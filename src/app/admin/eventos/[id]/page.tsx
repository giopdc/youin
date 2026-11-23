import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import type { EventRow } from "@/lib/types";
import { EventForm } from "../../EventForm";
import { EventTabs } from "../../EventTabs";
import { deleteDraft, setEventStatus, toggleEventFlag, updateEvent } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar evento" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> };

export default async function EditEvent({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const e = data as EventRow;
  const back = `/admin/eventos/${id}`;
  const missing = [!e.starts_at && "fecha y hora de inicio"].filter(Boolean);

  return (
    <div className="wrap">
      <EventTabs id={id} current="editar" />
      <Flash msg={sp.msg} err={sp.err} />
      <div className="card stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className={`status ${e.status === "published" ? "ok" : "warn"}`}>{e.status === "published" ? "Publicado" : "Borrador"}</span>
          {e.status === "published" && <Link className="small" href={`/eventos/${e.slug}`}>Ver ficha pública ↗</Link>}
        </div>
        <h1 style={{ margin: 0 }}>{e.title}</h1>
        {e.status === "draft" && missing.length > 0 && (
          <p className="small muted">Para publicar falta: {missing.join(", ")}.</p>
        )}
        <div className="row">
          <Link className="btn" href={`/admin/eventos/${id}/vista`}>Previsualizar</Link>
          <form action={setEventStatus}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="back" value={back} />
            {e.status === "draft" ? (
              <SubmitButton name="status" value="published" pendingText="Publicando…" confirm="¿Publicar este evento? Será visible para todo el mundo.">Publicar</SubmitButton>
            ) : (
              <SubmitButton className="btn" name="status" value="draft" pendingText="Retirando…" confirm="¿Retirar el evento? Dejará de ser visible y los enlaces /r/ mostrarán que no está disponible.">Volver a borrador</SubmitButton>
            )}
          </form>
        </div>
        {(e.guestlist_enabled || e.rewards_enabled) && (
          <div className="row">
            {e.guestlist_enabled && (
              <form action={toggleEventFlag}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="back" value={back} />
                <input type="hidden" name="flag" value="guestlist_open" />
                <input type="hidden" name="value" value={String(!e.guestlist_open)} />
                <SubmitButton className="btn sm">{e.guestlist_open ? "Cerrar lista" : "Reabrir lista"}</SubmitButton>
              </form>
            )}
            {e.rewards_enabled && (
              <form action={toggleEventFlag}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="back" value={back} />
                <input type="hidden" name="flag" value="rewards_open" />
                <input type="hidden" name="value" value={String(!e.rewards_open)} />
                <SubmitButton className="btn sm">{e.rewards_open ? "Cerrar programa de recompensas" : "Reabrir programa"}</SubmitButton>
              </form>
            )}
          </div>
        )}
        <p className="small muted">Cerrar impide nuevas solicitudes; quien ya está dentro lo conserva.</p>
      </div>

      <h2 style={{ marginTop: 24 }}>Editar</h2>
      <EventForm event={e} action={updateEvent} submitLabel={e.status === "published" ? "Guardar cambios (publicado)" : "Guardar borrador"} />

      {e.status === "draft" && (
        <form action={deleteDraft} style={{ marginTop: 24 }}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="back" value={back} />
          <SubmitButton className="btn danger" pendingText="Borrando…" confirm={`¿Borrar el borrador «${e.title}»? No se puede deshacer.`}>Borrar borrador</SubmitButton>
        </form>
      )}
    </div>
  );
}
