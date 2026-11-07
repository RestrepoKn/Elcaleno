"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MensajeAcceso } from "@/components/auth/MarcoAcceso";

type Errores = { nombre?: string; email?: string; contrasena?: string; confirmacion?: string };

/** Crear cuenta: siempre con permiso de usuario (el servidor fija el rol). */
export function RegistroForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);

  async function crearCuenta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const nuevos: Errores = {};
    if (nombre.trim() === "") nuevos.nombre = "Escribe tu nombre.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nuevos.email = "Ingresa un correo válido.";
    if (contrasena.length < 8 || contrasena.length > 128) nuevos.contrasena = "Debe tener entre 8 y 128 caracteres.";
    if (confirmacion !== contrasena) nuevos.confirmacion = "La confirmación no coincide.";
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setProcesando(true);
    try {
      const respuesta = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nombre.trim(), email: email.trim(), password: contrasena }),
      });
      const resultado = (await respuesta.json()) as { error?: string; destino?: string };
      if (!respuesta.ok) {
        setError(resultado.error ?? "No se pudo crear la cuenta.");
        return;
      }
      router.push(resultado.destino === "/inventario" ? "/inventario" : resultado.destino === "/login" ? "/login" : "/dashboard");
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={crearCuenta} noValidate>
      <Input
        id="registro-nombre"
        label="Nombre"
        autoComplete="name"
        maxLength={120}
        value={nombre}
        onChange={(event) => setNombre(event.target.value)}
        aria-invalid={Boolean(errores.nombre)}
        {...(errores.nombre ? { error: errores.nombre, "aria-describedby": "registro-nombre-error" } : {})}
      />
      <Input
        id="registro-email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        maxLength={254}
        placeholder="tu@correo.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        aria-invalid={Boolean(errores.email)}
        {...(errores.email ? { error: errores.email, "aria-describedby": "registro-email-error" } : {})}
      />
      <Input
        id="registro-contrasena"
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        maxLength={128}
        helperText="Mínimo 8 caracteres."
        value={contrasena}
        onChange={(event) => setContrasena(event.target.value)}
        aria-invalid={Boolean(errores.contrasena)}
        {...(errores.contrasena ? { error: errores.contrasena, "aria-describedby": "registro-contrasena-error" } : {})}
      />
      <Input
        id="registro-confirmacion"
        label="Confirma la contraseña"
        type="password"
        autoComplete="new-password"
        maxLength={128}
        value={confirmacion}
        onChange={(event) => setConfirmacion(event.target.value)}
        aria-invalid={Boolean(errores.confirmacion)}
        {...(errores.confirmacion ? { error: errores.confirmacion, "aria-describedby": "registro-confirmacion-error" } : {})}
      />
      {error ? <MensajeAcceso tipo="error">{error}</MensajeAcceso> : null}
      <Button type="submit" size="lg" disabled={procesando} className="w-full">
        {procesando ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
    </form>
  );
}
