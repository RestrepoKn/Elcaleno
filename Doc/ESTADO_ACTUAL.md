# Estado actual del repositorio

> Radiografía hecha en P00 el 2026-11-06, antes de escribir código del inventario.
> Carpeta real de documentos: `Doc/` (los prompts dicen `doc/`; en Windows es la misma ruta).

## 1. Versiones

| Paquete | Versión instalada | Nota |
|---|---|---|
| next | 16.3.5 | |
| react / react-dom | 19.2.8 | |
| typescript | 5.9.3 | |
| tailwindcss | 4.3.3 | |
| zod | 4.6.2 | |
| vitest | 4.1.11 | |
| pg | 8.23.1 | Ya está |
| @types/pg | 8.23.1 | Ya está |
| framer-motion | 13.2.0 | Solo lo usa `HolaMundo.tsx` |
| tsx | 4.21.0 | Transitivo (viene con `vercel`); no está en `package.json` |
| server-only | No instalado | Next lo resuelve internamente al compilar |

Entorno local: Node 26.13.0, npm 11.20.0. El CI usa Node 20. `npm ci` avisa `EBADENGINE` por `@renovatebot/pep440` con Node 26; es solo una advertencia.

## 2. Scripts de package.json

`dev` (`node scripts/tokenVercel.mjs && next dev`), `build`, `start`, `db:migrate`, `lint`, `format`, `type-check`, `test`, `test:watch`, `test:coverage`.

## 3. Estructura

Todo lo que existe hoy pertenece a otro módulo (base del proyecto, login, usuarios, notas) y no se toca, salvo lo que el dictamen indique.

```text
src/
  app/
    (dashboard)/   dashboard, notes, password, status, users
    api/           auth, data/[collection], health, users
    login/  recuperar-contrasena/  restablecer-contrasena/
    globals.css  layout.tsx  page.tsx  loading.tsx  not-found.tsx
  components/      auth, home, layout, theme, ui
  hooks/           use-collection.ts
  lib/             auth.ts, correo.ts, dataService.ts, json-db.ts, password.ts,
                   plantillasCorreo.ts, supabase-db.ts, tokenRecuperacion.ts,
                   types.ts, urlBase.ts, utils.ts
  modules/         notes, users
  styles/          tokens.ts
  proxy.ts
data/              example.json, note.json, sessions.json, _schema/
scripts/           migrate-supabase.mjs, tokenVercel.mjs
supabase/          migrations/ (2 archivos), restablecimientos_contrasena.sql
```

## 4. TypeScript

