"use client";

import { useId, type InputHTMLAttributes } from "react";

export type PropsCampo = InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string;
  error?: string | null | undefined;
  ayuda?: string | undefined;
};

/** Campo de texto o número con etiqueta, ayuda y error asociados (accesible). */
export function Campo({ etiqueta, error, ayuda, id, className = "", ...props }: PropsCampo) {
  const generado = useId();
  const idCampo = id ?? generado;
  const idAyuda = ayuda ? `${idCampo}-ayuda` : undefined;
  const idError = error ? `${idCampo}-error` : undefined;
  const descritoPor = [idAyuda, idError].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={idCampo} className="text-sm font-medium text-texto">
        {etiqueta}
      </label>
      <input
        id={idCampo}
        aria-invalid={error ? true : undefined}
        aria-describedby={descritoPor}
        className={`min-h-11 rounded-lg border bg-superficie px-3 text-base text-texto tabular-nums
          focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primario
          disabled:bg-fondo disabled:text-texto-suave
          ${error ? "border-alerta-roja" : "border-borde"}`}
        {...props}
      />
      {ayuda ? (
        <p id={idAyuda} className="text-xs text-texto-suave">
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p id={idError} className="text-xs font-medium text-alerta-roja-texto">
          {error}
        </p>
      ) : null}
    </div>
  );
}
