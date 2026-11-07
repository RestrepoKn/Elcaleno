# Fase 3 · Servidor, sesión y roles

Fecha: 2026-11-07. Estado: completada.

## Qué se reutilizó

- **Login:** `getCurrentUser()` de `src/lib/auth.ts`. `src/lib/auth/sesion.ts` lo envuelve y no se modificó.
- **Protección:** `src/proxy.ts`. Se ampliaron los matchers; los existentes no cambiaron.
- **Conexión:** pool propio en `src/lib/db/conexion.ts`. Comparte con el login solo la selección de variables (`src/lib/db/variables-conexion.mjs`).

## Verificación con `next dev`

| Prueba | Resultado |
|---|---|
| `GET /api/inventario/sesion` sin sesión | 401 `NO_AUTORIZADO` |
| Login con contraseña incorrecta | 401 |
| Login correcto (administrador) | 200 |
| `GET /api/inventario/sesion` con sesión | 200 `{ email, rol: "administrador" }` |
| `GET /inventario` sin sesión | 307 al login |
| Correo con sesión pero sin rol | Cubierto por `src/tests/servidor/sesion.test.ts`; no probado en vivo |

## Pruebas

`npm test`: 15 archivos, 123 pruebas en verde, incluidas las 14 originales. `type-check`, `lint` y `build` correctos.
