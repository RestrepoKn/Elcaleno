// Tipos de la capa de datos del inventario (plan, sección 10.6).

import type { NivelAlerta } from "@/lib/reglas/alertas";
import type { Seccion } from "@/lib/reglas/producto";
import type { EstadoConteo } from "@/lib/reglas/registro";
import type { EstadoTurno } from "@/lib/reglas/turno";

export type Rol = "administrador" | "encargado";

export type Producto = {
  id: string;
  nombre: string;
  seccion: Seccion;
  categoria: string;
  valorUnitario: number;
  umbralAlerta: number;
  umbralCritico: number | null;
  activo: boolean;
};

export type DatosProducto = {
  nombre: string;
  seccion: Seccion;
  categoria: string;
  valorUnitario: number;
  umbralAlerta?: number | undefined;
  umbralCritico?: number | null | undefined;
};

/** La sección no se cambia después de creado el producto (RN-01). */
export type CambiosProducto = {
  nombre?: string | undefined;
  categoria?: string | undefined;
  valorUnitario?: number | undefined;
  umbralAlerta?: number | undefined;
  umbralCritico?: number | null | undefined;
  activo?: boolean | undefined;
};

export type FiltrosProductos = { seccion?: Seccion | undefined; soloActivos?: boolean | undefined };

export type RegistroTurno = {
  id: number;
  turnoId: string;
  productoId: string;
  nombre: string;
  seccion: Seccion;
  valorUnitario: number;
  inicial: number;
  entrada: number;
  vendida: number;
  contado: number | null;
  finalCalculado: number;
  totalVenta: number;
  inventarioReferencia: number;
  faltante: number;
  sobrante: number;
  valorACancelar: number;
  estadoConteo: EstadoConteo;
  umbralAlerta: number;
  umbralCritico: number | null;
  nivelAlerta: NivelAlerta;
};

/** Cambios de una fila del turno; inicial solo lo envía una ruta con rol administrador (RN-09). */
export type CambiosRegistro = {
  entrada?: number | undefined;
  vendida?: number | undefined;
  contado?: number | undefined;
  inicial?: number | undefined;
};

export type DatosTurno = { fecha?: string | undefined; nombre: string; encargado: string };

export type Finanzas = { facturasEfectivo: number; pagoEncargado: number };

type CamposTurno = {
  id: string;
  fecha: string;
  nombre: string;
  encargado: string;
  estado: EstadoTurno;
  ventaTotal: number;
  totalACancelar: number;
  numRegistros: number;
  sinConteo: number;
  /** null para el encargado (sección 15) o mientras no se registren. */
  facturasEfectivo: number | null;
  pagoEncargado: number | null;
  resultadoNeto: number | null;
  /** Guardados al cerrar (RN-14); null mientras el turno no esté cerrado. */
  ventaTotalCierre: number | null;
  resultadoNetoCierre: number | null;
  entregadoAt: string | null;
  cerradoAt: string | null;
  createdAt: string;
};

export type TurnoResumen = CamposTurno;
export type TurnoDetalle = CamposTurno & { registros: RegistroTurno[] };

export type FilaInventario = {
  productoId: string;
  nombre: string;
  seccion: Seccion;
  categoria: string;
  valorUnitario: number;
  umbralAlerta: number;
  umbralCritico: number | null;
  turnoId: string;
  inventario: number;
  conteoFisico: boolean;
  nivelAlerta: NivelAlerta;
};

export type FiltrosInventario = {
  seccion?: Seccion | undefined;
  soloPorReponer?: boolean | undefined;
};
