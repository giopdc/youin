"use client";
import { useId, useState } from "react";

// Invitar a un amigo comparte la FICHA pública. No es el enlace de promotor (ese cuenta ventas).
export function InviteFriend({ url, title, defaultText, compact = false }: { url: string; title: string; defaultText: string; compact?: boolean }) {
  const [open, setOpen] = useState(!compact);
  const [text, setText] = useState(defaultText);
  const [status, setStatus] = useState<string | null>(null);
  const id = useId();
  const message = `${text.trim()} ${url}`;

  async function nativeShare() {
    setStatus(null);
    try {
      await navigator.share({ title, text: text.trim(), url });
      setStatus("¡Enviado! Ahora solo falta que diga que sí.");
    } catch (e) {
      // Cancelado o bloqueado: seguimos en la ficha.
      if ((e as Error)?.name !== "AbortError") setStatus("No se ha podido abrir el menú. Copia el enlace y pégalo donde quieras.");
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setStatus("Mensaje y enlace copiados. Pégalos en tu chat.");
  }

  if (!open) {
    return (
      <button type="button" className="btn invite block" onClick={() => setOpen(true)} aria-expanded={false} aria-controls={id}>
        ¿Te vienes? Invita a alguien
      </button>
    );
  }
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <div className="invite-box stack" id={id}>
      <label>
        <span className="lbl">Tu mensaje (puedes cambiarlo)</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={500} />
      </label>
      <div className="small muted">Se enviará con el enlace a la ficha: <span className="nowrap">{url.replace(/^https?:\/\//, "")}</span></div>
      <div className="row">
        <a className="btn invite" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
          Enviar por WhatsApp
        </a>
        {canShare && (
          <button type="button" className="btn" onClick={nativeShare}>Más opciones</button>
        )}
        <button type="button" className="btn" onClick={copy}>Copiar</button>
      </div>
      <p className="small muted" aria-live="polite" style={{ margin: 0 }}>{status ?? "Invitar a alguien no te apunta a nada ni cuenta ventas: solo le mandas el plan."}</p>
    </div>
  );
}
