import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { loadPromoters } from "@/lib/promoters";
import { formatShort } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ventas por perfil" };

export default async function Promoters({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const all = await loadPromoters(supabase);
  const q = (sp.q ?? "").trim().toLowerCase();
  const rows = all.filter((r) => !q || `${r.name} ${r.email}`.toLowerCase().includes(q));
  const sum = (k: "confirmed_tickets" | "invitations_earned" | "invitations_delivered" | "active_links") => all.reduce((n, r) => n + r[k], 0);

  return (
    <div className="wrap wide">
      <nav className="tabs" aria-label="Administración">
        <Link href="/admin">Fiestas</Link>
        <Link href="/admin/promotores" aria-current="page">Ventas por perfil</Link>
      </nav>
      <p className="kicker">Programa de promotores</p>
      <h1>Ventas por perfil</h1>
      <p className="muted small">
        Suma de las entradas válidas que has confirmado en «Ventas y recompensas» de cada fiesta. Se actualiza en cuanto guardas un total.
        Los clics en los enlaces no cuentan.
      </p>
      <div className="kpis">
        <div className="kpi"><b>{sum("confirmed_tickets")}</b><span>entradas confirmadas</span></div>
        <div className="kpi"><b>{all.length}</b><span>perfiles en el programa</span></div>
        <div className="kpi"><b>{sum("active_links")}</b><span>enlaces activos</span></div>
        <div className="kpi"><b>{sum("invitations_delivered")}/{sum("invitations_earned")}</b><span>invitaciones entregadas / conseguidas</span></div>
      </div>
      <form className="row" role="search">
        <input type="search" name="q" defaultValue={sp.q} placeholder="Buscar por nombre o correo" aria-label="Buscar" style={{ flex: 1, minWidth: 180 }} />
        <button className="btn" type="submit">Buscar</button>
        <a className="btn" href="/admin/promotores/csv" download>Descargar CSV</a>
      </form>
      {rows.length === 0 ? (
        <div className="card empty" style={{ marginTop: 12 }}>
          <p className="big">{q ? "Nadie coincide con la búsqueda" : "Aún no hay promotores"}</p>
          <p className="muted">Cuando alguien pulse «Quiero compartir y ganar una invitación» en una fiesta, aparecerá aquí.</p>
        </div>
      ) : (
        <table className="review" style={{ marginTop: 12 }}>
          <thead>
            <tr><th>#</th><th>Perfil</th><th>Entradas</th><th>Fiestas</th><th>Invitaciones</th><th>Última revisión</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr className="item solo" key={r.user_id}>
                <td data-label="Puesto" className="rank">{i + 1}</td>
                <td data-label="Perfil">
                  <div><strong>{r.name}</strong>{r.needs_review && <span className="status danger" style={{ marginLeft: 6 }}>Revisar</span>}</div>
                  <div className="small muted">{r.email}</div>
                  <ul className="small" style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {r.byEvent.map((e) => (
                      <li key={e.eventId}>
                        <Link href={`/admin/eventos/${e.eventId}/programa?q=${encodeURIComponent(r.name)}`}>{e.title}</Link>: {e.tickets}
                        {e.status === "pending" ? " · pendiente de enlace" : e.status === "inactive" ? " · desactivado" : ""}
                      </li>
                    ))}
                  </ul>
                </td>
                <td data-label="Entradas" className="num"><strong style={{ fontSize: "1.3rem" }}>{r.confirmed_tickets}</strong></td>
                <td data-label="Fiestas" className="num">{r.programs} ({r.active_links} activas)</td>
                <td data-label="Invitaciones" className="num">{r.invitations_delivered}/{r.invitations_earned}{r.invitations_pending > 0 ? ` · ${r.invitations_pending} pendiente${r.invitations_pending === 1 ? "" : "s"}` : ""}</td>
                <td data-label="Última revisión" className="small">{r.last_reviewed_at ? formatShort(r.last_reviewed_at) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
