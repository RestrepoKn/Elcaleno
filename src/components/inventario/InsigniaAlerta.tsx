import { Insignia, type TonoInsignia } from "@/components/ui/Insignia";
import { ETIQUETA_ALERTA, type NivelAlerta } from "@/lib/reglas/alertas";

// D-3: el aviso del bar ("Por reponer") usa su propio color (azul); amarilla y roja son solo de helados.
const TONO: Record<NivelAlerta, TonoInsignia> = {
  ninguna: "neutro",
  reponer: "reponer",
  amarilla: "amarilla",
  roja: "roja",
};

const ICONO: Record<NivelAlerta, string> = {
  ninguna: "",
  reponer: "↓",
  amarilla: "!",
  roja: "!!",
};

export function InsigniaAlerta({ nivel }: { nivel: NivelAlerta }) {
  return (
    <Insignia tono={TONO[nivel]}>
      {ICONO[nivel] ? <span aria-hidden="true">{ICONO[nivel]}</span> : null}
      {ETIQUETA_ALERTA[nivel]}
    </Insignia>
  );
}
