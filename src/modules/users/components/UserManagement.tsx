"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MensajeAcceso } from "@/components/auth/MarcoAcceso";

type UserRole = "admin" | "user";
type AccesoInventario = "ninguno" | "encargado" | "administrador";
type ManagedUser = { id: string; name: string; email: string; role: UserRole; active: boolean; createdAt: string; inventario: AccesoInventario };
type UserForm = { name: string; email: string; password: string; role: UserRole; active: boolean; inventario: AccesoInventario };

const emptyForm: UserForm = { name: "", email: "", password: "", role: "user", active: true, inventario: "encargado" };
const ETIQUETA_INVENTARIO: Record<AccesoInventario, string> = { ninguno: "Sin acceso", encargado: "Encargado", administrador: "Administrador" };

async function fetchUsers(): Promise<ManagedUser[]> {
  const response = await fetch("/api/users", { cache: "no-store" });
  const result = await response.json() as { users?: ManagedUser[]; error?: string };
  if (!response.ok) throw new Error(result.error ?? "No se pudieron cargar los usuarios.");
  return result.users ?? [];
}

export function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "No se pudieron cargar los usuarios."))
      .finally(() => setIsLoading(false));
  }, []);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setNotice("");
    setIsFormOpen(true);
  }

  function openEditForm(user: ManagedUser) {
    setEditingId(user.id);
    setForm({ name: user.name, email: user.email, password: "", role: user.role, active: user.active, inventario: user.inventario });
    setError("");
    setNotice("");
    setIsFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSaving(true);

    try {
      const response = await fetch(editingId ? `/api/users/${editingId}` : "/api/users", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          role: form.role,
          inventario: form.inventario,
          active: form.active,
          ...(form.password ? { password: form.password } : {}),
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo guardar el usuario.");

      setUsers(await fetchUsers());
      setNotice(editingId ? "Usuario actualizado." : "Usuario creado.");
      setIsFormOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el usuario.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-borde pb-6">
        <div>
          
          <h1 className="text-2xl font-bold text-texto">Usuarios</h1>
          <p className="text-sm text-texto-suave">Cuentas y permisos de acceso</p>
        </div>
        <Button type="button" onClick={openCreateForm}>Nuevo usuario</Button>
      </div>

      {error ? <div className="mt-5"><MensajeAcceso tipo="error">{error}</MensajeAcceso></div> : null}
      {notice ? <div className="mt-5"><MensajeAcceso tipo="exito">{notice}</MensajeAcceso></div> : null}

      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-borde bg-superficie p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">{editingId ? "Editar usuario" : "Crear usuario"}</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input id="user-name" label="Nombre" autoComplete="name" required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <Input id="user-email" label="Correo electrónico" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <Input id="user-password" label={editingId ? "Nueva contraseña (opcional)" : "Contraseña"} type="password" autoComplete="new-password" required={!editingId} minLength={8} maxLength={128} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} helperText={editingId ? "Déjala vacía para conservar la contraseña actual." : "Mínimo 8 caracteres."} />
            <label className="block space-y-1.5 text-sm font-medium text-texto" htmlFor="user-role">Rol<select id="user-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })} className="block min-h-11 w-full rounded-lg border border-borde bg-superficie px-3 text-base font-normal text-texto focus-visible:outline-2 focus-visible:outline-primario"><option value="user">Usuario</option><option value="admin">Administrador</option></select></label>
            <label className="block space-y-1.5 text-sm font-medium text-texto" htmlFor="user-inventario">Acceso al inventario<select id="user-inventario" value={form.inventario} onChange={(event) => setForm({ ...form, inventario: event.target.value as AccesoInventario })} className="block min-h-11 w-full rounded-lg border border-borde bg-superficie px-3 text-base font-normal text-texto focus-visible:outline-2 focus-visible:outline-primario"><option value="encargado">Encargado</option><option value="administrador">Administrador</option><option value="ninguno">Sin acceso</option></select><span className="block text-xs font-normal text-texto-suave">Encargado registra el turno; administrador también revisa, cierra y ve las finanzas.</span></label>
            {editingId ? <label className="flex items-center gap-3 text-sm text-texto"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-4 w-4 accent-primario" />Cuenta activa</label> : null}
          </div>
          <div className="mt-6 flex justify-end">
            <Button type="submit" loading={isSaving}>{editingId ? "Guardar cambios" : "Crear usuario"}</Button>
          </div>
        </form>
      ) : null}

      <div className="mt-7 overflow-x-auto">
        {isLoading ? <p className="py-10 text-sm text-texto-suave">Cargando usuarios...</p> : users.length === 0 ? <p className="py-10 text-sm text-texto-suave">No hay usuarios registrados.</p> : (
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead><tr className="border-b border-borde text-xs uppercase tracking-wider text-texto-suave"><th className="px-3 py-3 font-medium">Nombre</th><th className="px-3 py-3 font-medium">Correo</th><th className="px-3 py-3 font-medium">Rol</th><th className="px-3 py-3 font-medium">Inventario</th><th className="px-3 py-3 font-medium">Estado</th><th className="px-3 py-3 text-right font-medium">Acción</th></tr></thead>
            <tbody>{users.map((user) => <tr key={user.id} className="border-b border-borde"><td className="px-3 py-4 font-medium text-texto">{user.name}</td><td className="px-3 py-4 text-texto-suave">{user.email}</td><td className="px-3 py-4 text-texto-suave">{user.role === "admin" ? "Administrador" : "Usuario"}</td><td className="px-3 py-4"><span className={user.inventario === "ninguno" ? "text-texto-suave" : "font-semibold text-texto"}>{ETIQUETA_INVENTARIO[user.inventario] ?? "Sin acceso"}</span></td><td className="px-3 py-4"><span className={user.active ? "font-semibold text-ok-texto" : "text-texto-suave"}>{user.active ? "Activa" : "Inactiva"}</span></td><td className="px-3 py-4 text-right"><Button type="button" variant="ghost" size="sm" onClick={() => openEditForm(user)}>Editar</Button></td></tr>)}</tbody>
          </table>
        )}
      </div>
    </section>
  );
}