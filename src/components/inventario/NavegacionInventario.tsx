"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Rol } from "@/lib/datos/tipos";

type Enlace = { href: string; texto: string; soloAdministrador?: boolean };

const ENLACES: Enlace[] = [
  { href: "/inventario", texto: "Inventario" },
  { href: "/inventario/turno", texto: "Turno actual" },
  { href: "/inventario/productos", texto: "Productos", soloAdministrador: true },
  { href: "/inventario/turnos", texto: "Historial", soloAdministrador: true },
];

function estaActivo(ruta: string, href: string): boolean {
  if (href === "/inventario") return ruta === "/inventario";
  return ruta === href || ruta.startsWith(`${href}/`);
}

export function NavegacionInventario({ email, rol }: { email: string; rol: Rol }) {
  const ruta = usePathname();
  const visibles = ENLACES.filter((e) => !e.soloAdministrador || rol === "administrador");

  return (
    <header className="bg-primario text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link
          href="/inventario"
          className="text-lg font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Inventario del bar
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden max-w-[16rem] truncate text-white/80 sm:inline" title={email}>
            {email}
          </span>
          <Link
            href="/dashboard"
            className="min-h-9 content-center rounded-lg px-2 font-semibold text-white/85 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            Panel
          </Link>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">
            {rol === "administrador" ? "Administrador" : "Encargado"}
          </span>
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
      <nav aria-label="Secciones del inventario" className="border-t border-white/15">
        <ul className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-2 sm:px-4">
          {visibles.map((e) => {
            const activo = estaActivo(ruta, e.href);
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
