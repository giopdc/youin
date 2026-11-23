// Parche tras `opennextjs-cloudflare build`: @opennextjs/aws 4.2 llama a
// `import_cookie.default.parse`, pero cookie@1.x no tiene export por defecto,
// así que cualquier petición con cookies devuelve 500. Usamos el módulo directamente.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let patched = 0;
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== "node_modules" && name !== "assets") walk(p); continue; }
    if (!/\.(m?js)$/.test(name)) continue;
    const src = readFileSync(p, "utf8");
    const out = src.replace(/\b(import_cookie\d*)\.default\.(parse|serialize)\b/g, "($1.default ?? $1).$2");
    if (out !== src) { writeFileSync(p, out); patched++; }
  }
})(".open-next");
console.log(`Parche de cookies aplicado en ${patched} archivos`);
