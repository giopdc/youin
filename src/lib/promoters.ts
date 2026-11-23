import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventRow, ParticipationSummary, Profile } from "@/lib/types";

export type PromoterTotal = {
  user_id: string;
  programs: number;
  active_links: number;
  pending_links: number;
  confirmed_tickets: number;
  invitations_earned: number;
  invitations_delivered: number;
  invitations_pending: number;
  needs_review: boolean;
  last_reviewed_at: string | null;
};

export type PromoterRow = PromoterTotal & {
  name: string;
  email: string;
  byEvent: { title: string; slug: string; eventId: string; tickets: number; status: string }[];
};

/** Ventas por perfil (todas las fiestas). Con sesión de admin devuelve a todo el mundo. */
export async function loadPromoters(supabase: SupabaseClient): Promise<PromoterRow[]> {
  const [{ data: totals }, { data: parts }] = await Promise.all([
    supabase.from("promoter_totals").select("*"),
    supabase.from("participation_summary").select("user_id, event_id, confirmed_tickets, status"),
  ]);
  const t = (totals ?? []) as PromoterTotal[];
  const p = (parts ?? []) as Pick<ParticipationSummary, "user_id" | "event_id" | "confirmed_tickets" | "status">[];
  const userIds = t.map((x) => x.user_id);
  const eventIds = [...new Set(p.map((x) => x.event_id))];
  const [{ data: profs }, { data: evs }] = await Promise.all([
    userIds.length ? supabase.from("profiles").select("id, full_name, email").in("id", userIds) : Promise.resolve({ data: [] }),
    eventIds.length ? supabase.from("events").select("id, title, slug, starts_at").in("id", eventIds) : Promise.resolve({ data: [] }),
  ]);
  const people = new Map(((profs ?? []) as Profile[]).map((x) => [x.id, x]));
  const events = new Map(((evs ?? []) as Pick<EventRow, "id" | "title" | "slug" | "starts_at">[]).map((x) => [x.id, x]));
  return t
    .map((row) => ({
      ...row,
      name: people.get(row.user_id)?.full_name ?? "—",
      email: people.get(row.user_id)?.email ?? "",
      byEvent: p
        .filter((x) => x.user_id === row.user_id)
        .map((x) => ({ eventId: x.event_id, title: events.get(x.event_id)?.title ?? "—", slug: events.get(x.event_id)?.slug ?? "", tickets: x.confirmed_tickets, status: x.status }))
        .sort((a, b) => b.tickets - a.tickets),
    }))
    .sort((a, b) => b.confirmed_tickets - a.confirmed_tickets || a.name.localeCompare(b.name, "es"));
}
