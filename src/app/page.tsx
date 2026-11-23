import { createClient } from "@/lib/supabase/server";
import { EventCard } from "@/components/EventCard";
import { Flash } from "@/components/Flash";
import { hasEnded } from "@/lib/time";
import { APP_TAGLINE } from "@/config/site";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("starts_at", { ascending: true });
  const events = ((data ?? []) as EventRow[]).filter((e) => !hasEnded(e));
  return (
    <div className="wrap">
      <Flash msg={sp.msg} err={sp.err} />
      <h1>Próximos eventos</h1>
      <p className="muted">{APP_TAGLINE}</p>
      {events.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0 }}>Pronto anunciaremos los próximos eventos</p>
        </div>
      ) : (
        <div>
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}
