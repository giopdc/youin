import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadPromoters } from "@/lib/promoters";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  // Evita fórmulas al abrir en Excel/Sheets y escapa comillas.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET() {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return new NextResponse("Solo administración", { status: 403 });
  const rows = await loadPromoters(supabase);
  const header = ["nombre", "correo", "entradas_confirmadas", "fiestas", "enlaces_activos", "invitaciones_conseguidas", "invitaciones_entregadas", "invitaciones_pendientes", "ultima_revision", "detalle_por_fiesta"];
  const lines = rows.map((r) => [
    r.name, r.email, r.confirmed_tickets, r.programs, r.active_links, r.invitations_earned, r.invitations_delivered, r.invitations_pending,
    r.last_reviewed_at ?? "", r.byEvent.map((e) => `${e.title}: ${e.tickets}`).join(" | "),
  ].map(cell).join(","));
  const body = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ventas-por-perfil-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
