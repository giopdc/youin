import { TIME_ZONE } from "@/config/site";

function parts(ms: number) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(new Date(ms))) if (p.type !== "literal") o[p.type] = Number(p.value);
  return o as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

function offsetMs(utcMs: number): number {
  const p = parts(utcMs);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - (utcMs - (utcMs % 1000));
}

/** Convierte fecha (AAAA-MM-DD) y hora (HH:MM) de Madrid a ISO UTC. */
export function madridToUtcIso(date: string, time: string): string | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const tm = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dm || !tm) return null;
  const guess = Date.UTC(+dm[1], +dm[2] - 1, +dm[3], +tm[1], +tm[2]);
  if (Number.isNaN(guess)) return null;
  const o1 = offsetMs(guess);
  let t = guess - o1;
  const o2 = offsetMs(t);
  if (o2 !== o1) t = guess - o2;
  return new Date(t).toISOString();
}

/** Inicio y fin a partir de los campos del formulario. Si el fin es antes del inicio, es al día siguiente. */
export function eventRange(date: string, start: string, end: string): { starts_at: string | null; ends_at: string | null } {
  if (!date || !start) return { starts_at: null, ends_at: null };
  const starts_at = madridToUtcIso(date, start);
  if (!starts_at || !end) return { starts_at, ends_at: null };
  let ends = madridToUtcIso(date, end);
  if (ends && ends <= starts_at) {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    ends = madridToUtcIso(d.toISOString().slice(0, 10), end);
  }
  return { starts_at, ends_at: ends };
}

/** Partes locales (Madrid) para rellenar formularios. */
export function madridParts(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const p = parts(new Date(iso).getTime());
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
}

const dateFmt = new Intl.DateTimeFormat("es-ES", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" });
const dateYearFmt = new Intl.DateTimeFormat("es-ES", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("es-ES", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const shortFmt = new Intl.DateTimeFormat("es-ES", { timeZone: TIME_ZONE, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function formatEventDate(starts: string | null, ends: string | null, now = new Date()): string | null {
  if (!starts) return null;
  const s = new Date(starts);
  const sameYear = madridParts(starts).date.slice(0, 4) === madridParts(now.toISOString()).date.slice(0, 4);
  const day = (sameYear ? dateFmt : dateYearFmt).format(s);
  const cap = day.charAt(0).toUpperCase() + day.slice(1);
  const time = timeFmt.format(s) + (ends ? ` – ${timeFmt.format(new Date(ends))}` : "");
  return `${cap} · ${time}`;
}

export function formatShort(iso: string | null): string {
  return iso ? shortFmt.format(new Date(iso)) : "—";
}

export function hasEnded(e: { starts_at: string | null; ends_at: string | null }, now = Date.now()): boolean {
  if (!e.starts_at) return false;
  const end = e.ends_at ? new Date(e.ends_at).getTime() : new Date(e.starts_at).getTime() + 12 * 3600_000;
  return end < now;
}

const dayFmt = new Intl.DateTimeFormat("es-ES", { timeZone: TIME_ZONE, day: "2-digit" });
const monFmt = new Intl.DateTimeFormat("es-ES", { timeZone: TIME_ZONE, month: "short" });
/** Bloque de fecha para tarjetas: { day: "07", month: "dic" }. */
export function dateBadge(iso: string | null): { day: string; month: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  return { day: dayFmt.format(d), month: monFmt.format(d).replace(".", "") };
}
