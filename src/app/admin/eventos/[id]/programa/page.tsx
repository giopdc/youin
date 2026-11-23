import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { formatShort } from "@/lib/time";
import { withParams } from "@/lib/nav";
import { computeRewards } from "@/lib/rewards";
import { siteUrl } from "@/config/site";
import type { Delivery, EventRow, ParticipationSummary, Profile, SalesAdjustment } from "@/lib/types";
import { EventTabs } from "../../../EventTabs";
import { assignChannel, deliverInvitation, setInstructions, setParticipationActive, setSalesTotal } from "../../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ventas y recompensas" };

const FILTERS = {
  all: "Todas",
  pendiente_enlace: "Pendiente de enlace",
  invitacion_pendiente: "Invitación pendiente",
  revisar: "Para revisar",
} as const;
type FilterKey = keyof typeof FILTERS;

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> };

export default async function Program({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: ev } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!ev) notFound();
  const event = ev as EventRow;
  const { data: ps } = await supabase.from("participation_summary").select("*").eq("event_id", id).order("created_at");
  const parts = (ps ?? []) as ParticipationSummary[];
  const pids = parts.map((p) => p.id);
  const [{ data: adj }, { data: dels }] = await Promise.all([
    pids.length ? supabase.from("sales_adjustments").select("*").in("participation_id", pids).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    pids.length ? supabase.from("invitation_deliveries").select("*").in("participation_id", pids).order("seq") : Promise.resolve({ data: [] }),
  ]);
  const adjustments = (adj ?? []) as SalesAdjustment[];
  const deliveries = (dels ?? []) as Delivery[];
  const userIds = [...new Set([
    ...parts.map((p) => p.user_id),
    ...adjustments.map((a) => a.changed_by).filter(Boolean),
    ...deliveries.map((d) => d.delivered_by).filter(Boolean),
  ] as string[])];
  const { data: profs } = userIds.length ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds) : { data: [] };
  const people = new Map(((profs ?? []) as Profile[]).map((p) => [p.id, p]));

  const q = (sp.q ?? "").trim().toLowerCase();
  const f = (sp.f in FILTERS ? sp.f : "all") as FilterKey;
  const match = (p: ParticipationSummary) =>
    f === "all" ||
    (f === "pendiente_enlace" && p.status === "pending") ||
    (f === "invitacion_pendiente" && p.pending_invitations > 0) ||
    (f === "revisar" && p.needs_review);
  const rows = parts
    .filter(match)
    .filter((p) => !q || (people.get(p.user_id)?.full_name ?? "").toLowerCase().includes(q))
    .sort((a, b) => (people.get(a.user_id)?.full_name ?? "").localeCompare(people.get(b.user_id)?.full_name ?? "", "es"));
  const counts: Record<FilterKey, number> = {
    all: parts.length,
    pendiente_enlace: parts.filter((p) => p.status === "pending").length,
    invitacion_pendiente: parts.filter((p) => p.pending_invitations > 0).length,
    revisar: parts.filter((p) => p.needs_review).length,
  };
  const totalTickets = parts.reduce((n, p) => n + p.confirmed_tickets, 0);
  const base = `/admin/eventos/${id}/programa`;
  const self = withParams(base, { q: sp.q, f: f === "all" ? undefined : f });

  return (
    <div className="wrap wide">
      <EventTabs id={id} current="programa" />
      <Flash msg={sp.msg} err={sp.err} />
      <h1>Ventas y recompensas · {event.title}</h1>
      <p className="small muted">
        {event.rewards_enabled
          ? `Regla: cada ${event.reward_threshold} entradas válidas = 1 invitación${event.reward_cap ? `, máximo ${event.reward_cap} por persona` : ", sin límite"}. ${event.rewards_open ? "Programa abierto." : "Programa cerrado."}`
          : "Las recompensas no están activadas en este evento."}
      </p>
      <p className="small">
        {parts.length} participantes · {totalTickets} entradas confirmadas · {parts.reduce((n, p) => n + p.pending_invitations, 0)} invitaciones pendientes
      </p>
      <details className="card small">
        <summary>Cómo revisar</summary>
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li>Abre el informe de Xceed y localiza el canal de cada persona.</li>
          <li>Cuenta entradas individuales válidas (un pedido de 3 entradas son 3). No cuentes invitaciones gratuitas ni reembolsos.</li>
          <li>Escribe el <strong>TOTAL acumulado</strong>, no la diferencia. Guardar el mismo total no suma nada.</li>
        </ol>
      </details>

      <form className="row" role="search" style={{ marginTop: 12 }}>
        <input type="search" name="q" defaultValue={sp.q} placeholder="Buscar por nombre" aria-label="Buscar por nombre" style={{ flex: 1, minWidth: 180 }} />
        {f !== "all" && <input type="hidden" name="f" value={f} />}
        <button className="btn" type="submit">Buscar</button>
      </form>
      <nav className="tabs" aria-label="Filtrar">
        {(Object.keys(FILTERS) as FilterKey[]).map((k) => (
          <Link key={k} href={withParams(base, { q: sp.q, f: k === "all" ? undefined : k })} aria-current={f === k ? "page" : undefined}>
            {FILTERS[k]} ({counts[k]})
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="card">No hay participantes{q || f !== "all" ? " con este filtro" : " todavía"}.</div>
      ) : (
        <table className="review">
          <thead>
            <tr>
              <th>Participante</th>
              <th>Canal asignado</th>
              <th>Entradas confirmadas</th>
              <th>Progreso</th>
              <th>Invitaciones pendientes</th>
              <th>Última revisión</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const person = people.get(p.user_id);
              const r = computeRewards({ confirmed: p.confirmed_tickets, threshold: p.reward_threshold, cap: p.reward_cap, delivered: p.delivered });
              const progress = r.capReached
                ? `${r.earned} conseguida${r.earned === 1 ? "" : "s"} · máximo`
                : `${r.earned} conseguida${r.earned === 1 ? "" : "s"} · ${p.reward_threshold - (r.missingForNext ?? 0)}/${p.reward_threshold} para la siguiente`;
              const history = adjustments.filter((a) => a.participation_id === p.id);
              const pd = deliveries.filter((d) => d.participation_id === p.id);
              return (
                <ParticipantRows
                  key={p.id}
                  p={p}
                  name={person?.full_name ?? "—"}
                  email={person?.email ?? ""}
                  progress={progress}
                  history={history}
                  deliveries={pd}
                  people={people}
                  back={self}
                  link={`${siteUrl()}/r/${p.public_code}`}
                />
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ParticipantRows(props: {
  p: ParticipationSummary;
  name: string;
  email: string;
  progress: string;
  history: SalesAdjustment[];
  deliveries: Delivery[];
  people: Map<string, Profile>;
  back: string;
  link: string;
}) {
  const { p, name, email, progress, history, deliveries, people, back, link } = props;
  const channel =
    p.status === "pending" ? <span className="status warn">Pendiente de enlace</span>
    : p.status === "inactive" ? <span className="status danger">Desactivado</span>
    : <span className="status ok">Activo</span>;
  const hidden = (
    <>
      <input type="hidden" name="pid" value={p.id} />
      <input type="hidden" name="back" value={back} />
    </>
  );
  return (
    <>
      <tr className="item" id={`p-${p.id}`} style={{ scrollMarginTop: 72 }}>
        <td data-label="Participante"><strong>{name}</strong></td>
        <td data-label="Canal asignado">{channel}</td>
        <td data-label="Entradas confirmadas" className="num"><strong>{p.confirmed_tickets}</strong></td>
        <td data-label="Progreso" className="small">{progress}</td>
        <td data-label="Invitaciones pendientes" className="num">
          {p.pending_invitations}
          {p.needs_review && <div className="status danger" style={{ marginTop: 4 }}>Revisar: entregadas {p.delivered} de {p.earned}</div>}
        </td>
        <td data-label="Última revisión" className="small">{p.last_reviewed_at ? formatShort(p.last_reviewed_at) : "—"}</td>
      </tr>
      <tr className="manage">
        <td colSpan={6} className="full">
          <details>
            <summary>Gestionar a {name}</summary>
            <div className="grid2" style={{ marginTop: 8 }}>
              <div className="stack">
                <h3>Canal oficial de Xceed</h3>
                <p className="small muted">{email}</p>
                <form action={assignChannel} className="stack">
                  {hidden}
                  <label><span className="lbl">Enlace de Xceed que identifica las ventas de {name} en esta fiesta</span>
                    <input type="url" name="channel_url" required defaultValue={p.channel_url ?? ""} placeholder="https://xceed.me/…" />
                  </label>
                  <SubmitButton className="btn primary">{p.channel_url ? "Guardar enlace" : "Guardar y activar"}</SubmitButton>
                </form>
                {p.channel_url && (
                  <form action={setParticipationActive}>
                    {hidden}
                    {p.status === "active" ? (
                      <SubmitButton className="btn sm danger" name="active" value="false" confirm={`¿Desactivar el enlace de ${name}? Quien lo abra verá que no está activo.`}>Desactivar enlace</SubmitButton>
                    ) : (
                      <SubmitButton className="btn sm" name="active" value="true">Reactivar enlace</SubmitButton>
                    )}
                  </form>
                )}
                {p.status !== "pending" && (
                  <div className="small">
                    <span className="lbl">Enlace de {name} para compartir</span>
                    <div className="linkbox">{link}</div>
                  </div>
                )}
              </div>

              <div className="stack">
                <h3>Entradas confirmadas</h3>
                {p.channel_url ? (
                  <form action={setSalesTotal} className="stack">
                    {hidden}
                    <label><span className="lbl">TOTAL acumulado de entradas válidas en Xceed</span>
                      <input type="number" name="total" min={0} step={1} required inputMode="numeric" defaultValue={p.confirmed_tickets} />
                    </label>
                    <label><span className="lbl">Nota (opcional)</span>
                      <input type="text" name="note" placeholder="Ej.: reembolso de 1 entrada" maxLength={300} />
                    </label>
                    <SubmitButton className="btn primary">Guardar total</SubmitButton>
                  </form>
                ) : (
                  <p className="small muted">Asigna primero su enlace oficial.</p>
                )}
              </div>

              <div className="stack">
                <h3>Invitaciones</h3>
                <p className="small">Conseguidas: {p.earned} · Entregadas: {p.delivered} · Pendientes: {p.pending_invitations}</p>
                {p.needs_review && (
                  <div className="notice err small">
                    Entregadas: {p.delivered}. Con las ventas actuales le corresponden: {p.earned}. Revisa el caso; el historial de entrega se conserva.
                  </div>
                )}
                {p.pending_invitations > 0 && (
                  <form action={deliverInvitation}>
                    {hidden}
                    <input type="hidden" name="seq" value={p.delivered + 1} />
                    <SubmitButton className="btn primary" pendingText="Registrando…">Marcar invitación {p.delivered + 1} como entregada</SubmitButton>
                  </form>
                )}
                {deliveries.length > 0 && (
                  <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                    {deliveries.map((d) => (
                      <li key={d.id}>Invitación {d.seq}: {formatShort(d.delivered_at)}{d.delivered_by ? ` · ${people.get(d.delivered_by)?.full_name ?? ""}` : ""}</li>
                    ))}
                  </ul>
                )}
                <form action={setInstructions} className="stack">
                  {hidden}
                  <label><span className="lbl">Instrucciones privadas de entrega (solo las ve {name})</span>
                    <textarea name="instructions" defaultValue={p.delivery_instructions ?? ""} placeholder="Ej.: di tu nombre y DNI en la puerta de invitados" maxLength={1000} />
                  </label>
                  <SubmitButton className="btn sm">Guardar instrucciones</SubmitButton>
                </form>
              </div>

              <div className="stack">
                <h3>Historial de cambios</h3>
                {history.length === 0 ? (
                  <p className="small muted">Sin cambios todavía.</p>
                ) : (
                  <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                    {history.map((a) => (
                      <li key={a.id}>
                        {formatShort(a.created_at)} · {a.previous_total} → {a.new_total}
                        {a.changed_by ? ` · ${people.get(a.changed_by)?.full_name ?? "admin"}` : ""}
                        {a.note ? ` · «${a.note}»` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </details>
        </td>
      </tr>
    </>
  );
}
