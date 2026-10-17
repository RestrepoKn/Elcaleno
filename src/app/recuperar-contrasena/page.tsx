import Link from "next/link";
import { RecoveryRequestForm } from "@/components/auth/RecoveryRequestForm";

export default function RecoveryPage() {
  return (
    <main className="relative flex min-h-screen items-center overflow-hidden bg-[radial-gradient(ellipse_at_12%_18%,rgba(31,82,105,0.42),transparent_34%),radial-gradient(ellipse_at_88%_85%,rgba(91,61,39,0.38),transparent_32%),#09111f] px-5 py-10 text-white sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative mx-auto w-full max-w-md border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/20 sm:p-9">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-300">ELCALEÑO / INVENTARIO</p>
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-amber-300">Recuperación</p>
        <h1 className="mt-3 text-3xl font-bold">¿Olvidaste tu contraseña?</h1>
        <p className="mt-2 text-sm leading-6 text-white/55">Ingresa el correo de tu cuenta y te enviaremos un enlace para elegir una nueva contraseña.</p>
        <RecoveryRequestForm />
        <p className="mt-6 text-center text-sm text-white/45">
          <Link href="/login" className="text-cyan-300 underline-offset-4 hover:underline">Volver a iniciar sesión</Link>
        </p>
      </div>
    </main>
  );
}
