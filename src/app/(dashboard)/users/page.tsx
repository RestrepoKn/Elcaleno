import { Container } from "@/components/ui/Container";
import { requireAdmin } from "@/lib/auth";
import { UserManagement } from "@/modules/users/components/UserManagement";

export default async function UsersPage() {
  await requireAdmin();
  return <Container className="py-10"><UserManagement /></Container>;
}