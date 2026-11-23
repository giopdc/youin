"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateName(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 120) redirect("/perfil?err=" + encodeURIComponent("Escribe un nombre válido."));
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/acceso?next=/perfil");
  const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", data.user.id);
  redirect("/perfil?" + (error ? "err=" + encodeURIComponent("No se ha podido guardar.") : "msg=" + encodeURIComponent("Nombre actualizado.")));
}
