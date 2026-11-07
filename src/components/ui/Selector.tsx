"use client";

import { useId, type SelectHTMLAttributes } from "react";

export type OpcionSelector = { valor: string; etiqueta: string };

export type PropsSelector = SelectHTMLAttributes<HTMLSelectElement> & {
  etiqueta: string;
  opciones: readonly OpcionSelector[];
  error?: string | null | undefined;
  ayuda?: string | undefined;
};

export function Selector({ etiqueta, opciones, error, ayuda, id, className = "", ...props }: PropsSelector) {
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
      <select
        id={idCampo}
        aria-invalid={error ? true : undefined}
        aria-describedby={descritoPor}
        className={`min-h-11 rounded-lg border bg-superficie px-3 text-base text-texto
          focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primario
          disabled:bg-fondo disabled:text-texto-suave
          ${error ? "border-alerta-roja" : "border-borde"}`}
        {...props}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
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
