// Filas del turno: CU-04, CU-05 y CU-06 (RN-03, RN-04, RN-05, RN-09, RN-10).
// Los cálculos (inventario final, total de venta, faltante) los hacen las columnas generadas y la vista.

import { conTransaccion } from "@/lib/db/conexion";
import { conErrores, esIdRegistro, esUuid, filas } from "@/lib/datos/comun";
import { leerRegistro } from "@/lib/datos/lecturas";
import { bloquearTurno } from "@/lib/datos/turnos";
import type { CambiosRegistro, RegistroTurno } from "@/lib/datos/tipos";
import { datosInvalidos, ErrorDeNegocio } from "@/lib/reglas/errores";
import { validarConteo, validarMovimiento } from "@/lib/reglas/registro";
import { esEditable } from "@/lib/reglas/turno";

type Cantidades = { inicial: number; entrada: number; vendida: number; contado: number | null };

/**
 * Cambia una o varias cantidades de la fila en una sola transacción.
 * El inicial solo lo envía una ruta con rol administrador (RN-09); esta función no ve el rol.
 */
export async function actualizarRegistro(
  turnoId: string,
  registroId: number,
  cambios: CambiosRegistro,
): Promise<RegistroTurno> {
  const hayCambios = Object.values(cambios).some((valor) => valor !== undefined);
  if (!hayCambios) throw datosInvalidos("cambios");
  if (!esUuid(turnoId)) throw new ErrorDeNegocio("TURNO_NO_ENCONTRADO");
  if (!esIdRegistro(registroId)) throw new ErrorDeNegocio("REGISTRO_NO_ENCONTRADO");

  return conErrores(() =>
    conTransaccion(async (tx) => {
      const turno = await bloquearTurno(tx, turnoId);
      const [actual] = await filas<Cantidades>(
        tx,
        "select inicial, entrada, vendida, contado from registros_turno where id = $1 and turno_id = $2 for update",
        [registroId, turnoId],
      );
      if (!actual) throw new ErrorDeNegocio("REGISTRO_NO_ENCONTRADO");
      if (!esEditable(turno.estado)) throw new ErrorDeNegocio("TURNO_NO_EDITABLE");

      const nuevo: Cantidades = {
        inicial: cambios.inicial ?? actual.inicial,
        entrada: cambios.entrada ?? actual.entrada,
        vendida: cambios.vendida ?? actual.vendida,
        contado: cambios.contado ?? actual.contado,
      };
      validarMovimiento(nuevo.inicial, nuevo.entrada, nuevo.vendida);
      if (cambios.contado !== undefined) validarConteo(cambios.contado);

      await filas(
        tx,
        "update registros_turno set inicial = $2, entrada = $3, vendida = $4, contado = $5 where id = $1",
        [registroId, nuevo.inicial, nuevo.entrada, nuevo.vendida, nuevo.contado],
      );
      const registro = await leerRegistro(tx, registroId);
      if (!registro) throw new ErrorDeNegocio("REGISTRO_NO_ENCONTRADO");
      return registro;
    }),
  );
}

/** CU-04: entrada y/o cantidad vendida. */
export async function registrarMovimiento(
  turnoId: string,
  registroId: number,
  m: { entrada?: number | undefined; vendida?: number | undefined },
): Promise<RegistroTurno> {
  return actualizarRegistro(turnoId, registroId, { entrada: m.entrada, vendida: m.vendida });
}

/** CU-05: conteo físico. */
export async function registrarConteo(
  turnoId: string,
  registroId: number,
  contado: number,
): Promise<RegistroTurno> {
  return actualizarRegistro(turnoId, registroId, { contado });
}

/** CU-06 (solo administrador): ajusta el inicial; valida que vendida ≤ inicial + entrada. */
export async function ajustarInicial(
  turnoId: string,
  registroId: number,
  inicial: number,
): Promise<RegistroTurno> {
  return actualizarRegistro(turnoId, registroId, { inicial });
}
