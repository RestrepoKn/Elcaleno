// Fotos de facturas del turno (extensión M4).
// Orden al subir: validar → comprobar turno y permiso → subir a Storage → registrar en la base.
// Si el registro falla, se borra el objeto subido para no dejar archivos huérfanos.

import { randomUUID } from "node:crypto";
import { FOTOS_MAXIMAS_POR_TURNO } from "@/lib/config/inventario";
import { borrarObjetos, descargarObjeto, subirObjeto } from "@/lib/db/almacenamiento.mjs";
import { conErrores, esUuid, filas } from "@/lib/datos/comun";
import type { FotoTurno, Rol } from "@/lib/datos/tipos";
import { ErrorDeNegocio } from "@/lib/reglas/errores";
import { extensionDeFoto, puedeBorrarFoto, puedeSubirFoto, validarArchivoFoto } from "@/lib/reglas/fotos";
import type { EstadoTurno } from "@/lib/reglas/turno";

type Usuario = { email: string; rol: Rol };
type FilaFoto = FotoTurno & { ruta: string };

const SELECT_FOTO = `
  select id, turno_id as "turnoId", ruta, nombre_original as "nombreOriginal", tipo, tamano,
         subida_por as "subidaPor", created_at as "createdAt"
  from fotos_turno`;

/** La ruta de Storage no sale del servidor. */
function sinRuta(fila: FilaFoto): FotoTurno {
  const { id, turnoId, nombreOriginal, tipo, tamano, subidaPor, createdAt } = fila;
  return { id, turnoId, nombreOriginal, tipo, tamano, subidaPor, createdAt };
}

async function estadoDelTurno(turnoId: string): Promise<EstadoTurno> {
  const [turno] = esUuid(turnoId)
    ? await filas<{ estado: EstadoTurno }>(null, "select estado from turnos where id = $1", [turnoId])
    : [];
  if (!turno) throw new ErrorDeNegocio("TURNO_NO_ENCONTRADO");
  return turno.estado;
}

async function fotoDelTurno(turnoId: string, fotoId: number): Promise<FilaFoto> {
  const [foto] =
    esUuid(turnoId) && Number.isSafeInteger(fotoId) && fotoId > 0
      ? await filas<FilaFoto>(null, `${SELECT_FOTO} where id = $1 and turno_id = $2`, [fotoId, turnoId])
      : [];
  if (!foto) throw new ErrorDeNegocio("FOTO_NO_ENCONTRADA");
  return foto;
}

export async function listarFotos(turnoId: string): Promise<FotoTurno[]> {
  if (!esUuid(turnoId)) return [];
  const resultado = await filas<FilaFoto>(null, `${SELECT_FOTO} where turno_id = $1 order by created_at, id`, [turnoId]);
  return resultado.map(sinRuta);
}

export async function subirFoto(
  turnoId: string,
  archivo: { bytes: Uint8Array; tipo: string; nombre: string | null },
  usuario: Usuario,
): Promise<FotoTurno> {
  validarArchivoFoto(archivo.tipo, archivo.bytes.byteLength);
  const tipo = archivo.tipo;
  const estado = await estadoDelTurno(turnoId);
  if (!puedeSubirFoto(estado, usuario.rol)) {
    throw new ErrorDeNegocio(estado === "cerrado" ? "TURNO_NO_EDITABLE" : "SIN_PERMISO");
  }
  const [conteo] = await filas<{ n: number }>(null, "select count(*) as n from fotos_turno where turno_id = $1", [turnoId]);
  if ((conteo?.n ?? 0) >= FOTOS_MAXIMAS_POR_TURNO) {
    throw new ErrorDeNegocio("FOTO_INVALIDA", `El turno ya tiene ${FOTOS_MAXIMAS_POR_TURNO} fotos.`);
  }

  const ruta = `${turnoId}/${randomUUID()}.${extensionDeFoto(tipo)}`;
  await subirObjeto(ruta, archivo.bytes, tipo);
  try {
    return await conErrores(async () => {
      const [foto] = await filas<FilaFoto>(
        null,
        `insert into fotos_turno (turno_id, ruta, nombre_original, tipo, tamano, subida_por)
         values ($1, $2, $3, $4, $5, $6)
         returning id, turno_id as "turnoId", ruta, nombre_original as "nombreOriginal", tipo, tamano,
                   subida_por as "subidaPor", created_at as "createdAt"`,
        [turnoId, ruta, archivo.nombre?.slice(0, 200) ?? null, tipo, archivo.bytes.byteLength, usuario.email],
      );
      if (!foto) throw new Error("El registro de la foto no devolvió la fila.");
      return sinRuta(foto);
    });
  } catch (error) {
    await borrarObjetos([ruta]).catch((e) => console.error("[inventario] no se pudo borrar la foto huérfana", e));
    throw error;
  }
}

/** Contenido de la foto para mostrarla (la ruta de Storage nunca sale del servidor). */
export async function obtenerArchivoFoto(turnoId: string, fotoId: number): Promise<{ bytes: ArrayBuffer; tipo: string }> {
  const foto = await fotoDelTurno(turnoId, fotoId);
  const archivo = await descargarObjeto(foto.ruta);
  if (!archivo) throw new ErrorDeNegocio("FOTO_NO_ENCONTRADA");
  return { bytes: archivo.bytes, tipo: foto.tipo };
}

export async function borrarFoto(turnoId: string, fotoId: number, usuario: Usuario): Promise<void> {
  const foto = await fotoDelTurno(turnoId, fotoId);
  const estado = await estadoDelTurno(turnoId);
  if (!puedeBorrarFoto(estado, usuario.rol, foto.subidaPor === usuario.email)) {
    throw new ErrorDeNegocio(estado === "cerrado" ? "TURNO_NO_EDITABLE" : "SIN_PERMISO");
  }
  await filas(null, "delete from fotos_turno where id = $1", [foto.id]);
  await borrarObjetos([foto.ruta]).catch((e) => console.error("[inventario] no se pudo borrar el archivo de la foto", e));
}
