import { Container } from "@/components/ui/Container";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { requireUser } from "@/lib/auth";

export default async function PasswordPage() {
  await requireUser();

  return (
    <Container className="py-12">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-cyan-300">Seguridad</p>
      <h1 className="text-4xl font-bold tracking-tight">Cambiar contraseña</h1>
      <p className="mt-3 text-white/55">Confirma tu contraseña actual para elegir una nueva.</p>
      <div className="mt-8 max-w-xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <ChangePasswordForm />
      </div>
    </Container>
  );
}