- Alias: `@/*` → `./src/*`, `@data/*` → `./data/*`.
- Estricto: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noFallthroughCasesInSwitch`.

## 5. Autenticación

Existe login propio, sin Supabase Auth.

- Archivos: `src/lib/auth.ts`, `src/lib/password.ts`, `src/app/api/auth/*`, `src/components/auth/*`.
- Mecanismo: correo y contraseña (scrypt) en `public.users`; sesión en `public.user_sessions`; cookie `elcaleno_session`.
- Función de sesión: `getCurrentUser()` devuelve `{ id, email, name, role }` o `null`. El correo sale de ahí.
- `users.role` admite `admin` o `user`. Es independiente de `acceso`.
- Tras iniciar sesión, `LoginPage.tsx:42` redirige siempre a `/dashboard`.
- `src/lib/auth.ts` importa `server-only` y `next/headers`.

## 6. Base de datos

- Variables en `.env.local` (solo nombres): `ELCALENOSM_POSTGRES_URL` (pooler, puerto 6543), `ELCALENOSM_POSTGRES_PRISMA_URL`, `ELCALENOSM_POSTGRES_URL_NON_POOLING` (pooler, puerto 5432), `ELCALENOSM_POSTGRES_HOST`, `_USER`, `_PASSWORD`, `_DATABASE`, y claves `ELCALENOSM_SUPABASE_*`. No existe `DATABASE_URL`.
- Pool existente: `getSupabasePool()` en `src/lib/supabase-db.ts` (importa `server-only`; quita `sslmode` y `sslrootcert` de la URL).
- Tablas según el código: `users`, `user_sessions`, `restablecimientos_contrasena`.
- **Tablas reales de la base: SIN VERIFICAR.** La conexión falló con `28P01` (credenciales inválidas). Revisión local: las tres URL están bien formadas, sin caracteres especiales en la contraseña, coinciden con `ELCALENOSM_POSTGRES_PASSWORD` y traen el usuario con la referencia del proyecto. La causa más probable es una contraseña desactualizada. No se reintentó para no agravar el bloqueo del pool.
- En el código no hay `productos`, `turnos`, `acceso` ni `registros_turno`; falta confirmarlo en la base.

## 7. Dónde viven los datos hoy

El inventario se lleva en papel. No hay datos digitales que migrar.

## 8. Migraciones

Hay mecanismo: `npm run db:migrate` (`scripts/migrate-supabase.mjs`). Lee `supabase/migrations/*.sql` en orden alfabético y **reaplica todos los archivos en cada ejecución**, sin tabla de control. Por eso las migraciones deben ser repetibles. `supabase/restablecimientos_contrasena.sql` está fuera de esa carpeta y el script no lo aplica.

## 9. Dominio de inventario ya construido

Nada.

## 10. Estilos

- Tailwind 4 con `@theme inline` en `globals.css` (16 líneas).
- Tema oscuro global: `--background: #09111f`, `--foreground: #f4f7fb`. `ThemeProvider` solo envuelve `(dashboard)`.
- `src/styles/tokens.ts` tiene colores propios del tema oscuro.
- Fuente: Space Grotesk, expuesta como `--font-geist-sans`.
- `components/ui/`: `Badge`, `Button`, `Card`, `Container`, `Input`, `Spinner`, con estilos oscuros fijos (por ejemplo `bg-white/[0.04]`, `border-white/10`).

## 11. Pruebas

- Vitest con `environment: "node"`, `globals: true` e `include: ["src/**/*.{test,spec}.{ts,tsx}"]`. Una prueba fuera de `src/` no se ejecuta.
- Existentes: 5 archivos, 14 pruebas (`change-password`, `recuperar`, `restablecer`, `health`, `password`).

## 12. Conflictos

| Ruta | Estado |
|---|---|
| `src/app/inventario` | No existe |
| `src/app/api/inventario` | No existe |
| `src/lib/dataService.ts` | **Existe**: recuperación de contraseña. El plan quiere ese mismo nombre |
| `src/components/ui` | Existe, con otros nombres y tema oscuro |
| `src/app/page.tsx` | Muestra el login. No se toca |
| `src/lib/auth.ts` | Existe. `src/lib/auth/sesion.ts` puede convivir; `@/lib/auth` sigue resolviendo al archivo |

## 13. Decisiones derivadas

| Tema | Decisión |
|---|---|
| Ruta de login | `/login` (existe) |
| Archivo de protección | `src/proxy.ts` (existe; hay que ampliar su `matcher`) |
| Migraciones | `npm run db:migrate`; no se crea `migrar.mjs` ni `db:migrar` |
| Variable de conexión | `ELCALENOSM_POSTGRES_URL` |
| M1 | `supabase/migrations/20261106120000_inventario_tablas.sql` |
| M2 | `supabase/migrations/20261106120100_inventario_vistas_seguridad.sql` |
| M3 | `supabase/migrations/20261106120200_inventario_opcionales.sql` |
| Prefijo de imports | `@/` |
| Carpeta de la app | `src/app` |
| Pruebas de reglas | `src/tests/reglas/` |
| Fachada de datos | `src/lib/inventario/dataService.ts` |

## 14. Compilación de base

| Comando | Resultado |
|---|---|
| `npm ci` | OK, 723 paquetes. npm no ejecutó los postinstall de `esbuild` y `unrs-resolver` (política `allowScripts`); pruebas y build funcionan igual |
| `npm test` | OK: 5 archivos, 14 pruebas |
| `npm run lint` | OK |
| `npm run build` | OK. Advertencia previa: `src/lib/json-db.ts` hace que se rastree todo el proyecto |
| `npm run type-check` | Antes del build falla: `src/app/layout.tsx(15,50): TS2304 LayoutProps`. Después del build pasa |

Observación sin corregir: `.github/workflows/ci.yml` corre `type-check` antes de `build` y `next-env.d.ts` está en `.gitignore`, así que ese paso probablemente falla en un checkout limpio. No se ha comprobado en GitHub.
