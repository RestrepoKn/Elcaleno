"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import type { FacturaConAumento } from "@/lib/datos/tipos";
import { formatearPesos } from "@/lib/formato";
import { llamarApi, mensajeDeError } from "@/lib/inventario/cliente";

type Opcion = { valor: string; etiqueta: string };

/** CU-14: registra una factura de compra y avisa si el valor subió (RN-16). */
export function FormularioFactura({
  fechaHoy,
  productos,
  turnos,
}: {
  fechaHoy: string;
  productos: Opcion[];
  turnos: Opcion[];
}) {
  const router = useRouter();
  const [numero, setNumero] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [fecha, setFecha] = useState(fechaHoy);
  const [productoId, setProductoId] = useState(productos[0]?.valor ?? "");
  const [valor, setValor] = useState("");
  const [turnoId, setTurnoId] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<
    { tipo: "error"; texto: string } | { tipo: "ok"; factura: FacturaConAumento } | null
  >(null);
  const [guardando, setGuardando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setResultado(null);
    const v = Number(valor);
    const e: Record<string, string> = {};
    if (numero.trim() === "") e.numero = "Escriba el número de la factura.";
    if (proveedor.trim() === "") e.proveedor = "Escriba el proveedor.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) e.fecha = "Elija la fecha.";
    if (!productoId) e.productoId = "Elija el producto.";
    if (!Number.isInteger(v) || v <= 0) e.valor = "Pesos enteros, mayor que 0.";
    setErrores(e);
    if (Object.keys(e).length > 0) return;

    setGuardando(true);
    try {
      const factura = await llamarApi<FacturaConAumento>("/facturas", {
        metodo: "POST",
        cuerpo: {
          numero: numero.trim(),
          proveedor: proveedor.trim(),
          fecha,
          productoId,
          valorUnitario: v,
          ...(turnoId ? { turnoId } : {}),
        },
      });
      setResultado({ tipo: "ok", factura });
      setNumero("");
      setValor("");
      router.refresh();
    } catch (err) {
      setResultado({ tipo: "error", texto: mensajeDeError(err) });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {resultado?.tipo === "error" ? <Aviso tipo="error">{resultado.texto}</Aviso> : null}
      {resultado?.tipo === "ok" && resultado.factura.aumento ? (
        <Aviso tipo="advertencia" titulo="Aumento de precio">
          {resultado.factura.producto} subió de {formatearPesos(resultado.factura.aumento.anterior)} a{" "}
          {formatearPesos(resultado.factura.aumento.nuevo)} (+{formatearPesos(resultado.factura.aumento.diferencia)}) frente a la
          factura anterior.
        </Aviso>
      ) : null}
      {resultado?.tipo === "ok" && !resultado.factura.aumento ? (
        <Aviso tipo="exito">Factura {resultado.factura.numero} registrada. Sin aumento de precio.</Aviso>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Número de factura" value={numero} onChange={(ev) => setNumero(ev.target.value)} maxLength={40} error={errores.numero} autoComplete="off" />
        <Campo etiqueta="Proveedor" value={proveedor} onChange={(ev) => setProveedor(ev.target.value)} maxLength={120} error={errores.proveedor} />
        <Campo etiqueta="Fecha" type="date" value={fecha} onChange={(ev) => setFecha(ev.target.value)} error={errores.fecha} />
        <Selector etiqueta="Producto" opciones={productos} value={productoId} onChange={(ev) => setProductoId(ev.target.value)} error={errores.productoId} />
        <Campo
          etiqueta="Valor unitario de compra (pesos)"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={valor}
          onChange={(ev) => setValor(ev.target.value)}
          error={errores.valor}
          ayuda="Costo de compra al proveedor; no cambia el valor de venta del producto."
        />
        <Selector
          etiqueta="Turno (opcional)"
          opciones={[{ valor: "", etiqueta: "Sin turno" }, ...turnos]}
          value={turnoId}
          onChange={(ev) => setTurnoId(ev.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Boton type="submit" cargando={guardando} disabled={productos.length === 0}>
          Registrar factura
        </Boton>
      </div>
    </form>
  );
}
