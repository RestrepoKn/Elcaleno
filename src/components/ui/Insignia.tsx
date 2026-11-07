import type { HTMLAttributes } from "react";

export type TonoInsignia =
  | "neutro"
  | "primario"
  | "reponer"
  | "amarilla"
  | "roja"
  | "ok"
  | "sobrante"
  | "abierto"
  | "revision"
  | "cerrado";

// Texto oscuro sobre fondo suave del mismo tono, con borde, para mantener el contraste (sección 13).
const TONOS: Record<TonoInsignia, string> = {
  neutro: "border-borde bg-fondo text-texto-suave",
  primario: "border-primario/30 bg-primario-suave text-primario-oscuro",
  reponer: "border-reponer/30 bg-reponer/10 text-reponer",
  amarilla: "border-alerta-amarilla/50 bg-alerta-amarilla/15 text-alerta-amarilla-texto",
  roja: "border-alerta-roja/40 bg-alerta-roja/10 text-alerta-roja-texto",
  ok: "border-ok/40 bg-ok/10 text-ok-texto",
  sobrante: "border-sobrante/40 bg-sobrante/10 text-sobrante",
  abierto: "border-turno-abierto/40 bg-turno-abierto/10 text-turno-abierto",
  revision: "border-turno-revision/40 bg-turno-revision/10 text-turno-revision",
  cerrado: "border-turno-cerrado/40 bg-turno-cerrado/10 text-turno-cerrado",
};

export type PropsInsignia = HTMLAttributes<HTMLSpanElement> & { tono?: TonoInsignia };

/** Insignia con texto: el estado nunca se comunica solo con color. */
export function Insignia({ tono = "neutro", className = "", ...props }: PropsInsignia) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5
        text-xs font-semibold ${TONOS[tono]} ${className}`}
      {...props}
    />
  );
}
