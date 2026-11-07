import type { HTMLAttributes } from "react";

// Texto oscuro sobre fondo suave del mismo tono, como las insignias del inventario.
export function Badge({ variant = "info", className = "", ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: "info" | "success" | "warning" | "error" }) {
  const colors = {
    info: "border-reponer/30 bg-reponer/10 text-reponer",
    success: "border-ok/40 bg-ok/10 text-ok-texto",
    warning: "border-alerta-amarilla/50 bg-alerta-amarilla/15 text-alerta-amarilla-texto",
    error: "border-alerta-roja/40 bg-alerta-roja/10 text-alerta-roja-texto",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors[variant]} ${className}`} {...props} />;
}
