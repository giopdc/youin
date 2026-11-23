import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { formatShort } from "@/lib/time";
import type { Profile } from "@/lib/types";
import { EventTabs } from "../../../EventTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invitaciones enviadas" };

type Log = { id: number; user_id: string; channel: string; message: string | null; created_at: string };
const CH: Record<string, string> = { whatsapp: "WhatsApp", share: "Compartir del móvil", copy: "Copiado" };

export default async function Invites({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: ev } = await supabase.from("events").select("title").eq("id", id).maybeSingle();
  if (!ev) notFound();
  const { data } = await supabase.from("invite_logs").select("*").eq("event_id", id).order("created_at", { ascending: false }).limit(500);
  const logs = (data ?? []) as Log[];
  const ids = [...new Set(logs.map((l) => l.user_id))];
  const { data: profs } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
  const people = new Map(((profs ?? []) as Profile[]).map((p) => [p.id, p]));
  const byPerson = ids.map((u) => ({ u, n: logs.filter((l) => l.user_id === u).length })).sort((a, b) => b.n - a.n);
  return (
    <div className="wrap">
      <EventTabs id={id} current="invitaciones" />
      <h1>Invitaciones enviadas · {ev.title}</h1>
      <p className="small muted">Cada vez que alguien con sesión iniciada pulsa «Enviar por WhatsApp», «Más opciones» o «Copiar» en «¿Te vienes?». No sabemos si el mensaje llegó a enviarse: es la intención de invitar.</p>
      <div className="kpis">
        <div className="kpi"><b>{logs.length}</b><span>invitaciones</span></div>
        <div className="kpi"><b>{ids.length}</b><span>personas invitando</span></div>
      </div>
      {byPerson.length > 0 && (
        <section className="card">
          <h2>Quién invita más</h2>
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {byPerson.slice(0, 10).map(({ u, n }) => <li key={u}><strong>{people.get(u)?.full_name ?? "—"}</strong> · {n}</li>)}
          </ol>
        </section>
      )}
      {logs.length === 0 ? (
        <div className="card empty" style={{ marginTop: 12 }}><p className="big">Todavía no hay invitaciones</p></div>
      ) : (
        logs.map((l) => (
          <div className="card" key={l.id}>
            <div className="small muted">{formatShort(l.created_at)} · {CH[l.channel] ?? l.channel}</div>
            <strong>{people.get(l.user_id)?.full_name ?? "—"}</strong> <span className="small muted">{people.get(l.user_id)?.email}</span>
            {l.message && <p className="pre" style={{ margin: "6px 0 0" }}>«{l.message}»</p>}
          </div>
        ))
      )}
    </div>
  );
}
