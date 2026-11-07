import type { ReactNode } from "react";

/**
 * Marco de las pantallas de acceso (login, recuperar y restablecer contraseña), con el diseño del inventario:
 * panel cereza con la marca y una tarjeta blanca con el formulario. En el celular, la marca va arriba.
 */
export function MarcoAcceso({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-1 flex-col bg-fondo text-texto md:flex-row">
      <section className="flex flex-col justify-between gap-6 bg-primario px-6 py-6 text-white md:w-[44%] md:px-12 md:py-12">
        <p className="text-sm font-semibold tracking-wide text-white/85">El Caleño</p>
        <div className="hidden md:block">
          <h1 className="text-4xl font-bold leading-tight lg:text-5xl">Inventario del bar</h1>
          <p className="mt-4 max-w-sm text-base leading-7 text-white/85">
            Turnos, conteo físico, faltantes y alertas de reposición del bar y los helados, en un solo lugar.
          </p>
        </div>
        <p className="hidden text-sm text-white/70 md:block">Bar · Helados · Cocina</p>
      </section>
      <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md rounded-xl border border-borde bg-superficie p-6 shadow-sm sm:p-8">{children}</div>
      </section>
    </main>
  );
}

/** Aviso de las pantallas de acceso (mismo estilo que Aviso del inventario). */
export function MensajeAcceso({ tipo, children }: { tipo: "error" | "exito"; children: ReactNode }) {
  const estilo =
    tipo === "error"
      ? "border-alerta-roja/40 bg-alerta-roja/10 text-alerta-roja-texto"
      : "border-ok/40 bg-ok/10 text-ok-texto";
  return (
    <p role={tipo === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${estilo}`}>
      {children}
    </p>
  );
}

export const claseEnlaceAcceso =
  "font-semibold text-primario underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario";
