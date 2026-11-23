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
        <EventDetail event={e}>
          {(e.guestlist_enabled || e.ticket_url || e.rewards_enabled) && (
            <section className="card" aria-label="Acciones (vista previa)">
              {e.guestlist_enabled && (
                <div className="action">
                  <h2>Lista</h2>
                  {e.guestlist_conditions && <p className="small pre muted">{e.guestlist_conditions}</p>}
                  <span className="btn primary block" aria-disabled="true">{e.guestlist_open ? "Apuntarme a la lista" : "La lista está cerrada"}</span>
                </div>
              )}
              {e.ticket_url && (
                <div className="action">
                  <h2>Entradas</h2>
                  <span className="btn primary block" aria-disabled="true">Comprar entrada</span>
                  <p className="small muted" style={{ marginTop: 6 }}>Abre: {e.ticket_url}</p>
                </div>
              )}
              {e.rewards_enabled && (
                <div className="action">
                  <h2>Comparte y gana</h2>
                  <p className="small">Por cada {e.reward_threshold} entradas confirmadas que se vendan con tu enlace consigues 1 invitación personal{e.reward_cap ? ` (máximo ${e.reward_cap} por persona)` : ""}.</p>
                  {e.rewards_conditions && <p className="small pre muted">{e.rewards_conditions}</p>}
                  <span className="btn block" aria-disabled="true">{e.rewards_open ? "Quiero compartir y ganar una invitación" : "El programa está cerrado"}</span>
                </div>
              )}
            </section>
          )}
        </EventDetail>
      </div>
    </div>
  );
}
