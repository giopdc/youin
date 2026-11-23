import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { EventDetail } from "@/components/EventDetail";
import type { EventRow } from "@/lib/types";
import { EventTabs } from "../../../EventTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vista previa" };

export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const e = data as EventRow;
  return (
    <div className="wrap">
      <EventTabs id={id} current="vista" />
      <p className="banner">Vista previa{e.status === "draft" ? " · borrador, no visible al público" : ""}</p>
      <div style={{ marginTop: 16 }}>
        <EventDetail
          event={e}
          actions={
            <section className="card plan" aria-label="Acciones (vista previa)">
              <h2>Tu plan</h2>
              <span className="btn invite block" aria-disabled="true">¿Te vienes? Invita a alguien</span>
              <div className="row">
                <span className="btn" aria-disabled="true">Guardar plan</span>
                {e.ticket_url && <span className="btn sun" aria-disabled="true">Comprar entrada</span>}
              </div>
              {e.ticket_url && <p className="small muted" style={{ margin: 0 }}>Abre: {e.ticket_url}</p>}
            </section>
          }
          extra={
            <>
              {e.guestlist_enabled && (
                <section className="card">
                  <h2>Lista</h2>
                  {e.guestlist_conditions && <p className="small pre muted">{e.guestlist_conditions}</p>}
                  <span className="btn primary block" aria-disabled="true">{e.guestlist_open ? "Apuntarme a la lista" : "La lista está cerrada"}</span>
                </section>
              )}
              {e.rewards_enabled && (
                <section className="card promo">
                  <p className="kicker">Programa de promotores · opcional</p>
                  <h2>Vende entradas y gana una invitación</h2>
                  <p className="small">Por cada {e.reward_threshold} entradas válidas vendidas con tu enlace personal consigues 1 invitación{e.reward_cap ? ` (máximo ${e.reward_cap} por persona)` : ""}.</p>
                  {e.rewards_conditions && <p className="small pre muted">{e.rewards_conditions}</p>}
                  <span className="btn block" aria-disabled="true">{e.rewards_open ? "Quiero compartir y ganar una invitación" : "El programa está cerrado"}</span>
                </section>
              )}
            </>
          }
        />
      </div>
    </div>
  );
}
