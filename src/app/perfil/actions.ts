"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/acceso?next=/perfil");
  return { supabase, user: data.user };
}

export async function updateName(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 120) redirect("/perfil?err=" + encodeURIComponent("Escribe un nombre válido."));
  const { supabase, user } = await session();
  const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
  revalidatePath("/perfil");
  redirect("/perfil?" + (error ? "err=" + encodeURIComponent("No se ha podido guardar.") : "msg=" + encodeURIComponent("Nombre actualizado.")));
}

export async function setTicket(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const value = String(formData.get("has_ticket"));
  const { supabase } = await session();
  const { error } = await supabase.rpc("set_plan_ticket", { p_event: eventId, p_has_ticket: value === "reset" ? null : value === "true" });
  revalidatePath("/perfil");
  redirect(`/perfil${error ? `?err=${encodeURIComponent(error.message)}` : ""}#e-${slug}`);
}

export async function removePlan(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "");
  const { supabase } = await session();
  const { error } = await supabase.rpc("remove_plan", { p_event: eventId });
  revalidatePath("/perfil");
  redirect("/perfil?" + (error ? "err=" + encodeURIComponent(error.message) : "msg=" + encodeURIComponent("Plan quitado.")));
}
