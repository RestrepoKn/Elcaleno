import Link from "next/link";
import { PasswordResetForm } from "@/components/auth/PasswordResetForm";

type PageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function PasswordResetPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  const tokenUnico = typeof token === "string" ? token : null;

  return (
    <main className="relative flex min-h-screen items-center overflow-hidden bg-[radial-gradient(ellipse_at_12%_18%,rgba(31,82,105,0.42),transparent_34%),radial-gradient(ellipse_at_88%_85%,rgba(91,61,39,0.38),transparent_32%),#09111f] px-5 py-10 text-white sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative mx-auto w-full max-w-md border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/20 sm:p-9">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-300">ELCALEÑO / INVENTARIO</p>
        {tokenUnico ? (
          <>
            <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-amber-300">Seguridad</p>
            <h1 className="mt-3 text-3xl font-bold">Elige una nueva contraseña</h1>
            <p className="mt-2 text-sm text-white/55">La contraseña debe tener al menos 8 caracteres.</p>
            <PasswordResetForm token={tokenUnico} />
          </>
        ) : (
          <>
            <h1 className="mt-8 text-3xl font-bold">Enlace no válido</h1>
            <p className="mt-3 text-sm leading-6 text-white/55">Falta el token de recuperación. Solicita un enlace nuevo para continuar.</p>
            <Link href="/recuperar-contrasena" className="mt-6 inline-block text-sm text-cyan-300 underline-offset-4 hover:underline">
              Solicitar un nuevo enlace
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
