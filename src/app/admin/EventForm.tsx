import type { EventRow } from "@/lib/types";
import { madridParts } from "@/lib/time";
import { SubmitButton } from "@/components/SubmitButton";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="lbl">{label}</span>
      {children}
      {hint && <span className="small muted">{hint}</span>}
    </label>
  );
}

export function EventForm({ event, action, submitLabel }: { event?: EventRow; action: (fd: FormData) => Promise<void>; submitLabel: string }) {
  const s = madridParts(event?.starts_at ?? null);
  const e = madridParts(event?.ends_at ?? null);
  return (
    <form action={action} className="stack" encType="multipart/form-data">
      {event && <input type="hidden" name="id" value={event.id} />}
      <fieldset className="stack">
        <legend>Datos básicos</legend>
        <Field label="Título *"><input type="text" name="title" required defaultValue={event?.title} maxLength={160} /></Field>
        <Field label="Promotora"><input type="text" name="promoter" defaultValue={event?.promoter ?? ""} placeholder="Elenco, The Basement…" /></Field>
        <div className="grid2">
          <Field label="Fecha" hint="Hora de Madrid. Obligatoria para publicar."><input type="date" name="date" defaultValue={s.date} /></Field>
          <div className="grid2">
            <Field label="Inicio"><input type="time" name="start_time" defaultValue={s.time} /></Field>
            <Field label="Fin" hint="Si es antes del inicio, se entiende al día siguiente."><input type="time" name="end_time" defaultValue={e.time} /></Field>
          </div>
        </div>
        <div className="grid2">
          <Field label="Sala"><input type="text" name="venue" defaultValue={event?.venue ?? ""} /></Field>
          <Field label="Ciudad"><input type="text" name="city" defaultValue={event?.city ?? "Valencia"} /></Field>
        </div>
        <Field label="Dirección"><input type="text" name="address" defaultValue={event?.address ?? ""} /></Field>
      </fieldset>

      <fieldset className="stack">
        <legend>Cartel y contenido</legend>
        {event?.poster_url && (
          <div className="stack">
            <img src={event.poster_url} alt="Cartel actual" style={{ maxHeight: 200, width: "auto", borderRadius: 8 }} />
            <label className="check"><input type="checkbox" name="remove_poster" /> Quitar cartel</label>
          </div>
        )}
        <Field label="Subir cartel" hint="JPG, PNG o WebP, máximo 5 MB."><input type="file" name="poster_file" accept="image/jpeg,image/png,image/webp,image/gif" /></Field>
        <Field label="…o dirección del cartel (https)"><input type="url" name="poster_url" defaultValue={event?.poster_url ?? ""} /></Field>
        <Field label="Descripción"><textarea name="description" defaultValue={event?.description ?? ""} /></Field>
        <Field label="Por qué ir (opcional)" hint="Una frase que anime a venir. Sale en la ficha y marca la fiesta como «Recomendada»."><textarea name="recommendation" defaultValue={event?.recommendation ?? ""} maxLength={400} /></Field>
        <Field label="Artistas" hint="Uno por línea."><textarea name="artists" defaultValue={event?.artists ?? ""} /></Field>
        <div className="grid2">
          <Field label="Precio o texto de precios"><textarea name="price_text" defaultValue={event?.price_text ?? ""} style={{ minHeight: 60 }} /></Field>
          <Field label="Edad mínima"><input type="number" name="min_age" min={0} max={99} inputMode="numeric" defaultValue={event?.min_age ?? ""} /></Field>
        </div>
        <Field label="Condiciones de acceso"><textarea name="access_conditions" defaultValue={event?.access_conditions ?? ""} /></Field>
      </fieldset>

      <fieldset className="stack">
        <legend>Comprar entrada</legend>
        <Field label="Enlace oficial de venta en Xceed" hint="Solo https://xceed.me/… Si lo dejas vacío no aparece el botón «Comprar entrada». Puedes usar aquí tu enlace general de promotor.">
          <input type="url" name="ticket_url" defaultValue={event?.ticket_url ?? ""} placeholder="https://xceed.me/…" pattern="https://([A-Za-z0-9\-]+\.)*[Xx][Cc][Ee][Ee][Dd]\.[Mm][Ee](/.*)?" title="Debe ser un enlace https de xceed.me" />
        </Field>
      </fieldset>

      <fieldset className="stack">
        <legend>Lista</legend>
        <label className="check"><input type="checkbox" name="guestlist_enabled" defaultChecked={event?.guestlist_enabled ?? false} /> Mostrar «Apuntarme a la lista»</label>
        <label className="check"><input type="checkbox" name="guestlist_open" defaultChecked={event?.guestlist_open ?? true} /> Lista abierta a nuevas solicitudes</label>
        <label className="check"><input type="checkbox" name="guestlist_auto_confirm" defaultChecked={event?.guestlist_auto_confirm ?? false} /> Confirmar al momento (sin revisar una a una)</label>
        <Field label="Ventaja de la lista" hint="Corta y clara. Sale en grande en portada y ficha. Ej.: Gratis hasta las 21:30"><input type="text" name="guestlist_perk" maxLength={80} defaultValue={event?.guestlist_perk ?? ""} /></Field>
        <Field label="Condiciones de la lista" hint="Se muestran junto al botón."><textarea name="guestlist_conditions" defaultValue={event?.guestlist_conditions ?? ""} /></Field>
      </fieldset>

      <fieldset className="stack">
        <legend>Compartir y ganar (recompensas)</legend>
        <label className="check"><input type="checkbox" name="rewards_enabled" defaultChecked={event?.rewards_enabled ?? false} /> Mostrar «Quiero compartir y ganar una invitación»</label>
        <label className="check"><input type="checkbox" name="rewards_open" defaultChecked={event?.rewards_open ?? true} /> Programa abierto a nuevas inscripciones</label>
        <div className="grid2">
          <Field label="Entradas por invitación"><input type="number" name="reward_threshold" min={1} required inputMode="numeric" defaultValue={event?.reward_threshold ?? 5} /></Field>
          <Field label="Límite de invitaciones por persona" hint="Vacío = sin límite."><input type="number" name="reward_cap" min={1} inputMode="numeric" defaultValue={event?.reward_cap ?? ""} /></Field>
        </div>
        <Field label="Condiciones de las recompensas"><textarea name="rewards_conditions" defaultValue={event?.rewards_conditions ?? ""} /></Field>
      </fieldset>

      <SubmitButton className="btn primary block">{submitLabel}</SubmitButton>
    </form>
  );
}
