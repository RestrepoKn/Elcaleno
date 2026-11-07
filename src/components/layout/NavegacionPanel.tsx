"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotonTema } from "@/components/ui/BotonTema";

export type EnlacePanel = { href: string; texto: string };

/** Barra del panel con el mismo diseño de la del inventario (cereza, enlace activo subrayado). */
export function NavegacionPanel({ nombre, enlaces }: { nombre: string; enlaces: EnlacePanel[] }) {
  const ruta = usePathname();
  return (
    <header className="bg-primario text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link
          href="/dashboard"
          className="text-lg font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          El Caleño
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden max-w-[16rem] truncate text-white/80 sm:inline" title={nombre}>
            {nombre}
          </span>
          <BotonTema />
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="min-h-9 rounded-lg px-3 font-semibold hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
      <nav aria-label="Secciones del panel" className="border-t border-white/15">
        <ul className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-2 sm:px-4">
          {enlaces.map((e) => {
            const activo = ruta === e.href || ruta.startsWith(`${e.href}/`);
            return (
              <li key={e.href}>
                <Link
                  href={e.href}
                  aria-current={activo ? "page" : undefined}
                  className={`flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium
                    focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white
                    ${activo ? "border-white text-white" : "border-transparent text-white/80 hover:text-white"}`}
                >
                  {e.texto}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
