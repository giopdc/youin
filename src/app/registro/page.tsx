import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { safeNext } from "@/lib/nav";
import { SignUpForm } from "../AuthForms";

export const metadata = { title: "Crear cuenta" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const next = safeNext((await searchParams).next);
  const { user } = await getSession();
  if (user) redirect(next);
  return (
    <div className="wrap" style={{ maxWidth: 440 }}>
      <h1>Crear cuenta</h1>
      <p className="muted">Con tu cuenta puedes apuntarte a listas y participar en las recompensas.</p>
      <SignUpForm next={next} />
    </div>
  );
}
