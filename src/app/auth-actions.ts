"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/nav";
import { siteUrl } from "@/config/site";

export type FormState = { error?: string; ok?: string; values?: Record<string, string> };

function authError(message: string): string {
  if (/already registered|already exists/i.test(message)) return "Ya existe una cuenta con ese correo. Entra o recupera tu acceso.";
  if (/invalid login credentials/i.test(message)) return "Correo o contraseña incorrectos.";
  if (/email not confirmed/i.test(message)) return "Confirma tu correo con el enlace que te enviamos antes de entrar.";
  if (/password/i.test(message) && /(least|short|weak)/i.test(message)) return "La contraseña debe tener al menos 8 caracteres.";
  if (/rate limit|too many/i.test(message)) return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
  if (/invalid.*email|email.*invalid/i.test(message)) return "Revisa el correo: no parece válido.";
  return "No hemos podido completar la operación. Inténtalo de nuevo.";
}

const confirmUrl = (next: string) => `${siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`;

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  const values = { name, email };
  if (!name) return { error: "Escribe tu nombre.", values };
  if (name.length > 120) return { error: "El nombre es demasiado largo.", values };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Revisa el correo: no parece válido.", values };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres.", values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name }, emailRedirectTo: confirmUrl(next) },
  });
  if (error) return { error: authError(error.message), values };
  if (data.session) redirect(next);
  return { ok: `Te hemos enviado un correo a ${email}. Abre el enlace para confirmar tu cuenta y volverás aquí.`, values };
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authError(error.message), values: { email } };
  redirect(next);
}

export async function requestReset(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Revisa el correo: no parece válido.", values: { email } };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: confirmUrl("/nueva-contrasena") });
  if (error && /rate limit|too many/i.test(error.message)) return { error: authError(error.message), values: { email } };
  return { ok: "Si hay una cuenta con ese correo, te hemos enviado un enlace para elegir una contraseña nueva." };
}

export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "El enlace ha caducado. Pide uno nuevo desde «He olvidado mi contraseña»." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: authError(error.message) };
  redirect("/perfil?msg=" + encodeURIComponent("Contraseña actualizada."));
}
