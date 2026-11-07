"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MensajeAcceso } from "@/components/auth/MarcoAcceso";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (newPassword.length < 8 || newPassword.length > 128) {
      setError("La nueva contraseña debe tener entre 8 y 128 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("La nueva contraseña debe ser distinta a la actual.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) {
        setError(result.error ?? "No se pudo cambiar la contraseña.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice(result.message ?? "Tu contraseña se cambió correctamente.");
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        id="current-password"
        label="Contraseña actual"
        type="password"
        autoComplete="current-password"
        required
        maxLength={128}
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
      />
      <Input
        id="new-password"
        label="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        helperText="Debe tener entre 8 y 128 caracteres."
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
      />
      <Input
        id="confirm-password"
        label="Confirma la nueva contraseña"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />
      {error ? <MensajeAcceso tipo="error">{error}</MensajeAcceso> : null}
      {notice ? <MensajeAcceso tipo="exito">{notice}</MensajeAcceso> : null}
      <div className="flex justify-end">
        <Button type="submit" loading={isSaving}>Actualizar contraseña</Button>
      </div>
    </form>
  );
}
