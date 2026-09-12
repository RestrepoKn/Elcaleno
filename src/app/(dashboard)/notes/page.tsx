import { Container } from "@/components/ui/Container";
import { NoteBoard } from "@/modules/notes/components/NoteBoard";

export default function NotesPage() { return <Container className="py-12"><p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-cyan-300">Módulo core</p><h1 className="text-4xl font-bold tracking-tight">Notas</h1><p className="mt-3 mb-10 text-white/55">Una colección de ejemplo para validar el flujo completo de datos.</p><NoteBoard /></Container>; }