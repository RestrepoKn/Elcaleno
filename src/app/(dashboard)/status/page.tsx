"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Spinner } from "@/components/ui/Spinner";

interface Health { status: "ok" | "error"; environment: string; version: string; uptime: number; timestamp: string; }
function formatUptime(seconds: number) { const minutes = Math.floor(seconds / 60); return `${Math.floor(minutes / 60)}h ${minutes % 60}m`; }
export default function StatusPage() {
  const [health, setHealth] = useState<Health | null>(null);
  useEffect(() => { fetch("/api/health").then((response) => response.json() as Promise<Health>).then(setHealth).catch(() => setHealth({ status: "error", environment: "unknown", version: "unknown", uptime: 0, timestamp: "" })); }, []);
  return <Container className="py-12"><p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-cyan-300">Observabilidad</p><h1 className="text-4xl font-bold tracking-tight">Estado del sistema</h1><p className="mt-3 text-white/55">Una lectura rápida de la salud de Elcaleno.</p>{health ? <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card><p className="text-xs text-white/45">Estado</p><Badge variant={health.status === "ok" ? "success" : "error"} className="mt-4">{health.status === "ok" ? "Operativo" : "Con incidencias"}</Badge></Card><Card><p className="text-xs text-white/45">Versión</p><p className="mt-4 text-2xl font-semibold">{health.version}</p></Card><Card><p className="text-xs text-white/45">Entorno</p><p className="mt-4 text-2xl font-semibold">{health.environment}</p></Card><Card><p className="text-xs text-white/45">Uptime</p><p className="mt-4 text-2xl font-semibold">{formatUptime(health.uptime)}</p></Card></div> : <div className="mt-10"><Spinner size="lg" /></div>}</Container>;
}