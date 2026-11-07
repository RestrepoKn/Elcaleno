"use client";

import { useSyncExternalStore } from "react";

type Tema = "claro" | "oscuro";
const CLAVE = "tema";
const EVENTO = "cambio-tema";

function leerTema(): Tema {
  return document.documentElement.dataset.theme === "oscuro" ? "oscuro" : "claro";
}

function suscribir(aviso: () => void): () => void {
  window.addEventListener(EVENTO, aviso);
  window.addEventListener("storage", aviso);
  return () => {
    window.removeEventListener(EVENTO, aviso);
    window.removeEventListener("storage", aviso);
  };
}

/** Aplica y recuerda el tema en este navegador. */
function aplicarTema(tema: Tema): void {
  if (tema === "oscuro") document.documentElement.dataset.theme = "oscuro";
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem(CLAVE, tema);
  } catch {
    // Navegación privada o almacenamiento bloqueado: el tema se aplica igual, solo no se recuerda.
  }
  window.dispatchEvent(new Event(EVENTO));
}

const ESTILOS = {
  // Sobre la barra cereza (inventario y panel).
  barra: "text-white hover:bg-white/15 focus-visible:outline-white",
  // Pantallas de acceso: en el celular queda sobre la franja cereza; en el computador, sobre el fondo de la página.
  acceso: "text-white hover:bg-white/15 focus-visible:outline-white md:text-texto md:hover:bg-primario-suave md:focus-visible:outline-primario",
} as const;

/** Botón sol/luna para cambiar entre tema claro y oscuro. */
export function BotonTema({ variante = "barra", className = "" }: { variante?: keyof typeof ESTILOS; className?: string }) {
  // En el servidor no se conoce la preferencia: se muestra el botón del tema claro y se corrige al hidratar.
  const tema = useSyncExternalStore(suscribir, leerTema, () => "claro" as Tema);
  const oscuro = tema === "oscuro";

  return (
    <button
      type="button"
      onClick={() => aplicarTema(oscuro ? "claro" : "oscuro")}
      aria-pressed={oscuro}
      aria-label={oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={oscuro ? "Tema claro" : "Tema oscuro"}
      className={`inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold focus-visible:outline-2 ${ESTILOS[variante]} ${className}`}
    >
      {oscuro ? (
        // Sol: volver al tema claro
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // Luna: pasar al tema oscuro
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
      <span className="hidden lg:inline">{oscuro ? "Claro" : "Oscuro"}</span>
    </button>
  );
}
