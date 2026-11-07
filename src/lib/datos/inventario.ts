// Inventario actual y alertas: CU-11 (RN-06).
// v_inventario_actual da el último inventario de referencia de cada producto activo con registros.

import { filas } from "@/lib/datos/comun";
import type { FilaInventario, FiltrosInventario } from "@/lib/datos/tipos";
import { nivelAlerta } from "@/lib/reglas/alertas";

type FilaVista = Omit<FilaInventario, "nivelAlerta">;

export async function inventarioActual(f: FiltrosInventario = {}): Promise<FilaInventario[]> {
  const valores: unknown[] = [];
  let donde = "";
  if (f.seccion) {
    valores.push(f.seccion);
    donde = "where seccion = $1";
  }
  const resultado = await filas<FilaVista>(
    null,
    `select producto_id as "productoId", nombre, seccion, categoria, valor_unitario as "valorUnitario",
            umbral_alerta as "umbralAlerta", umbral_critico as "umbralCritico",
            turno_id as "turnoId", inventario, conteo_fisico as "conteoFisico"
     from v_inventario_actual
     ${donde}
     order by seccion, lower(nombre)`,
    valores,
  );
  const conAlerta = resultado.map((fila) => ({
    ...fila,
    nivelAlerta: nivelAlerta(fila.inventario, fila.umbralAlerta, fila.umbralCritico),
  }));
  // "Por reponer": la lista para pedir al proveedor (cualquier alerta).
  return f.soloPorReponer ? conAlerta.filter((fila) => fila.nivelAlerta !== "ninguna") : conAlerta;
}
