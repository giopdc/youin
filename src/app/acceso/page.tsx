import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { safeNext } from "@/lib/nav";
import { Flash } from "@/components/Flash";
import { SignInForm } from "../AuthForms";

export const metadata = { title: "Entrar" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const { user } = await getSession();
  if (user) redirect(next);
  return (
    <div className="wrap" style={{ maxWidth: 440 }}>
      <Flash msg={sp.msg} err={sp.err} />
      <h1>Entrar</h1>
      <SignInForm next={next} />
    </div>
  );
}
