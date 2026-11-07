-- M4 · Fotos de facturas del turno (extensión solicitada por el estudiante después de P09).
-- Cada foto es el soporte de un recibo pagado con la caja durante el turno.
-- El archivo vive en Supabase Storage (espacio privado "facturas-turno"); esta tabla dice a qué turno pertenece.
-- Repetible: db:migrate reaplica todos los archivos.

CREATE TABLE IF NOT EXISTS fotos_turno (
  id              BIGSERIAL    PRIMARY KEY,
  turno_id        UUID         NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  ruta            VARCHAR(300) NOT NULL,                 -- ruta del objeto dentro del espacio de Storage
  nombre_original VARCHAR(200),
  tipo            VARCHAR(40)  NOT NULL,                 -- image/jpeg | image/png | image/webp
  tamano          INTEGER      NOT NULL,                 -- bytes
  subida_por      VARCHAR(160) NOT NULL,                 -- correo de quien la subió
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fotos_ruta_unica   UNIQUE (ruta),
  CONSTRAINT fotos_tipo_valido  CHECK (tipo IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT fotos_tamano_valido CHECK (tamano > 0 AND tamano <= 4194304)
);
CREATE INDEX IF NOT EXISTS idx_fotos_turno ON fotos_turno (turno_id, created_at);

ALTER TABLE fotos_turno ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fotos_turno FROM anon, authenticated;

-- Espacio privado: sin acceso público; la app lo usa desde el servidor con la llave de servicio.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('facturas-turno', 'facturas-turno', false, 4194304, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
