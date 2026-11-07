import { exigirSesion } from "@/lib/auth/sesion";
import type { ContextoRuta } from "@/lib/http/consulta";
import { conManejoDeErrores, responderOk } from "@/lib/http/respuestas";
import { borrarFoto, obtenerArchivoFoto } from "@/lib/inventario/dataService";

export const dynamic = "force-dynamic";

type Contexto = ContextoRuta<{ id: string; fotoId: string }>;

/** GET → la imagen (ambos roles, con sesión). Las fotos nunca tienen dirección pública. */
export const GET = conManejoDeErrores(async (_request: Request, { params }: Contexto) => {
  await exigirSesion();
  const { id, fotoId } = await params;
  const archivo = await obtenerArchivoFoto(id, Number(fotoId));
  return new Response(archivo.bytes, {
    headers: {
      "Content-Type": archivo.tipo,
      // Privada: solo el navegador de quien la pidió la guarda, por poco tiempo.
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
});

/** DELETE → { borrada: true }. Administrador mientras el turno no esté cerrado; encargado, solo las suyas y con el turno abierto. */
export const DELETE = conManejoDeErrores(async (_request: Request, { params }: Contexto) => {
  const usuario = await exigirSesion();
  const { id, fotoId } = await params;
  await borrarFoto(id, Number(fotoId), usuario);
  return responderOk({ borrada: true });
});
