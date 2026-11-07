import type { ButtonHTMLAttributes } from "react";

type Variante = "primario" | "secundario" | "peligro" | "fantasma";
type Tamano = "sm" | "md" | "lg";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-primario text-white hover:bg-primario-oscuro",
  secundario: "border border-borde bg-superficie text-texto hover:bg-primario-suave",
  peligro: "bg-alerta-roja text-white hover:bg-alerta-roja-texto",
  fantasma: "text-primario hover:bg-primario-suave",
};

const TAMANOS: Record<Tamano, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

export type PropsBoton = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamano?: Tamano;
  cargando?: boolean;
};

/** Botón del inventario: foco visible, áreas táctiles de al menos 44 px en tamaño md. */
export function Boton({
  variante = "primario",
  tamano = "md",
  cargando = false,
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}: PropsBoton) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario
        disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTES[variante]} ${TAMANOS[tamano]} ${className}`}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...props}
    >
      {cargando ? "Guardando…" : children}
    </button>
  );
}
