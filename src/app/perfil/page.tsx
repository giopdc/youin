import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { CopyShare } from "@/components/CopyShare";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { formatEventDate, formatShort, hasEnded } from "@/lib/time";
import { computeRewards, rewardMessage } from "@/lib/rewards";
import { siteUrl } from "@/config/site";
import type { Delivery, EventRow, GuestlistRow, ParticipationSummary } from "@/lib/types";
import { updateName } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi perfil" };

type Group = { event: EventRow; request?: GuestlistRow; part?: ParticipationSummary; deliveries: Delivery[] };

export default async function Perfil({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireUser("/perfil");
  const [{ data: reqs }, { data: parts }] = await Promise.all([
    supabase.from("guestlist_requests").select("*").eq("user_id", user.id),
    supabase.from("participation_summary").select("*").eq("user_id", user.id),
  ]);
  const requests = (reqs ?? []) as GuestlistRow[];
  const participations = (parts ?? []) as ParticipationSummary[];
  const eventIds = [...new Set([...requests.map((r) => r.event_id), ...participations.map((p) => p.event_id)])];
  const [{ data: evs }, { data: dels }] = await Promise.all([
    eventIds.length ? supabase.from("events").select("*").in("id", eventIds) : Promise.resolve({ data: [] }),
    participations.length
      ? supabase.from("invitation_deliveries").select("*").in("participation_id", participations.map((p) => p.id))
      : Promise.resolve({ data: [] }),
  ]);
  const deliveries = (dels ?? []) as Delivery[];
  const groups: Group[] = ((evs ?? []) as EventRow[]).map((event) => {
    const part = participations.find((p) => p.event_id === event.id);
    return {
      event,
      request: requests.find((r) => r.event_id === event.id),
      part,
      deliveries: part ? deliveries.filter((d) => d.participation_id === part.id).sort((a, b) => a.seq - b.seq) : [],
    };
  });
  const upcoming = groups.filter((g) => !hasEnded(g.event)).sort(byDate);
  const past = groups.filter((g) => hasEnded(g.event)).sort(byDate).reverse();

  return (
    <div className="wrap">
      <Flash msg={sp.msg} err={sp.err} />
      <h1>Mi perfil</h1>
      <p className="muted">{profile?.full_name} · {user.email}</p>

      {groups.length === 0 && (
        <div className="card">
          <p>Todavía no te has apuntado a ninguna fiesta.</p>
          <Link className="btn primary" href="/">Ver próximos eventos</Link>
        </div>
      )}
      {upcoming.map((g) => <EventGroup key={g.event.id} g={g} />)}
      {past.length > 0 && (
        <>
          <h2 style={{ marginTop: 24 }}>Fiestas pasadas</h2>
          {past.map((g) => <EventGroup key={g.event.id} g={g} />)}
        </>
      )}

      <details className="card" style={{ marginTop: 24 }}>
        <summary>Editar mi nombre</summary>
        <form action={updateName} className="stack" style={{ marginTop: 8 }}>
          <label><span className="lbl">Nombre</span>
            <input type="text" name="name" defaultValue={profile?.full_name} required maxLength={120} />
          </label>
          <SubmitButton className="btn">Guardar nombre</SubmitButton>
        </form>
      </details>
    </div>
  );
}

function byDate(a: Group, b: Group) {
  return (a.event.starts_at ?? "").localeCompare(b.event.starts_at ?? "");
}

function nextStep(g: Group): string {
  if (hasEnded(g.event)) return "Fiesta terminada";
  const p = g.part;
  if (p) {
    if (p.pending_invitations > 0) return "Recoge tu invitación: sigue las instrucciones de entrega";
    if (p.status === "pending") return "Espera tu enlace: aparecerá aquí cuando esté listo";
    if (p.status === "active") return "Comparte tu enlace para sumar entradas";
  }
  if (g.request?.status === "pending") return "Espera la confirmación de la lista";
  if (g.request?.status === "confirmed") return "Estás en la lista. ¡Nos vemos en la fiesta!";
  if (p?.status === "inactive") return "Tu enlace está desactivado";
  return "Consulta la ficha de la fiesta";
}

function EventGroup({ g }: { g: Group }) {
  const { event, request, part } = g;
  const ended = hasEnded(event);
  const date = formatEventDate(event.starts_at, event.ends_at);
  return (
    <section className="card" id={`e-${event.slug}`} style={{ scrollMarginTop: 72 }}>
      <div className="small muted">{event.promoter}</div>
      <h2><Link href={`/eventos/${event.slug}`}>{event.title}</Link></h2>
      {date && <p className="small">{date}</p>}
      <p className="next-step">→ {nextStep(g)}</p>

      {request && (
        <div className="action">
          <h3>Lista</h3>
          {request.status === "pending" && <span className="status warn">Solicitud recibida</span>}
          {request.status === "confirmed" && <span className="status ok">Estás en la lista</span>}
          {request.status === "rejected" && <span className="status danger">Solicitud no aceptada</span>}
          {event.guestlist_conditions && <p className="small pre muted" style={{ marginTop: 8 }}>{event.guestlist_conditions}</p>}
        </div>
      )}

      {part && <ProgramPanel g={g} ended={ended} />}
    </section>
  );
}

function ProgramPanel({ g, ended }: { g: Group; ended: boolean }) {
  const p = g.part!;
  const r = computeRewards({ confirmed: p.confirmed_tickets, threshold: p.reward_threshold, cap: p.reward_cap, delivered: p.delivered });
  const pct = r.capReached ? 100 : Math.round(((p.confirmed_tickets % p.reward_threshold) / p.reward_threshold) * 100);
  return (
    <div className="action stack">
      <h3>Comparte y gana</h3>
      {p.status === "pending" ? (
        <p>Hemos recibido tu solicitud. Tu enlace aparecerá aquí cuando esté listo</p>
      ) : (
        <>
          {p.status === "active" && !ended ? (
            <CopyShare url={`${siteUrl()}/r/${p.public_code}`} title={g.event.title} />
          ) : (
            <p className="muted">{ended ? "La fiesta ha terminado: tu enlace ya no está activo." : "Tu enlace está desactivado."}</p>
          )}
          <p style={{ fontWeight: 600 }}>
            {rewardMessage({ confirmed: p.confirmed_tickets, threshold: p.reward_threshold, cap: p.reward_cap, delivered: p.delivered })}
          </p>
          <div className="progress" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
          <dl className="facts small">
            <dt>Entradas confirmadas</dt><dd>{p.confirmed_tickets}</dd>
            <dt>Última revisión</dt><dd>{p.last_reviewed_at ? formatShort(p.last_reviewed_at) : "Aún sin revisar"}</dd>
            {(p.earned > 0 || p.delivered > 0) && (
              <>
                <dt>Invitaciones</dt>
                <dd>{p.earned} conseguida{p.earned === 1 ? "" : "s"} · {p.delivered} entregada{p.delivered === 1 ? "" : "s"}</dd>
              </>
            )}
          </dl>
          {g.deliveries.length > 0 && (
            <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
              {g.deliveries.map((d) => (
                <li key={d.id}>Invitación {d.seq}: entregada el {formatShort(d.delivered_at)}</li>
              ))}
            </ul>
          )}
          {p.delivery_instructions && (
            <div className="notice">
              <div className="small muted">Instrucciones de entrega (solo para ti)</div>
              <p className="pre" style={{ margin: 0 }}>{p.delivery_instructions}</p>
            </div>
          )}
          <p className="small muted">Las entradas se revisan a mano a partir del informe oficial de Xceed. Abrir tu enlace no suma ventas: solo cuentan las entradas válidas confirmadas.</p>
        </>
      )}
    </div>
  );
}
