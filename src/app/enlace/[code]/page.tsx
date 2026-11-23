import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveReferral } from "@/lib/referral";

export const dynamic = "force-dynamic";
export const metadata = { title: "Enlace", robots: { index: false, follow: false } };

// Página de estado de un enlace /r/<código> que no está activo.
export default async function ReferralPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const row = await resolveReferral(code);
  if (row.state === "active") redirect(`/r/${encodeURIComponent(code)}`);

  const messages: Record<string, string> = {
    ended: "Esta fiesta ya ha terminado.",
    inactive: "Este enlace no está activo ahora mismo.",
    unavailable: "Este evento ya no está disponible.",
    not_found: "No encontramos este enlace.",
    error: "No hemos podido abrir el enlace. Inténtalo de nuevo en un momento.",
  };
  const state = row.state;
  return (
    <div className="wrap" style={{ maxWidth: 520 }}>
      <div className="card stack">
        {row?.event_title && <div className="muted">{row.event_title}</div>}
        <h1>{messages[state] ?? messages.not_found}</h1>
        <div className="row">
          {row?.event_slug && state !== "ended" && (
            <Link className="btn" href={`/eventos/${row.event_slug}`}>Ver la fiesta</Link>
          )}
          <Link className="btn primary" href="/">Ver próximos eventos</Link>
        </div>
      </div>
    </div>
  );
}
