// Códigos de error de negocio, mensajes y estado HTTP (plan, sección 11.2).

export type CodigoError =
  | "DATOS_INVALIDOS"
  | "NO_AUTORIZADO"
  | "SIN_PERMISO"
  | "PRODUCTO_DUPLICADO"
  | "PRODUCTO_NO_ENCONTRADO"
  | "PRODUCTO_CON_REGISTROS"
  | "TURNO_NO_ENCONTRADO"
  | "REGISTRO_NO_ENCONTRADO"
  | "TURNO_YA_ABIERTO"
  | "TURNO_DUPLICADO"
  | "TURNO_NO_EDITABLE"
  | "TURNO_INCOMPLETO"
  | "TRANSICION_INVALIDA"
  | "VENDIDO_EXCEDE_EXISTENCIA"
  | "FACTURA_DUPLICADA"
  | "FOTO_INVALIDA"
  | "FOTO_NO_ENCONTRADA"
  | "ERROR_INTERNO";

export const MENSAJES: Record<CodigoError, string> = {
  DATOS_INVALIDOS: "Revise los datos ingresados.",
  NO_AUTORIZADO: "Debe iniciar sesión.",
  SIN_PERMISO: "No tiene permiso para esta acción.",
  PRODUCTO_DUPLICADO: "Ya existe un producto con ese nombre en esta sección.",
  PRODUCTO_NO_ENCONTRADO: "El producto no existe.",
  PRODUCTO_CON_REGISTROS: "El producto tiene registros y no se puede eliminar; desactívelo.",
  TURNO_NO_ENCONTRADO: "El turno no existe.",
  REGISTRO_NO_ENCONTRADO: "La fila del turno no existe.",
  TURNO_YA_ABIERTO: "Ya hay un turno abierto. Entréguelo antes de abrir otro.",
  TURNO_DUPLICADO: "Ya existe un turno con ese nombre en esa fecha.",
  TURNO_NO_EDITABLE: "El turno ya fue entregado o cerrado y no se puede modificar.",
  TURNO_INCOMPLETO: "Faltan datos para continuar (conteos, facturas o pago).",
  TRANSICION_INVALIDA: "Esa acción no es válida para el estado actual del turno.",
  VENDIDO_EXCEDE_EXISTENCIA: "La cantidad vendida supera lo disponible (inicial más entrada).",
  FACTURA_DUPLICADA: "Ya existe una factura con ese número para ese producto.",
  FOTO_INVALIDA: "La foto debe ser JPG, PNG o WEBP y pesar máximo 4 MB.",
  FOTO_NO_ENCONTRADA: "La foto no existe.",
  ERROR_INTERNO: "Ocurrió un error inesperado. Intente de nuevo.",
};

export const ESTADO_HTTP: Record<CodigoError, number> = {
  DATOS_INVALIDOS: 400,
  NO_AUTORIZADO: 401,
  SIN_PERMISO: 403,
  PRODUCTO_DUPLICADO: 409,
  PRODUCTO_NO_ENCONTRADO: 404,
  PRODUCTO_CON_REGISTROS: 409,
  TURNO_NO_ENCONTRADO: 404,
  REGISTRO_NO_ENCONTRADO: 404,
  TURNO_YA_ABIERTO: 409,
  TURNO_DUPLICADO: 409,
  TURNO_NO_EDITABLE: 409,
  TURNO_INCOMPLETO: 409,
  TRANSICION_INVALIDA: 409,
  VENDIDO_EXCEDE_EXISTENCIA: 409,
  FACTURA_DUPLICADA: 409,
  FOTO_INVALIDA: 400,
  FOTO_NO_ENCONTRADA: 404,
  ERROR_INTERNO: 500,
};

/** Error esperado por las reglas del negocio; la capa HTTP lo traduce con ESTADO_HTTP. */
export class ErrorDeNegocio extends Error {
  readonly codigo: CodigoError;
  readonly detalles: unknown;

  constructor(codigo: CodigoError, mensaje?: string, detalles?: unknown) {
    super(mensaje ?? MENSAJES[codigo]);
    this.name = "ErrorDeNegocio";
    this.codigo = codigo;
    this.detalles = detalles ?? null;
  }
}

/** Atajo para los errores de validación, indicando el campo que falló. */
export function datosInvalidos(campo: string): ErrorDeNegocio {
  return new ErrorDeNegocio("DATOS_INVALIDOS", undefined, { campo });
}
