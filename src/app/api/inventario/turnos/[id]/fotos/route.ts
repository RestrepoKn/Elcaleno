import { exigirSesion } from "@/lib/auth/sesion";
import { FOTO_TAMANO_MAXIMO } from "@/lib/config/inventario";
import type { ContextoRuta } from "@/lib/http/consulta";
import { conManejoDeErrores, responderOk } from "@/lib/http/respuestas";
import { listarFotos, subirFoto } from "@/lib/inventario/dataService";
import { ErrorDeNegocio } from "@/lib/reglas/errores";

export const dynamic = "force-dynamic";

/** GET /api/inventario/turnos/[id]/fotos → FotoTurno[] (ambos roles). */
export const GET = conManejoDeErrores(async (_request: Request, { params }: ContextoRuta<{ id: string }>) => {
  await exigirSesion();
  const { id } = await params;
  return responderOk(await listarFotos(id));
});

/**
 * POST /api/inventario/turnos/[id]/fotos (multipart, campo "foto") → FotoTurno (201).
 * Turno abierto: ambos roles; en revisión: administrador; cerrado: nadie.
 */
export const POST = conManejoDeErrores(async (request: Request, { params }: ContextoRuta<{ id: string }>) => {
  const usuario = await exigirSesion();
  const { id } = await params;

  let formulario: FormData;
  try {
    formulario = await request.formData();
  } catch {
    throw new ErrorDeNegocio("FOTO_INVALIDA");
  }
  const archivo = formulario.get("foto");
  if (!(archivo instanceof File) || archivo.size === 0 || archivo.size > FOTO_TAMANO_MAXIMO) {
    throw new ErrorDeNegocio("FOTO_INVALIDA");
  }
  const foto = await subirFoto(
    id,
    { bytes: new Uint8Array(await archivo.arrayBuffer()), tipo: archivo.type, nombre: archivo.name || null },
    usuario,
  );
  return responderOk(foto, 201);
});
