// Lecturas compartidas: filas del turno (v_registros_turno) y turnos (v_turnos).
// Los cálculos derivados vienen de las vistas; aquí solo se agregan el estado del conteo y la alerta.

import type { PoolClient } from "pg";
import { filas } from "@/lib/datos/comun";
import type { RegistroTurno, Rol, TurnoDetalle, TurnoResumen } from "@/lib/datos/tipos";
import { nivelAlerta } from "@/lib/reglas/alertas";
import { estadoConteo } from "@/lib/reglas/registro";

type FilaRegistro = Omit<RegistroTurno, "estadoConteo" | "nivelAlerta">;

const SELECT_REGISTRO = `
  select v.id, v.turno_id as "turnoId", v.producto_id as "productoId", v.nombre, v.seccion,
         v.valor_unitario as "valorUnitario", v.inicial, v.entrada, v.vendida, v.contado,
         v.final_calculado as "finalCalculado", v.total_venta as "totalVenta",
         v.inventario_referencia as "inventarioReferencia", v.faltante, v.sobrante,
         v.valor_a_cancelar as "valorACancelar",
         p.umbral_alerta as "umbralAlerta", p.umbral_critico as "umbralCritico"
  from v_registros_turno v
  join productos p on p.id = v.producto_id`;

function completarRegistro(fila: FilaRegistro): RegistroTurno {
  return {
    ...fila,
    estadoConteo: estadoConteo(fila.finalCalculado, fila.contado),
    nivelAlerta: nivelAlerta(fila.inventarioReferencia, fila.umbralAlerta, fila.umbralCritico),
  };
}

export async function leerRegistro(tx: PoolClient | null, registroId: number): Promise<RegistroTurno | null> {
  const [fila] = await filas<FilaRegistro>(tx, `${SELECT_REGISTRO} where v.id = $1`, [registroId]);
  return fila ? completarRegistro(fila) : null;
}

export async function leerRegistrosDeTurno(
  tx: PoolClient | null,
  turnoId: string,
): Promise<RegistroTurno[]> {
  const resultado = await filas<FilaRegistro>(
    tx,
    `${SELECT_REGISTRO} where v.turno_id = $1 order by v.seccion, lower(v.nombre)`,
    [turnoId],
  );
  return resultado.map(completarRegistro);
}

const SELECT_TURNO = `
  select id, fecha, nombre, encargado, estado,
         venta_total as "ventaTotal", total_a_cancelar as "totalACancelar",
         num_registros as "numRegistros", sin_conteo as "sinConteo",
         facturas_efectivo as "facturasEfectivo", pago_encargado as "pagoEncargado",
         resultado_neto as "resultadoNeto",
         venta_total_cierre as "ventaTotalCierre", resultado_neto_cierre as "resultadoNetoCierre",
         entregado_at as "entregadoAt", cerrado_at as "cerradoAt", created_at as "createdAt"
  from v_turnos`;

/** El encargado no ve facturas, pago ni resultado neto (sección 15). */
function segunRol(turno: TurnoResumen, rol: Rol): TurnoResumen {
  if (rol === "administrador") return turno;
  return {
    ...turno,
    facturasEfectivo: null,
    pagoEncargado: null,
    resultadoNeto: null,
    resultadoNetoCierre: null,
  };
}

export async function leerTurno(
  tx: PoolClient | null,
  turnoId: string,
  rol: Rol,
): Promise<TurnoDetalle | null> {
  const [turno] = await filas<TurnoResumen>(tx, `${SELECT_TURNO} where id = $1`, [turnoId]);
  if (!turno) return null;
  return { ...segunRol(turno, rol), registros: await leerRegistrosDeTurno(tx, turnoId) };
}

export async function leerTurnos(limite: number, rol: Rol): Promise<TurnoResumen[]> {
  const resultado = await filas<TurnoResumen>(
    null,
    `${SELECT_TURNO} order by fecha desc, created_at desc limit $1`,
    [limite],
  );
  return resultado.map((turno) => segunRol(turno, rol));
}
