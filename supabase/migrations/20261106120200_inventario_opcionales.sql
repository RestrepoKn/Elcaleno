-- M3 · Opcionales del inventario (F5 turno de cocina, F6 facturas de compra).
-- SQL literal de Doc/PLAN_INVENTARIO.md, sección 18. Repetible: db:migrate reaplica todos los archivos.

-- M3: opcionales

CREATE TABLE IF NOT EXISTS registros_cocina (
  id                 BIGSERIAL    PRIMARY KEY,
  fecha              DATE         NOT NULL,
  producto           VARCHAR(160) NOT NULL,
  existencia_inicial INTEGER      NOT NULL,
  salida             INTEGER      NOT NULL,
  final_esperado     INTEGER GENERATED ALWAYS AS (existencia_inicial - salida) STORED,   -- RN-17
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT cocina_producto_minimo CHECK (char_length(btrim(producto)) >= 1),
  CONSTRAINT cocina_cantidades_validas CHECK (existencia_inicial >= 0 AND salida >= 0 AND salida <= existencia_inicial)
);
CREATE INDEX IF NOT EXISTS idx_cocina_fecha ON registros_cocina (fecha DESC);

CREATE TABLE IF NOT EXISTS facturas (
  id             BIGSERIAL    PRIMARY KEY,
  numero         VARCHAR(40)  NOT NULL,
  proveedor      VARCHAR(120) NOT NULL,
  fecha          DATE         NOT NULL,
  producto_id    UUID         NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  valor_unitario INTEGER      NOT NULL,                 -- costo de compra, no el valor de venta del producto
  turno_id       UUID         REFERENCES turnos(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT facturas_valor_positivo CHECK (valor_unitario > 0),
  CONSTRAINT facturas_texto_minimo   CHECK (char_length(btrim(numero)) >= 1 AND char_length(btrim(proveedor)) >= 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_facturas_numero_producto ON facturas (lower(btrim(numero)), producto_id);
CREATE INDEX IF NOT EXISTS idx_facturas_producto ON facturas (producto_id, fecha DESC, id DESC);

ALTER TABLE registros_cocina ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas         ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON registros_cocina, facturas FROM anon, authenticated;
