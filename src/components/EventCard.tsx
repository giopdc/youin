import Link from "next/link";
import type { EventRow } from "@/lib/types";
import { dateBadge, formatEventDate } from "@/lib/time";
import { placeLine, withArtists } from "@/lib/event-text";
import { Poster } from "./Poster";

export function EventCard({ event, href, saved }: { event: EventRow; href?: string; saved?: boolean }) {
  const date = formatEventDate(event.starts_at, event.ends_at);
  const artists = withArtists(event);
  const badge = dateBadge(event.starts_at);
  const perk = event.guestlist_enabled && event.guestlist_open && event.guestlist_perk;
  return (
    <Link href={href ?? `/eventos/${event.slug}`} className="event-card">
      <div className="media">
        <Poster event={event} />
        {badge && <span className="datechip" aria-hidden="true"><b>{badge.day}</b><span>{badge.month}</span></span>}
      </div>
      <div className="meta">
        <div className="row tight">
          {perk && <span className="badge perk">Lista: {perk.toLowerCase()}</span>}
          {saved && <span className="badge saved">En tus planes</span>}
          {!perk && !saved && event.recommendation && <span className="badge gio">Recomendada</span>}
        </div>
        <h2>{event.title}</h2>
        {artists && <p className="artists">con {artists}</p>}
        {date && <p className="small when">{date}</p>}
        <p className="small muted">{placeLine(event)}</p>
      </div>
    </Link>
  );
}
