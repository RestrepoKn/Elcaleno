import { requireAdmin } from "@/lib/auth";
import { UserManagement } from "@/modules/users/components/UserManagement";

export default async function UsersPage() {
  await requireAdmin();
  return <UserManagement />;
}
