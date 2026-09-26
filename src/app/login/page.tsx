"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: { email?: string; password?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Ingresa un correo válido.";
    }
    if (!password.trim()) {
      nextErrors.password = "Ingresa tu contraseña.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    window.setTimeout(() => {
      // TODO: conectar con la API real
      if (email.trim().toLowerCase() === "demo@elcaleno.com" && password === "demo1234") {
        router.push("/");
        return;
      }

      setErrors({ password: "Correo o contraseña incorrectos" });
      setIsSubmitting(false);
    }, 600);
  }

  return (
    <main className="relative flex min-h-screen items-center overflow-hidden bg-[radial-gradient(ellipse_at_12%_18%,rgba(31,82,105,0.42),transparent_34%),radial-gradient(ellipse_at_88%_85%,rgba(91,61,39,0.38),transparent_32%),#09111f] px-5 py-10 text-white sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative mx-auto grid w-full max-w-5xl items-center gap-12 md:grid-cols-[1fr_420px] md:gap-16">
        <section className="hidden md:block">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-300">ELCALEÑO / INVENTARIO</p>
          <h1 className="mt-8 max-w-lg text-6xl font-bold leading-[1.02] text-white">
            Todo en su sitio.
            <span className="mt-2 block text-amber-300">Siempre a mano.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-white/55">
            Entra para mantener tus productos y existencias bajo control, sin complicaciones.
          </p>
          <div className="mt-12 flex items-center gap-3 border-t border-white/10 pt-5 text-sm text-white/45">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Inventario sencillo, al día
          </div>
        </section>

        <section className="w-full border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/20 sm:p-9">
          <div className="mb-8 md:hidden">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-300">ELCALEÑO / INVENTARIO</p>
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber-300">Acceso</p>
          <h2 className="mt-3 text-3xl font-bold">Bienvenido</h2>
          <p className="mt-2 text-sm text-white/55">Ingresa a tu inventario.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            <Input
              id="email"
              label="Correo electrónico"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(errors.email)}
              {...(errors.email ? { error: errors.email, "aria-describedby": "email-error" } : {})}
              className="mt-2 rounded-md border-white/15 bg-white/[0.04] placeholder:text-white/25 focus:border-amber-300"
            />
            <Input
              id="password"
              label="Contraseña"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Tu contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(errors.password)}
              {...(errors.password ? { error: errors.password, "aria-describedby": "password-error" } : {})}
              className="mt-2 rounded-md border-white/15 bg-white/[0.04] placeholder:text-white/25 focus:border-amber-300"
            />
            <div className="flex justify-end">
              <a
                href="#"
                onClick={(event) => event.preventDefault()}
                className="text-sm text-cyan-300 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
              >
                Olvidé mi contraseña
              </a>
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full rounded-md bg-amber-300 text-slate-950 hover:bg-amber-200"
            >
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}