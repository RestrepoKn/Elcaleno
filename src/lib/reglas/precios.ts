// F6 · Facturas de compra y aviso de aumento de precio (opcional): RN-16.
// Estas facturas registran el costo de compra; no son las "facturas en efectivo" del turno (RN-07).

/** true si el valor nuevo es mayor que el último registrado. La primera factura del producto no es aumento. */
export function hayAumento(valorAnterior: number | null, valorNuevo: number): boolean {
  return valorAnterior !== null && valorNuevo > valorAnterior;
}

/** Datos del aumento para notificar, o null si no hubo. */
export function detalleAumento(
  valorAnterior: number | null,
  valorNuevo: number,
): { anterior: number; nuevo: number; diferencia: number } | null {
  if (valorAnterior === null || !hayAumento(valorAnterior, valorNuevo)) return null;
  return { anterior: valorAnterior, nuevo: valorNuevo, diferencia: valorNuevo - valorAnterior };
}
