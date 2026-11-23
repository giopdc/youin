import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import type { GuestlistRow, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
const cell = (v: unknown) => {
  const s = String(v ?? "");
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};
const LABEL = { pending: "pendiente", confirmed: "confirmada", rejected: "rechazada" } as const;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return new NextResponse("Solo administración", { status: 403 });
  const { data: ev } = await supabase.from("events").select("slug, title").eq("id", id).maybeSingle();
  const { data: reqs } = await supabase.from("guestlist_requests").select("*").eq("event_id", id).order("created_at");
  const rows = (reqs ?? []) as GuestlistRow[];
  const { data: profs } = rows.length ? await supabase.from("profiles").select("id, full_name, email").in("id", rows.map((r) => r.user_id)) : { data: [] };
  const people = new Map(((profs ?? []) as Profile[]).map((p) => [p.id, p]));
  const lines = rows.map((r) => [r.created_at, people.get(r.user_id)?.full_name, people.get(r.user_id)?.email, r.phone, r.contact_consent ? "sí" : "no", LABEL[r.status]].map(cell).join(","));
  const body = "﻿" + [["fecha", "nombre", "correo", "telefono", "acepta_contacto", "estado"].map(cell).join(","), ...lines].join("\r\n");
  return new NextResponse(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="lista-${ev?.slug ?? id}.csv"`, "Cache-Control": "no-store" },
  });
}
