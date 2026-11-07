import type { ReactNode } from "react";

type TipoAviso = "error" | "exito" | "info" | "advertencia";

const TIPOS: Record<TipoAviso, string> = {
  error: "border-alerta-roja/40 bg-alerta-roja/10 text-alerta-roja-texto",
  exito: "border-ok/40 bg-ok/10 text-ok-texto",
  info: "border-reponer/30 bg-reponer/10 text-reponer",
  advertencia: "border-alerta-amarilla/50 bg-alerta-amarilla/15 text-alerta-amarilla-texto",
};

export function Aviso({
  tipo = "info",
  titulo,
  children,
  className = "",
}: {
  tipo?: TipoAviso;
  titulo?: string | undefined;
  children?: ReactNode;
  className?: string;
}) {
  // Los errores se anuncian de inmediato; el resto, sin interrumpir.
  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-sm ${TIPOS[tipo]} ${className}`}
    >
      {titulo ? <p className="font-semibold">{titulo}</p> : null}
      {children ? <div className={titulo ? "mt-1" : ""}>{children}</div> : null}
    </div>
  );
}
