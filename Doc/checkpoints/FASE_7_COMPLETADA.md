# Fase 7 · Opcionales: cocina y facturas de compra

Fecha: 2026-11-07. Estado: completada.

P09 se adelantó a pedido del estudiante, antes de diligenciar `Doc/ACEPTACION.md` (el prompt pedía hacerlo después).

## Base de datos

- M3: `supabase/migrations/20261106120200_inventario_opcionales.sql`. Es el SQL literal de la sección 18 y es repetible.
- Aplicada con `npm run db:migrate`.
- Verificada:
  - `registros_cocina` y `facturas` con RLS activo.
  - Restricciones `cocina_cantidades_validas`, `cocina_producto_minimo`, `facturas_valor_positivo` y `facturas_texto_minimo`.
  - Índice `ux_facturas_numero_producto`.
  - Columna generada `final_esperado`: 10 − 4 = 6. Una salida de 11 con existencia 10 da 23514 `cocina_cantidades_validas`.

## Código

| Pieza | Archivos |
|---|---|
| Reglas | `src/lib/reglas/cocina.ts` (`inventarioFinalCocina`, `validarCocina`), `src/lib/reglas/precios.ts` (`hayAumento(valorAnterior, valorNuevo)`, `detalleAumento`) |
| Datos | `src/lib/datos/cocina.ts` (`registrarTurnoCocina`, `listarCocina`, `productosDeCocina`), `src/lib/datos/facturas.ts` (`registrarFactura`, `listarFacturas`), reexportados en la fachada |
| API | `GET/POST /api/inventario/cocina` (ambos roles), `GET/POST /api/inventario/facturas` (administrador) |
| Pantallas | `/inventario/cocina` (ambos roles: formulario con final esperado en vivo y registros por fecha), `/inventario/facturas` (administrador: formulario con aviso de aumento e historial filtrable por producto) |
| Navegación | Cocina (ambos) y Facturas (administrador) |
| Limpieza | `db:limpiar` también borra las facturas y los registros de cocina de prueba |

El aumento se calcula frente a la factura anterior **en fecha** del mismo producto (en la misma fecha, la registrada antes). `registrarFactura` y el historial (con `LAG`) usan el mismo criterio. Estas facturas son costos de compra y no alimentan las "facturas en efectivo" del turno.

## Pruebas

- `npm test`: 134 de 134. Incluye T-62 a T-68 con la numeración del plan: T-62 a T-65 de precios y T-66 a T-68 de cocina, más 2 complementarias.
- Son 68 pruebas numeradas del plan.

Verificación en vivo con `next dev`:

| # | Caso | Resultado |
|---|---|---|
| 1 | El encargado registra en cocina 10 − 4 | 201, final 6 |
| 2 | Salida 11 | 400 `DATOS_INVALIDOS` |
| 3, 4 | Listado y página de cocina | Correctos |
| 5 | El encargado registra una factura | 403 `SIN_PERMISO` |
| 6 a 8 | Facturas 2000, 2500 y 1800 sobre "Demo Agua" | Aumento solo en la segunda (2000 → 2500, +500) |
| 9 | Número repetido | 409 `FACTURA_DUPLICADA` |
| 10 | Producto inexistente | 404 `PRODUCTO_NO_ENCONTRADO` |
| 11, 12 | Historial y página | Muestran "Subió $ 500" |
| 13 | Página de facturas como encargado | "No tiene permiso" |

No se crearon productos en la prueba: el turno "Mañana" del estudiante estaba abierto y un producto nuevo habría entrado en él (RN-13). Los datos de prueba se borraron.

`npm run type-check`, `npm run lint` y `npm run build`: correctos.

## Aceptación

A-22 y A-23 están agregadas a `Doc/ACEPTACION.md` para ejecutarlas en Vercel.
