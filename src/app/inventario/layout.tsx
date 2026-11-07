import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { NavegacionInventario } from "@/components/inventario/NavegacionInventario";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { obtenerSesion, obtenerUsuario } from "@/lib/auth/sesion";

export const metadata: Metadata = {
  title: "Inventario del bar",
  description: "Control de inventario por turnos: bar y helados.",
};

/** Verifica la sesión (sección 12). Sin sesión: al login. Con sesión pero sin rol en acceso: sin acceso. */
export default async function LayoutInventario({ children }: { children: ReactNode }) {
  const email = await obtenerSesion();
  if (!email) redirect("/login");
  const usuario = await obtenerUsuario();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-fondo text-texto">
      {usuario ? (
        <>
          <NavegacionInventario email={usuario.email} rol={usuario.rol} />
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">{children}</main>
        </>
      ) : (
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10">
          <EstadoVacio
            titulo="Sin acceso al inventario"
            descripcion={`La cuenta ${email} no tiene un rol asignado en el inventario. Pida al administrador que le dé acceso.`}
            accion={
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="font-semibold text-primario underline-offset-4 hover:underline">
                  Cerrar sesión
                </button>
              </form>
            }
          />
        </main>
      )}
    </div>
  );
}
