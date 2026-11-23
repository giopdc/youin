import Link from "next/link";

export function EventTabs({ id, current }: { id: string; current: "editar" | "vista" | "lista" | "programa" }) {
  const tabs = [
    ["editar", `/admin/eventos/${id}`, "Editar"],
    ["vista", `/admin/eventos/${id}/vista`, "Vista previa"],
    ["lista", `/admin/eventos/${id}/lista`, "Lista"],
    ["programa", `/admin/eventos/${id}/programa`, "Ventas y recompensas"],
  ] as const;
  return (
    <nav className="tabs" aria-label="Secciones del evento">
      <Link href="/admin">← Eventos</Link>
      {tabs.map(([k, href, label]) => (
        <Link key={k} href={href} aria-current={current === k ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}
