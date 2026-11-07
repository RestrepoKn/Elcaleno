import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { obtenerUsuario } from "@/lib/auth/sesion";
import { NavegacionPanel, type EnlacePanel } from "@/components/layout/NavegacionPanel";

/** Marco del panel con el diseño del inventario: barra cereza arriba y contenido sobre fondo claro. */
export async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const usuarioInventario = user ? await obtenerUsuario().catch(() => null) : null;

  const enlaces: EnlacePanel[] = [
    { href: "/dashboard", texto: "Panel" },
    ...(usuarioInventario ? [{ href: "/inventario", texto: "Inventario" }] : []),
    { href: "/notes", texto: "Notas" },
    { href: "/status", texto: "Estado" },
    { href: "/password", texto: "Contraseña" },
    ...(user?.role === "admin" ? [{ href: "/users", texto: "Usuarios" }] : []),
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col bg-fondo text-texto">
      <NavegacionPanel nombre={user?.name ?? user?.email ?? ""} enlaces={enlaces} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
