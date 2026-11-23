import { NextResponse, type NextRequest } from "next/server";
import { resolveReferral } from "@/lib/referral";

export const dynamic = "force-dynamic";

// Enlace público y estable /r/<código>. No requiere cuenta. El servidor busca el destino
// guardado y redirige a Xceed solo si la participación está activa. Abrirlo nunca suma ventas.
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const r = await resolveReferral(code);
  if (r.state === "active" && r.destination) {
    return NextResponse.redirect(r.destination, { status: 302, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  }
  return NextResponse.redirect(new URL(`/enlace/${encodeURIComponent(code)}`, request.url), {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
