/** Solo permite volver a rutas internas (evita redirecciones abiertas). */
export function safeNext(value: unknown, fallback = "/perfil"): string {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || /[\r\n]/.test(v)) return fallback;
  return v;
}

export function withParams(path: string, params: Record<string, string | undefined | null>): string {
  const [base, hash] = path.split("#");
  const [p, q] = base.split("?");
  const sp = new URLSearchParams(q);
  for (const [k, val] of Object.entries(params)) {
    if (val == null || val === "") sp.delete(k);
    else sp.set(k, val);
  }
  const qs = sp.toString();
  return `${p}${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`;
}
