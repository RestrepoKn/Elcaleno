// Fotos de facturas del turno (extensión M4): quién sube, quién borra y qué archivo se acepta.
// Un turno cerrado es inmutable (RN-14): sus fotos se ven, pero no se agregan ni se borran.

import { FOTO_TAMANO_MAXIMO, FOTO_TIPOS } from "@/lib/config/inventario";
import { ErrorDeNegocio } from "@/lib/reglas/errores";
import type { EstadoTurno } from "@/lib/reglas/turno";

type RolFoto = "administrador" | "encargado";
export type TipoFoto = (typeof FOTO_TIPOS)[number];

/** Abierto: ambos roles. En revisión: solo el administrador. Cerrado: nadie. */
export function puedeSubirFoto(estado: EstadoTurno, rol: RolFoto): boolean {
  if (estado === "cerrado") return false;
  return estado === "abierto" || rol === "administrador";
}

/** El administrador borra cualquiera mientras el turno no esté cerrado; el encargado, solo las suyas y con el turno abierto. */
export function puedeBorrarFoto(estado: EstadoTurno, rol: RolFoto, esPropia: boolean): boolean {
  if (estado === "cerrado") return false;
  if (rol === "administrador") return true;
  return estado === "abierto" && esPropia;
}

export function esTipoFoto(tipo: string): tipo is TipoFoto {
  return (FOTO_TIPOS as readonly string[]).includes(tipo);
}

/** Lanza FOTO_INVALIDA si el archivo no es una imagen permitida o supera el tamaño máximo. */
export function validarArchivoFoto(tipo: string, tamano: number): asserts tipo is TipoFoto {
  if (!esTipoFoto(tipo) || !Number.isInteger(tamano) || tamano <= 0 || tamano > FOTO_TAMANO_MAXIMO) {
    throw new ErrorDeNegocio("FOTO_INVALIDA", undefined, { tipo, tamano });
  }
}

export function extensionDeFoto(tipo: TipoFoto): "jpg" | "png" | "webp" {
  return tipo === "image/png" ? "png" : tipo === "image/webp" ? "webp" : "jpg";
}
