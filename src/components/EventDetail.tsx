import type { EventRow } from "@/lib/types";
import { formatEventDate } from "@/lib/time";

// Ficha pública. Los campos opcionales vacíos no se muestran.
export function EventDetail({ event, children }: { event: EventRow; children?: React.ReactNode }) {
  const date = formatEventDate(event.starts_at, event.ends_at);
  const place = [event.venue, event.address, event.city].filter(Boolean).join(", ");
  const artists = (event.artists ?? "").split("\n").map((a) => a.trim()).filter(Boolean);
  return (
    <article className="stack">
      {event.poster_url && <img className="poster" src={event.poster_url} alt={`Cartel de ${event.title}`} />}
      <div>
        {event.promoter && <div className="muted">{event.promoter}</div>}
        <h1>{event.title}</h1>
        {date && <p style={{ fontWeight: 600 }}>{date}</p>}
        {place && <p className="muted">{place}</p>}
      </div>
      {children}
      {artists.length > 0 && (
        <section className="card">
          <h2>Artistas</h2>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {artists.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      )}
      {event.description && (
        <section className="card">
          <h2>Información</h2>
          <p className="pre">{event.description}</p>
        </section>
      )}
      {(event.price_text || event.min_age != null || event.access_conditions) && (
        <section className="card">
          <dl className="facts">
            {event.price_text && (
              <>
                <dt>Precio</dt>
                <dd className="pre">{event.price_text}</dd>
              </>
            )}
            {event.min_age != null && (
              <>
                <dt>Edad mínima</dt>
                <dd>{event.min_age} años</dd>
              </>
            )}
            {event.access_conditions && (
              <>
                <dt>Acceso</dt>
                <dd className="pre">{event.access_conditions}</dd>
              </>
            )}
          </dl>
        </section>
      )}
    </article>
  );
}
