import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { EventForm } from "../../EventForm";
import { createEvent } from "../../actions";

export const metadata = { title: "Nuevo evento" };

export default async function NewEvent({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  await requireAdmin();
  return (
    <div className="wrap">
      <nav className="tabs"><Link href="/admin">← Eventos</Link></nav>
      <Flash msg={sp.msg} err={sp.err} />
      <h1>Nuevo evento</h1>
      <p className="muted">Se guarda como borrador. Podrás previsualizarlo antes de publicarlo.</p>
      <EventForm action={createEvent} submitLabel="Crear borrador" />
    </div>
  );
}
