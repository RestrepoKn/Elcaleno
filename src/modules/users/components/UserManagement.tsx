"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type UserRole = "admin" | "user";
type ManagedUser = { id: string; name: string; email: string; role: UserRole; active: boolean; createdAt: string };
type UserForm = { name: string; email: string; password: string; role: UserRole; active: boolean };

const emptyForm: UserForm = { name: "", email: "", password: "", role: "user", active: true };

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
    setForm({ name: user.name, email: user.email, password: "", role: user.role, active: user.active });
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
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-300">Administración</p>
          <h1 className="mt-2 text-3xl font-bold">Usuarios</h1>
          <p className="mt-2 text-sm text-white/55">Cuentas y permisos de acceso</p>
        </div>
        <Button type="button" onClick={openCreateForm}>Nuevo usuario</Button>
      </div>

      {error ? <p role="alert" className="mt-5 border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
      {notice ? <p role="status" className="mt-5 border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-200">{notice}</p> : null}

      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="mt-6 border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">{editingId ? "Editar usuario" : "Crear usuario"}</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input id="user-name" label="Nombre" autoComplete="name" required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <Input id="user-email" label="Correo electrónico" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <Input id="user-password" label={editingId ? "Nueva contraseña (opcional)" : "Contraseña"} type="password" autoComplete="new-password" required={!editingId} minLength={8} maxLength={128} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} helperText={editingId ? "Déjala vacía para conservar la contraseña actual." : "Mínimo 8 caracteres."} />
            <label className="block space-y-2 text-sm text-white/80" htmlFor="user-role">Rol<select id="user-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })} className="w-full border border-white/15 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-300"><option value="user">Usuario</option><option value="admin">Administrador</option></select></label>
            {editingId ? <label className="flex items-center gap-3 text-sm text-white/80"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-4 w-4 accent-amber-300" />Cuenta activa</label> : null}
          </div>
          <div className="mt-6 flex justify-end">
            <Button type="submit" loading={isSaving}>{editingId ? "Guardar cambios" : "Crear usuario"}</Button>
          </div>
        </form>
      ) : null}

      <div className="mt-7 overflow-x-auto">
        {isLoading ? <p className="py-10 text-sm text-white/55">Cargando usuarios...</p> : users.length === 0 ? <p className="py-10 text-sm text-white/55">No hay usuarios registrados.</p> : (
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead><tr className="border-b border-white/15 text-xs uppercase tracking-wider text-white/45"><th className="px-3 py-3 font-medium">Nombre</th><th className="px-3 py-3 font-medium">Correo</th><th className="px-3 py-3 font-medium">Rol</th><th className="px-3 py-3 font-medium">Estado</th><th className="px-3 py-3 text-right font-medium">Acción</th></tr></thead>
            <tbody>{users.map((user) => <tr key={user.id} className="border-b border-white/10"><td className="px-3 py-4 font-medium text-white">{user.name}</td><td className="px-3 py-4 text-white/65">{user.email}</td><td className="px-3 py-4 text-white/65">{user.role === "admin" ? "Administrador" : "Usuario"}</td><td className="px-3 py-4"><span className={user.active ? "text-emerald-300" : "text-white/40"}>{user.active ? "Activa" : "Inactiva"}</span></td><td className="px-3 py-4 text-right"><Button type="button" variant="ghost" size="sm" onClick={() => openEditForm(user)}>Editar</Button></td></tr>)}</tbody>
          </table>
        )}
      </div>
    </section>
  );
}