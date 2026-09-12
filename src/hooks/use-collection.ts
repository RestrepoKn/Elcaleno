"use client";

import { useCallback, useEffect, useState } from "react";
import type { BaseRecord, CreateInput, UpdateInput } from "@/lib/types";

interface ApiResponse<T> { success: boolean; data: T; error?: string; }
export function useCollection<T extends BaseRecord>(collectionName: string) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refetch = useCallback(async () => {
    setIsLoading(true);
    try { const response = await fetch(`/api/data/${collectionName}`); const body = await response.json() as ApiResponse<{ data: T[] }>; if (!response.ok) throw new Error(body.error ?? "No se pudieron cargar los datos"); setData(body.data.data); setError(null); } catch (cause) { setError(cause instanceof Error ? cause.message : "Error de red"); } finally { setIsLoading(false); }
  }, [collectionName]);
  useEffect(() => { const timer = window.setTimeout(() => { void refetch(); }, 0); return () => window.clearTimeout(timer); }, [refetch]);
  async function createRecord(input: CreateInput<T>) { const response = await fetch(`/api/data/${collectionName}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); const body = await response.json() as ApiResponse<T>; if (!response.ok) throw new Error(body.error ?? "No se pudo crear"); await refetch(); return body.data; }
  async function updateRecord(id: string, input: UpdateInput<T>) { const response = await fetch(`/api/data/${collectionName}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...input }) }); const body = await response.json() as ApiResponse<T>; if (!response.ok) throw new Error(body.error ?? "No se pudo actualizar"); await refetch(); return body.data; }
  async function removeRecord(id: string) { const response = await fetch(`/api/data/${collectionName}?id=${id}`, { method: "DELETE" }); if (!response.ok) throw new Error("No se pudo eliminar"); await refetch(); return true; }
  return { data, isLoading, error, refetch, create: createRecord, update: updateRecord, remove: removeRecord };
}