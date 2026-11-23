import type { EventRow } from "@/lib/types";
import { formatEventDate } from "@/lib/time";
import { artistList } from "@/lib/event-text";
import { Poster } from "./Poster";

// Ficha: primero la música y la recomendación, luego las acciones y por último la información práctica.
export function EventDetail({ event, actions, extra }: { event: EventRow; actions?: React.ReactNode; extra?: React.ReactNode }) {
  const date = formatEventDate(event.starts_at, event.ends_at);
  const place = [event.venue, event.address, event.city].filter(Boolean).join(", ");
  const artists = artistList(event);
  return (
    <article className="ficha">
      <div className="ficha-media desktop-only"><Poster event={event} size="hero" /></div>
      <div className="ficha-body stack">
        <header>
          {event.promoter && <p className="kicker">{event.promoter}</p>}
          <h1>{event.title}</h1>
          {date && <p className="when-big">{date}</p>}
          {place && <p className="muted">{place}</p>}
        </header>

        {(event.genres?.length > 0 || artists.length > 0) && (
          <section className="card music" aria-labelledby="musica">
            <h2 id="musica">Qué suena</h2>
            {event.genres?.length > 0 && (
              <ul className="genres">{event.genres.map((g) => <li key={g}>{g}</li>)}</ul>
            )}
            {artists.length > 0 && (
              <ul className="lineup">{artists.map((a) => <li key={a}>{a}</li>)}</ul>
            )}
          </section>
        )}

        {event.recommendation && (
          <aside className="gio-note" aria-label="Recomendación de Gio">
            <p className="kicker">Gio recomienda</p>
            <p className="pre">{event.recommendation}</p>
          </aside>
        )}

        {actions}

        <div className="mobile-only"><Poster event={event} size="hero" /></div>

        {event.description && (
          <section className="card">
            <h2>La fiesta</h2>
            <p className="pre" style={{ margin: 0 }}>{event.description}</p>
          </section>
        )}
        {(event.price_text || event.min_age != null || event.access_conditions) && (
          <section className="card">
            <h2>Antes de ir</h2>
            <dl className="facts">
              {event.price_text && (<><dt>Precio</dt><dd className="pre">{event.price_text}</dd></>)}
              {event.min_age != null && (<><dt>Edad mínima</dt><dd>{event.min_age} años</dd></>)}
              {event.access_conditions && (<><dt>Acceso</dt><dd className="pre">{event.access_conditions}</dd></>)}
            </dl>
          </section>
        )}
        {extra}
      </div>
    </article>
  );
}
