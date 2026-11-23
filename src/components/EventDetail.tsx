import type { EventRow } from "@/lib/types";
import { formatEventDate } from "@/lib/time";
import { lineupByStage, parsePrices } from "@/lib/event-text";
import { Poster } from "./Poster";

// Ficha, en este orden: cabecera, lista, programa de promotores, line-up por salas, tu plan y lo práctico.
export function EventDetail({
  event, top, program, actions, extra,
}: { event: EventRow; top?: React.ReactNode; program?: React.ReactNode; actions?: React.ReactNode; extra?: React.ReactNode }) {
  const date = formatEventDate(event.starts_at, event.ends_at);
  const stages = lineupByStage(event);
  const prices = parsePrices(event.price_text);
  const access = (event.access_conditions ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <article className="ficha">
      <div className="ficha-media desktop-only"><Poster event={event} size="hero" /></div>
      <div className="ficha-body">
        <header className="ficha-head">
          {event.promoter && <p className="kicker">{event.promoter}</p>}
          <h1>{event.title}</h1>
          <div className="facts-row">
            {date && <span>{date}</span>}
            {event.venue && <span>{event.venue}</span>}
            {event.min_age != null && <span>+{event.min_age}</span>}
          </div>
          {event.address && <p className="muted small" style={{ margin: 0 }}>{[event.address, event.city].filter(Boolean).join(", ")}</p>}
        </header>

        {top}
        {program}

        {stages.length > 0 && (
          <section aria-labelledby="lineup" className="lineup-block">
            <h2 id="lineup" className="block-title">Line-up</h2>
            <div className={`stages${stages.length > 1 ? " two" : ""}`}>
              {stages.map((s, i) => (
                <div className="stage" key={i}>
                  {(s.name || s.time) && (
                    <div className="stage-head">
                      {s.name && <span className="stage-name">{s.name}</span>}
                      {s.time && <span className="stage-time">{s.time}</span>}
                    </div>
                  )}
                  <ul className="lineup">{s.artists.map((a) => <li key={a}>{a}</li>)}</ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {event.recommendation && (
          <aside className="gio-note" aria-label="Por qué ir">
            <p className="kicker">Por qué ir</p>
            <p className="pre">{event.recommendation}</p>
          </aside>
        )}

        {actions}

        <div className="mobile-only"><Poster event={event} size="hero" /></div>

        {(prices.rows.length > 0 || access.length > 0 || event.description) && (
          <section className="info-grid" aria-label="Información">
            {prices.rows.length > 0 && (
              <div className="card">
                <h2 className="block-title">Entradas</h2>
                <table className="prices">
                  <tbody>
                    {prices.rows.map((r) => (
                      <tr key={r.label}><th scope="row">{r.label}</th><td>{r.value}</td></tr>
                    ))}
                  </tbody>
                </table>
                {prices.notes.map((n) => <p key={n} className="small muted" style={{ margin: "8px 0 0" }}>{n}</p>)}
              </div>
            )}
            {(access.length > 0 || event.description) && (
              <div className="card">
                <h2 className="block-title">Antes de ir</h2>
                {access.length > 0 && <ul className="checks">{access.map((a) => <li key={a}>{a}</li>)}</ul>}
                {event.description && <p className="pre small muted" style={{ margin: access.length ? "10px 0 0" : 0 }}>{event.description}</p>}
              </div>
            )}
          </section>
        )}
        {extra}
      </div>
    </article>
  );
}
