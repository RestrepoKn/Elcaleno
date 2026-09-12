"use client";

import { useState } from "react";
import { useCollection } from "@/hooks/use-collection";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { NoteInput, NoteRecord } from "../types";

const emptyNote: NoteInput = { title: "", content: "", category: "general", pinned: false };
export function NoteBoard() {
  const notes = useCollection<NoteRecord>("note");
  const [draft, setDraft] = useState(emptyNote);
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setSaving(true); try { await notes.create(draft); setDraft(emptyNote); } finally { setSaving(false); } }
  return <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]"><section className="space-y-3">{notes.isLoading ? <p className="text-white/50">Cargando notas...</p> : notes.data.length === 0 ? <Card><p className="text-white/60">Aún no hay notas. Crea la primera desde el panel.</p></Card> : notes.data.map((note) => <Card key={note.id} className="flex items-start justify-between gap-5"><div><div className="flex items-center gap-3"><h2 className="font-semibold">{note.title}</h2><Badge variant={note.category === "importante" ? "warning" : "info"}>{note.category}</Badge></div><p className="mt-2 text-sm text-white/55">{note.content}</p></div><button className="text-xs text-red-300 hover:text-red-200" onClick={() => void notes.remove(note.id)}>Eliminar</button></Card>)}</section><Card><h2 className="font-semibold">Nueva nota</h2><form className="mt-5 space-y-4" onSubmit={(event) => void submit(event)}><Input id="note-title" label="Título" required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /><label className="block text-sm text-white/80">Contenido<textarea className="mt-2 min-h-28 w-full border border-white/15 bg-slate-950/50 p-3 text-white outline-none focus:border-cyan-300" value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} /></label><label className="block text-sm text-white/80">Categoría<select className="mt-2 w-full border border-white/15 bg-slate-950/50 p-3 text-white" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as NoteInput["category"] })}><option value="general">General</option><option value="importante">Importante</option><option value="pendiente">Pendiente</option></select></label><Button type="submit" loading={saving} className="w-full">Guardar nota</Button></form></Card></div>;
}