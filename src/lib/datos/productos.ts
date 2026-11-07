// Productos del inventario: CU-01 y CU-02 (RN-01, RN-02, RN-09, RN-13).
// Las operaciones de escritura exigen rol administrador en la ruta, no aquí.

import type { PoolClient } from "pg";
import { conTransaccion } from "@/lib/db/conexion";
import { conErrores, esUuid, filas } from "@/lib/datos/comun";
import type { CambiosProducto, DatosProducto, FiltrosProductos, Producto } from "@/lib/datos/tipos";
import { datosInvalidos, ErrorDeNegocio } from "@/lib/reglas/errores";
import { esSeccionValida, umbralesPorDefecto, validarProducto } from "@/lib/reglas/producto";

const SELECT_PRODUCTO = `
  select id, nombre, seccion, categoria, valor_unitario as "valorUnitario",
         umbral_alerta as "umbralAlerta", umbral_critico as "umbralCritico", activo
  from productos`;

export async function listarProductos(f: FiltrosProductos = {}): Promise<Producto[]> {
  const condiciones: string[] = [];
  const valores: unknown[] = [];
  if (f.seccion) {
    valores.push(f.seccion);
    condiciones.push(`seccion = $${valores.length}`);
  }
  if (f.soloActivos) condiciones.push("activo");
  const donde = condiciones.length > 0 ? `where ${condiciones.join(" and ")}` : "";
  return filas<Producto>(null, `${SELECT_PRODUCTO} ${donde} order by seccion, lower(nombre)`, valores);
}

export async function obtenerProducto(id: string): Promise<Producto> {
  const [producto] = esUuid(id)
    ? await filas<Producto>(null, `${SELECT_PRODUCTO} where id = $1`, [id])
    : [];
  if (!producto) throw new ErrorDeNegocio("PRODUCTO_NO_ENCONTRADO");
  return producto;
}

/** CU-01: producto activo con los umbrales por defecto de su sección; si hay turno abierto, entra en él con inicial 0. */
export async function crearProducto(d: DatosProducto): Promise<{ id: string }> {
  if (!esSeccionValida(d.seccion)) throw datosInvalidos("seccion");
  const defecto = umbralesPorDefecto(d.seccion);
  const producto = {
    nombre: d.nombre.trim(),
    seccion: d.seccion,
    categoria: d.categoria.trim(),
    valorUnitario: d.valorUnitario,
    umbralAlerta: d.umbralAlerta ?? defecto.umbralAlerta,
    umbralCritico: d.umbralCritico !== undefined ? d.umbralCritico : defecto.umbralCritico,
  };
  validarProducto(producto);

  return conErrores(() =>
    conTransaccion(async (tx) => {
      const [creado] = await filas<{ id: string }>(
        tx,
        `insert into productos (nombre, seccion, categoria, valor_unitario, umbral_alerta, umbral_critico)
         values ($1, $2, $3, $4, $5, $6)
         returning id`,
        [
          producto.nombre,
          producto.seccion,
          producto.categoria,
          producto.valorUnitario,
          producto.umbralAlerta,
          producto.umbralCritico,
        ],
      );
      if (!creado) throw new Error("La inserción del producto no devolvió el id.");

      // RN-13: un producto creado con un turno abierto entra en ese turno con inicial 0.
      const [abierto] = await filas<{ id: string }>(
        tx,
        "select id from turnos where estado = 'abierto' for update",
      );
      if (abierto) {
        await filas(
          tx,
          `insert into registros_turno (turno_id, producto_id, nombre, seccion, valor_unitario, inicial)
           values ($1, $2, $3, $4, $5, 0)`,
          [abierto.id, creado.id, producto.nombre, producto.seccion, producto.valorUnitario],
        );
      }
      return { id: creado.id };
    }),
  );
}

/** CU-02: cambia nombre, categoría, valor, umbrales o activo. No afecta turnos ya abiertos (RN-08). */
export async function actualizarProducto(id: string, cambios: CambiosProducto): Promise<void> {
  if (!esUuid(id)) throw new ErrorDeNegocio("PRODUCTO_NO_ENCONTRADO");
  const hayCambios = Object.values(cambios).some((valor) => valor !== undefined);
  if (!hayCambios) throw datosInvalidos("cambios");

  await conErrores(() =>
    conTransaccion(async (tx) => {
      const [actual] = await filas<Producto>(tx, `${SELECT_PRODUCTO} where id = $1 for update`, [id]);
      if (!actual) throw new ErrorDeNegocio("PRODUCTO_NO_ENCONTRADO");

      const nuevo: Producto = {
        ...actual,
        nombre: cambios.nombre !== undefined ? cambios.nombre.trim() : actual.nombre,
        categoria: cambios.categoria !== undefined ? cambios.categoria.trim() : actual.categoria,
        valorUnitario: cambios.valorUnitario ?? actual.valorUnitario,
        umbralAlerta: cambios.umbralAlerta ?? actual.umbralAlerta,
        umbralCritico: cambios.umbralCritico !== undefined ? cambios.umbralCritico : actual.umbralCritico,
        activo: cambios.activo ?? actual.activo,
      };
      validarProducto(nuevo);

      await filas(
        tx,
        `update productos
         set nombre = $2, categoria = $3, valor_unitario = $4,
             umbral_alerta = $5, umbral_critico = $6, activo = $7
         where id = $1`,
        [id, nuevo.nombre, nuevo.categoria, nuevo.valorUnitario, nuevo.umbralAlerta, nuevo.umbralCritico, nuevo.activo],
      );
    }),
  );
}

/** Un producto no se elimina; se desactiva (RN-13). */
export async function desactivarProducto(id: string): Promise<void> {
  await actualizarProducto(id, { activo: false });
}

/** Interna: productos activos, para abrir un turno. */
export async function listarProductosActivos(tx: PoolClient): Promise<Producto[]> {
  return filas<Producto>(tx, `${SELECT_PRODUCTO} where activo order by seccion, lower(nombre)`);
}

/**
 * Interna (RN-09): último inventario de referencia del producto (el contado si existe; si no, el calculado),
 * sin contar el turno indicado. 0 si el producto no tiene historial.
 */
export async function inicialSugerido(
  tx: PoolClient,
  productoId: string,
  excluirTurnoId: string,
): Promise<number> {
  const [ultimo] = await filas<{ inventario: number }>(
    tx,
    `select v.inventario_referencia as inventario
     from v_registros_turno v
     join turnos t on t.id = v.turno_id
     where v.producto_id = $1 and v.turno_id <> $2
     order by t.fecha desc, t.created_at desc
     limit 1`,
    [productoId, excluirTurnoId],
  );
  return ultimo?.inventario ?? 0;
}
