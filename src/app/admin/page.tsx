import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { formatEventDate, hasEnded } from "@/lib/time";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administración" };

export default async function AdminHome({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: evs }, { data: reqs }, { data: parts }] = await Promise.all([
    supabase.from("events").select("*").order("starts_at", { ascending: false, nullsFirst: true }),
    supabase.from("guestlist_requests").select("event_id, status"),
    supabase.from("participation_summary").select("event_id, status, pending_invitations, needs_review"),
  ]);
  const events = (evs ?? []) as EventRow[];
  const r = (reqs ?? []) as { event_id: string; status: string }[];
  const p = (parts ?? []) as { event_id: string; status: string; pending_invitations: number; needs_review: boolean }[];
  return (
    <div className="wrap">
      <Flash msg={sp.msg} err={sp.err} />
      <nav className="tabs" aria-label="Administración">
        <Link href="/admin" aria-current="page">Fiestas</Link>
        <Link href="/admin/promotores">Ventas por perfil</Link>
      </nav>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Administración</h1>
        <Link className="btn primary" href="/admin/eventos/nuevo">Nuevo evento</Link>
      </div>
      <div style={{ marginTop: 16 }}>
        {events.map((e) => {
          const er = r.filter((x) => x.event_id === e.id);
          const ep = p.filter((x) => x.event_id === e.id);
          const pendingList = er.filter((x) => x.status === "pending").length;
          const pendingLink = ep.filter((x) => x.status === "pending").length;
          const pendingInv = ep.reduce((n, x) => n + x.pending_invitations, 0);
          const review = ep.filter((x) => x.needs_review).length;
          return (
            <div className="card" key={e.id}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className={`status ${e.status === "published" ? "ok" : "warn"}`}>
                  {e.status === "published" ? (hasEnded(e) ? "Publicado · terminado" : "Publicado") : "Borrador"}
                </span>
                <span className="small muted">{e.promoter}</span>
              </div>
              <h2 style={{ marginTop: 8 }}><Link href={`/admin/eventos/${e.id}`}>{e.title}</Link></h2>
              <p className="small muted">{formatEventDate(e.starts_at, e.ends_at) ?? "Sin fecha"}</p>
              <p className="small">
                Lista: {er.length} ({pendingList} por revisar) · Programa: {ep.length} ({pendingLink} sin enlace) · Invitaciones pendientes: {pendingInv}
                {review > 0 && <> · <strong style={{ color: "var(--danger)" }}>{review} para revisar</strong></>}
              </p>
              <div className="row">
                <Link className="btn sm" href={`/admin/eventos/${e.id}`}>Editar</Link>
                <Link className="btn sm" href={`/admin/eventos/${e.id}/lista`}>Lista</Link>
                <Link className="btn sm" href={`/admin/eventos/${e.id}/programa`}>Ventas y recompensas</Link>
              </div>
            </div>
          );
        })}
        {events.length === 0 && <div className="card">Aún no hay eventos. Crea el primero.</div>}
      </div>
    </div>
  );
}
