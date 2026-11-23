import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EventDetail } from "@/components/EventDetail";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { InviteFriend } from "@/components/InviteFriend";
import { AutoSavePlan } from "@/components/AutoSavePlan";
import { Countdown } from "@/components/Countdown";
import { ListJoin } from "@/components/ListJoin";
import { StickyJoin } from "@/components/StickyJoin";
import { Confetti } from "@/components/Confetti";
import { formatEventDate, hasEnded } from "@/lib/time";
import { invitePresets, inviteText, shareDescription } from "@/lib/event-text";
import { APP_NAME, siteUrl } from "@/config/site";
import type { EventRow, GuestlistRow, ParticipationSummary, SavedPlan } from "@/lib/types";
import { joinProgram, savePlan } from "./actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string>> };

async function loadEvent(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return data as EventRow | null;
}

// Vista previa al compartir la ficha (WhatsApp, Telegram, etc.).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const e = await loadEvent(slug);
  if (!e) return { title: "Fiesta no disponible" };
  const url = `${siteUrl()}/eventos/${e.slug}`;
  const description = shareDescription(e);
  return {
    title: e.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website", siteName: APP_NAME, locale: "es_ES",
      title: `¿Te vienes? ${e.title}`, description, url,
      ...(e.poster_url ? { images: [{ url: e.poster_url, alt: `Cartel de ${e.title}` }] } : {}),
    },
    twitter: { card: e.poster_url ? "summary_large_image" : "summary", title: `¿Te vienes? ${e.title}`, description },
  };
}

