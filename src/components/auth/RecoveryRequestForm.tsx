"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function RecoveryRequestForm() {
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);

  async function solicitarEnlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensaje("");
    setError("");
    setProcesando(true);

    try {
      const respuesta = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const resultado = await respuesta.json() as { message?: string; error?: string };
      if (!respuesta.ok) {
        setError(resultado.error ?? "No se pudo procesar la solicitud.");
        return;
      }
      setMensaje(resultado.message ?? "Si el correo está registrado, recibirás un enlace para restablecer la contraseña.");
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={solicitarEnlace}>
      <Input
        id="recovery-email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        placeholder="tu@correo.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="mt-2 rounded-md border-white/15 bg-white/[0.04] placeholder:text-white/25 focus:border-amber-300"
      />
      {error ? <p role="alert" className="border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
      {mensaje ? <p role="status" className="border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-200">{mensaje}</p> : null}
      <Button type="submit" size="lg" disabled={procesando} className="w-full rounded-md bg-amber-300 text-slate-950 hover:bg-amber-200">
        {procesando ? "Enviando..." : "Enviar enlace"}
      </Button>
      <p className="text-center text-sm text-white/55">
        <Link href="/login" className="text-cyan-300 underline-offset-4 hover:underline">Volver al inicio de sesión</Link>
      </p>
    </form>
  );
}
