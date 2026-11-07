import { Insignia, type TonoInsignia } from "@/components/ui/Insignia";
import { ETIQUETA_ESTADO_TURNO, type EstadoTurno } from "@/lib/reglas/turno";

const TONO: Record<EstadoTurno, TonoInsignia> = {
  abierto: "abierto",
  en_revision: "revision",
  cerrado: "cerrado",
};

export function InsigniaEstadoTurno({ estado }: { estado: EstadoTurno }) {
  return <Insignia tono={TONO[estado]}>{ETIQUETA_ESTADO_TURNO[estado]}</Insignia>;
}
