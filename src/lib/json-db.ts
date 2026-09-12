import { mkdir, readFile, rename, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { BaseRecord, CollectionFile, CreateInput, QueryOptions, QueryResult, UpdateInput } from "./types";
import { generateId, now } from "./utils";

export class JsonDBError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "DUPLICATE_ID" | "VALIDATION_ERROR" | "IO_ERROR", message: string) {
    super(message);
    this.name = "JsonDBError";
  }
}

export class ReadOnlyError extends JsonDBError {
  constructor() {
    super("IO_ERROR", "Las escrituras están deshabilitadas en producción.");
    this.name = "ReadOnlyError";
  }
}

const locks = new Map<string, Promise<void>>();
const dataDirectory = path.resolve(process.env.DATA_DIR ?? path.join(process.cwd(), "data"));

function resolveCollectionPath(name: string): string {
  if (!/^[a-z0-9-]+$/.test(name)) throw new JsonDBError("VALIDATION_ERROR", "Nombre de colección inválido.");
  return path.join(dataDirectory, `${name}.json`);
}

async function readCollection<T extends BaseRecord>(name: string): Promise<CollectionFile<T>> {
  try {
    const raw = await readFile(resolveCollectionPath(name), "utf8");
    return JSON.parse(raw) as CollectionFile<T>;
  } catch {
    throw new JsonDBError("NOT_FOUND", `La colección '${name}' no existe.`);
  }
}

async function writeCollection<T extends BaseRecord>(name: string, data: CollectionFile<T>): Promise<void> {
  if (process.env.NODE_ENV === "production") throw new ReadOnlyError();
  const filePath = resolveCollectionPath(name);
  const previous = locks.get(filePath) ?? Promise.resolve();
  const next = previous.then(async () => {
    await mkdir(path.join(dataDirectory, "_backups"), { recursive: true });
    try {
      await copyFile(filePath, path.join(dataDirectory, "_backups", `${name}_${Date.now()}.json`));
    } catch {
      // The first write has no previous file to back up.
    }
    const temporaryPath = `${filePath}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(data, null, 2), "utf8");
    await rename(temporaryPath, filePath);
  });
  locks.set(filePath, next);
  try {
    await next;
  } finally {
    if (locks.get(filePath) === next) locks.delete(filePath);
  }
}

function validateRecord<T extends BaseRecord>(schema: z.ZodType<T>, record: unknown): T {
  const result = schema.safeParse(record);
  if (!result.success) throw new JsonDBError("VALIDATION_ERROR", result.error.message);
  return result.data;
}

export async function getAll<T extends BaseRecord>(name: string, options: QueryOptions = {}): Promise<QueryResult<T>> {
  const collection = await readCollection<T>(name);
  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.max(1, options.limit ?? 50);
  const records = [...collection.records];
  if (options.sortBy) {
    const field = options.sortBy;
    records.sort((left, right) => String(left[field as keyof T] ?? "").localeCompare(String(right[field as keyof T] ?? "")) * (options.sortOrder === "desc" ? -1 : 1));
  }
  return { data: records.slice(offset, offset + limit), total: records.length, limit, offset };
}

export async function getById<T extends BaseRecord>(name: string, id: string): Promise<T | null> {
  const collection = await readCollection<T>(name);
  return collection.records.find((record) => record.id === id) ?? null;
}

export async function create<T extends BaseRecord>(name: string, input: CreateInput<T>, schema: z.ZodType<T>): Promise<T> {
  const collection = await readCollection<T>(name);
  const prefix = name.slice(0, 3);
  const record = validateRecord(schema, { ...input, id: generateId(prefix), createdAt: now(), updatedAt: now() });
  if (collection.records.some((item) => item.id === record.id)) throw new JsonDBError("DUPLICATE_ID", `El ID '${record.id}' ya existe.`);
  collection.records.push(record);
  collection._meta.lastModified = now();
  await writeCollection(name, collection);
  return record;
}

export async function update<T extends BaseRecord>(name: string, id: string, partial: UpdateInput<T>, schema: z.ZodType<T>): Promise<T> {
  const collection = await readCollection<T>(name);
  const index = collection.records.findIndex((record) => record.id === id);
  if (index < 0) throw new JsonDBError("NOT_FOUND", `El registro '${id}' no existe.`);
  const current = collection.records[index] as T;
  const updated = validateRecord(schema, { ...current, ...partial, id, updatedAt: now() });
  collection.records[index] = updated;
  collection._meta.lastModified = now();
  await writeCollection(name, collection);
  return updated;
}

export async function remove(name: string, id: string): Promise<boolean> {
  const collection = await readCollection(name);
  const remaining = collection.records.filter((record) => record.id !== id);
  if (remaining.length === collection.records.length) throw new JsonDBError("NOT_FOUND", `El registro '${id}' no existe.`);
  collection.records = remaining;
  collection._meta.lastModified = now();
  await writeCollection(name, collection);
  return true;
}

export async function query<T extends BaseRecord>(name: string, filter: (record: T) => boolean): Promise<T[]> {
  const collection = await readCollection<T>(name);
  return collection.records.filter(filter);
}

export async function count(name: string): Promise<number> {
  const collection = await readCollection(name);
  return collection.records.length;
}