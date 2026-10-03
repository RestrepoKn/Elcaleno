import { requireUser } from "@/lib/auth";
import StatusClient from "./StatusClient";

export default async function StatusPage() {
  await requireUser();
  return <StatusClient />;
}