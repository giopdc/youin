import Link from "next/link";
import type { EventRow } from "@/lib/types";
import { formatEventDate } from "@/lib/time";

export function EventCard({ event, href }: { event: EventRow; href?: string }) {
  const date = formatEventDate(event.starts_at, event.ends_at);
  const place = [event.venue, event.city].filter(Boolean).join(" · ");
  return (
    <Link href={href ?? `/eventos/${event.slug}`} className="card event-card">
      {event.poster_url && <img src={event.poster_url} alt="" loading="lazy" />}
      <div className="meta">
        {event.promoter && <div className="small muted">{event.promoter}</div>}
        <h2 style={{ marginBottom: 4 }}>{event.title}</h2>
        {date && <div className="small">{date}</div>}
        {place && <div className="small muted">{place}</div>}
      </div>
    </Link>
  );
}
