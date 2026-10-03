import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Container } from "@/components/ui/Container";

export async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const linkClass = "block rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="shrink-0 font-mono text-sm font-bold tracking-[0.25em] text-amber-300">ELCALEÑO</Link>
          <nav className="flex items-center gap-3 overflow-x-auto text-sm text-white/60 sm:gap-5">
            <Link href="/dashboard" className="shrink-0 hover:text-white">Panel</Link>
            <Link href="/notes" className="shrink-0 hover:text-white">Notas</Link>
            <Link href="/status" className="shrink-0 hover:text-white">Estado</Link>
            {user?.role === "admin" ? <Link href="/users" className="shrink-0 hover:text-white">Usuarios</Link> : null}
            <ThemeToggle />
            <form action="/api/auth/logout" method="post"><button type="submit" className="shrink-0 hover:text-white">Salir</button></form>
          </nav>
        </Container>
      </header>
      <div className="md:grid md:grid-cols-[220px_1fr]">
        <aside className="hidden min-h-[calc(100vh-4rem)] border-r border-white/10 p-6 md:block">
          <p className="mb-4 text-xs uppercase tracking-widest text-white/40">Workspace</p>
          <Link href="/dashboard" className={linkClass}>Resumen</Link>
          <Link href="/notes" className={linkClass}>Notas</Link>
          <Link href="/status" className={linkClass}>Sistema</Link>
          {user?.role === "admin" ? <Link href="/users" className={linkClass}>Usuarios</Link> : null}
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}