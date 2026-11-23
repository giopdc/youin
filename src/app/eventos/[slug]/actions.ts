"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { joinList } from "@/lib/list";
import { appendToSheet } from "@/lib/sheets";
import { formatEventDate } from "@/lib/time";
import { siteUrl } from "@/config/site";

const back = (slug: string, intent?: string) =>
  `/registro?next=${encodeURIComponent(`/eventos/${slug}${intent ? `?plan=${intent}` : ""}`)}`;

async function eventBySlug(slug: string, intent?: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(back(slug, intent));
  const { data: event } = await supabase.from("events").select("id, slug").eq("slug", slug).maybeSingle();
  if (!event) redirect("/?err=" + encodeURIComponent("Esta fiesta no está disponible."));
  return { supabase, event };
}

export async function savePlan(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const { supabase, event } = await eventBySlug(slug, "guardar");
  const { error } = await supabase.rpc("save_plan", { p_event: event.id });
  if (error) redirect(`/eventos/${slug}?err=${encodeURIComponent(error.message)}`);
  revalidatePath(`/eventos/${slug}`);
  redirect(`/eventos/${slug}?msg=${encodeURIComponent("¡Plan guardado! Lo tienes en «Mis planes».")}#plan`);
}

/** Se llama al volver del registro con ?plan=guardar. Es idempotente. */
export async function savePlanAfterSignup(slug: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false };
  const { data: event } = await supabase.from("events").select("id").eq("slug", slug).maybeSingle();
  if (!event) return { ok: false, error: "Esta fiesta no está disponible." };
  const { error } = await supabase.rpc("save_plan", { p_event: event.id });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export type JoinState = { error?: string; sent?: string; values?: Record<string, string> };

function friendlyAuth(message: string) {
  if (/already registered|already exists/i.test(message)) return "Ya tienes cuenta con ese correo. Entra y apúntate con un toque.";
  if (/rate limit|too many/i.test(message)) return "Demasiados intentos. Espera un momento y vuelve a probar.";
  if (/password/i.test(message)) return "La contraseña debe tener al menos 8 caracteres.";
  return "No hemos podido apuntarte. Inténtalo de nuevo.";
}

/** Apuntarse a la lista en un solo paso (crea la cuenta si hace falta). */
export async function joinListQuick(_: JoinState, formData: FormData): Promise<JoinState> {
  const slug = String(formData.get("slug") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const consent = formData.get("consent") === "on";
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const values = { name, email, phone };
  if (!/^\+?[0-9 ]{9,20}$/.test(phone)) return { error: "Escribe tu móvil (9 cifras o con prefijo, p. ej. +34 600 000 000).", values };

  const supabase = await createClient();
  const { data: ev } = await supabase.from("events").select("id, slug, title, starts_at, ends_at, guestlist_perk").eq("slug", slug).maybeSingle();
  if (!ev) return { error: "Esta fiesta no está disponible.", values };
  let { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (!name) return { error: "Escribe tu nombre.", values };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Revisa el correo: no parece válido.", values };
    if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres.", values };
    const next = `/eventos/${slug}?dentro=1#lista`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, phone, list_consent: consent, pending_list: slug },
        emailRedirectTo: `${siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) return { error: friendlyAuth(error.message), values };
    if (!data.session) {
      return { sent: `Casi estás: abre el correo que te hemos enviado a ${email} y quedarás en la lista al momento.`, values };
    }
    user = data.user;
  }
  const r = await joinList(supabase, user!, ev, phone, consent);
  if ("error" in r && r.error) return { error: r.error, values };
  if (user?.user_metadata?.pending_list) await supabase.auth.updateUser({ data: { pending_list: null } });
  revalidatePath(`/eventos/${slug}`);
  redirect(`/eventos/${slug}?dentro=1#lista`);
}

/** Registra una invitación «¿Te vienes?» y la manda a la hoja. Solo con sesión iniciada. */
export async function logInvite(eventId: string, channel: "whatsapp" | "share" | "copy", message: string): Promise<{ count?: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};
  const { error } = await supabase.rpc("log_invite", { p_event: eventId, p_channel: channel, p_message: message.slice(0, 500) });
  if (error) return {};
  const [{ data: ev }, { data: prof }, { count }] = await Promise.all([
    supabase.from("events").select("title, starts_at, ends_at").eq("id", eventId).maybeSingle(),
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabase.from("invite_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("event_id", eventId),
  ]);
  await appendToSheet("mensajes", {
    fiesta: ev?.title ?? "",
    fecha_fiesta: ev ? formatEventDate(ev.starts_at, ev.ends_at) : "",
    nombre: prof?.full_name ?? "",
    correo: prof?.email ?? user.email ?? "",
    canal: channel === "whatsapp" ? "WhatsApp" : channel === "share" ? "Compartir del móvil" : "Copiado",
    mensaje: message,
  });
  return { count: count ?? undefined };
}

export async function joinProgram(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const { supabase, event } = await eventBySlug(slug);
  const { error } = await supabase.rpc("join_program", { p_event: event.id });
  if (error) redirect(`/eventos/${slug}?err=${encodeURIComponent(error.message)}`);
  redirect(`/perfil#e-${slug}`);
}
