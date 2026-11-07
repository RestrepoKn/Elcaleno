import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; helperText?: string; }

// Misma API de siempre; estilo del diseño del inventario.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, helperText, className = "", id, ...props }, ref) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-texto" htmlFor={id}>
      {label}
      <input
        ref={ref}
        id={id}
        className={`block min-h-11 w-full rounded-lg border bg-superficie px-3 text-base font-normal text-texto placeholder:text-texto-suave/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primario ${error ? "border-alerta-roja" : "border-borde"} ${className}`}
        {...props}
      />
      {error ? (
        <span id={id ? `${id}-error` : undefined} className="block text-xs font-medium text-alerta-roja-texto">{error}</span>
      ) : helperText ? (
        <span className="block text-xs font-normal text-texto-suave">{helperText}</span>
      ) : null}
    </label>
  );
});
