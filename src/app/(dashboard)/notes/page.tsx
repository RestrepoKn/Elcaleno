import { redirect } from "next/navigation";

// "Notas" guardaba en archivos JSON, que en Vercel no persisten. Se reemplazó por el buzón de sugerencias.
export default function NotesPage() {
  redirect("/inventario/sugerencias");
}
