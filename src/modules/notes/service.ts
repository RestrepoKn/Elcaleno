import { create, getAll, remove, update } from "@/lib/json-db";
import { noteRecordSchema } from "@data/_schema/note.schema";
import type { NoteInput, NoteRecord } from "./types";

export function listNotes() { return getAll<NoteRecord>("note", { sortBy: "updatedAt", sortOrder: "desc" }); }
export function createNote(input: NoteInput) { return create<NoteRecord>("note", input, noteRecordSchema); }
export function updateNote(id: string, input: Partial<NoteInput>) { return update<NoteRecord>("note", id, input, noteRecordSchema); }
export function deleteNote(id: string) { return remove("note", id); }