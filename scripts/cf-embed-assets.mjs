// Alternativa de despliegue sin "static assets" de Cloudflare: incrusta los
// archivos de .open-next/assets en el propio worker. Útil cuando la subida de
// assets no es posible (p. ej. entornos con proxy). Uso: npm run deploy:direct
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, extname } from "node:path";

const root = ".open-next/assets";
const types = {
  ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
  ".html": "text/html; charset=utf-8",
};
const files = {};
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files["/" + relative(root, p).split("\\").join("/")] = [types[extname(p)] || "application/octet-stream", readFileSync(p).toString("base64")];
  }
})(root);
writeFileSync(".open-next/embedded-assets.mjs", `export default ${JSON.stringify(files)};\n`);
writeFileSync(".open-next/direct-worker.mjs", `import assets from "./embedded-assets.mjs";
import app from "./worker.js";
export * from "./worker.js";
const cache = new Map();
export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    const hit = assets[pathname];
    if (hit && (request.method === "GET" || request.method === "HEAD")) {
      let body = cache.get(pathname);
      if (!body) { body = Uint8Array.from(atob(hit[1]), (c) => c.charCodeAt(0)); cache.set(pathname, body); }
      const immutable = pathname.startsWith("/_next/static/");
      return new Response(request.method === "HEAD" ? null : body, { headers: {
        "content-type": hit[0],
        "cache-control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=3600",
      } });
    }
    return app.fetch(request, env, ctx);
  },
};
`);
console.log(`Incrustados ${Object.keys(files).length} archivos`);
