// Único sitio donde se define el nombre de la comunidad.
// Puedes cambiarlo aquí o con la variable NEXT_PUBLIC_APP_NAME.
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "You In";

export const APP_TAGLINE = "Fiestas de música electrónica en Valencia";

export const TIME_ZONE = "Europe/Madrid";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}
