"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function eventBySlug(slug: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/registro?next=${encodeURIComponent(`/eventos/${slug}`)}`);
  const { data: event } = await supabase.from("events").select("id, slug").eq("slug", slug).maybeSingle();
  if (!event) redirect("/?err=" + encodeURIComponent("Este evento no está disponible."));
  return { supabase, event };
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
