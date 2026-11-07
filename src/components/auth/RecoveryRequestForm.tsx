"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { claseEnlaceAcceso, MensajeAcceso } from "@/components/auth/MarcoAcceso";

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
      />
      {error ? <MensajeAcceso tipo="error">{error}</MensajeAcceso> : null}
      {mensaje ? <MensajeAcceso tipo="exito">{mensaje}</MensajeAcceso> : null}
      <Button type="submit" size="lg" disabled={procesando} className="w-full">
        {procesando ? "Enviando..." : "Enviar enlace"}
      </Button>
      <p className="text-center text-sm text-texto-suave">
        <Link href="/login" className={claseEnlaceAcceso}>Volver al inicio de sesión</Link>
      </p>
    </form>
  );
}
