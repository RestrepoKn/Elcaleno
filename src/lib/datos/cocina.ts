// F5 · Turno de cocina (opcional): CU-13, RN-17.

import { LIMITE_LISTADO } from "@/lib/config/inventario";
import { conErrores, filas } from "@/lib/datos/comun";
import type { DatosCocina, RegistroCocina } from "@/lib/datos/tipos";
import { validarCocina } from "@/lib/reglas/cocina";
import { esFechaValida } from "@/lib/reglas/fechas";

const SELECT_COCINA = `
  select id, fecha, producto, existencia_inicial as "existenciaInicial", salida,
         final_esperado as "finalEsperado", created_at as "createdAt"
  from registros_cocina`;

/** Registra existencia inicial y salida; el inventario final esperado lo calcula la base (columna generada). */
export async function registrarTurnoCocina(d: DatosCocina): Promise<RegistroCocina> {
  const datos = { ...d, producto: d.producto.trim() };
  validarCocina(datos);
  return conErrores(async () => {
    const [registro] = await filas<RegistroCocina>(
      null,
      `with nuevo as (
         insert into registros_cocina (fecha, producto, existencia_inicial, salida)
         values ($1, $2, $3, $4)
         returning *
       )
       select id, fecha, producto, existencia_inicial as "existenciaInicial", salida,
              final_esperado as "finalEsperado", created_at as "createdAt"
       from nuevo`,
      [datos.fecha, datos.producto, datos.existenciaInicial, datos.salida],
    );
    if (!registro) throw new Error("La inserción del registro de cocina no devolvió la fila.");
    return registro;
  });
}

/** Registros de cocina de una fecha; sin fecha válida, los más recientes. */
export async function listarCocina(fecha?: string): Promise<RegistroCocina[]> {
  if (fecha && esFechaValida(fecha)) {
    return filas<RegistroCocina>(null, `${SELECT_COCINA} where fecha = $1 order by id desc`, [fecha]);
  }
  return filas<RegistroCocina>(null, `${SELECT_COCINA} order by fecha desc, id desc limit $1`, [LIMITE_LISTADO]);
}

/** Nombres usados antes en cocina, para sugerirlos al escribir. */
export async function productosDeCocina(): Promise<string[]> {
  const resultado = await filas<{ producto: string }>(
    null,
    `select producto from registros_cocina group by producto order by max(created_at) desc limit 50`,
  );
  return resultado.map((r) => r.producto);
}
