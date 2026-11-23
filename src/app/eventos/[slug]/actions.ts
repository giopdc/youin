"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export async function requestGuestlist(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const { supabase, event } = await eventBySlug(slug);
  const { error } = await supabase.rpc("request_guestlist", { p_event: event.id });
  if (error) redirect(`/eventos/${slug}?err=${encodeURIComponent(error.message)}`);
  redirect(`/eventos/${slug}?msg=${encodeURIComponent("Solicitud recibida")}#lista`);
}

export async function joinProgram(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const { supabase, event } = await eventBySlug(slug);
  const { error } = await supabase.rpc("join_program", { p_event: event.id });
  if (error) redirect(`/eventos/${slug}?err=${encodeURIComponent(error.message)}`);
  redirect(`/perfil#e-${slug}`);
}
