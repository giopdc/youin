import type { EventRow } from "@/lib/types";

// Cartel o, si no hay, un bloque de color con el nombre de la fiesta.
export function Poster({ event, size = "card" }: { event: Pick<EventRow, "poster_url" | "title">; size?: "card" | "hero" }) {
  if (event.poster_url) {
    return <img className={size === "hero" ? "poster" : "thumb"} src={event.poster_url} alt={size === "hero" ? `Cartel de ${event.title}` : ""} loading={size === "hero" ? "eager" : "lazy"} />;
  }
  return (
    <div className={`${size === "hero" ? "poster" : "thumb"} poster-fallback`} role={size === "hero" ? "img" : undefined} aria-label={size === "hero" ? `${event.title}: sin cartel todavía` : undefined}>
      <span>{event.title}</span>
    </div>
  );
}
