-- Inventario del bar · M1 (Doc/PLAN_INVENTARIO.md, sección 9.2). Copia literal del plan.
-- Repetible: scripts/migrate-supabase.mjs reaplica todos los archivos en cada ejecución.

-- M1: tablas del inventario

CREATE TABLE IF NOT EXISTS acceso (
  email  VARCHAR(160) PRIMARY KEY,
  rol    VARCHAR(14)  NOT NULL,
  CONSTRAINT acceso_email_minimo CHECK (char_length(btrim(email)) >= 3),
  CONSTRAINT acceso_rol_valido   CHECK (rol IN ('administrador', 'encargado'))   -- RN-15
);

CREATE TABLE IF NOT EXISTS productos (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         VARCHAR(160) NOT NULL,
  seccion        VARCHAR(10)  NOT NULL,                  -- 'bar' | 'helados'
  categoria      VARCHAR(40)  NOT NULL,
  valor_unitario INTEGER      NOT NULL,                  -- pesos enteros
  umbral_alerta  SMALLINT     NOT NULL,                  -- bar: 6 · helados: 5 (amarilla)
  umbral_critico SMALLINT,                               -- solo helados: 3 (roja)
  activo         BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT productos_nombre_minimo   CHECK (char_length(btrim(nombre)) >= 1),
  CONSTRAINT productos_valor_positivo  CHECK (valor_unitario > 0),
  CONSTRAINT productos_seccion_valida  CHECK (seccion IN ('bar', 'helados')),
  CONSTRAINT productos_umbral_positivo CHECK (umbral_alerta > 0),
  CONSTRAINT productos_umbrales_coherentes CHECK (                                  -- RN-02
    (seccion = 'bar' AND umbral_critico IS NULL) OR
    (seccion = 'helados' AND umbral_critico IS NOT NULL
       AND umbral_critico > 0 AND umbral_critico < umbral_alerta))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_productos_nombre ON productos (seccion, lower(btrim(nombre)));  -- RN-01
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos (seccion, activo);

CREATE TABLE IF NOT EXISTS turnos (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha                 DATE         NOT NULL,
  nombre                VARCHAR(40)  NOT NULL,
  encargado             VARCHAR(80)  NOT NULL,
  estado                VARCHAR(12)  NOT NULL DEFAULT 'abierto',
  facturas_efectivo     INTEGER,                         -- lo registra el administrador (RN-07)
  pago_encargado        INTEGER,                         -- lo registra el administrador (RN-07)
  venta_total_cierre    INTEGER,                         -- guardado al cerrar (RN-14)
  resultado_neto_cierre INTEGER,                         -- guardado al cerrar; puede ser negativo
  entregado_at          TIMESTAMPTZ,
  cerrado_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT turnos_nombre_minimo    CHECK (char_length(btrim(nombre)) >= 1),
  CONSTRAINT turnos_encargado_minimo CHECK (char_length(btrim(encargado)) >= 1),
  CONSTRAINT turnos_estado_valido    CHECK (estado IN ('abierto', 'en_revision', 'cerrado')),   -- RN-12
  CONSTRAINT turnos_facturas_validas CHECK (facturas_efectivo IS NULL OR facturas_efectivo >= 0),
  CONSTRAINT turnos_pago_valido      CHECK (pago_encargado IS NULL OR pago_encargado >= 0),
  CONSTRAINT turnos_entrega_coherente CHECK ((estado = 'abierto') = (entregado_at IS NULL)),
  CONSTRAINT turnos_cierre_coherente CHECK (                                                     -- RN-14
    (estado = 'cerrado' AND cerrado_at IS NOT NULL AND facturas_efectivo IS NOT NULL
       AND pago_encargado IS NOT NULL AND venta_total_cierre IS NOT NULL
       AND resultado_neto_cierre IS NOT NULL) OR
    (estado <> 'cerrado' AND cerrado_at IS NULL))
);
-- Un solo turno abierto a la vez y fecha + nombre únicos (RN-11):
CREATE UNIQUE INDEX IF NOT EXISTS ux_turnos_un_abierto ON turnos (estado) WHERE estado = 'abierto';
CREATE UNIQUE INDEX IF NOT EXISTS ux_turnos_fecha_nombre ON turnos (fecha, lower(btrim(nombre)));
CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos (fecha DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS registros_turno (
  id              BIGSERIAL    PRIMARY KEY,
  turno_id        UUID         NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  producto_id     UUID         NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,    -- RN-13
  nombre          VARCHAR(160) NOT NULL,                 -- copia al abrir el turno
  seccion         VARCHAR(10)  NOT NULL,                 -- copia al abrir el turno
  valor_unitario  INTEGER      NOT NULL,                 -- copiado al abrir el turno (RN-08)
  inicial         INTEGER      NOT NULL DEFAULT 0,
  entrada         INTEGER      NOT NULL DEFAULT 0,
  vendida         INTEGER      NOT NULL DEFAULT 0,
  contado         INTEGER,                               -- conteo físico; NULL hasta que se ingresa
  final_calculado INTEGER GENERATED ALWAYS AS (inicial + entrada - vendida) STORED,         -- RN-03
  total_venta     INTEGER GENERATED ALWAYS AS (vendida * valor_unitario) STORED,            -- RN-04
  CONSTRAINT registros_cantidades_validas CHECK (inicial >= 0 AND entrada >= 0 AND vendida >= 0),  -- RN-10
  CONSTRAINT registros_contado_valido     CHECK (contado IS NULL OR contado >= 0),
  CONSTRAINT registros_valor_positivo     CHECK (valor_unitario > 0),
  CONSTRAINT registros_vendida_excede     CHECK (vendida <= inicial + entrada),             -- RN-10
  CONSTRAINT registros_unico_por_turno    UNIQUE (turno_id, producto_id)
);
CREATE INDEX IF NOT EXISTS idx_registros_turno ON registros_turno (turno_id);
CREATE INDEX IF NOT EXISTS idx_registros_producto ON registros_turno (producto_id);

CREATE OR REPLACE FUNCTION inventario_actualizar_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_productos_updated_at ON productos;
CREATE TRIGGER trg_productos_updated_at BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION inventario_actualizar_updated_at();
DROP TRIGGER IF EXISTS trg_turnos_updated_at ON turnos;
CREATE TRIGGER trg_turnos_updated_at BEFORE UPDATE ON turnos
  FOR EACH ROW EXECUTE FUNCTION inventario_actualizar_updated_at();
