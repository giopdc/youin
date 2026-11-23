"use client";
import { useId, useState } from "react";
import { logInvite } from "@/app/eventos/[slug]/actions";

// Invitar a un amigo comparte la FICHA pública. No es el enlace de promotor (ese cuenta ventas).
export function InviteFriend({
  url, title, defaultText, presets = [], compact = false, eventId, loggedIn = false, sent = 0,
}: {
  url: string; title: string; defaultText: string; presets?: string[]; compact?: boolean; eventId?: string; loggedIn?: boolean; sent?: number;
}) {
  const [open, setOpen] = useState(!compact);
  const [text, setText] = useState(defaultText);
  const [count, setCount] = useState(sent);
  const [status, setStatus] = useState<string | null>(null);
  const id = useId();
  const message = `${text.trim()} ${url}`;

  function track(channel: "whatsapp" | "share" | "copy") {
    setCount((c) => c + 1);
    if (loggedIn && eventId) logInvite(eventId, channel, text.trim()).then((r) => r.count && setCount(r.count)).catch(() => {});
  }
  async function nativeShare() {
    setStatus(null);
    try {
      await navigator.share({ title, text: text.trim(), url });
      track("share");
      setStatus("¡Enviado! Ahora solo falta que diga que sí.");
    } catch (e) {
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
    track("copy");
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
      {presets.length > 0 && (
        <div>
          <span className="lbl">Elige un mensaje</span>
          <div className="chips" role="group" aria-label="Mensajes rápidos">
            {presets.map((p) => (
              <button key={p} type="button" className={`chip${p === text ? " on" : ""}`} aria-pressed={p === text} onClick={() => setText(p)}>{p}</button>
            ))}
          </div>
        </div>
      )}
      <label>
        <span className="lbl">…o escríbelo a tu manera</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={500} />
      </label>
      <div className="small muted">Se enviará con el enlace a la ficha: <span className="nowrap">{url.replace(/^https?:\/\//, "")}</span></div>
      <div className="row">
        <a className="btn invite" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp")}>
          Enviar por WhatsApp
        </a>
        {canShare && <button type="button" className="btn" onClick={nativeShare}>Más opciones</button>}
        <button type="button" className="btn" onClick={copy}>Copiar</button>
      </div>
      {count > 0 && <p className="invite-count" aria-live="polite">Has invitado {count} {count === 1 ? "vez" : "veces"}. ¡Cuantos más, mejor!</p>}
      <p className="small muted" aria-live="polite" style={{ margin: 0 }}>
        {status ?? `Invitar a alguien no cuenta ventas: solo le mandas el plan.${loggedIn ? " Guardamos tu mensaje para saber cuántas invitaciones se mandan." : ""}`}
      </p>
    </div>
  );
}
