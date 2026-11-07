import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { requireUser } from "@/lib/auth";

export default async function PasswordPage() {
  await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-texto">Cambiar contraseña</h1>
        <p className="text-sm text-texto-suave">Confirma tu contraseña actual para elegir una nueva.</p>
      </div>
      <div className="w-full max-w-xl rounded-xl border border-borde bg-superficie p-5 shadow-sm sm:p-6">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
