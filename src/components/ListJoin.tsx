"use client";
import Link from "next/link";
import { useActionState } from "react";
import { joinListQuick, type JoinState } from "@/app/eventos/[slug]/actions";
import { SubmitButton } from "./SubmitButton";

// Apuntarse a la lista en un solo paso. Con sesión: solo el móvil. Sin sesión: nombre, correo, móvil y contraseña.
export function ListJoin({ slug, loggedIn, perk, defaultPhone }: { slug: string; loggedIn: boolean; perk: string | null; defaultPhone?: string }) {
  const [state, action] = useActionState<JoinState, FormData>(joinListQuick, {});
  if (state.sent) return <div className="notice ok" role="status"><b>¡Casi dentro!</b> {state.sent}</div>;
  return (
    <form action={action} className="stack list-form">
      {state.error && (
        <div className="notice err" role="alert">
          {state.error}{" "}
          {/Ya tienes cuenta/.test(state.error) && <Link href={`/acceso?next=${encodeURIComponent(`/eventos/${slug}?lista=1#lista`)}`}>Entrar</Link>}
        </div>
      )}
      <input type="hidden" name="slug" value={slug} />
      {!loggedIn && (
        <div className="grid2">
          <label><span className="lbl">Nombre</span><input type="text" name="name" required autoComplete="name" defaultValue={state.values?.name} /></label>
          <label><span className="lbl">Correo</span><input type="email" name="email" required autoComplete="email" inputMode="email" defaultValue={state.values?.email} /></label>
        </div>
      )}
      <div className="grid2">
        <label><span className="lbl">Móvil</span>
          <input type="tel" name="phone" required autoComplete="tel" inputMode="tel" placeholder="600 000 000" pattern="\+?[0-9 ]{9,20}" defaultValue={state.values?.phone ?? defaultPhone} />
        </label>
        {!loggedIn && (
          <label><span className="lbl">Contraseña (para ver tu plan luego)</span><input type="password" name="password" required minLength={8} autoComplete="new-password" /></label>
        )}
      </div>
      <label className="check"><input type="checkbox" name="consent" /> Avisadme por WhatsApp de las próximas fiestas</label>
      <SubmitButton className="btn invite block big" pendingText="Apuntándote…">{perk ? `Apúntame · ${perk.toLowerCase()}` : "Apúntame a la lista"}</SubmitButton>
      <p className="small muted" style={{ margin: 0 }}>
        Usamos tu nombre, correo y móvil solo para gestionar la lista de esta fiesta{!loggedIn ? ". ¿Ya tienes cuenta? " : "."}
        {!loggedIn && <Link href={`/acceso?next=${encodeURIComponent(`/eventos/${slug}?lista=1#lista`)}`}>Entra</Link>}
      </p>
    </form>
  );
}
