import type { EventRow } from "@/lib/types";

// Cartel o, si no hay, un bloque de color con el estilo musical.
export function Poster({ event, size = "card" }: { event: Pick<EventRow, "poster_url" | "title" | "genres">; size?: "card" | "hero" }) {
  if (event.poster_url) {
    return <img className={size === "hero" ? "poster" : "thumb"} src={event.poster_url} alt={size === "hero" ? `Cartel de ${event.title}` : ""} loading={size === "hero" ? "eager" : "lazy"} />;
  }
  const label = event.genres?.[0] ?? "Música electrónica";
  return (
    <div className={`${size === "hero" ? "poster" : "thumb"} poster-fallback`} role={size === "hero" ? "img" : undefined} aria-label={size === "hero" ? `${event.title}: sin cartel todavía` : undefined}>
      <span>{label}</span>
    </div>
  );
}
