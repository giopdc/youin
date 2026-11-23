"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { savePlanAfterSignup } from "@/app/eventos/[slug]/actions";

// Al volver del registro con ?plan=guardar, guarda el plan una sola vez.
export function AutoSavePlan({ slug }: { slug: string }) {
  const router = useRouter();
  const done = useRef(false);
  const [state, setState] = useState("Guardando tu plan…");
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    savePlanAfterSignup(slug).then((r) => {
      setState(r.ok ? "¡Plan guardado!" : r.error ?? "No se ha podido guardar el plan.");
      router.replace(`/eventos/${slug}${r.ok ? `?msg=${encodeURIComponent("¡Plan guardado! Lo tienes en «Mis planes».")}` : ""}#plan`);
    });
  }, [slug, router]);
  return <div className="notice ok" role="status">{state}</div>;
}
