import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-fondo px-6 text-center text-texto">
      <div>
        <p className="text-sm font-semibold text-primario">404 · No encontrado</p>
        <h1 className="mt-3 text-3xl font-bold">Esta página no existe.</h1>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center rounded-lg bg-primario px-5 font-semibold text-white hover:bg-primario-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
