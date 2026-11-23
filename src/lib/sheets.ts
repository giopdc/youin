// Envía filas a la hoja de Google del administrador mediante un Apps Script publicado como aplicación web.
// Configuración (secretos del servidor, nunca en el navegador):
//   GOOGLE_SHEETS_WEBHOOK_URL  URL de la aplicación web de Apps Script (https://script.google.com/macros/s/…/exec)
//   GOOGLE_SHEETS_TOKEN        la misma clave que guardes en las propiedades del script
// Si no están configuradas, no hace nada. Un fallo de la hoja nunca bloquea la inscripción.
import { TIME_ZONE } from "@/config/site";

export type SheetKind = "lista" | "mensajes";

const stamp = () =>
  new Intl.DateTimeFormat("es-ES", { timeZone: TIME_ZONE, dateStyle: "short", timeStyle: "medium" }).format(new Date());

export async function appendToSheet(kind: SheetKind, row: Record<string, string | number | boolean | null>): Promise<boolean> {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const token = process.env.GOOGLE_SHEETS_TOKEN;
  if (!url || !token) return false;
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url) && !process.env.GOOGLE_SHEETS_ALLOW_ANY_URL) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token, kind, row: { fecha: stamp(), ...row } }),
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch (e) {
    console.error("Google Sheets:", (e as Error).message);
    return false;
  }
}
