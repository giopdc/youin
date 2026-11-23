"use client";
import { useEffect, useState } from "react";

// Pequeña celebración al entrar en la lista. Respeta «reducir movimiento».
export function Confetti() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 3200);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  const colors = ["#c6f432", "#cdbfff", "#ff6a45", "#141414"];
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 36 }).map((_, i) => (
        <i key={i} style={{ left: `${(i * 37) % 100}%`, background: colors[i % 4], animationDelay: `${(i % 9) * 0.07}s`, transform: `rotate(${i * 23}deg)` }} />
      ))}
    </div>
  );
}
