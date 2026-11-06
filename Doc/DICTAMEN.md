# Dictamen del punto de partida

> Resultado de P00 (2026-11-06). Si este dictamen y el plan no coinciden en un nombre o ruta del repositorio, prevalece este dictamen, porque refleja el código real. Las reglas de negocio siguen siendo las del plan.

## Resumen

| Pieza | Estado | Qué hacer | Prompt |
|---|---|---|---|
| Proyecto Next/TS | EXISTE Y REUTILIZABLE | REUTILIZAR | Todos |
| Tailwind 4 | EXISTE Y REUTILIZABLE | REUTILIZAR | P06 |
| Dependencias `pg`, `zod`, `framer-motion` | EXISTE Y REUTILIZABLE | REUTILIZAR | Todos |
| `tsx` | Solo transitivo | CREAR (agregar a devDependencies) | P04 |
| Conexión a Postgres | Variable existe; contraseña rechazada | CREAR pool propio, tras corregir la credencial | P01, P03 |
| Login y sesión | EXISTE Y REUTILIZABLE | REUTILIZAR (envolver) | P03 |
| `src/proxy.ts` | EXISTE Y REUTILIZABLE | Ampliar sin alterar lo actual | P03 |
| Componentes `ui` | EXISTE (otro módulo) | NO TOCAR; crear los del inventario | P06 |
| Migraciones | EXISTE Y REUTILIZABLE | REUTILIZAR `db:migrate` | P01 |
| `src/lib/dataService.ts` | EXISTE (otro módulo) | NO TOCAR; fachada con otra ruta | P04 |
| Productos, turnos, conteo, alertas, resumen | NO EXISTE | CREAR | P01 a P08 |
| Módulos notas, usuarios, recuperación | EXISTE (otro módulo) | NO TOCAR | |

## Proyecto Next/TS
- Estado: EXISTE Y REUTILIZABLE
- Qué hacer: REUTILIZAR
- Detalle: Next 16.3.5, TypeScript estricto, alias `@/*`. Línea base en verde (`ESTADO_ACTUAL.md`, sección 14).

## Conexión a Postgres
- Estado: la variable existe, pero Supabase rechaza la contraseña (`28P01`)
- Qué hacer: CREAR `src/lib/db/conexion.ts` en P03, después de corregir la credencial
- Detalle:
  - Usar `ELCALENOSM_POSTGRES_URL`, no `DATABASE_URL`.
  - Quitar `sslmode` y `sslrootcert` de la URL, como `supabase-db.ts`.
  - Pool propio, sin importar `supabase-db.ts`: ese archivo importa `server-only`, que no está instalado como paquete y fallaría en scripts con `tsx`.
  - Pasar los parsers con la opción `types` del `Pool`. `types.setTypeParser` global, como en la sección 10.7 del plan, cambiaría también las consultas del login.

## Login y sesión
- Estado: EXISTE Y REUTILIZABLE
- Qué hacer: REUTILIZAR
- Detalle:
  - `src/lib/auth/sesion.ts` envuelve `getCurrentUser()` y consulta `acceso`; no reescribe el login.
  - `acceso` y `users.role` son independientes: `admin` no implica `administrador`.
  - Comparar correos en minúsculas, porque `users` los guarda así y `acceso` no lo exige.
  - No agregar `demo@elcaleno.com` a `acceso`.
  - `obtenerSesion` no se exporta desde la fachada de datos, para que los scripts con `tsx` no carguen `next/headers`.

## Protección de rutas
- Estado: EXISTE Y REUTILIZABLE
- Qué hacer: ampliar `src/proxy.ts`
- Detalle: agregar `/inventario/:path*` y `/api/inventario/:path*`, conservando las rutas actuales. En `/api/inventario` responder 401 en vez de redirigir. El proxy solo mira la cookie; la validación real es `exigirSesion()`.

## Componentes ui base
- Estado: EXISTE (otro módulo), con estilos oscuros fijos
- Qué hacer: NO TOCAR; CREAR `Boton`, `Campo`, `Selector`, `Tarjeta`, `Insignia`, `Aviso`, `Modal`, `EstadoVacio` en P06
- Detalle: los nombres en español no chocan con `Button`, `Card`, etc. El tema claro del plan se aplica solo dentro de `/inventario`, sin cambiar `:root` ni `body`. `Container` y `Spinner` se pueden reutilizar.

## Migraciones
- Estado: EXISTE Y REUTILIZABLE
- Qué hacer: REUTILIZAR `npm run db:migrate`
- Detalle: no crear `scripts/migrar.mjs`. Como el script reaplica todo, las migraciones deben ser repetibles; M1 y M2 del plan ya lo son. Nombres en `ESTADO_ACTUAL.md`, sección 13.

## Fachada de datos
- Estado: `src/lib/dataService.ts` EXISTE (otro módulo)
- Qué hacer: NO TOCAR; CREAR `src/lib/inventario/dataService.ts`
- Detalle: donde el plan o los prompts digan `lib/dataService.ts`, usar esta ruta.

## Funcionalidades del inventario
- Estado: NO EXISTE
- Qué hacer: CREAR
- Detalle: productos, turno de bar, turno de helados, conteo físico, alertas y resumen financiero, según P01 a P08.

## Correcciones a los prompts

| Prompt | Dice | Debe ser |
|---|---|---|
| P01 | `db:migrar`, `migrar.mjs` | `db:migrate` existente |
| P02 | `tests/reglas/` | `src/tests/reglas/` |
| P02 | `puedeCerrar(estado, facturas, pago)` | `puedeCerrar(estado, finanzasRegistradas)` |
| P02 | Lista parcial de funciones | Incluir también `esEditable`, `validarTurno`, `validarFinanzas` e `inventarioReferencia` (sección 10.5) |
| P04 | `registrarCierreFinanciero` | `registrarFinanzas` |
| P04 | `lib/datos/precios.ts` | `lib/datos/facturas.ts` |
| P04 | No crea `cargar-acceso.ts` | Crear `scripts/cargar-acceso.ts` (sección 9.3) |
| P04 | No menciona RN-13 | Un producto creado con turno abierto entra en él con inicial 0 |
| P04 | `devolverTurno` vuelve a abierto | Además `entregado_at = NULL`, por `turnos_entrega_coherente` |
| P04, P08 | `db:demo` antes de `probar:flujo` | Orden: `db:limpiar`, `probar:flujo`, `db:demo` |
| P05 | Vender de más da 409/422 | 409 |
| P08 | `historial/` y `resumen/` | `/inventario/turnos` y `/inventario/turnos/[id]` |
| P08 | Deja los demo para la aceptación | Limpiar los demo antes de A-01 a A-21 |
| P09 | `hayAumento(valorNuevo, ultimoValor)` | `hayAumento(valorAnterior, valorNuevo)` |
| P09 | T-62 a T-64 cocina, T-65 a T-68 precios | T-62 a T-65 precios, T-66 a T-68 cocina |

Nota para P01: en el caso (e) de `verificar-bd`, el segundo turno no puede ser `abierto` si ya hay uno, y un turno `en_revision` necesita `entregado_at`. Si no se arma así, el error sería por otra restricción.

## Qué necesita conseguir el estudiante

1. **Bloquea P01:** una contraseña válida de Postgres en `.env.local`.
2. **Bloquea P03:** correos y rol de cada persona. Cada una debe existir en `users` y en `acceso`.
3. **Antes de P06:** decidir si se permite un cambio mínimo para llegar a `/inventario` desde el login o el dashboard.
4. **Antes de P01:** confirmar D-1 a D-4 (plan, sección 3.5).
