import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { NewPasswordForm } from "../AuthForms";

export const metadata = { title: "Contraseña nueva" };

export default async function Page() {
  const { user } = await getSession();
  if (!user) redirect("/recuperar");
  return (
    <div className="wrap" style={{ maxWidth: 440 }}>
      <h1>Elige una contraseña nueva</h1>
      <NewPasswordForm />
    </div>
  );
}
