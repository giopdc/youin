import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user ?? null;
  let profile: Profile | null = null;
  let isAdmin = false;
  if (user) {
    const [{ data: p }, { data: admin }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email").eq("id", user.id).maybeSingle(),
      supabase.rpc("is_admin"),
    ]);
    profile = (p as Profile | null) ?? null;
    isAdmin = admin === true;
  }
  return { supabase, user, profile, isAdmin };
}

export async function requireUser(next: string) {
  const s = await getSession();
  if (!s.user) redirect(`/acceso?next=${encodeURIComponent(next)}`);
  return s as typeof s & { user: NonNullable<typeof s.user> };
}

/** Comprobación en el servidor. La base de datos vuelve a comprobarlo (RLS y funciones). */
export async function requireAdmin() {
  const s = await getSession();
  if (!s.user) redirect(`/acceso?next=/admin`);
  if (!s.isAdmin) redirect("/?err=" + encodeURIComponent("Esa zona es solo para administración."));
  return s as typeof s & { user: NonNullable<typeof s.user> };
}

export function friendlyDbError(message: string | undefined | null): string {
  if (!message) return "No se ha podido guardar. Inténtalo de nuevo.";
  if (/events_publish_requires_date/.test(message)) return "Para publicar, indica la fecha y la hora de inicio.";
  if (/events_end_after_start/.test(message)) return "La hora de fin debe ser posterior al inicio.";
  if (/ticket_url_check/.test(message)) return "El enlace de compra debe ser una dirección https de Xceed.";
  if (/poster_url_check/.test(message)) return "El cartel debe ser una dirección https.";
  if (/events_slug_key|duplicate key.*slug/.test(message)) return "Ya existe un evento con esa dirección.";
  if (/participations_event_channel_uidx/.test(message)) return "Ese enlace ya está asignado a otra persona en esta fiesta.";
  if (/row-level security|permission denied/i.test(message)) return "No tienes permiso para hacer esto.";
  return message;
}
