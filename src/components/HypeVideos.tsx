"use client";
import { useEffect, useRef, useState } from "react";

type Video = { src: string; poster?: string | null };

function Clip({ v, i }: { v: Video; i: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Solo se reproduce mientras se ve: ahorra datos y batería.
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !reduce) el.play().catch(() => {});
      else el.pause();
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  function toggle() {
    const el = ref.current;
    if (!el) return;
    el.muted = !muted;
    setMuted(!muted);
    if (el.paused) el.play().catch(() => {});
  }
  return (
    <figure className="clip">
      <video ref={ref} src={v.src} poster={v.poster ?? undefined} muted loop playsInline preload="metadata" aria-label={`Vídeo ${i + 1} de la última edición`} />
      <button type="button" className="clip-sound" onClick={toggle} aria-pressed={!muted}>
        {muted ? "Activar sonido" : "Silenciar"}
      </button>
    </figure>
  );
}

// Vídeos de ediciones anteriores para crear ganas de ir.
export function HypeVideos({ videos, title }: { videos: Video[]; title: string }) {
  if (!videos?.length) return null;
  return (
    <section className="hype" aria-label={`Así se vive ${title}`}>
      <p className="hype-title">Así se vive <span className="accent">{title}</span></p>
      <div className="clips">
        {videos.map((v, i) => <Clip key={v.src} v={v} i={i} />)}
      </div>
    </section>
  );
}
