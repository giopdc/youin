import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/nav";
import { completePendingList } from "@/lib/list";

// Destino de los enlaces de los correos (confirmación de cuenta y recuperación).
// Admite el formato token_hash (recomendado, funciona aunque el correo se abra en otro
// navegador) y el formato ?code= (PKCE).
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }
  if (ok) await completePendingList(supabase);
  const dest = ok
    ? next
    : `/acceso?next=${encodeURIComponent(next)}&err=${encodeURIComponent("El enlace no es válido o ha caducado. Entra o pide uno nuevo.")}`;
  return NextResponse.redirect(new URL(dest, url.origin));
}
