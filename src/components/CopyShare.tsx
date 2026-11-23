"use client";
import { useState } from "react";

export function CopyShare({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const text = `¡Consigue tu entrada para ${title}! ${url}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="stack">
      <div className="linkbox" aria-label="Tu enlace">{url}</div>
      <div className="row">
        <button type="button" className="btn primary" onClick={copy} aria-live="polite">
          {copied ? "Enlace copiado" : "Copiar enlace"}
        </button>
        <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
          Compartir por WhatsApp
        </a>
      </div>
    </div>
  );
}
