import type { EventRow } from "@/lib/types";
import { formatEventDate } from "@/lib/time";

export function artistList(e: Pick<EventRow, "artists">): string[] {
  return (e.artists ?? "").split("\n").map((a) => a.trim()).filter(Boolean);
}

/** «A, B, C y 3 más» (máximo n nombres). */
export function withArtists(e: Pick<EventRow, "artists">, n = 3): string | null {
  const a = artistList(e);
  if (!a.length) return null;
  const shown = a.slice(0, n).map((x) => x.replace(/\s*\(.*\)$/, ""));
  const rest = a.length - shown.length;
  if (rest > 0) return `${shown.join(", ")} y ${rest} más`;
  return shown.length > 1 ? `${shown.slice(0, -1).join(", ")} y ${shown.at(-1)}` : shown[0];
}

export function placeLine(e: Pick<EventRow, "venue" | "city">): string {
  return [e.venue, e.city].filter(Boolean).join(" · ");
}

const dayOf = (e: EventRow) => formatEventDate(e.starts_at, e.ends_at)?.split(" · ")[0]?.toLowerCase() ?? null;
const perkOpen = (e: EventRow) => (e.guestlist_enabled && e.guestlist_open && e.guestlist_perk ? e.guestlist_perk : null);

/** Texto que se propone al invitar a un amigo (editable antes de enviar). */
export function inviteText(e: EventRow): string {
  const day = dayOf(e);
  const perk = perkOpen(e);
  return `¿Te vienes a ${e.title}${day ? ` el ${day}` : ""}${e.venue ? ` en ${e.venue}` : ""}?${perk ? ` Apuntándote a la lista: ${perk.toLowerCase()}.` : ""}`;
}

/** Mensajes rápidos para invitar, construidos solo con datos de la fiesta. */
export function invitePresets(e: EventRow): string[] {
  const day = dayOf(e);
  const perk = perkOpen(e);
  const first = withArtists(e, 1);
  const list = [
    inviteText(e),
    perk ? `Me he apuntado a la lista de ${e.title}: ${perk.toLowerCase()}. ¿Te apuntas conmigo?` : `Yo voy a ${e.title}. ¿Te vienes?`,
    day ? `Plan para el ${day}: ${e.title}${first ? ` con ${first}` : ""}. ¿You in?` : null,
  ];
  return list.filter((x): x is string => Boolean(x));
}

/** Descripción corta para la vista previa al compartir (WhatsApp, etc.). */
export function shareDescription(e: EventRow): string {
  const perk = perkOpen(e);
  const parts = [perk ? `Lista: ${perk.toLowerCase()}` : null, formatEventDate(e.starts_at, e.ends_at), placeLine(e), withArtists(e, 4)];
  return parts.filter(Boolean).join(" · ");
}
