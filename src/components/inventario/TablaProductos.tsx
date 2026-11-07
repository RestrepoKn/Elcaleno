"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormularioProducto } from "@/components/inventario/FormularioProducto";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Insignia } from "@/components/ui/Insignia";
import { Modal } from "@/components/ui/Modal";
import type { Producto } from "@/lib/datos/tipos";
import { formatearPesos } from "@/lib/formato";
import { llamarApi, mensajeDeError } from "@/lib/inventario/cliente";
import type { Seccion } from "@/lib/reglas/producto";

type Filtro = "todas" | Seccion;
const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: "todas", texto: "Todas" },
  { valor: "bar", texto: "Bar" },
  { valor: "helados", texto: "Helados" },
];

function umbrales(p: Producto): string {
  return p.umbralCritico === null ? `< ${p.umbralAlerta}` : `< ${p.umbralAlerta} · < ${p.umbralCritico}`;
}

export function TablaProductos({ productos }: { productos: Producto[] }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [editando, setEditando] = useState<Producto | null>(null);
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibles = productos.filter((p) => filtro === "todas" || p.seccion === filtro);

  async function alternarActivo(p: Producto) {
    setError(null);
    setCambiando(p.id);
    try {
      await llamarApi(`/productos/${p.id}`, { metodo: "PATCH", cuerpo: { activo: !p.activo } });
      router.refresh();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCambiando(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Filtrar por sección" className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Boton
            key={f.valor}
            tamano="sm"
            variante={filtro === f.valor ? "primario" : "secundario"}
            aria-pressed={filtro === f.valor}
            onClick={() => setFiltro(f.valor)}
          >
            {f.texto}
          </Boton>
        ))}
      </div>

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      {visibles.length === 0 ? (
        <EstadoVacio titulo="No hay productos en esta sección" descripcion="Use “Nuevo producto” para registrarlos." />
      ) : (
        <ul className="flex flex-col gap-2">
          {visibles.map((p) => (
            <li
              key={p.id}
              className={`flex flex-col gap-3 rounded-xl border border-borde bg-superficie p-4 sm:flex-row sm:items-center sm:justify-between
                ${p.activo ? "" : "opacity-70"}`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-texto">{p.nombre}</p>
                  <Insignia tono={p.seccion === "bar" ? "primario" : "neutro"}>
                    {p.seccion === "bar" ? "Bar" : "Helados"}
                  </Insignia>
                  {p.activo ? null : <Insignia tono="cerrado">Inactivo</Insignia>}
                </div>
                <p className="mt-1 text-sm text-texto-suave">
                  {p.categoria} · <span className="tabular-nums">{formatearPesos(p.valorUnitario)}</span> · umbrales{" "}
                  <span className="tabular-nums">{umbrales(p)}</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Boton tamano="sm" variante="secundario" onClick={() => setEditando(p)}>
                  Editar
                </Boton>
                <Boton
                  tamano="sm"
                  variante={p.activo ? "fantasma" : "secundario"}
                  cargando={cambiando === p.id}
                  onClick={() => alternarActivo(p)}
                  aria-label={`${p.activo ? "Desactivar" : "Activar"} ${p.nombre}`}
                >
                  {p.activo ? "Desactivar" : "Activar"}
                </Boton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal abierto={editando !== null} titulo={`Editar ${editando?.nombre ?? ""}`} onCerrar={() => setEditando(null)}>
        {editando ? (
          <FormularioProducto key={editando.id} producto={editando} alGuardar={() => setEditando(null)} />
        ) : null}
      </Modal>
    </div>
  );
}
