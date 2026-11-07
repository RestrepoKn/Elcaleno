import Link from "next/link";
import { claseEnlaceAcceso, MarcoAcceso } from "@/components/auth/MarcoAcceso";
import { PasswordResetForm } from "@/components/auth/PasswordResetForm";

type PageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function PasswordResetPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  const tokenUnico = typeof token === "string" ? token : null;

  return (
    <MarcoAcceso>
      {tokenUnico ? (
        <>
          <h1 className="text-2xl font-bold text-texto">Elige una nueva contraseña</h1>
          <p className="mt-1 text-sm text-texto-suave">La contraseña debe tener al menos 8 caracteres.</p>
          <PasswordResetForm token={tokenUnico} />
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-texto">Enlace no válido</h1>
          <p className="mt-2 text-sm leading-6 text-texto-suave">
            Falta el token de recuperación. Solicita un enlace nuevo para continuar.
          </p>
          <Link href="/recuperar-contrasena" className={`mt-6 inline-block text-sm ${claseEnlaceAcceso}`}>
            Solicitar un nuevo enlace
          </Link>
        </>
      )}
    </MarcoAcceso>
  );
}
