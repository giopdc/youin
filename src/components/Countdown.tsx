"use client";
import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

// Cuenta atrás en directo hasta el inicio de la fiesta.
export function Countdown({ to, label = "Empieza en" }: { to: string; label?: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const p = parts(target - (now ?? target - 0));
  if (now !== null && target - now <= 0) return <p className="countdown-live">¡Está pasando ahora!</p>;
  const cells: [number, string][] = [[p.d, "días"], [p.h, "h"], [p.m, "min"], [p.s, "s"]];
  return (
    <div className="countdown" role="timer" aria-label={`${label} ${p.d} días y ${p.h} horas`}>
      <span className="countdown-label">{label}</span>
      <div className="countdown-cells" aria-hidden="true">
        {cells.map(([v, u]) => (
          <span key={u} className="cell"><b>{now === null ? "··" : String(v).padStart(2, "0")}</b><i>{u}</i></span>
        ))}
      </div>
    </div>
  );
}
