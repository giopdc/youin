import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { CopyShare } from "@/components/CopyShare";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { formatEventDate, formatShort, hasEnded } from "@/lib/time";
import { computeRewards, rewardMessage } from "@/lib/rewards";
import { siteUrl } from "@/config/site";
import { InviteFriend } from "@/components/InviteFriend";
import { invitePresets, inviteText, placeLine } from "@/lib/event-text";
import type { Delivery, EventRow, GuestlistRow, ParticipationSummary, SavedPlan } from "@/lib/types";
import { removePlan, setTicket, updateName } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mis planes" };

type Group = { event: EventRow; plan?: SavedPlan; request?: GuestlistRow; part?: ParticipationSummary; deliveries: Delivery[] };

export default async function Perfil({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireUser("/perfil");
  const [{ data: reqs }, { data: parts }, { data: pls }] = await Promise.all([
    supabase.from("guestlist_requests").select("*").eq("user_id", user.id),
    supabase.from("participation_summary").select("*").eq("user_id", user.id),
    supabase.from("saved_plans").select("*").eq("user_id", user.id),
  ]);
  const plans = (pls ?? []) as SavedPlan[];
  const requests = (reqs ?? []) as GuestlistRow[];
  const participations = (parts ?? []) as ParticipationSummary[];
  const eventIds = [...new Set([...plans.map((p) => p.event_id), ...requests.map((r) => r.event_id), ...participations.map((p) => p.event_id)])];
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
      plan: plans.find((p) => p.event_id === event.id),
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
      <h1>Mis planes</h1>
      <p className="muted">Hola, {profile?.full_name}. Aquí tienes tus fiestas, tus solicitudes y tus invitaciones.</p>

      {participations.length > 0 && (() => {
        const tickets = participations.reduce((n, x) => n + x.confirmed_tickets, 0);
        const earned = participations.reduce((n, x) => n + x.earned, 0);
        const delivered = participations.reduce((n, x) => n + x.delivered, 0);
        return (
          <section className="kpis" aria-label="Tus ventas como promotor">
            <div className="kpi"><b>{tickets}</b><span>entradas vendidas con tu enlace</span></div>
            <div className="kpi"><b>{participations.length}</b><span>{participations.length === 1 ? "fiesta" : "fiestas"} en el programa</span></div>
            <div className="kpi"><b>{earned}</b><span>{earned === 1 ? "invitación conseguida" : "invitaciones conseguidas"}</span></div>
            <div className="kpi"><b>{delivered}</b><span>{delivered === 1 ? "invitación entregada" : "invitaciones entregadas"}</span></div>
          </section>
        );
      })()}

      {groups.length === 0 && (
        <div className="card empty">
          <p className="big">Aún no tienes planes</p>
          <p className="muted">Busca una fiesta que te apetezca y pulsa «Guardar plan». Aparecerá aquí.</p>
          <Link className="btn primary" href="/">Ver fiestas</Link>
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
  if (p && p.pending_invitations > 0) return "Recoge tu invitación: sigue las instrucciones de entrega";
  if (g.plan?.has_ticket === null || (g.plan && g.plan.has_ticket === undefined)) return "Cuéntanos: ¿tienes ya entrada?";
  if (g.plan?.has_ticket === false && g.event.ticket_url) return "Consigue tu entrada antes de que suba de precio";
  if (g.request?.status === "pending") return "Espera la confirmación de la lista";
  if (p?.status === "pending") return "Espera tu enlace de promotor: aparecerá aquí";
  if (p?.status === "active") return "Comparte tu enlace de promotor para sumar entradas";
  if (g.request?.status === "confirmed") return "Estás en la lista. Invita a alguien y nos vemos en la pista";
  if (g.plan?.has_ticket) return "¡Tienes entrada! ¿Le preguntas a alguien si se viene?";
  if (p?.status === "inactive") return "Tu enlace de promotor está desactivado";
  return "Mira la ficha y decide";
}

function EventGroup({ g }: { g: Group }) {
  const { event, request, part, plan } = g;
  const ended = hasEnded(event);
  const date = formatEventDate(event.starts_at, event.ends_at);
  const url = `${siteUrl()}/eventos/${event.slug}`;
  const hidden = (
    <>
      <input type="hidden" name="event_id" value={event.id} />
      <input type="hidden" name="slug" value={event.slug} />
    </>
  );
  return (
    <section className="card plan-card" id={`e-${event.slug}`} style={{ scrollMarginTop: 72 }}>
      <h2><Link href={`/eventos/${event.slug}`}>{event.title}</Link></h2>
      {date && <p className="small when">{date}</p>}
      <p className="small muted">{placeLine(event)}</p>
      <p className="next-step">{nextStep(g)}</p>

      {plan && !ended && (
        <div className="action stack">
          <h3>Tu plan</h3>
          {plan.has_ticket === null ? (
            <form action={setTicket} className="stack">
              {hidden}
              <p style={{ margin: 0, fontWeight: 700 }}>¿Tienes ya entrada?</p>
              <div className="row">
                <SubmitButton className="btn primary" name="has_ticket" value="true">Sí, ya la tengo</SubmitButton>
                <SubmitButton className="btn" name="has_ticket" value="false">Todavía no</SubmitButton>
              </div>
            </form>
          ) : plan.has_ticket ? (
            <form action={setTicket} className="row">
              {hidden}
              <span className="status ok">Tienes entrada. ¡Nos vemos en la pista!</span>
              <SubmitButton className="btn sm" name="has_ticket" value="reset">Cambiar</SubmitButton>
            </form>
          ) : (
            <form action={setTicket} className="row">
              {hidden}
              <span className="status warn">Aún sin entrada</span>
              {event.ticket_url && <a className="btn sm sun" href={event.ticket_url} target="_blank" rel="noopener noreferrer">Comprar entrada</a>}
              <SubmitButton className="btn sm" name="has_ticket" value="true">Ya la tengo</SubmitButton>
            </form>
          )}
          <InviteFriend url={url} title={event.title} defaultText={inviteText(event)} presets={invitePresets(event)} compact eventId={event.id} loggedIn />
        </div>
      )}

      {request && (
        <div className="action">
          <h3>Lista</h3>
          {request.status === "pending" && <span className="status warn">Solicitud recibida</span>}
          {request.status === "confirmed" && <span className="status ok">Estás en la lista{event.guestlist_perk ? ` · ${event.guestlist_perk.toLowerCase()}` : ""}</span>}
          {request.status === "rejected" && <span className="status danger">Solicitud no aceptada</span>}
          {event.guestlist_conditions && <p className="small pre muted" style={{ marginTop: 8 }}>{event.guestlist_conditions}</p>}
          {!ended && event.starts_at && <p style={{ marginTop: 8, marginBottom: 0 }}><a className="btn sm" href={`/eventos/${event.slug}/calendario`}>Añadir al calendario</a></p>}
        </div>
      )}

      {part && <ProgramPanel g={g} ended={ended} />}

      {plan && (
        <form action={removePlan} className="action">
          {hidden}
          <SubmitButton className="btn sm" pendingText="Quitando…" confirm={`¿Quitar «${event.title}» de tus planes?`}>Quitar de mis planes</SubmitButton>
        </form>
      )}
    </section>
  );
}

function ProgramPanel({ g, ended }: { g: Group; ended: boolean }) {
  const p = g.part!;
  const r = computeRewards({ confirmed: p.confirmed_tickets, threshold: p.reward_threshold, cap: p.reward_cap, delivered: p.delivered });
  const pct = r.capReached ? 100 : Math.round(((p.confirmed_tickets % p.reward_threshold) / p.reward_threshold) * 100);
  return (
    <div className="action stack promo-inline">
      <p className="kicker">Programa de promotores</p>
      <h3>Tu enlace personal de venta</h3>
      <p className="small muted" style={{ margin: 0 }}>Este enlace cuenta en Xceed las entradas que vendes. Para invitar a un amigo usa «¿Te vienes?».</p>
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
