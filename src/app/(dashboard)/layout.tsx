import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

// El tema claro/oscuro lo maneja BotonTema (barra superior) en toda la app.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
