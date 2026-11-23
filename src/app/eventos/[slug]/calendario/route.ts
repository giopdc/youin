import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl, APP_NAME } from "@/config/site";

export const dynamic = "force-dynamic";

const ics = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// Archivo de calendario (.ics) con aviso el día antes y 2 horas antes.
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: e } = await supabase.from("events").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!e || !e.starts_at) return new NextResponse("No disponible", { status: 404 });
  const end = e.ends_at ?? new Date(new Date(e.starts_at).getTime() + 6 * 3600_000).toISOString();
  const url = `${siteUrl()}/eventos/${slug}`;
  const desc = [e.guestlist_perk && e.guestlist_enabled ? `Lista: ${e.guestlist_perk}` : null, url].filter(Boolean).join("\n");
  const body = [
    "BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${APP_NAME}//ES`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.id}@you-in`, `DTSTAMP:${ics(new Date().toISOString())}`,
    `DTSTART:${ics(e.starts_at)}`, `DTEND:${ics(end)}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc([e.venue, e.address, e.city].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${esc(desc)}`, `URL:${url}`,
    "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${esc(`Mañana: ${e.title}`)}`, "END:VALARM",
    "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", `DESCRIPTION:${esc(`En 2 horas: ${e.title}`)}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
  return new NextResponse(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${slug}.ics"` },
  });
}
