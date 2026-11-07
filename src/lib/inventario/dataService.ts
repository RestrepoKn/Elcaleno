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
  eliminarTurno,
  entregarTurno,
  listarTurnos,
  obtenerTurno,
  obtenerTurnoAbierto,
  registrarFinanzas,
  tieneTurnoPosterior,
} from "@/lib/datos/turnos";

export {
  actualizarRegistro,
  ajustarInicial,
  registrarConteo,
  registrarMovimiento,
} from "@/lib/datos/registros";

export { inventarioActual } from "@/lib/datos/inventario";

// Opcionales (P09)
export { listarCocina, productosDeCocina, registrarTurnoCocina } from "@/lib/datos/cocina";
export { listarFacturas, registrarFactura } from "@/lib/datos/facturas";

// Buzón de sugerencias (M5)
export {
  contarSugerenciasNoLeidas,
  crearSugerencia,
  eliminarSugerencia,
  listarMisSugerencias,
  listarSugerencias,
  marcarSugerencia,
} from "@/lib/datos/sugerencias";

// Fotos de facturas del turno (M4)
export { borrarFoto, listarFotos, obtenerArchivoFoto, subirFoto } from "@/lib/datos/fotos";

export type {
  CambiosProducto,
  CambiosRegistro,
  DatosCocina,
  DatosFactura,
  DatosProducto,
  FacturaConAumento,
  FotoTurno,
  RegistroCocina,
  Sugerencia,
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
