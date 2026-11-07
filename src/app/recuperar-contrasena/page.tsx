import Link from "next/link";
import { claseEnlaceAcceso, MarcoAcceso } from "@/components/auth/MarcoAcceso";
import { RecoveryRequestForm } from "@/components/auth/RecoveryRequestForm";

export default function RecoveryPage() {
  return (
    <MarcoAcceso>
      <h1 className="text-2xl font-bold text-texto">¿Olvidaste tu contraseña?</h1>
      <p className="mt-1 text-sm leading-6 text-texto-suave">
        Ingresa el correo de tu cuenta y te enviaremos un enlace para elegir una nueva contraseña.
      </p>
      <RecoveryRequestForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className={claseEnlaceAcceso}>Volver a iniciar sesión</Link>
      </p>
    </MarcoAcceso>
  );
}
