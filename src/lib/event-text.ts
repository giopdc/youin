import type { EventRow } from "@/lib/types";
import { formatEventDate } from "@/lib/time";

const lines = (t: string | null) => (t ?? "").split("\n").map((a) => a.trim()).filter(Boolean);

/** Solo artistas (sin las líneas de sala que empiezan por #). */
export function artistList(e: Pick<EventRow, "artists">): string[] {
  return lines(e.artists).filter((l) => !l.startsWith("#"));
}

export type Stage = { name: string | null; time: string | null; artists: string[] };

/** Line-up por salas: una línea «# Sala · 20:00 – 04:00» abre una sala; el resto son artistas. */
export function lineupByStage(e: Pick<EventRow, "artists">): Stage[] {
  const out: Stage[] = [];
  for (const l of lines(e.artists)) {
    if (l.startsWith("#")) {
      const [name, ...rest] = l.replace(/^#+\s*/, "").split(" · ");
      out.push({ name: name.trim() || null, time: rest.join(" · ").trim() || null, artists: [] });
    } else {
      if (!out.length) out.push({ name: null, time: null, artists: [] });
      out[out.length - 1].artists.push(l);
    }
  }
  return out.filter((s) => s.artists.length || s.name);
}

export type Prices = { rows: { label: string; value: string }[]; notes: string[]; from: number | null };

/** Precios: cada línea «Concepto: valor» es una fila; el resto, notas. «from» es el precio más bajo de las entradas. */
export function parsePrices(text: string | null): Prices {
  const rows: Prices["rows"] = [];
  const notes: string[] = [];
  let from: number | null = null;
  for (const l of lines(text)) {
    const i = l.indexOf(":");
    if (i > 0 && /\d/.test(l.slice(i))) {
      const label = l.slice(0, i).trim();
      const value = l.slice(i + 1).trim();
      rows.push({ label, value });
      if (!/reservado|botella|mesa|vip/i.test(label)) {
        for (const m of value.matchAll(/(\d+(?:[.,]\d+)?)\s*€/g)) {
          const n = Number(m[1].replace(",", "."));
          if (from === null || n < from) from = n;
        }
      }
    } else notes.push(l);
  }
  return { rows, notes, from };
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
