// Utilidades compartidas por la capa de datos del inventario.

import type { PoolClient, QueryResultRow } from "pg";
import { consultar } from "@/lib/db/conexion";
import { comoErrorDeNegocio } from "@/lib/reglas/errores-bd";

/** Ejecuta en la transacción si se da; si no, con el pool. */
export async function filas<T extends QueryResultRow>(
  tx: PoolClient | null,
  sql: string,
  valores: unknown[] = [],
): Promise<T[]> {
  if (!tx) return consultar<T>(sql, valores);
  const resultado = await tx.query<T>(sql, valores);
  return resultado.rows;
}

/** Ejecuta el trabajo y convierte los errores de restricciones de Postgres en ErrorDeNegocio (tabla 9.4). */
export async function conErrores<T>(trabajo: () => Promise<T>): Promise<T> {
  try {
    return await trabajo();
  } catch (error) {
    throw comoErrorDeNegocio(error);
  }
}

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Evita enviar a Postgres un id con formato inválido (daría error 22P02 en vez de "no encontrado"). */
export function esUuid(valor: string): boolean {
  return PATRON_UUID.test(valor);
}

export function esIdRegistro(valor: number): boolean {
  return Number.isSafeInteger(valor) && valor > 0;
}
