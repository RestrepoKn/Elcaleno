import { NoteBoard } from "@/modules/notes/components/NoteBoard";
import { requireUser } from "@/lib/auth";

export default async function NotesPage() {
  await requireUser();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-texto">Notas</h1>
        <p className="text-sm text-texto-suave">Notas internas.</p>
      </div>
      <NoteBoard />
    </div>
  );
}
