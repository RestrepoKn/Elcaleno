# Estado de ejecución

| Prompt | Fase | Estado |
|---|---|---|
| P00 | 0 · Verificación | Completado, con un pendiente: tablas reales sin verificar |
| P01 | 1 · Base de datos | Completado (base nueva) |
| P02 | 2 · Reglas | Completado (adelantado; no depende de la base) |
| P03 | 3 · Servidor | Completado |
| P04 | 4 · Datos | Pendiente |
| P05 | 4 · API | Pendiente |
| P06 | 5 · Interfaz base | Pendiente |
| P07 | 5 · Turno | Pendiente |
| P08 | 5 y 6 · Cierre y aceptación | Pendiente |
| P09 | 7 · Opcionales | Pendiente |

## Bitácora

### P00 · 2026-11-06

- Ejecutado con Claude Code, no con Copilot.
- `npm ci` correcto. `npm test` 14 de 14, `lint` y `build` correctos. `type-check` pasa solo después del build.
- Conexión a Postgres rechazada con `28P01`. La revisión local no encontró errores de formato en las URL. No se reintentó.
- Archivos creados: `Doc/ESTADO_ACTUAL.md`, `Doc/DICTAMEN.md`, `Doc/ESTADO_EJECUCION.md`, `Doc/checkpoints/FASE_0_COMPLETADA.md`, `.github/copilot-instructions.md`.
- No se modificó código, configuración ni dependencias.
- El archivo de prompts se llama `Doc/PROMPTS INVENTARIO.md`, con espacio, no `PROMPTS_INVENTARIO.md`.

### P02 · 2026-11-07

- Adelantado a P01 con autorización del estudiante.
- Se crearon `src/lib/config/inventario.ts`, siete archivos en `src/lib/reglas/` y `src/tests/reglas/` (T-01 a T-61).
- `npm test`: 75 de 75 (61 nuevas y 14 existentes). Lint, build y type-check correctos.
- Detalle en `Doc/checkpoints/FASE_2_COMPLETADA.md`.

### Conexión a Supabase · 2026-11-07

- `.env.local` se actualizó a las 08:03.
- Puerto 6543 (transaction pooler): TCP conecta, pero no responde a la solicitud SSL de Postgres y corta a los 20 s (`ECONNRESET`). Probado sin credenciales.
- Puerto 5432 (session pooler): TLS 1.3 correcto, con certificado legítimo de Supabase y sin proxy intermedio. La autenticación falla: `28000 PAM authentication failed for user "postgres"`.
- Conclusión: la contraseña de Postgres en `.env.local` sigue sin ser válida. Las llaves de API de Supabase no sirven como contraseña de la base.
- No se reintenta, para evitar un bloqueo de IP.
- Después, el propio panel de Supabase falló con `PAM authentication failed for user "postgres"`. Se descartó esa base y se creó una conexión nueva desde Vercel.

### P01 · 2026-11-07 (base nueva)

- Creados por un agente: migraciones `20261106120000_inventario_tablas.sql` (M1) y `20261106120100_inventario_vistas_seguridad.sql` (M2), copia literal de 9.2 y 9.3; `scripts/verificar-bd.mjs` (`db:verificar`).
- Agregada `20261003190000_restablecimientos_contrasena.sql`, copia de `supabase/restablecimientos_contrasena.sql`, que antes no se aplicaba.
- `npm run db:migrate`: las 5 migraciones aplicadas, y reaplicadas sin error (son repetibles).
- `npm run db:verificar`: 0 fallas. Tablas, vistas, índices, restricciones, columnas generadas, RLS y casos a) a h) en OK.
- Para cambios futuros: no editar M1 ni M2. Usar migraciones nuevas con `ALTER`; si cambian columnas de `turnos` o `registros_turno`, hacer `DROP VIEW` primero, porque las vistas usan `r.*` y `t.*`.

### Variables de conexión · 2026-11-07

- La conexión nueva dejó variables sin prefijo (`POSTGRES_URL`…) en `.env.local`, y en Vercel el prefijo cambió a `ELCALENO`.
- Nuevo `src/lib/db/variables-conexion.mjs`. Acepta `ELCALENO_`, `ELCALENOSM_` o sin prefijo. En desarrollo y scripts prefiere `*_URL_NON_POOLING` (5432), porque el 6543 no responde desde la red local; en producción prefiere `*_URL` (6543).
- Usado por `src/lib/db/conexion.ts`, `scripts/verificar-bd.mjs` y `scripts/crear-usuario.mjs`.
- Cambio mínimo en otro módulo, autorizado por el estudiante: `src/lib/supabase-db.ts` y `scripts/migrate-supabase.mjs` usan la misma función. El comportamiento con las variables antiguas no cambia.

### P03 · 2026-11-07

- Creados por un agente:
  - `src/lib/db/conexion.ts`: pool propio, parsers solo para ese pool, sin `server-only`.
  - `src/lib/datos/tipos.ts` y `src/lib/datos/acceso.ts` (`rolDeCorreo`).
  - `src/lib/auth/sesion.ts`: `obtenerSesion`, `obtenerUsuario`, `exigirSesion`, `exigirRol`.
  - `src/lib/http/respuestas.ts`, `src/lib/validacion/esquemas.ts` y `src/lib/formato.ts`.
  - `src/app/api/inventario/sesion/route.ts`.
  - Pruebas en `src/tests/servidor/`.
- Modificado: `src/proxy.ts`. Se agregaron `/inventario` y `/api/inventario`; la API responde 401 en JSON.
- `scripts/crear-usuario.mjs` (`db:usuario`): crea el usuario del login y su rol en `acceso`. Funciona de forma interactiva o con `--email --nombre --rol --generar-contrasena`. El hash se verificó compatible con `verifyPassword`.
- Usuario creado: `santiago.restrepo04@usa.edu.co`, rol administrador.
- Verificación con `next dev`:
  - `/api/inventario/sesion` sin sesión: 401 `NO_AUTORIZADO`.
  - Login con contraseña errónea: 401. Login correcto: 200.
  - `/api/inventario/sesion` con sesión: 200 `{ rol: "administrador" }`.
  - `/inventario` sin sesión: 307 al login.
- Sin verificar en vivo: un correo con sesión pero sin rol en `acceso`. Está cubierto por pruebas unitarias.
- `npm run type-check`, `npm test` (15 archivos, 123 pruebas), `npm run lint` y `npm run build`: todo correcto.
