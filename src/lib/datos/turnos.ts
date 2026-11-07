// Ciclo de vida del turno: CU-03, CU-07 a CU-10 y CU-12 (RN-07, RN-08, RN-09, RN-11, RN-12, RN-14).
// Abrir, entregar, cerrar y devolver ocurren en una transacción con el turno bloqueado (FOR UPDATE).

import type { PoolClient } from "pg";
import { LIMITE_LISTADO } from "@/lib/config/inventario";
import { conTransaccion } from "@/lib/db/conexion";
import { conErrores, esUuid, filas } from "@/lib/datos/comun";
import { leerTurno, leerTurnos } from "@/lib/datos/lecturas";
import { inicialSugerido, listarProductosActivos } from "@/lib/datos/productos";
import type { DatosTurno, Finanzas, Rol, TurnoDetalle, TurnoResumen } from "@/lib/datos/tipos";
import { ErrorDeNegocio } from "@/lib/reglas/errores";
import { hoyBogota } from "@/lib/reglas/fechas";
import {
  puedeCerrar,
  puedeDevolver,
  puedeEntregar,
  resultadoNeto,
  validarFinanzas,
  validarTurno,
  valorVentaTotal,
  type EstadoTurno,
} from "@/lib/reglas/turno";

type TurnoBloqueado = {
  id: string;
  estado: EstadoTurno;
  facturasEfectivo: number | null;
  pagoEncargado: number | null;
};

/** Bloquea el turno para la transacción; TURNO_NO_ENCONTRADO si no existe. */
export async function bloquearTurno(tx: PoolClient, turnoId: string): Promise<TurnoBloqueado> {
  const [turno] = esUuid(turnoId)
    ? await filas<TurnoBloqueado>(
        tx,
        `select id, estado, facturas_efectivo as "facturasEfectivo", pago_encargado as "pagoEncargado"
         from turnos where id = $1 for update`,
        [turnoId],
      )
    : [];
  if (!turno) throw new ErrorDeNegocio("TURNO_NO_ENCONTRADO");
  return turno;
}

async function leerTurnoObligatorio(tx: PoolClient | null, turnoId: string, rol: Rol): Promise<TurnoDetalle> {
  const turno = await leerTurno(tx, turnoId, rol);
  if (!turno) throw new ErrorDeNegocio("TURNO_NO_ENCONTRADO");
  return turno;
}

export async function hayTurnoAbierto(tx: PoolClient | null): Promise<boolean> {
  const resultado = await filas(tx, "select 1 from turnos where estado = 'abierto' limit 1");
  return resultado.length > 0;
}

/** CU-03 (sección 7.1): turno abierto con una fila por producto activo, inicial sugerido y valor copiado. */
export async function abrirTurno(d: DatosTurno, rol: Rol): Promise<TurnoDetalle> {
  const datos = { fecha: d.fecha ?? hoyBogota(), nombre: d.nombre.trim(), encargado: d.encargado.trim() };
  validarTurno(datos);

  return conErrores(() =>
    conTransaccion(async (tx) => {
      if (await hayTurnoAbierto(tx)) throw new ErrorDeNegocio("TURNO_YA_ABIERTO"); // RN-11
      const [turno] = await filas<{ id: string }>(
        tx,
        "insert into turnos (fecha, nombre, encargado, estado) values ($1, $2, $3, 'abierto') returning id",
        [datos.fecha, datos.nombre, datos.encargado],
      );
      if (!turno) throw new Error("La inserción del turno no devolvió el id.");

      for (const p of await listarProductosActivos(tx)) {
        const inicial = await inicialSugerido(tx, p.id, turno.id); // RN-09
        await filas(
          tx,
          `insert into registros_turno (turno_id, producto_id, nombre, seccion, valor_unitario, inicial)
           values ($1, $2, $3, $4, $5, $6)`,
          [turno.id, p.id, p.nombre, p.seccion, p.valorUnitario, inicial], // RN-08
        );
      }
      return leerTurnoObligatorio(tx, turno.id, rol);
    }),
  );
}

/** CU-07 (sección 7.2): abierto → en_revision, con conteo en todas las filas. */
export async function entregarTurno(turnoId: string, rol: Rol): Promise<TurnoDetalle> {
  return conErrores(() =>
    conTransaccion(async (tx) => {
      const turno = await bloquearTurno(tx, turnoId);
      const [conteo] = await filas<{ sinConteo: number }>(
        tx,
        `select count(*) filter (where contado is null) as "sinConteo"
         from registros_turno where turno_id = $1`,
        [turnoId],
      );
      const sinConteo = conteo?.sinConteo ?? 0;
      if (turno.estado !== "abierto") throw new ErrorDeNegocio("TRANSICION_INVALIDA");
      if (!puedeEntregar(turno.estado, sinConteo)) {
        throw new ErrorDeNegocio(
          "TURNO_INCOMPLETO",
          `Faltan ${sinConteo} ${sinConteo === 1 ? "fila" : "filas"} por conteo físico.`,
          { filasSinConteo: sinConteo },
        );
      }
      await filas(
        tx,
        "update turnos set estado = 'en_revision', entregado_at = now() where id = $1",
        [turnoId],
      );
      return leerTurnoObligatorio(tx, turnoId, rol);
    }),
  );
}

