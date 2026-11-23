// Recorre scripts/prueba-comunidad.md (pasos 1, 2, 3 y 5) en un móvil simulado de 390 × 844.
// El paso 4 (programa de Elenco) lo cubre la prueba de base de datos y la E2E del entorno de pruebas.
//
// Uso:
//   BASE=https://… SLUG=elenco-house-7-diciembre EMAIL=… PASSWORD=… SHOTS=./capturas node scripts/guion-comunidad.mjs
// La cuenta EMAIL/PASSWORD debe existir y estar confirmada. Si REGISTER=1, la crea desde /registro
// (solo sirve donde el registro no exige confirmar el correo).
import { createRequire } from "node:module";
// require() respeta NODE_PATH (útil si Playwright está instalado globalmente).
const { chromium, devices } = createRequire(import.meta.url)("playwright");
import { mkdirSync } from "node:fs";

const BASE = (process.env.BASE || "http://localhost:3000").replace(/\/$/, "");
const SLUG = process.env.SLUG || "elenco-house-7-diciembre";
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
if (!EMAIL || !PASSWORD) throw new Error("Define EMAIL y PASSWORD");

let n = 0;
const notes = [];
const ok = (cond, label) => {
  if (!cond) throw new Error("FALLO: " + label);
  console.log(`ok ${++n} - ${label}`);
};
const note = (t) => { notes.push(t); console.log("nota - " + t); };

const browser = await chromium.launch();
const phone = { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } };
const ctx = await browser.newContext(phone);
await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
const page = await ctx.newPage();
page.on("dialog", (d) => d.accept());
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => r.status() >= 500 && errors.push(`${r.status()} ${r.url()}`));
const shot = (name, p = page, full = true) => SHOTS && p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: full });
const main = () => page.locator("main").innerText();

// ---------------------------------------------------------------- 1. Ficha desde un mensaje, sin cuenta
await page.goto(`${BASE}/eventos/${SLUG}`, { waitUntil: "networkidle" });
await shot("1-ficha-sin-cuenta");
const music = page.getByRole("heading", { name: "Line-up" });
ok(await music.isVisible(), "1. la ficha muestra el line-up");
const musicBox = await page.locator(".lineup-block").boundingBox();
ok((await page.locator(".lineup li").count()) > 0, "1. line-up visible sin registrarse");
ok(/\d{1,2}:\d{2}/.test(await page.locator(".facts-row").innerText()), "1. se ve cuándo empieza");
ok((await page.locator(".ficha header").innerText()).length > 0 && (await main()).includes("Palau Alameda") || !SLUG.startsWith("elenco"), "1. se ve dónde es");
note(`1. El line-up empieza a ${Math.round(musicBox.y)} px del borde superior (pantalla de 844 px).`);
note((await page.locator(".prices").count()) ? "1. Precios en tabla y «desde X €» en el botón de compra." : "1. Esta fiesta no tiene precios.");

// ---------------------------------------------------------------- 2. Guardar plan → registro/acceso → volver
await page.getByRole("link", { name: "Guardar plan" }).click();
await page.waitForURL(/\/registro/);
ok(decodeURIComponent(page.url()).includes(`/eventos/${SLUG}?plan=guardar`), "2. el registro recuerda la ficha y la intención de guardar");
if (process.env.REGISTER === "1") {
  await page.getByLabel("Nombre").fill("Prueba Comunidad");
  await page.getByLabel("Correo").fill(EMAIL);
  await page.getByLabel(/Contraseña/).fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
} else {
  await page.getByRole("link", { name: "Entra", exact: true }).click();
  await page.waitForURL(/\/acceso/);
  ok(decodeURIComponent(page.url()).includes("plan=guardar"), "2. al pasar a «Entrar» se conserva la vuelta");
  await page.getByLabel("Correo").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
}
await page.waitForURL(new RegExp(`/eventos/${SLUG}`), { timeout: 30000 });
await page.getByRole("link", { name: "✓ En tus planes" }).waitFor({ timeout: 20000 });
ok(true, "2. vuelve a la ficha y el plan queda guardado");
await shot("2-ficha-plan-guardado");
await page.reload({ waitUntil: "networkidle" });
await page.goto(`${BASE}/eventos/${SLUG}?plan=guardar`, { waitUntil: "networkidle" }); // repetir la intención no duplica
await page.goto(`${BASE}/perfil`, { waitUntil: "networkidle" });
ok((await page.locator(`#e-${SLUG}`).count()) === 1 && (await page.locator(".plan-card").count()) >= 1, "2. tras recargar hay un único plan de esta fiesta");
ok((await main()).includes("¿Tienes ya entrada?"), "2. el perfil pregunta «¿Tienes ya entrada?»");
await shot("3-perfil-pregunta-entrada");
await page.getByRole("button", { name: "Sí, ya la tengo" }).click();
await page.getByText("Tienes entrada. ¡Nos vemos en la pista!").waitFor({ timeout: 20000 });
ok(true, "2. con «sí» el texto cambia a «Tienes entrada…»");
await shot("4-perfil-con-entrada");

