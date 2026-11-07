# Fase 6 · Revisión, pruebas y aceptación

Fecha: 2026-11-07. Estado: revisión y pruebas completadas. La aceptación está preparada y la ejecuta el estudiante en Vercel.

## Revisión del código (secciones 4, 8 y 15)

| Punto | Resultado |
|---|---|
| Cálculos fuera de `lib/reglas/` o sin usar las columnas generadas | Ninguno. La base calcula `final_calculado` y `total_venta`; las vistas, faltante, sobrante y valor a cancelar; la planilla en vivo usa las mismas funciones de `lib/reglas` |
| Valor no copiado al abrir el turno | Se copia (RN-08). `probar:flujo` 5 y 27 |
| Alerta sin el inventario de referencia | Usa `inventario_referencia` (contado si existe; si no, calculado) |
| Más de un turno abierto | Lo impiden el índice único parcial `ux_turnos_un_abierto` y la verificación en `abrirTurno` |
| Acciones del administrador al alcance del encargado | Ninguna. Las 11 rutas llaman `exigirSesion()`; las de administrador, `exigirRol`; las páginas muestran "No tiene permiso". Verificado en vivo (P05: 37 de 37) |
| Turno cerrado editable | No. `esEditable` y `registrarFinanzas` lo rechazan con `TURNO_NO_EDITABLE`; la pantalla es de solo lectura |
| "Hoy" con `new Date()` fuera de `fechas.ts` | Ninguno |
| SQL concatenado | Ninguno. Solo se interpolan fragmentos fijos; los valores van parametrizados |
| Montos con decimales | Ninguno. Enteros validados en reglas, Zod y CHECK |
| Alerta comunicada solo con color | Ninguna. Todas las insignias llevan texto |
| Código de otro módulo | Cambios mínimos y documentados: `proxy.ts` (matchers), `supabase-db.ts` y `migrate-supabase.mjs` (selección de variables), login (`route.ts`, `LoginPage.tsx`, `AppShell.tsx`: destino y enlace). En `globals.css` solo se agregó |

## Pruebas

| Prueba | Resultado |
|---|---|
| `npm test` | 125 de 125 (61 de reglas, 50 de servidor y 14 originales) |
| `npm run probar:flujo` | 33 de 33 en P04. No se repitió en P08 porque exige borrar la demostración, que el estudiante estaba usando en Vercel; la capa de datos de P04 no cambió, salvo la consulta `tieneTurnoPosterior` |
| Verificación de la API (`scripts/verificar-api.ps1`) | 37 de 37 en P05 |
| `npm run db:verificar` | 0 fallas en P01 |
| `npm run lint`, `type-check` y `build` | OK |

## Aceptación

- `Doc/ACEPTACION.md` contiene A-01 a A-21 con las columnas para diligenciar, la preparación (`db:limpiar`, cuentas con `db:usuario`) y la nota de A-22 y A-23 (opcionales, P09).
- Pendiente del estudiante: ejecutar A-01 a A-21 en https://elcalenosm.vercel.app y llenar la tabla.

## Seguridad

- `.gitignore` excluye `.env*`. No hay `.env` versionados ni credenciales en archivos versionados (revisado con `git grep`).
- README con la sección "Módulo de inventario", agregada sin borrar el contenido anterior.
