import { ResetForm } from "../AuthForms";

export const metadata = { title: "Recuperar acceso" };

export default function Page() {
  return (
    <div className="wrap" style={{ maxWidth: 440 }}>
      <h1>Recuperar acceso</h1>
      <p className="muted">Te enviaremos un enlace para elegir una contraseña nueva.</p>
      <ResetForm />
    </div>
  );
}