/** CU-08: facturas en efectivo y pago al encargado (turno no cerrado). */
export async function registrarFinanzas(turnoId: string, f: Finanzas, rol: Rol): Promise<TurnoDetalle> {
  validarFinanzas(f);
  return conErrores(() =>
    conTransaccion(async (tx) => {
      const turno = await bloquearTurno(tx, turnoId);
      if (turno.estado === "cerrado") throw new ErrorDeNegocio("TURNO_NO_EDITABLE"); // RN-14
      await filas(
        tx,
        "update turnos set facturas_efectivo = $2, pago_encargado = $3 where id = $1",
        [turnoId, f.facturasEfectivo, f.pagoEncargado],
      );
      return leerTurnoObligatorio(tx, turnoId, rol);
    }),
  );
}

/** CU-09 (sección 7.3): en_revision → cerrado, guardando venta total y resultado neto. */
export async function cerrarTurno(turnoId: string, rol: Rol): Promise<TurnoDetalle> {
  return conErrores(() =>
    conTransaccion(async (tx) => {
      const turno = await bloquearTurno(tx, turnoId);
      if (turno.estado !== "en_revision") throw new ErrorDeNegocio("TRANSICION_INVALIDA");
      const finanzasRegistradas = turno.facturasEfectivo !== null && turno.pagoEncargado !== null;
      if (!puedeCerrar(turno.estado, finanzasRegistradas)) {
        throw new ErrorDeNegocio(
          "TURNO_INCOMPLETO",
          "Registre las facturas en efectivo y el pago al encargado antes de cerrar.",
          {
            faltan: [
              ...(turno.facturasEfectivo === null ? ["facturasEfectivo"] : []),
              ...(turno.pagoEncargado === null ? ["pagoEncargado"] : []),
            ],
          },
        );
      }

      const totales = await filas<{ totalVenta: number }>(
        tx,
        'select total_venta as "totalVenta" from registros_turno where turno_id = $1',
        [turnoId],
      );
      const venta = valorVentaTotal(totales.map((t) => t.totalVenta)); // RN-07
      const neto = resultadoNeto(venta, turno.facturasEfectivo ?? 0, turno.pagoEncargado ?? 0);

      await filas(
        tx,
        `update turnos
         set estado = 'cerrado', venta_total_cierre = $2, resultado_neto_cierre = $3, cerrado_at = now()
         where id = $1`,
        [turnoId, venta, neto],
      );
      return leerTurnoObligatorio(tx, turnoId, rol);
    }),
  );
}

/** CU-10: en_revision → abierto, solo si no hay un turno posterior. */
export async function devolverTurno(turnoId: string, rol: Rol): Promise<TurnoDetalle> {
  return conErrores(() =>
    conTransaccion(async (tx) => {
      const turno = await bloquearTurno(tx, turnoId);
      const [posterior] = await filas<{ hay: boolean }>(
        tx,
        `select exists (
           select 1 from turnos o, turnos t
           where t.id = $1 and o.id <> t.id and o.created_at > t.created_at
         ) as hay`,
        [turnoId],
      );
      const hayTurnoPosterior = posterior?.hay ?? false;
      if (!puedeDevolver(turno.estado, hayTurnoPosterior)) {
        throw new ErrorDeNegocio(
          "TRANSICION_INVALIDA",
          hayTurnoPosterior && turno.estado === "en_revision"
            ? "No se puede devolver: ya existe un turno posterior."
            : undefined,
          { estado: turno.estado, hayTurnoPosterior },
        );
      }
      // turnos_entrega_coherente: un turno abierto no tiene entregado_at.
      await filas(tx, "update turnos set estado = 'abierto', entregado_at = null where id = $1", [turnoId]);
      return leerTurnoObligatorio(tx, turnoId, rol);
    }),
  );
}

export async function obtenerTurno(turnoId: string, rol: Rol): Promise<TurnoDetalle> {
  if (!esUuid(turnoId)) throw new ErrorDeNegocio("TURNO_NO_ENCONTRADO");
  return leerTurnoObligatorio(null, turnoId, rol);
}

/** El turno abierto actual, o null si no hay. */
export async function obtenerTurnoAbierto(rol: Rol): Promise<TurnoDetalle | null> {
  const [abierto] = await filas<{ id: string }>(null, "select id from turnos where estado = 'abierto'");
  return abierto ? leerTurno(null, abierto.id, rol) : null;
}

/** CU-12: historial de turnos, del más reciente al más antiguo. */
export async function listarTurnos(limite: number = LIMITE_LISTADO, rol: Rol = "administrador"): Promise<TurnoResumen[]> {
  const tope = Math.min(Math.max(Math.trunc(limite) || LIMITE_LISTADO, 1), LIMITE_LISTADO);
  return leerTurnos(tope, rol);
}
