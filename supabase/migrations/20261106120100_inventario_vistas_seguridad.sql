-- Inventario del bar · M2 (Doc/PLAN_INVENTARIO.md, sección 9.3). Copia literal del plan.
-- Repetible: scripts/migrate-supabase.mjs reaplica todos los archivos en cada ejecución.

-- M2: vistas con los cálculos derivados y cierre de acceso público

CREATE OR REPLACE VIEW v_registros_turno
WITH (security_invoker = true) AS
SELECT
  r.*,
  COALESCE(r.contado, r.final_calculado) AS inventario_referencia,                          -- RN-06
  CASE WHEN r.contado IS NOT NULL AND r.contado < r.final_calculado
       THEN r.final_calculado - r.contado ELSE 0 END AS faltante,                           -- RN-05
  CASE WHEN r.contado IS NOT NULL AND r.contado > r.final_calculado
       THEN r.contado - r.final_calculado ELSE 0 END AS sobrante,                           -- RN-05
  CASE WHEN r.contado IS NOT NULL AND r.contado < r.final_calculado
       THEN (r.final_calculado - r.contado) * r.valor_unitario ELSE 0 END AS valor_a_cancelar  -- RN-05
FROM registros_turno r;

CREATE OR REPLACE VIEW v_turnos
WITH (security_invoker = true) AS
SELECT
  t.*,
  s.venta_total, s.total_a_cancelar, s.num_registros, s.sin_conteo,
  CASE WHEN t.facturas_efectivo IS NOT NULL AND t.pago_encargado IS NOT NULL
       THEN s.venta_total - t.facturas_efectivo - t.pago_encargado END AS resultado_neto    -- RN-07
FROM turnos t
CROSS JOIN LATERAL (
  SELECT COALESCE(SUM(v.total_venta), 0)      AS venta_total,
         COALESCE(SUM(v.valor_a_cancelar), 0) AS total_a_cancelar,
         COUNT(*)                             AS num_registros,
         COUNT(*) FILTER (WHERE v.contado IS NULL) AS sin_conteo
  FROM v_registros_turno v
  WHERE v.turno_id = t.id
) s;

CREATE OR REPLACE VIEW v_inventario_actual
WITH (security_invoker = true) AS
SELECT DISTINCT ON (p.id)
  p.id AS producto_id, p.nombre, p.seccion, p.categoria, p.valor_unitario,
  p.umbral_alerta, p.umbral_critico,
  v.turno_id,
  v.inventario_referencia AS inventario,
  (v.contado IS NOT NULL) AS conteo_fisico
FROM productos p
JOIN v_registros_turno v ON v.producto_id = p.id
JOIN turnos t ON t.id = v.turno_id
WHERE p.activo
ORDER BY p.id, t.fecha DESC, t.created_at DESC;

ALTER TABLE acceso          ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_turno ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON acceso, productos, turnos, registros_turno FROM anon, authenticated;
REVOKE ALL ON v_registros_turno, v_turnos, v_inventario_actual FROM anon, authenticated;
