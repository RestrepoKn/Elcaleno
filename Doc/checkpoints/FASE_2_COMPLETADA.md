# Fase 2 · Reglas de negocio

Fecha: 2026-11-07. Estado: completada.

Se ejecutó antes de P01, con autorización del estudiante, porque las reglas no usan la base de datos. P01 sigue pendiente.

## Archivos creados

- `src/lib/config/inventario.ts`: secciones, categorías, umbrales (6; 5 y 3), `UMBRALES_POR_DEFECTO` y topes (`CANTIDAD_MAXIMA` 9999, `MONTO_MAXIMO` = máximo de INTEGER, longitudes de texto).
- `src/lib/reglas/errores.ts`: `CodigoError`, `MENSAJES`, `ESTADO_HTTP` (tabla 11.2), `ErrorDeNegocio` y `datosInvalidos(campo)`.
- `src/lib/reglas/fechas.ts`: `hoyBogota`, `esFechaValida` (calendario real, sin usar el reloj).
- `src/lib/reglas/producto.ts`: `Seccion`, `esSeccionValida`, `umbralesPorDefecto`, `validarProducto`.
- `src/lib/reglas/registro.ts`: los cálculos de la fila, `estadoConteo`, `inventarioReferencia`, `esCantidadValida`, `validarMovimiento`, `validarConteo`.
- `src/lib/reglas/alertas.ts`: `NivelAlerta`, `ETIQUETA_ALERTA`, `nivelAlerta` (idéntica a la sección 8).
- `src/lib/reglas/turno.ts`: `EstadoTurno`, `ETIQUETA_ESTADO_TURNO`, `esEditable`, `puedeEntregar`, `puedeCerrar(estado, finanzasRegistradas)`, `puedeDevolver`, `validarTurno`, `validarFinanzas`, `valorVentaTotal`, `resultadoNeto`.
- `src/tests/reglas/`: `ayudas.ts` (`esperarCodigo`) y cuatro archivos de prueba con T-01 a T-61, cada caso con su ID.

## Verificación

| Comando | Resultado |
|---|---|
| `npm test` | 9 archivos, 75 pruebas: 61 nuevas y 14 existentes, todas en verde |
| `npm run lint` | OK |
| `npm run build` | OK |
| `npm run type-check` | OK |

Comprobaciones adicionales:
- `hoyBogota(2026-11-07T04:30Z)` da `2026-11-06` y `hoyBogota(2026-11-07T05:30Z)` da `2026-11-07`; el cambio de día ocurre a medianoche de Bogotá.
- `esFechaValida`: rechaza `2026-02-29` y `2026-13-01`; acepta `2028-02-29`.
- En `src/lib/reglas/` no hay imports de `pg`, `next` ni `node:`, ni `process.env` ni red. El único `new Date()` es el parámetro por defecto de `hoyBogota`.

## Decisiones

- Ninguna prueba se ajustó para que pasara; todas pasaron en el primer intento.
- Los errores de validación llevan `detalles: { campo }`, para que la interfaz marque el campo.
- Se agregó el tope `MONTO_MAXIMO` para que valores y montos no superen una columna INTEGER, que de otro modo fallaría en la base.
