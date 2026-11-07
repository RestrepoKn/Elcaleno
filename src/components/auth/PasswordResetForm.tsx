"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { claseEnlaceAcceso, MensajeAcceso } from "@/components/auth/MarcoAcceso";

export function PasswordResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);

  async function restablecer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (contrasena.length < 8 || contrasena.length > 128) {
      setError("La contraseña debe tener entre 8 y 128 caracteres.");
      return;
    }
    if (contrasena !== confirmacion) {
      setError("La confirmación no coincide con la contraseña.");
      return;
    }

    setProcesando(true);
    try {
      const respuesta = await fetch("/api/auth/restablecer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, contrasena, confirmacion }),
      });
      const resultado = await respuesta.json() as { error?: string };
      if (!respuesta.ok) {
        setError(resultado.error ?? "No se pudo restablecer la contraseña.");
        return;
      }
      router.replace("/login?restablecida=1");
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={restablecer}>
      <Input
        id="new-password"
        label="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        value={contrasena}
        onChange={(event) => setContrasena(event.target.value)}
      />
      <Input
        id="confirm-password"
        label="Confirma la nueva contraseña"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        value={confirmacion}
        onChange={(event) => setConfirmacion(event.target.value)}
      />
      {error ? (
        <>
          <MensajeAcceso tipo="error">{error}</MensajeAcceso>
          {error === "El enlace no es válido o ya venció." ? (
            <p className="text-sm text-texto-suave">
              <Link href="/recuperar-contrasena" className={claseEnlaceAcceso}>Solicitar otro enlace</Link>
            </p>
          ) : null}
        </>
      ) : null}
      <Button type="submit" size="lg" disabled={procesando} className="w-full">
        {procesando ? "Actualizando..." : "Restablecer contraseña"}
      </Button>
    </form>
  );
}
