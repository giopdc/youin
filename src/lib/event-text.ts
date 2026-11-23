import type { EventRow } from "@/lib/types";
import { formatEventDate } from "@/lib/time";

export function artistList(e: Pick<EventRow, "artists">): string[] {
  return (e.artists ?? "").split("\n").map((a) => a.trim()).filter(Boolean);
}

/** «con A, B y C» (máximo n nombres). */
export function withArtists(e: Pick<EventRow, "artists">, n = 3): string | null {
  const a = artistList(e);
  if (!a.length) return null;
  const shown = a.slice(0, n).map((x) => x.replace(/\s*\(.*\)$/, ""));
  const rest = a.length - shown.length;
  const joined = shown.length > 1 ? `${shown.slice(0, -1).join(", ")} y ${shown.at(-1)}` : shown[0];
  return rest > 0 ? `${shown.join(", ")} y ${rest} más` : joined;
}

export function placeLine(e: Pick<EventRow, "venue" | "city">): string {
  return [e.venue, e.city].filter(Boolean).join(" · ");
}

/** Texto que se propone al invitar a un amigo (editable antes de enviar). */
export function inviteText(e: EventRow): string {
  const when = formatEventDate(e.starts_at, e.ends_at);
  const music = e.genres?.length ? ` Suena ${e.genres.slice(0, 2).join(" y ").toLowerCase()}.` : "";
  return `¿Te vienes a ${e.title}?${when ? ` ${when.split(" · ")[0]}` : ""}${e.venue ? ` en ${e.venue}` : ""}.${music}`;
}

/** Descripción corta para la vista previa al compartir (WhatsApp, etc.). */
export function shareDescription(e: EventRow): string {
  const parts = [formatEventDate(e.starts_at, e.ends_at), placeLine(e), e.genres?.slice(0, 3).join(", "), withArtists(e, 4)];
  return parts.filter(Boolean).join(" · ");
}
