"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { claseEnlaceAcceso, MarcoAcceso, MensajeAcceso } from "@/components/auth/MarcoAcceso";

export function LoginPage({ passwordRestablecida = false }: { passwordRestablecida?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const result = await response.json() as { error?: string; destino?: string };
      if (!response.ok) {
        setErrors({ password: result.error ?? "Correo o contraseña incorrectos." });
        return;
      }
      // Quien tiene rol en el inventario entra directo a /inventario; el resto, al panel.
      router.push(result.destino === "/inventario" ? "/inventario" : "/dashboard");
    } catch {
      setErrors({ password: "No se pudo conectar. Inténtalo de nuevo." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <MarcoAcceso>
          <h2 className="text-2xl font-bold text-texto">Bienvenido</h2>
          <p className="mt-1 text-sm text-texto-suave">Ingresa a tu inventario.</p>
          {passwordRestablecida ? (
            <div className="mt-5">
              <MensajeAcceso tipo="exito">Tu contraseña se restableció correctamente. Ya puedes iniciar sesión.</MensajeAcceso>
            </div>
          ) : null}

          <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
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
            />
            <div className="flex justify-end">
              <Link href="/recuperar-contrasena" className={`text-sm ${claseEnlaceAcceso}`}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-texto-suave">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className={claseEnlaceAcceso}>Crear cuenta</Link>
          </p>
    </MarcoAcceso>
  );
}