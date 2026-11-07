import { EstadoVacio } from "@/components/ui/EstadoVacio";

// Marcador de P06: la apertura del turno y la planilla se construyen en P07.
export default function PaginaTurno() {
  return (
    <EstadoVacio
      titulo="Turno actual"
      descripcion="Próximamente: abrir el turno y registrar la planilla de bar y helados."
    />
  );
}
