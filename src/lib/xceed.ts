// Validación de destinos de Xceed. Debe coincidir con public.is_xceed_url en la base de datos.
export const XCEED_HOST = "xceed.me";

export type XceedCheck = { ok: true; url: string } | { ok: false; error: string };

export function checkXceedUrl(input: string | null | undefined): XceedCheck {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, error: "Pega el enlace de Xceed." };
  if (/\s/.test(raw) || raw.length > 2000) return { ok: false, error: "El enlace no es válido." };
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, error: "El enlace no es válido." };
  }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== "https:") return { ok: false, error: "El enlace debe empezar por https://" };
  if (host !== XCEED_HOST && !host.endsWith("." + XCEED_HOST))
    return { ok: false, error: `El enlace debe ser de Xceed (${XCEED_HOST}).` };
  if (u.username || u.password || u.port) return { ok: false, error: "El enlace no es válido." };
  u.hash = "";
  // Normalizamos solo el protocolo y el dominio; ruta y parámetros se conservan tal cual.
  const url = `https://${host}${u.pathname}${u.search}`;
  // Comprobación literal equivalente a la de la base de datos
  if (!/^https:\/\/([a-z0-9-]+\.)*xceed\.me(\/[^#]*)?$/i.test(url))
    return { ok: false, error: "El enlace no es válido." };
  return { ok: true, url };
}
