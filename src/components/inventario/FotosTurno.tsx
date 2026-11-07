"use client";

import { useRef, useState } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Modal } from "@/components/ui/Modal";
import { FOTO_TAMANO_MAXIMO, FOTOS_MAXIMAS_POR_TURNO } from "@/lib/config/inventario";
import type { FotoTurno, Rol } from "@/lib/datos/tipos";
import { formatearFechaHora } from "@/lib/formato";
import { enviarArchivo, llamarApi, mensajeDeError } from "@/lib/inventario/cliente";
import { puedeBorrarFoto, puedeSubirFoto } from "@/lib/reglas/fotos";
import type { EstadoTurno } from "@/lib/reglas/turno";

const LADO_MAXIMO = 1600;

/** Reduce la foto a JPEG de máximo 1600 px de lado, para que suba rápido y quepa en el límite de Vercel. */
async function reducirFoto(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  const contexto = lienzo.getContext("2d");
  if (!contexto) throw new Error("sin lienzo");
  contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  imagen.close();
  for (const calidad of [0.82, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/jpeg", calidad));
    if (blob && blob.size <= FOTO_TAMANO_MAXIMO) return blob;
  }
  throw new Error("muy grande");
}

const urlFoto = (turnoId: string, fotoId: number) => `/api/inventario/turnos/${turnoId}/fotos/${fotoId}`;

/** Fotos de las facturas pagadas con la caja durante el turno. */
export function FotosTurno({
  turnoId,
  estado,
  rol,
  email,
  fotosIniciales,
}: {
  turnoId: string;
  estado: EstadoTurno;
  rol: Rol;
  email: string;
  fotosIniciales: FotoTurno[];
}) {
  const [fotos, setFotos] = useState(fotosIniciales);
  const [subiendo, setSubiendo] = useState<{ hechas: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viendo, setViendo] = useState<FotoTurno | null>(null);
  const [borrando, setBorrando] = useState(false);
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  const puedeSubir = puedeSubirFoto(estado, rol) && fotos.length < FOTOS_MAXIMAS_POR_TURNO;

  async function subir(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    setError(null);
    const archivos = Array.from(lista).slice(0, FOTOS_MAXIMAS_POR_TURNO - fotos.length);
    setSubiendo({ hechas: 0, total: archivos.length });
    for (const [i, archivo] of archivos.entries()) {
      try {
        let reducida: Blob;
        try {
          reducida = await reducirFoto(archivo);
        } catch {
          throw new Error(`No se pudo leer "${archivo.name}". Use una foto JPG o PNG.`);
        }
        const foto = await enviarArchivo<FotoTurno>(`/turnos/${turnoId}/fotos`, "foto", reducida, "factura.jpg");
        setFotos((actuales) => [...actuales, foto]);
      } catch (err) {
        setError(err instanceof Error && !("codigo" in err) ? err.message : mensajeDeError(err));
        break;
      } finally {
        setSubiendo({ hechas: i + 1, total: archivos.length });
      }
    }
    setSubiendo(null);
    if (camara.current) camara.current.value = "";
    if (galeria.current) galeria.current.value = "";
  }

  async function borrar(foto: FotoTurno) {
    setBorrando(true);
    setError(null);
    try {
      await llamarApi(`/turnos/${turnoId}/fotos/${foto.id}`, { metodo: "DELETE" });
      setFotos((actuales) => actuales.filter((f) => f.id !== foto.id));
      setViendo(null);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setBorrando(false);
    }
  }

  return (
    <section aria-labelledby={`fotos-${turnoId}`} className="flex flex-col gap-3 rounded-xl border border-borde bg-superficie p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id={`fotos-${turnoId}`} className="text-lg font-semibold text-texto">
            Fotos de facturas <span className="text-sm font-normal text-texto-suave">· {fotos.length}</span>
          </h2>
          <p className="text-xs text-texto-suave">Recibos pagados con la caja durante el turno.</p>
        </div>
        {puedeSubir ? (
          <div className="flex flex-wrap gap-2">
            <Boton onClick={() => camara.current?.click()} cargando={subiendo !== null}>
              Tomar foto
            </Boton>
            <Boton variante="secundario" onClick={() => galeria.current?.click()} disabled={subiendo !== null}>
              Elegir de la galería
            </Boton>
            {/* La cámara trasera se abre directo en el celular; en el computador abre el selector de archivos. */}
            <input ref={camara} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => subir(e.target.files)} />
            <input ref={galeria} type="file" accept="image/jpeg,image/png,image/webp,image/*" multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => subir(e.target.files)} />
          </div>
        ) : null}
      </div>

      {subiendo ? (
        <p role="status" className="text-sm text-texto-suave">
          Subiendo {Math.min(subiendo.hechas + 1, subiendo.total)} de {subiendo.total}…
        </p>
      ) : null}
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      {estado === "cerrado" ? <p className="text-xs text-texto-suave">Turno cerrado: las fotos se pueden ver, no agregar ni borrar.</p> : null}
      {estado === "en_revision" && rol === "encargado" ? (
        <p className="text-xs text-texto-suave">El turno fue entregado: solo el administrador puede agregar fotos.</p>
      ) : null}

      {fotos.length === 0 ? (
        <p className="text-sm text-texto-suave">Aún no hay fotos en este turno.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {fotos.map((f, i) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => setViendo(f)}
                className="block aspect-square w-full overflow-hidden rounded-lg border border-borde bg-fondo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
                aria-label={`Ver la foto ${i + 1}, subida el ${formatearFechaHora(f.createdAt)}`}
              >
                {/* Imagen protegida por sesión desde la API: next/image no aplica aquí. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urlFoto(turnoId, f.id)} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        abierto={viendo !== null}
        titulo="Foto de factura"
        onCerrar={() => setViendo(null)}
        acciones={
          viendo ? (
            <>
              <a
                href={urlFoto(turnoId, viendo.id)}
                target="_blank"
                rel="noopener"
                className="inline-flex min-h-11 items-center rounded-lg border border-borde px-4 text-sm font-semibold text-texto hover:bg-primario-suave"
              >
                Abrir en tamaño completo
              </a>
              {puedeBorrarFoto(estado, rol, viendo.subidaPor === email) ? (
                <Boton variante="peligro" onClick={() => borrar(viendo)} cargando={borrando}>
                  Borrar
                </Boton>
              ) : null}
              <Boton variante="secundario" onClick={() => setViendo(null)}>
                Cerrar
              </Boton>
            </>
          ) : null
        }
      >
        {viendo ? (
          <div className="flex flex-col gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlFoto(turnoId, viendo.id)} alt="Foto de la factura" className="max-h-[60vh] w-full rounded-lg object-contain" />
            <p className="text-xs text-texto-suave">
              Subida por {viendo.subidaPor} · {formatearFechaHora(viendo.createdAt)}
            </p>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
