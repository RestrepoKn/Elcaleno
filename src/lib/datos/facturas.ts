// F6 · Facturas de compra y aviso de aumento de precio (opcional): CU-14, RN-16.
// No confundir con las "facturas en efectivo" del turno (RN-07): estas son costos de compra a proveedores.
// La comparación es contra la factura anterior en fecha del mismo producto (en la misma fecha, la registrada antes).

import { LIMITE_LISTADO, LONGITUD_NUMERO_FACTURA, LONGITUD_PROVEEDOR, MONTO_MAXIMO } from "@/lib/config/inventario";
import { conTransaccion } from "@/lib/db/conexion";
import { conErrores, esUuid, filas } from "@/lib/datos/comun";
import type { DatosFactura, FacturaConAumento } from "@/lib/datos/tipos";
import { datosInvalidos, ErrorDeNegocio } from "@/lib/reglas/errores";
import { esFechaValida } from "@/lib/reglas/fechas";
import { detalleAumento } from "@/lib/reglas/precios";

type FilaFactura = Omit<FacturaConAumento, "aumento"> & { valorAnterior: number | null };

// LAG da el valor de la factura anterior del mismo producto, con el mismo orden que usa registrarFactura.
const SELECT_FACTURAS = `
  select f.id, f.numero, f.proveedor, f.fecha, f.producto_id as "productoId", p.nombre as producto, p.seccion,
         f.valor_unitario as "valorUnitario", f.turno_id as "turnoId", f.created_at as "createdAt",
         lag(f.valor_unitario) over (partition by f.producto_id order by f.fecha, f.id) as "valorAnterior"
  from facturas f
  join productos p on p.id = f.producto_id`;

function conAumento({ valorAnterior, ...fila }: FilaFactura): FacturaConAumento {
  return { ...fila, aumento: detalleAumento(valorAnterior, fila.valorUnitario) };
}

function validarFactura(d: DatosFactura): void {
  const numero = d.numero.trim();
  const proveedor = d.proveedor.trim();
  if (numero.length < 1 || numero.length > LONGITUD_NUMERO_FACTURA) throw datosInvalidos("numero");
  if (proveedor.length < 1 || proveedor.length > LONGITUD_PROVEEDOR) throw datosInvalidos("proveedor");
  if (!esFechaValida(d.fecha)) throw datosInvalidos("fecha");
  if (!Number.isInteger(d.valorUnitario) || d.valorUnitario <= 0 || d.valorUnitario > MONTO_MAXIMO) {
    throw datosInvalidos("valorUnitario");
  }
}

/** CU-14: guarda la factura y avisa si el valor subió respecto a la factura anterior del producto. */
export async function registrarFactura(d: DatosFactura): Promise<FacturaConAumento> {
  validarFactura(d);
  if (!esUuid(d.productoId)) throw new ErrorDeNegocio("PRODUCTO_NO_ENCONTRADO");
  if (d.turnoId !== undefined && !esUuid(d.turnoId)) throw new ErrorDeNegocio("TURNO_NO_ENCONTRADO");

  return conErrores(() =>
    conTransaccion(async (tx) => {
      const [producto] = await filas<{ id: string }>(tx, "select id from productos where id = $1 for update", [d.productoId]);
      if (!producto) throw new ErrorDeNegocio("PRODUCTO_NO_ENCONTRADO");
      if (d.turnoId !== undefined) {
        const [turno] = await filas(tx, "select 1 from turnos where id = $1", [d.turnoId]);
        if (!turno) throw new ErrorDeNegocio("TURNO_NO_ENCONTRADO");
      }

      const [creada] = await filas<{ id: number }>(
        tx,
        `insert into facturas (numero, proveedor, fecha, producto_id, valor_unitario, turno_id)
         values ($1, $2, $3, $4, $5, $6)
         returning id`,
        [d.numero.trim(), d.proveedor.trim(), d.fecha, d.productoId, d.valorUnitario, d.turnoId ?? null],
      );
      if (!creada) throw new Error("La inserción de la factura no devolvió el id.");

      const [fila] = await filas<FilaFactura>(
        tx,
        `select * from (${SELECT_FACTURAS} where f.producto_id = $1) x where x.id = $2`,
        [d.productoId, creada.id],
      );
      if (!fila) throw new Error("No se pudo leer la factura registrada.");
      return conAumento(fila);
    }),
  );
}

/** Historial de facturas (más recientes primero), con el aumento de cada una frente a la anterior del producto. */
export async function listarFacturas(f: { productoId?: string | undefined } = {}): Promise<FacturaConAumento[]> {
  if (f.productoId !== undefined && !esUuid(f.productoId)) return [];
  const resultado = f.productoId
    ? await filas<FilaFactura>(
        null,
        `${SELECT_FACTURAS} where f.producto_id = $1 order by f.fecha desc, f.id desc limit $2`,
        [f.productoId, LIMITE_LISTADO],
      )
    : await filas<FilaFactura>(null, `${SELECT_FACTURAS} order by f.fecha desc, f.id desc limit $1`, [LIMITE_LISTADO]);
  return resultado.map(conAumento);
}
