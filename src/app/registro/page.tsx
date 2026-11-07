import Link from "next/link";
import { claseEnlaceAcceso, MarcoAcceso } from "@/components/auth/MarcoAcceso";
import { RegistroForm } from "@/components/auth/RegistroForm";

export default function RegistroPage() {
  return (
    <MarcoAcceso>
      <h1 className="text-2xl font-bold text-texto">Crear cuenta</h1>
      <p className="mt-1 text-sm leading-6 text-texto-suave">
        La cuenta se crea con permiso de usuario y entra al inventario como encargado: registra el turno, sin ver
        finanzas ni cambiar valores.
      </p>
      <RegistroForm />
      <p className="mt-6 text-center text-sm text-texto-suave">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className={claseEnlaceAcceso}>Inicia sesión</Link>
      </p>
    </MarcoAcceso>
  );
}
