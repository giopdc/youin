import Link from "next/link";
import type { EventRow } from "@/lib/types";
import { formatEventDate } from "@/lib/time";
import { placeLine, withArtists } from "@/lib/event-text";
import { Poster } from "./Poster";

export function EventCard({ event, href, saved }: { event: EventRow; href?: string; saved?: boolean }) {
  const date = formatEventDate(event.starts_at, event.ends_at);
  const artists = withArtists(event);
  return (
    <Link href={href ?? `/eventos/${event.slug}`} className="event-card">
      <Poster event={event} />
      <div className="meta">
        <div className="row tight">
          {event.recommendation && <span className="badge gio">Recomendada por Gio</span>}
          {saved && <span className="badge saved">En tus planes</span>}
        </div>
        <h2>{event.title}</h2>
        {event.genres?.length > 0 && (
          <ul className="genres" aria-label="Música">
            {event.genres.slice(0, 3).map((g) => <li key={g}>{g}</li>)}
          </ul>
        )}
        {artists && <p className="artists">con {artists}</p>}
        {date && <p className="small when">{date}</p>}
        <p className="small muted">{placeLine(event)}</p>
      </div>
    </Link>
  );
}
