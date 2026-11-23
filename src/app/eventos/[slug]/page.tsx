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
import { hasEnded } from "@/lib/time";
import { inviteText, shareDescription } from "@/lib/event-text";
import { APP_NAME, siteUrl } from "@/config/site";
import type { EventRow, GuestlistRow, ParticipationSummary, SavedPlan } from "@/lib/types";
import { joinProgram, requestGuestlist, savePlan } from "./actions";

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
      type: "website",
      siteName: APP_NAME,
      locale: "es_ES",
      title: `¿Te vienes? ${e.title}`,
      description,
      url,
      ...(e.poster_url ? { images: [{ url: e.poster_url, alt: `Cartel de ${e.title}` }] } : {}),
    },
    twitter: { card: e.poster_url ? "summary_large_image" : "summary", title: `¿Te vienes? ${e.title}`, description },
  };
}

export default async function EventPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { supabase, user } = await getSession();
  const event = await loadEvent(slug);
  if (!event) notFound();
  const ended = hasEnded(event);
  const url = `${siteUrl()}/eventos/${slug}`;

  let request: GuestlistRow | null = null;
  let part: ParticipationSummary | null = null;
  let plan: SavedPlan | null = null;
  if (user) {
    const [{ data: r }, { data: p }, { data: pl }] = await Promise.all([
      supabase.from("guestlist_requests").select("*").eq("event_id", event.id).eq("user_id", user.id).maybeSingle(),
      supabase.from("participation_summary").select("*").eq("event_id", event.id).eq("user_id", user.id).maybeSingle(),
      supabase.from("saved_plans").select("*").eq("event_id", event.id).eq("user_id", user.id).maybeSingle(),
    ]);
    request = r as GuestlistRow | null;
    part = p as ParticipationSummary | null;
    plan = pl as SavedPlan | null;
  }
  const signup = (intent?: string) =>
    `/registro?next=${encodeURIComponent(`/eventos/${slug}${intent ? `?plan=${intent}` : ""}`)}`;
  const autoSave = user && !plan && sp.plan === "guardar" && !ended;

  const actions = ended ? (
    <div className="notice warn">Esta fiesta ya ha terminado. <Link href="/">Mira las próximas</Link>.</div>
  ) : (
    <section className="card plan" id="plan" aria-labelledby="tu-plan">
      <h2 id="tu-plan">Tu plan</h2>
      {autoSave && <AutoSavePlan slug={slug} />}
      <InviteFriend url={url} title={event.title} defaultText={inviteText(event)} compact />
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
        {event.ticket_url && (
          <a className="btn sun" href={event.ticket_url} target="_blank" rel="noopener noreferrer">Comprar entrada</a>
        )}
      </div>
      {event.ticket_url && <p className="small muted" style={{ margin: 0 }}>La entrada se compra en Xceed.</p>}
      {!user && <p className="small muted" style={{ margin: 0 }}>Para guardar el plan te pediremos nombre y correo, y volverás aquí.</p>}
    </section>
  );

  const extra = !ended && (event.guestlist_enabled || event.rewards_enabled) ? (
    <>
      {event.guestlist_enabled && (
        <section className="card" id="lista" aria-labelledby="h-lista">
          <h2 id="h-lista">Lista</h2>
          {event.guestlist_conditions && <p className="small pre muted">{event.guestlist_conditions}</p>}
          {request ? (
            request.status === "confirmed" ? <span className="status ok">Estás en la lista</span>
            : request.status === "rejected" ? <span className="status danger">Tu solicitud no ha sido aceptada</span>
            : <span className="status warn">Solicitud recibida</span>
          ) : !event.guestlist_open ? (
            <p className="muted">La lista está cerrada.</p>
          ) : user ? (
            <form action={requestGuestlist}>
              <input type="hidden" name="slug" value={slug} />
              <SubmitButton className="btn primary block" pendingText="Enviando…">Apuntarme a la lista</SubmitButton>
            </form>
          ) : (
            <Link className="btn primary block" href={signup()}>Apuntarme a la lista</Link>
          )}
          <p className="small muted" style={{ marginTop: 8 }}>Pedir lista no es acceso confirmado: te avisamos aquí cuando Gio la confirme.</p>
        </section>
      )}
      {event.rewards_enabled && (
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
      )}
    </>
  ) : null;

  return (
    <div className="wrap wide">
      <Flash msg={sp.msg} err={sp.err} />
      <EventDetail event={event} actions={actions} extra={extra} />
    </div>
  );
}
