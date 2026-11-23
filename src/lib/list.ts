import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { appendToSheet } from "@/lib/sheets";
import { formatEventDate } from "@/lib/time";
import type { EventRow, GuestlistRow } from "@/lib/types";

type Ev = Pick<EventRow, "id" | "slug" | "title" | "starts_at" | "ends_at" | "guestlist_perk">;

/** Apunta a la lista (idempotente) y manda la fila a la hoja de Google. */
export async function joinList(supabase: SupabaseClient, user: User, event: Ev, phone: string, consent: boolean) {
  const { data, error } = await supabase.rpc("request_guestlist", { p_event: event.id, p_phone: phone, p_consent: consent });
  if (error) return { error: error.message };
  const r = data as GuestlistRow;
  const { data: prof } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
  await appendToSheet("lista", {
    fiesta: event.title,
    fecha_fiesta: formatEventDate(event.starts_at, event.ends_at),
    nombre: prof?.full_name ?? (user.user_metadata?.full_name as string) ?? "",
    correo: prof?.email ?? user.email ?? "",
    telefono: r.phone ?? phone,
    acepta_contacto: r.contact_consent,
    estado: r.status === "confirmed" ? "confirmada" : r.status === "pending" ? "pendiente" : "rechazada",
    ventaja: event.guestlist_perk,
  });
  return { request: r };
}

/** Tras confirmar el correo: completa la lista que se pidió al registrarse. */
export async function completePendingList(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const slug = user?.user_metadata?.pending_list as string | undefined;
  if (!user || !slug) return null;
  const { data: ev } = await supabase.from("events").select("id, slug, title, starts_at, ends_at, guestlist_perk").eq("slug", slug).maybeSingle();
  if (ev) await joinList(supabase, user, ev as Ev, String(user.user_metadata?.phone ?? ""), Boolean(user.user_metadata?.list_consent));
  await supabase.auth.updateUser({ data: { pending_list: null } });
  return slug;
}
