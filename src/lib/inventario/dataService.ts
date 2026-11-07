// Fachada única de datos del inventario (plan, sección 10.6).
// Las rutas y páginas del inventario importan datos SOLO desde aquí.
// No confundir con src/lib/dataService.ts, que es del módulo de recuperación de contraseña.
// La sesión no se exporta aquí (está en @/lib/auth/sesion), para que los scripts con tsx puedan usar esta fachada.

export {
  actualizarProducto,
  crearProducto,
  desactivarProducto,
  listarProductos,
  obtenerProducto,
} from "@/lib/datos/productos";

export {
  abrirTurno,
  cerrarTurno,
  devolverTurno,
  entregarTurno,
  listarTurnos,
  obtenerTurno,
  obtenerTurnoAbierto,
  registrarFinanzas,
} from "@/lib/datos/turnos";

export {
  actualizarRegistro,
  ajustarInicial,
  registrarConteo,
  registrarMovimiento,
} from "@/lib/datos/registros";

export { inventarioActual } from "@/lib/datos/inventario";

export type {
  CambiosProducto,
  CambiosRegistro,
  DatosProducto,
  DatosTurno,
  FilaInventario,
  Finanzas,
  FiltrosInventario,
  FiltrosProductos,
  Producto,
  RegistroTurno,
  Rol,
  TurnoDetalle,
  TurnoResumen,
} from "@/lib/datos/tipos";
