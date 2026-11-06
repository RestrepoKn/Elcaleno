# Fase 0 · Verificación del punto de partida

Fecha: 2026-11-06. Estado: completada, con un pendiente que bloquea P01.

## Infraestructura

| Elemento | Estado |
|---|---|
| Dependencias | Instaladas con `npm ci` |
| Pruebas | 14 de 14 |
| Lint y build | Correctos |
| Type-check | Correcto después del build |
| Conexión a Postgres | **Falla: `28P01`, contraseña rechazada** |

## Otro módulo (no se toca)

Login y sesión, usuarios, notas, recuperación de contraseña, `src/lib/dataService.ts`, `src/components/ui/*`, `src/app/page.tsx`.
Excepción prevista: ampliar el `matcher` de `src/proxy.ts` en P03.

## Resumen del dictamen

- Se reutiliza: proyecto, Tailwind, dependencias, login mediante envoltura, `db:migrate`.
- Se crea: pool propio del inventario, fachada en `src/lib/inventario/dataService.ts`, componentes ui en español y todo el dominio.
- Hay 15 correcciones a los prompts, listadas en `Doc/DICTAMEN.md`.

## Qué necesita conseguir el estudiante

1. Contraseña válida de Postgres en `.env.local` (bloquea P01).
2. Correos y roles para `acceso` (antes de P03).
3. Confirmar D-1 a D-4 (antes de P01).
4. Decidir el acceso a `/inventario` desde el login o el dashboard (antes de P06).
