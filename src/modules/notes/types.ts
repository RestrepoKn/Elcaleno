import type { NoteRecord } from "@data/_schema/note.schema";
export type { NoteRecord };
export type NoteInput = Omit<NoteRecord, "id" | "createdAt" | "updatedAt">;