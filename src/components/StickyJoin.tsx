"use client";
import { useEffect, useState } from "react";

// Barra fija en el móvil para apuntarse sin buscar el botón. Se oculta cuando el formulario está a la vista.
export function StickyJoin({ perk, count }: { perk: string | null; count: number }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const el = document.getElementById("lista");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setHidden(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  if (hidden) return null;
  return (
    <div className="sticky-join">
      <div className="sticky-text">
        <b>{perk ?? "Apúntate a la lista"}</b>
        <span>{count > 0 ? `${count} ${count === 1 ? "persona ya está" : "personas ya están"} dentro` : "Sé de los primeros"}</span>
      </div>
      <a className="btn invite" href="#lista">Apúntame</a>
    </div>
  );
}
