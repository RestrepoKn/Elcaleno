import { exampleRecordSchema } from "./example.schema";
import { noteRecordSchema } from "./note.schema";

export const schemaRegistry = { example: exampleRecordSchema, note: noteRecordSchema } as const;
export function getSchema(collection: string) {
  return schemaRegistry[collection as keyof typeof schemaRegistry] ?? null;
}