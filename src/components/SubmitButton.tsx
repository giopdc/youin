"use client";
import { useFormStatus } from "react-dom";

// Se desactiva mientras se envía: evita dobles envíos por doble pulsación.
export function SubmitButton({
  children,
  pendingText = "Guardando…",
  className = "btn primary",
  name,
  value,
  confirm,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  name?: string;
  value?: string;
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-disabled={pending}
      name={name}
      value={value}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