// ---------------------------------------------------------------- 3. Invitar a otra persona
await page.goto(`${BASE}/eventos/${SLUG}`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "¿Te vienes? Invita a alguien" }).click();
const box = page.getByLabel("Tu mensaje (puedes cambiarlo)");
ok((await box.inputValue()).startsWith("¿Te vienes a"), "3. el mensaje propuesto lleva el título de la fiesta");
await box.fill("¿Te vienes el lunes? Pinta muy bien");
const wa = await page.getByRole("link", { name: "Enviar por WhatsApp" }).getAttribute("href");
const waText = decodeURIComponent(wa.split("text=")[1]);
ok(waText.startsWith("¿Te vienes el lunes? Pinta muy bien") && waText.includes(`${BASE}/eventos/${SLUG}`), "3. WhatsApp lleva el texto editado y el destino es la ficha pública");
ok(!waText.includes("/r/"), "3. invitar no usa el enlace personal de promotor");
await shot("5-invitar");
// Cancelar el menú nativo: seguimos en la ficha sin error.
// Simulamos el menú nativo del móvil y que la persona lo cancela.
await page.addInitScript(() => { navigator.share = () => Promise.reject(new DOMException("cancel", "AbortError")); });
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: "¿Te vienes? Invita a alguien" }).click();
await page.getByRole("button", { name: "Más opciones" }).click({ timeout: 5000 }).catch(() => note("3. «Más opciones» no aparece: el navegador no tiene menú nativo para compartir."));
ok(page.url().includes(`/eventos/${SLUG}`) && !(await main()).includes("No se ha podido"), "3. al cancelar el menú nativo sigues en la ficha");
await page.getByRole("button", { name: "Copiar" }).click();
await page.getByText("Mensaje y enlace copiados").waitFor();
const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => null);
ok(!clip || clip.includes(`/eventos/${SLUG}`), "3. «Copiar» deja mensaje y enlace listos para pegar");

// ---------------------------------------------------------------- Vista previa social
const anon = await browser.newContext();
const ap = await anon.newPage();
await ap.goto(`${BASE}/eventos/${SLUG}`, { waitUntil: "domcontentloaded" });
const html = await ap.content();
await anon.close();
const og = (k) => (html.match(new RegExp(`<meta property="${k}" content="([^"]*)"`)) || [])[1];
ok(og("og:title") && og("og:description") && og("og:url") === `${BASE}/eventos/${SLUG}`, "3. la ficha trae og:title, og:description y og:url en el HTML inicial");
note(`og:title = ${og("og:title")} | og:image = ${og("og:image") ? "sí" : "no"}`);

// ---------------------------------------------------------------- 5. Teclado y escritorio
const k = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const kp = await k.newPage();
await kp.goto(BASE, { waitUntil: "networkidle" });
await kp.keyboard.press("Tab");
ok((await kp.evaluate(() => document.activeElement?.textContent)) === "Saltar al contenido", "5. con teclado lo primero es «Saltar al contenido»");
await kp.keyboard.press("Enter");
for (let i = 0; i < 30; i++) {
  await kp.keyboard.press("Tab");
  if (await kp.evaluate(() => document.activeElement?.classList.contains("event-card"))) break;
}
ok(await kp.evaluate(() => document.activeElement?.classList.contains("event-card")), "5. se llega a una fiesta con Tab");
const outline = await kp.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
ok(outline !== "none", "5. el foco se ve");
await kp.keyboard.press("Enter");
await kp.waitForURL(/\/eventos\//);
ok(true, "5. Enter abre la ficha");
await kp.goto(BASE, { waitUntil: "networkidle" });
const w = await kp.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
ok(w[0] <= w[1], "5. portada en escritorio sin scroll horizontal");
await shot("6-portada-escritorio", kp);
await page.goto(BASE, { waitUntil: "networkidle" });
const pw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
ok(pw[0] <= pw[1], "5. portada en móvil sin scroll horizontal");
await shot("0-portada-movil");

ok(errors.length === 0, `sin errores de página ni 5xx${errors.length ? ": " + errors.join(" | ") : ""}`);
console.log(`\nGUION OK: ${n} comprobaciones`);
console.log("NOTAS:\n- " + notes.join("\n- "));
await browser.close();
