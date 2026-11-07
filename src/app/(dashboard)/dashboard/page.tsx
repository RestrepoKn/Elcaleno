import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { obtenerUsuario } from "@/lib/auth/sesion";

type Acceso = { href: string; titulo: string; descripcion: string };

function Tarjeta({ href, titulo, descripcion }: Acceso) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-xl border border-borde bg-superficie p-5 shadow-sm transition hover:border-primario/40 hover:bg-primario-suave/40
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
    >
      <span className="text-base font-semibold text-texto">{titulo}</span>
      <span className="text-sm text-texto-suave">{descripcion}</span>
    </Link>
  );
}

/** Portada del panel: accesos directos según el rol. */
export default async function DashboardPage() {
  const user = await requireUser();
  const inventario = await obtenerUsuario().catch(() => null);
  const esAdministrador = inventario?.rol === "administrador";

  const accesosInventario: Acceso[] = inventario
    ? [
        { href: "/inventario", titulo: "Inventario actual", descripcion: "Existencias de bar y helados con sus alertas de reposición." },
        { href: "/inventario/turno", titulo: "Turno actual", descripcion: "Abrir el turno, llenar la planilla y fotografiar las facturas." },
        ...(esAdministrador
          ? [
              { href: "/inventario/turnos", titulo: "Historial", descripcion: "Revisar, cerrar turnos y ver el resultado neto." },
              { href: "/inventario/productos", titulo: "Productos", descripcion: "Valores, umbrales y productos activos." },
            ]
          : []),
      ]
    : [];

  const accesosCuenta: Acceso[] = [
    { href: "/password", titulo: "Cambiar contraseña", descripcion: "Actualice su contraseña de acceso." },
    ...(user.role === "admin" ? [{ href: "/users", titulo: "Usuarios", descripcion: "Cuentas y permisos de acceso." }] : []),
    { href: "/notes", titulo: "Notas", descripcion: "Notas internas." },
    { href: "/status", titulo: "Estado del sistema", descripcion: "Salud y versión de la aplicación." },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-texto">Hola, {user.name}</h1>
        <p className="text-sm text-texto-suave">
          {inventario
            ? `Tiene acceso al inventario como ${inventario.rol === "administrador" ? "administrador" : "encargado"}.`
            : "Su cuenta aún no tiene acceso al inventario. Pida al administrador que se lo asigne."}
        </p>
      </div>

      {accesosInventario.length > 0 ? (
        <section aria-labelledby="accesos-inventario" className="flex flex-col gap-3">
          <h2 id="accesos-inventario" className="text-lg font-semibold text-texto">Inventario del bar</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {accesosInventario.map((a) => (
              <Tarjeta key={a.href} {...a} />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="accesos-cuenta" className="flex flex-col gap-3">
        <h2 id="accesos-cuenta" className="text-lg font-semibold text-texto">Cuenta y sistema</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {accesosCuenta.map((a) => (
            <Tarjeta key={a.href} {...a} />
          ))}
        </div>
      </section>
    </div>
  );
}
