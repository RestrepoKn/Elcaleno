-- M5 · Buzón de sugerencias (pedido del estudiante; reemplaza "Notas", que guardaba en archivos JSON
-- y en Vercel no persistía). Los encargados escriben; el administrador lee todas.
-- Repetible: db:migrate reaplica todos los archivos.

CREATE TABLE IF NOT EXISTS sugerencias (
  id           BIGSERIAL     PRIMARY KEY,
  autor_email  VARCHAR(160)  NOT NULL,
  autor_nombre VARCHAR(120)  NOT NULL,
  categoria    VARCHAR(20)   NOT NULL DEFAULT 'sugerencia',
  mensaje      VARCHAR(1000) NOT NULL,
  leida        BOOLEAN       NOT NULL DEFAULT false,
  leida_at     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT sugerencias_mensaje_minimo  CHECK (char_length(btrim(mensaje)) >= 3),
  CONSTRAINT sugerencias_categoria_valida CHECK (categoria IN ('sugerencia', 'problema', 'pedido', 'otro')),
  CONSTRAINT sugerencias_lectura_coherente CHECK (leida = (leida_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_sugerencias_bandeja ON sugerencias (leida, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sugerencias_autor ON sugerencias (autor_email, created_at DESC);

ALTER TABLE sugerencias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sugerencias FROM anon, authenticated;
