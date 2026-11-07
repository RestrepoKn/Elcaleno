import Link from "next/link";
import { FormularioSugerencia, ListaSugerencias } from "@/components/inventario/BuzonSugerencias";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { obtenerUsuario } from "@/lib/auth/sesion";
import { contarSugerenciasNoLeidas, listarMisSugerencias, listarSugerencias } from "@/lib/inventario/dataService";

export const dynamic = "force-dynamic";

function Filtro({ href, activo, children }: { href: string; activo: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={activo ? "true" : undefined}
      className={`inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario
        ${activo ? "bg-primario text-white" : "border border-borde bg-superficie text-texto hover:bg-primario-suave"}`}
    >
      {children}
    </Link>
  );
}

/** Buzón de sugerencias: el encargado escribe y ve las suyas; el administrador lee todas. */
export default async function PaginaSugerencias({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await obtenerUsuario();
  if (!usuario) return null;

  if (usuario.rol !== "administrador") {
    const mias = await listarMisSugerencias(usuario.email);
    return (
      <>
        <div>
          <h1 className="text-2xl font-bold text-texto">Buzón de sugerencias</h1>
          <p className="text-sm text-texto-suave">Cuéntele al administrador ideas, problemas o pedidos del bar.</p>
        </div>
        <Tarjeta>
          <FormularioSugerencia />
        </Tarjeta>
        <section className="flex flex-col gap-3" aria-labelledby="mis-sugerencias">
          <h2 id="mis-sugerencias" className="text-lg font-semibold text-texto">Mis sugerencias</h2>
          <ListaSugerencias sugerencias={mias} esAdministrador={false} />
        </section>
      </>
    );
  }

  const soloNoLeidas = (await searchParams).ver !== "todas";
  const [sugerencias, sinLeer] = await Promise.all([listarSugerencias({ soloNoLeidas }), contarSugerenciasNoLeidas()]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-texto">Buzón de sugerencias</h1>
        <p className="text-sm text-texto-suave">
          {sinLeer === 0 ? "No hay sugerencias sin leer." : `${sinLeer} ${sinLeer === 1 ? "sugerencia sin leer" : "sugerencias sin leer"}.`}
        </p>
      </div>
      <div role="group" aria-label="Filtrar sugerencias" className="flex gap-2">
        <Filtro href="/inventario/sugerencias" activo={soloNoLeidas}>{`Sin leer (${sinLeer})`}</Filtro>
        <Filtro href="/inventario/sugerencias?ver=todas" activo={!soloNoLeidas}>Todas</Filtro>
      </div>
      <ListaSugerencias sugerencias={sugerencias} esAdministrador />
    </>
  );
}