export default async function EventPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { supabase, user, profile } = await getSession();
  const event = await loadEvent(slug);
  if (!event) notFound();
  const ended = hasEnded(event);
  const url = `${siteUrl()}/eventos/${slug}`;
  const listOpen = event.guestlist_enabled && event.guestlist_open && !ended;

  let request: GuestlistRow | null = null;
  let part: ParticipationSummary | null = null;
  let plan: SavedPlan | null = null;
  let invites = 0;
  const { data: countData } = await supabase.rpc("guestlist_count", { p_event: event.id });
  const count = typeof countData === "number" ? countData : 0;
  if (user) {
    const [{ data: r }, { data: p }, { data: pl }, { count: ic }] = await Promise.all([
      supabase.from("guestlist_requests").select("*").eq("event_id", event.id).eq("user_id", user.id).maybeSingle(),
      supabase.from("participation_summary").select("*").eq("event_id", event.id).eq("user_id", user.id).maybeSingle(),
      supabase.from("saved_plans").select("*").eq("event_id", event.id).eq("user_id", user.id).maybeSingle(),
      supabase.from("invite_logs").select("id", { count: "exact", head: true }).eq("event_id", event.id).eq("user_id", user.id),
    ]);
    request = r as GuestlistRow | null;
    part = p as ParticipationSummary | null;
    plan = pl as SavedPlan | null;
    invites = ic ?? 0;
  }
  const signup = (intent?: string) =>
    `/registro?next=${encodeURIComponent(`/eventos/${slug}${intent ? `?plan=${intent}` : ""}`)}`;
  const autoSave = user && !plan && sp.plan === "guardar" && !ended;
  const invite = (
    <InviteFriend url={url} title={event.title} defaultText={inviteText(event)} presets={invitePresets(event)} compact
      eventId={event.id} loggedIn={Boolean(user)} sent={invites} />
  );

  const top = event.guestlist_enabled && !ended ? (
    <section className="card list-hook" id="lista" aria-labelledby="h-lista" style={{ scrollMarginTop: 76 }}>
      {request ? (
        <>
          {sp.dentro === "1" && <Confetti />}
          <div className="pass">
            <p className="pass-top">{request.status === "confirmed" ? "Estás dentro" : request.status === "pending" ? "Solicitud recibida" : "Solicitud no aceptada"}</p>
            <p className="pass-name">{profile?.full_name}</p>
            <p className="pass-event">{event.title}</p>
            <p className="pass-meta">{formatEventDate(event.starts_at, event.ends_at)} · {event.venue}</p>
            {event.guestlist_perk && request.status !== "rejected" && <p className="pass-perk">{event.guestlist_perk}</p>}
          </div>
          {request.status === "pending" && <p className="small muted">Te avisaremos aquí cuando la confirmemos.</p>}
          <div className="row">
            <a className="btn" href={`/eventos/${slug}/calendario`}>Añadir al calendario</a>
            <Link className="btn" href={`/perfil#e-${slug}`}>Ver mis planes</Link>
          </div>
          <p className="hook-cta">Ahora lo mejor: que se venga alguien más.</p>
          {invite}
        </>
      ) : !listOpen ? (
        <p className="muted" style={{ margin: 0 }}>La lista está cerrada.</p>
      ) : (
        <>
          <p className="kicker">Lista</p>
          <h2 id="h-lista" className="hook-title">{event.guestlist_perk ?? "Apúntate a la lista"}</h2>
          {event.starts_at && <Countdown to={event.starts_at} label="La fiesta empieza en" />}
          <p className="hook-count">
            {count > 0 ? <><b>{count}</b> {count === 1 ? "persona ya está apuntada" : "personas ya están apuntadas"}</> : <>Sé de los primeros en apuntarte</>}
          </p>
          {event.guestlist_conditions && <p className="small pre muted">{event.guestlist_conditions}</p>}
          <ListJoin slug={slug} loggedIn={Boolean(user)} perk={event.guestlist_perk} />
        </>
      )}
    </section>
  ) : null;

  const actions = ended ? (
    <div className="notice warn">Esta fiesta ya ha terminado. <Link href="/">Mira las próximas</Link>.</div>
  ) : (
    <section className="card plan" id="plan" aria-labelledby="tu-plan">
      <h2 id="tu-plan">Tu plan</h2>
      {autoSave && <AutoSavePlan slug={slug} />}
      {!request && invite}
      <div className="row">
        {plan ? (
          <Link className="btn saved-btn" href={`/perfil#e-${slug}`}>✓ En tus planes</Link>
        ) : user ? (
          <form action={savePlan}>
            <input type="hidden" name="slug" value={slug} />
            <SubmitButton className="btn" pendingText="Guardando…">Guardar plan</SubmitButton>
          </form>
        ) : (
          <Link className="btn" href={signup("guardar")}>Guardar plan</Link>
        )}
        {event.ticket_url && <a className="btn sun" href={event.ticket_url} target="_blank" rel="noopener noreferrer">Comprar entrada</a>}
        {event.starts_at && <a className="btn" href={`/eventos/${slug}/calendario`}>Calendario</a>}
      </div>
      {event.ticket_url && <p className="small muted" style={{ margin: 0 }}>La entrada se compra en Xceed.</p>}
    </section>
  );

  const extra = !ended && event.rewards_enabled ? (
    <section className="card promo" id="programa" aria-labelledby="h-programa">
      <p className="kicker">Programa de promotores · opcional</p>
      <h2 id="h-programa">Vende entradas y gana una invitación</h2>
      <p className="small">
        Por cada {event.reward_threshold} entradas válidas vendidas con tu enlace personal consigues 1 invitación
        {event.reward_cap ? ` (máximo ${event.reward_cap} por persona)` : ""}.
      </p>
      <p className="small muted">No es lo mismo que invitar a un amigo: este enlace es solo tuyo y sirve para que Xceed cuente tus ventas.</p>
      {event.rewards_conditions && <p className="small pre muted">{event.rewards_conditions}</p>}
      {part ? (
        <Link className="btn block" href={`/perfil#e-${slug}`}>
          {part.status === "pending" ? "Solicitud recibida · ver mi panel" : "Ver mi enlace y mis ventas"}
        </Link>
      ) : !event.rewards_open ? (
        <p className="muted">El programa está cerrado.</p>
      ) : user ? (
        <form action={joinProgram}>
          <input type="hidden" name="slug" value={slug} />
          <SubmitButton className="btn block" pendingText="Enviando…">Quiero compartir y ganar una invitación</SubmitButton>
        </form>
      ) : (
        <Link className="btn block" href={signup()}>Quiero compartir y ganar una invitación</Link>
      )}
    </section>
  ) : null;

  return (
    <div className="wrap wide">
      <Flash msg={sp.msg} err={sp.err} />
      <EventDetail event={event} top={top} actions={actions} extra={extra} />
      {listOpen && !request && <StickyJoin perk={event.guestlist_perk} count={count} />}
    </div>
  );
}
