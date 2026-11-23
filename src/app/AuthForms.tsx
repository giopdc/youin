"use client";
import Link from "next/link";
import { useActionState } from "react";
import { requestReset, signIn, signUp, updatePassword, type FormState } from "./auth-actions";
import { SubmitButton } from "@/components/SubmitButton";

function Notice({ state }: { state: FormState }) {
  if (state.error) return <div className="notice err" role="alert">{state.error}</div>;
  if (state.ok) return <div className="notice ok" role="status">{state.ok}</div>;
  return null;
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUp, {});
  if (state.ok) return <Notice state={state} />;
  return (
    <form action={action} className="stack">
      <Notice state={state} />
      <input type="hidden" name="next" value={next} />
      <label><span className="lbl">Nombre</span>
        <input type="text" name="name" required autoComplete="name" maxLength={120} defaultValue={state.values?.name} />
      </label>
      <label><span className="lbl">Correo</span>
        <input type="email" name="email" required autoComplete="email" inputMode="email" defaultValue={state.values?.email} />
      </label>
      <label><span className="lbl">Contraseña (mínimo 8 caracteres)</span>
        <input type="password" name="password" required minLength={8} autoComplete="new-password" />
      </label>
      <SubmitButton className="btn primary block" pendingText="Creando cuenta…">Crear cuenta</SubmitButton>
      <p className="small muted">¿Ya tienes cuenta? <Link href={`/acceso?next=${encodeURIComponent(next)}`}>Entra</Link></p>
    </form>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, {});
  return (
    <form action={action} className="stack">
      <Notice state={state} />
      <input type="hidden" name="next" value={next} />
      <label><span className="lbl">Correo</span>
        <input type="email" name="email" required autoComplete="email" inputMode="email" defaultValue={state.values?.email} />
      </label>
      <label><span className="lbl">Contraseña</span>
        <input type="password" name="password" required autoComplete="current-password" />
      </label>
      <SubmitButton className="btn primary block" pendingText="Entrando…">Entrar</SubmitButton>
      <p className="small"><Link href="/recuperar">He olvidado mi contraseña</Link></p>
      <p className="small muted">¿No tienes cuenta? <Link href={`/registro?next=${encodeURIComponent(next)}`}>Regístrate</Link></p>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(requestReset, {});
  if (state.ok) return <Notice state={state} />;
  return (
    <form action={action} className="stack">
      <Notice state={state} />
      <label><span className="lbl">Correo de tu cuenta</span>
        <input type="email" name="email" required autoComplete="email" inputMode="email" defaultValue={state.values?.email} />
      </label>
      <SubmitButton className="btn primary block" pendingText="Enviando…">Enviar enlace</SubmitButton>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState(updatePassword, {});
  return (
    <form action={action} className="stack">
      <Notice state={state} />
      <label><span className="lbl">Contraseña nueva (mínimo 8 caracteres)</span>
        <input type="password" name="password" required minLength={8} autoComplete="new-password" />
      </label>
      <SubmitButton className="btn primary block">Guardar contraseña</SubmitButton>
    </form>
  );
}
