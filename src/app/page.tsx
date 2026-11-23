import Link from "next/link";
import { getSession } from "@/lib/auth";
import { EventCard } from "@/components/EventCard";
import { Flash } from "@/components/Flash";
import { Poster } from "@/components/Poster";
import { Countdown } from "@/components/Countdown";
import { formatEventDate, hasEnded } from "@/lib/time";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase, user } = await getSession();
  const { data } = await supabase.from("events").select("*").eq("status", "published").order("starts_at", { ascending: true });
  const upcoming = ((data ?? []) as EventRow[]).filter((e) => !hasEnded(e));
  const saved = new Set<string>();
  const joined = new Set<string>();
  if (user) {
    const [{ data: plans }, { data: lists }] = await Promise.all([
      supabase.from("saved_plans").select("event_id").eq("user_id", user.id),
      supabase.from("guestlist_requests").select("event_id").eq("user_id", user.id),
    ]);
    (plans ?? []).forEach((p: { event_id: string }) => saved.add(p.event_id));
    (lists ?? []).forEach((p: { event_id: string }) => joined.add(p.event_id));
  }
  // La fiesta con lista abierta más próxima es la protagonista.
  const featured = upcoming.find((e) => e.guestlist_enabled && e.guestlist_open && e.guestlist_perk);
  let count = 0;
  if (featured) {
    const { data: c } = await supabase.rpc("guestlist_count", { p_event: featured.id });
    count = typeof c === "number" ? c : 0;
  }
  const rest = upcoming.filter((e) => e.id !== featured?.id);

  return (
    <div className="wrap wide">
      <Flash msg={sp.msg} err={sp.err} />
      <section className="hero">
        <span className="sticker">¿you in?</span>
        <h1>Tu próxima noche, <span className="accent">seleccionada</span>.</h1>
        <p>La agenda de música electrónica de Valencia. Apúntate a la lista, guarda tu plan y pregunta a quien quieras: ¿te vienes?</p>
      </section>

      {upcoming.length === 0 ? (
        <div className="card empty">
          <p className="big">Pronto anunciaremos los próximos eventos</p>
          <p className="muted">Estamos seleccionando las próximas noches. Vuelve en unos días.</p>
        </div>
      ) : (
        <>
          {featured && (
            <section className="featured" aria-labelledby="destacada">
              <Link href={`/eventos/${featured.slug}`} className="featured-media" tabIndex={-1} aria-hidden="true">
                <Poster event={featured} />
              </Link>
              <div className="featured-body">
                <p className="kicker">Lista abierta</p>
                <h2 id="destacada" className="featured-perk">{featured.guestlist_perk}</h2>
                <p className="featured-title"><Link href={`/eventos/${featured.slug}`}>{featured.title}</Link></p>
                <p className="when">{formatEventDate(featured.starts_at, featured.ends_at)} · {featured.venue}</p>
                {featured.starts_at && <Countdown to={featured.starts_at} label="Empieza en" />}
                <p className="hook-count">{count > 0 ? <><b>{count}</b> {count === 1 ? "persona ya está apuntada" : "personas ya están apuntadas"}</> : "Sé de los primeros en apuntarte"}</p>
                {joined.has(featured.id) ? (
                  <Link className="btn primary big" href={`/eventos/${featured.slug}#lista`}>Ya estás dentro · invita a alguien</Link>
                ) : (
                  <Link className="btn invite big" href={`/eventos/${featured.slug}?lista=1#lista`}>Apúntame gratis</Link>
                )}
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <>
              <h2 className="section-title">{featured ? "Más noches" : "Próximas fiestas"}</h2>
              <div className="grid">
                {rest.map((e) => <EventCard key={e.id} event={e} saved={saved.has(e.id)} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
