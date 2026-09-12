import { NextResponse } from "next/server";
import { getSchema } from "@data/_schema/registry";
import { create, getAll, getById, remove, update, JsonDBError } from "@/lib/json-db";
import type { BaseRecord } from "@/lib/types";

type Context = { params: Promise<{ collection: string }> };

function errorResponse(error: unknown) {
  const known = error instanceof JsonDBError;
  const code = known ? error.code : "INTERNAL";
  const status = code === "NOT_FOUND" ? 404 : code === "VALIDATION_ERROR" ? 400 : code === "DUPLICATE_ID" ? 409 : 500;
  return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Error interno", code, timestamp: new Date().toISOString() }, { status });
}

export async function GET(request: Request, { params }: Context) {
  try {
    const { collection } = await params;
    if (!getSchema(collection)) return errorResponse(new JsonDBError("NOT_FOUND", "Colección no registrada."));
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (id) {
      return NextResponse.json({ success: true, data: await getById(collection, id), timestamp: new Date().toISOString() });
    }
    const sortBy = url.searchParams.get("sortBy");
    const options = { limit: Number(url.searchParams.get("limit") ?? 50), offset: Number(url.searchParams.get("offset") ?? 0), sortOrder: url.searchParams.get("sortOrder") === "desc" ? "desc" as const : "asc" as const, ...(sortBy ? { sortBy } : {}) };
    const data = await getAll(collection, options);
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { collection } = await params;
    const schema = getSchema(collection);
    if (!schema) return errorResponse(new JsonDBError("NOT_FOUND", "Colección no registrada."));
    const data = await create(collection, await request.json() as Omit<BaseRecord, "id" | "createdAt" | "updatedAt">, schema as never);
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const { collection } = await params;
    const schema = getSchema(collection);
    if (!schema) return errorResponse(new JsonDBError("NOT_FOUND", "Colección no registrada."));
    const body = await request.json() as { id?: string } & Record<string, unknown>;
    if (!body.id) return errorResponse(new JsonDBError("VALIDATION_ERROR", "El campo id es obligatorio."));
    const { id, ...partial } = body;
    const data = await update(collection, id, partial, schema as never);
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { collection } = await params;
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return errorResponse(new JsonDBError("VALIDATION_ERROR", "El parámetro id es obligatorio."));
    await remove(collection, id);
    return NextResponse.json({ success: true, data: true, timestamp: new Date().toISOString() });
  } catch (error) { return errorResponse(error); }
}