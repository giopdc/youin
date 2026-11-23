import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { EventDetail } from "@/components/EventDetail";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { hasEnded } from "@/lib/time";
import type { EventRow, GuestlistRow, ParticipationSummary } from "@/lib/types";
import { joinProgram, requestGuestlist } from "./actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { supabase } = await getSession();
  const { data } = await supabase.from("events").select("title").eq("slug", slug).maybeSingle();
  return { title: data?.title ?? "Evento" };
}

export default async function EventPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { supabase, user } = await getSession();
  const { data } = await supabase.from("events").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!data) notFound();
  const event = data as EventRow;
  const ended = hasEnded(event);

  let request: GuestlistRow | null = null;
  let part: ParticipationSummary | null = null;
  if (user) {
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from("guestlist_requests").select("*").eq("event_id", event.id).eq("user_id", user.id).maybeSingle(),
      supabase.from("participation_summary").select("*").eq("event_id", event.id).eq("user_id", user.id).maybeSingle(),
    ]);
    request = r as GuestlistRow | null;
    part = p as ParticipationSummary | null;
  }
  const signup = `/registro?next=${encodeURIComponent(`/eventos/${slug}`)}`;
  const hasActions = event.guestlist_enabled || !!event.ticket_url || event.rewards_enabled;

  return (
    <div className="wrap">
      <Flash msg={sp.msg} err={sp.err} />
      <EventDetail event={event}>
        {ended && <div className="notice warn">Esta fiesta ya ha terminado.</div>}
        {hasActions && !ended && (
          <section className="card" aria-label="Acciones">
            {event.guestlist_enabled && (
              <div className="action" id="lista">
                <h2>Lista</h2>
                {event.guestlist_conditions && <p className="small pre muted">{event.guestlist_conditions}</p>}
                {request ? (
                  <GuestlistStatus status={request.status} />
                ) : !event.guestlist_open ? (
                  <p className="muted">La lista está cerrada.</p>
                ) : user ? (
                  <form action={requestGuestlist}>
                    <input type="hidden" name="slug" value={slug} />
                    <SubmitButton className="btn primary block" pendingText="Enviando…">Apuntarme a la lista</SubmitButton>
                  </form>
                ) : (
                  <Link className="btn primary block" href={signup}>Apuntarme a la lista</Link>
                )}
              </div>
            )}

            {event.ticket_url && (
              <div className="action">
                <h2>Entradas</h2>
                <a className="btn sun block" href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                  Comprar entrada
                </a>
                <p className="small muted" style={{ marginTop: 6 }}>La compra se realiza en Xceed.</p>
              </div>
            )}

            {event.rewards_enabled && (
              <div className="action" id="programa">
                <h2>Comparte y gana</h2>
                <p className="small">
                  Por cada {event.reward_threshold} entradas confirmadas que se vendan con tu enlace consigues 1 invitación personal
                  {event.reward_cap ? ` (máximo ${event.reward_cap} por persona)` : ""}.
                </p>
                {event.rewards_conditions && <p className="small pre muted">{event.rewards_conditions}</p>}
                {part ? (
                  <>
                    <p className="small">
                      {part.status === "pending"
                        ? "Hemos recibido tu solicitud. Tu enlace aparecerá aquí cuando esté listo"
                        : part.status === "active"
                          ? `Tu enlace está activo. Entradas confirmadas: ${part.confirmed_tickets}`
                          : "Tu enlace está desactivado"}
                    </p>
                    <Link className="btn block" href={`/perfil#e-${slug}`}>Ver mi panel</Link>
                  </>
                ) : !event.rewards_open ? (
                  <p className="muted">El programa está cerrado.</p>
                ) : user ? (
                  <form action={joinProgram}>
                    <input type="hidden" name="slug" value={slug} />
                    <SubmitButton className="btn block" pendingText="Enviando…">Quiero compartir y ganar una invitación</SubmitButton>
                  </form>
                ) : (
                  <Link className="btn block" href={signup}>Quiero compartir y ganar una invitación</Link>
                )}
              </div>
            )}
            {!user && (event.guestlist_enabled || event.rewards_enabled) && (
              <p className="small muted action">
                Para apuntarte o participar necesitas una cuenta. <Link href={`/acceso?next=${encodeURIComponent(`/eventos/${slug}`)}`}>¿Ya tienes una? Entra</Link>.
              </p>
            )}
          </section>
        )}
      </EventDetail>
    </div>
  );
}

function GuestlistStatus({ status }: { status: GuestlistRow["status"] }) {
  if (status === "confirmed") return <p><span className="status ok">Estás en la lista</span></p>;
  if (status === "rejected") return <p><span className="status danger">Tu solicitud no ha sido aceptada</span></p>;
  return <p><span className="status warn">Solicitud recibida</span></p>;
}
