// Traducción de errores de restricciones de Postgres a códigos de negocio (plan, sección 9.4).
// Función pura: solo mira las propiedades code y constraint del error; no importa pg.

import { ErrorDeNegocio, type CodigoError } from "@/lib/reglas/errores";

// Restricciones UNIQUE con su código de negocio.
const RESTRICCIONES_UNICAS: Record<string, CodigoError> = {
  ux_productos_nombre: "PRODUCTO_DUPLICADO",
  ux_turnos_un_abierto: "TURNO_YA_ABIERTO",
  ux_turnos_fecha_nombre: "TURNO_DUPLICADO",
  ux_facturas_numero_producto: "FACTURA_DUPLICADA",
};

type ErrorPostgres = { code: string; constraint?: string | undefined };

function esErrorPostgres(error: unknown): error is ErrorPostgres {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

/** Código de negocio de un error de restricción de Postgres; null si no es uno de los esperados. */
export function traducirErrorPostgres(error: unknown): CodigoError | null {
  if (!esErrorPostgres(error)) return null;
  const restriccion = error.constraint ?? "";
  switch (error.code) {
    case "23505":
      return RESTRICCIONES_UNICAS[restriccion] ?? null;
    case "23503":
      return "PRODUCTO_CON_REGISTROS";
    case "23514":
      return restriccion === "registros_vendida_excede"
        ? "VENDIDO_EXCEDE_EXISTENCIA"
        : "DATOS_INVALIDOS";
    default:
      return null;
  }
}

/** Convierte un error de restricción conocido en ErrorDeNegocio; cualquier otro se devuelve igual. */
export function comoErrorDeNegocio(error: unknown): unknown {
  if (error instanceof ErrorDeNegocio) return error;
  const codigo = traducirErrorPostgres(error);
  if (!codigo) return error;
  const restriccion = (error as ErrorPostgres).constraint;
  return new ErrorDeNegocio(codigo, undefined, restriccion ? { restriccion } : null);
}
