"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { CATEGORIAS_BAR, CATEGORIA_HELADOS } from "@/lib/config/inventario";
import type { Producto } from "@/lib/datos/tipos";
import { llamarApi, mensajeDeError } from "@/lib/inventario/cliente";
import { umbralesPorDefecto, type Seccion } from "@/lib/reglas/producto";

const OPCIONES_SECCION = [
  { valor: "bar", etiqueta: "Bar" },
  { valor: "helados", etiqueta: "Helados" },
] as const;

function categoriasDe(seccion: Seccion) {
  const lista = seccion === "bar" ? [...CATEGORIAS_BAR] : [CATEGORIA_HELADOS];
  return lista.map((c) => ({ valor: c, etiqueta: c }));
}

function aEntero(texto: string): number {
  return texto.trim() === "" ? Number.NaN : Number(texto);
}

/**
 * Alta (POST) o edición (PATCH) de un producto. La sección no se cambia después de creado (RN-01).
 * Los umbrales se precargan con los de la sección (RN-02).
 */
export function FormularioProducto({
  producto,
  alGuardar,
}: {
  producto?: Producto;
  alGuardar?: () => void;
}) {
  const router = useRouter();
  const edicion = producto !== undefined;
  const [seccion, setSeccion] = useState<Seccion>(producto?.seccion ?? "bar");
  const defecto = umbralesPorDefecto(seccion);
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [categoria, setCategoria] = useState(producto?.categoria ?? CATEGORIAS_BAR[0]);
  const [valor, setValor] = useState(producto ? String(producto.valorUnitario) : "");
  const [umbralAlerta, setUmbralAlerta] = useState(String(producto?.umbralAlerta ?? defecto.umbralAlerta));
  const [umbralCritico, setUmbralCritico] = useState(
    String(producto?.umbralCritico ?? defecto.umbralCritico ?? ""),
  );
  const [error, setError] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  function cambiarSeccion(nueva: Seccion) {
    const d = umbralesPorDefecto(nueva);
    setSeccion(nueva);
    setCategoria(nueva === "bar" ? CATEGORIAS_BAR[0] : CATEGORIA_HELADOS);
    setUmbralAlerta(String(d.umbralAlerta));
    setUmbralCritico(d.umbralCritico === null ? "" : String(d.umbralCritico));
  }

  function validar(): Record<string, string> {
    const e: Record<string, string> = {};
    if (nombre.trim() === "") e.nombre = "Escriba el nombre.";
    const v = aEntero(valor);
    if (!Number.isInteger(v) || v <= 0) e.valor = "Valor en pesos enteros, mayor que 0.";
    const a = aEntero(umbralAlerta);
    if (!Number.isInteger(a) || a <= 0) e.umbralAlerta = "Entero mayor que 0.";
    if (seccion === "helados") {
      const c = aEntero(umbralCritico);
      if (!Number.isInteger(c) || c <= 0) e.umbralCritico = "Entero mayor que 0.";
      else if (Number.isInteger(a) && c >= a) e.umbralCritico = "Debe ser menor que el umbral amarillo.";
    }
    return e;
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length > 0) return;

    const datos = {
      nombre: nombre.trim(),
      categoria,
      valorUnitario: aEntero(valor),
      umbralAlerta: aEntero(umbralAlerta),
      umbralCritico: seccion === "helados" ? aEntero(umbralCritico) : null,
    };
    setGuardando(true);
    try {
      if (edicion) {
        await llamarApi(`/productos/${producto.id}`, { metodo: "PATCH", cuerpo: datos });
      } else {
        await llamarApi("/productos", { metodo: "POST", cuerpo: { ...datos, seccion } });
      }
      router.refresh();
      if (alGuardar) alGuardar();
      else router.push("/inventario/productos");
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {error ? <Aviso tipo="error">{error}</Aviso> : null}
      <Campo
        etiqueta="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        maxLength={160}
        required
        autoComplete="off"
        error={errores.nombre}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Selector
          etiqueta="Sección"
          opciones={OPCIONES_SECCION}
          value={seccion}
          onChange={(e) => cambiarSeccion(e.target.value as Seccion)}
          disabled={edicion}
          ayuda={edicion ? "La sección no se cambia después de creado el producto." : undefined}
        />
        <Selector
          etiqueta="Categoría"
          opciones={categoriasDe(seccion)}
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        />
      </div>
      <Campo
        etiqueta="Valor unitario (pesos)"
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        required
        error={errores.valor}
        ayuda={edicion ? "El cambio aplica desde el siguiente turno; el turno abierto conserva su valor." : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta={seccion === "bar" ? "Umbral de reposición" : "Umbral amarillo"}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={umbralAlerta}
          onChange={(e) => setUmbralAlerta(e.target.value)}
          error={errores.umbralAlerta}
          ayuda={seccion === "bar" ? "Alerta con menos de estas unidades (por defecto 6)." : "Amarilla con menos de estas unidades (por defecto 5)."}
        />
        {seccion === "helados" ? (
          <Campo
            etiqueta="Umbral rojo"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={umbralCritico}
            onChange={(e) => setUmbralCritico(e.target.value)}
            error={errores.umbralCritico}
            ayuda="Roja con menos de estas unidades (por defecto 3)."
          />
        ) : null}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {!edicion ? (
          <Boton variante="secundario" onClick={() => router.push("/inventario/productos")}>
            Cancelar
          </Boton>
        ) : null}
        <Boton type="submit" cargando={guardando}>
          {edicion ? "Guardar cambios" : "Crear producto"}
        </Boton>
      </div>
    </form>
  );
}
