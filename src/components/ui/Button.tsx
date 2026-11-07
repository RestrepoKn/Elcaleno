import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" | "lg"; loading?: boolean; }

// Misma API de siempre; colores del diseño del inventario (cereza sobre fondo claro).
export function Button({ variant = "primary", size = "md", loading = false, className = "", children, disabled, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-primario text-white hover:bg-primario-oscuro",
    secondary: "border border-borde bg-superficie text-texto hover:bg-primario-suave",
    ghost: "text-primario hover:bg-primario-suave",
    danger: "bg-alerta-roja text-white hover:brightness-90",
  };
  const sizes = { sm: "min-h-9 px-3 text-sm", md: "min-h-11 px-4 text-sm", lg: "min-h-12 px-5 text-base" };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Cargando..." : children}
    </button>
  );
}
