import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { formatShort } from "@/lib/time";
import { withParams } from "@/lib/nav";
import type { EventRow, GuestlistRow, Profile } from "@/lib/types";
import { EventTabs } from "../../../EventTabs";
import { setGuestStatus } from "../../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lista" };

const LABEL = { pending: "Pendiente", confirmed: "Confirmada", rejected: "Rechazada" } as const;
const CLS = { pending: "warn", confirmed: "ok", rejected: "danger" } as const;

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> };

export default async function GuestList({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: ev } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!ev) notFound();
  const event = ev as EventRow;
  const { data: reqs } = await supabase.from("guestlist_requests").select("*").eq("event_id", id).order("created_at");
  const requests = (reqs ?? []) as GuestlistRow[];
  const { data: profs } = requests.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", requests.map((r) => r.user_id))
    : { data: [] };
  const byId = new Map(((profs ?? []) as Profile[]).map((p) => [p.id, p]));

  const q = (sp.q ?? "").trim().toLowerCase();
  const f = sp.f ?? "all";
  const rows = requests
    .map((r) => ({ r, p: byId.get(r.user_id) }))
    .filter(({ r }) => f === "all" || r.status === f)
    .filter(({ p }) => !q || `${p?.full_name ?? ""} ${p?.email ?? ""}`.toLowerCase().includes(q))
    .sort((a, b) => (a.p?.full_name ?? "").localeCompare(b.p?.full_name ?? "", "es"));
  const confirmedNames = requests
    .filter((r) => r.status === "confirmed")
    .map((r) => byId.get(r.user_id)?.full_name ?? "")
    .sort((a, b) => a.localeCompare(b, "es"));
  const counts = { all: requests.length, pending: 0, confirmed: 0, rejected: 0 };
  requests.forEach((r) => counts[r.status]++);
  const base = `/admin/eventos/${id}/lista`;
  const self = withParams(base, { q: sp.q, f: sp.f });

  return (
    <div className="wrap">
      <EventTabs id={id} current="lista" />
      <Flash msg={sp.msg} err={sp.err} />
      <h1>Lista · {event.title}</h1>
      <p className="small muted">
        {event.guestlist_enabled ? (event.guestlist_open ? "Lista abierta" : "Lista cerrada") : "La lista no está activada en este evento"}.
        La lista es independiente del programa de recompensas.
      </p>
      <form className="row" role="search">
        <input type="search" name="q" defaultValue={sp.q} placeholder="Buscar por nombre o correo" aria-label="Buscar" style={{ flex: 1, minWidth: 180 }} />
        {f !== "all" && <input type="hidden" name="f" value={f} />}
        <button className="btn" type="submit">Buscar</button>
      </form>
      <nav className="tabs" aria-label="Filtrar">
        {(["all", "pending", "confirmed", "rejected"] as const).map((k) => (
          <Link key={k} href={withParams(base, { q: sp.q, f: k === "all" ? undefined : k })} aria-current={f === k ? "page" : undefined}>
            {k === "all" ? "Todas" : LABEL[k]} ({counts[k]})
          </Link>
        ))}
      </nav>
      {rows.length === 0 && <div className="card">No hay solicitudes{q || f !== "all" ? " con este filtro" : " todavía"}.</div>}
      {rows.map(({ r, p }) => (
        <div className="card" key={r.id} id={`g-${r.id}`} style={{ scrollMarginTop: 72 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <strong>{p?.full_name ?? "—"}</strong>
              <div className="small muted">{p?.email} · {formatShort(r.created_at)}</div>
            </div>
            <span className={`status ${CLS[r.status]}`}>{LABEL[r.status]}</span>
          </div>
          <form action={setGuestStatus} className="row" style={{ marginTop: 10 }}>
            <input type="hidden" name="rid" value={r.id} />
            <input type="hidden" name="back" value={self} />
            {r.status !== "confirmed" && <SubmitButton className="btn sm primary" name="status" value="confirmed">Confirmar</SubmitButton>}
            {r.status !== "rejected" && <SubmitButton className="btn sm" name="status" value="rejected">Rechazar</SubmitButton>}
            {r.status !== "pending" && <SubmitButton className="btn sm" name="status" value="pending">Volver a pendiente</SubmitButton>}
          </form>
        </div>
      ))}
      {confirmedNames.length > 0 && (
        <details className="card" style={{ marginTop: 16 }}>
          <summary>Nombres confirmados para la puerta ({confirmedNames.length})</summary>
          <textarea readOnly rows={Math.min(confirmedNames.length + 1, 15)} defaultValue={confirmedNames.join("\n")} aria-label="Nombres confirmados" style={{ marginTop: 8 }} />
        </details>
      )}
    </div>
  );
}
