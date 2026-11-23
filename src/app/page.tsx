import Link from "next/link";
import { getSession } from "@/lib/auth";
import { EventCard } from "@/components/EventCard";
import { Flash } from "@/components/Flash";
import { hasEnded } from "@/lib/time";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase, user } = await getSession();
  const { data } = await supabase.from("events").select("*").eq("status", "published").order("starts_at", { ascending: true });
  const upcoming = ((data ?? []) as EventRow[]).filter((e) => !hasEnded(e));
  const saved = new Set<string>();
  if (user) {
    const { data: plans } = await supabase.from("saved_plans").select("event_id").eq("user_id", user.id);
    (plans ?? []).forEach((p: { event_id: string }) => saved.add(p.event_id));
  }
  const genres = [...new Set(upcoming.flatMap((e) => e.genres ?? []))].sort((a, b) => a.localeCompare(b, "es"));
  const musica = sp.musica && genres.includes(sp.musica) ? sp.musica : null;
  const list = musica ? upcoming.filter((e) => e.genres?.includes(musica)) : upcoming;
  const picks = musica ? [] : upcoming.filter((e) => e.recommendation);

  return (
    <div className="wrap wide">
      <Flash msg={sp.msg} err={sp.err} />
      <section className="hero">
        <span className="sticker">¿you in?</span>
        <h1>Tu próxima noche, <span className="accent">seleccionada</span>.</h1>
        <p>La agenda de música electrónica de Valencia que recomienda Gio. Mira qué suena, guarda tu plan y pregunta a quien quieras si se viene.</p>
      </section>

      {upcoming.length === 0 ? (
        <div className="card empty">
          <p className="big">Pronto anunciaremos los próximos eventos</p>
          <p className="muted">Estamos seleccionando las próximas noches. Vuelve en unos días.</p>
        </div>
      ) : (
        <>
          <ul className="paths" aria-label="Por dónde empezar">
            <li><strong>¿Primera vez?</strong> Empieza por las fiestas que recomienda Gio.</li>
            <li><strong>¿Ya conoces la escena?</strong> Filtra por el sonido que buscas.</li>
            <li><strong>¿Vas con gente?</strong> En cada fiesta, «¿Te vienes?» se la manda a quien quieras.</li>
          </ul>

          {picks.length > 0 && (
            <section aria-labelledby="gio">
              <h2 id="gio" className="section-title">Gio recomienda</h2>
              <div className="picks">
                {picks.map((e) => (
                  <Link key={e.id} href={`/eventos/${e.slug}`} className="pick">
                    <span className="pick-title">{e.title}</span>
                    <span className="pick-quote">«{e.recommendation}»</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {genres.length > 1 && (
            <nav className="tabs" aria-label="Filtrar por música">
              <Link href="/" aria-current={!musica ? "page" : undefined}>Toda la música</Link>
              {genres.map((g) => (
                <Link key={g} href={`/?musica=${encodeURIComponent(g)}`} aria-current={musica === g ? "page" : undefined}>{g}</Link>
              ))}
            </nav>
          )}

          <h2 className="section-title">{musica ? `Fiestas con ${musica}` : "Próximas fiestas"}</h2>
          {list.length === 0 ? (
            <div className="card empty">
              <p>Ahora mismo no hay fiestas de {musica}.</p>
              <Link className="btn" href="/">Ver toda la música</Link>
            </div>
          ) : (
            <div className="grid">
              {list.map((e) => <EventCard key={e.id} event={e} saved={saved.has(e.id)} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
