"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Diálogo modal sobre <dialog>: el navegador maneja el foco, la tecla Escape y el fondo inerte.
 */
export function Modal({
  abierto,
  titulo,
  onCerrar,
  children,
  acciones,
}: {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  acciones?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      onClose={onCerrar}
      onCancel={(e) => {
        e.preventDefault();
        onCerrar();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-borde bg-superficie p-0
        text-texto shadow-xl backdrop:bg-black/40"
    >
      <div className="flex flex-col gap-4 p-5">
        <h2 id={idTitulo} className="text-lg font-semibold">
          {titulo}
        </h2>
        <div className="text-sm">{children}</div>
        {acciones ? <div className="flex flex-wrap justify-end gap-2">{acciones}</div> : null}
      </div>
    </dialog>
  );
}
