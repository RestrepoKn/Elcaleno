# El Caleño · Plan técnico de implementación

> Sistema de Pedidos para Restaurante · versión técnica 1.0, derivada del plan funcional de elcaleno
> Asignatura: Lógica y Programación (SIST0200) · Universidad Sergio Arboleda, Santa Marta · Docente: Jhonatan Castro Polo
> Stack: Next.js 16 (App Router) + TypeScript + Tailwind 4 + Supabase Postgres + Zod 4 · Despliegue en Vercel
> Ejecución: GitHub Copilot en modo Agente, con los prompts de `doc/PROMPTS_ELCALENO.md`

---

## Índice

0. [Cómo se usa este documento](#0-cómo-se-usa-este-documento)
1. [Punto de partida](#1-punto-de-partida)
2. [Traducción de la persistencia](#2-traducción-de-la-persistencia)
3. [Alcance](#3-alcance)
4. [Acceso](#4-acceso)
5. [Estados del pedido (flujo de cocina)](#5-estados-del-pedido)
6. [Reglas de negocio](#6-reglas-de-negocio)
7. [Casos de uso](#7-casos-de-uso)
8. [El cálculo de la cuenta](#8-el-cálculo-de-la-cuenta)
9. [Modelo de datos](#9-modelo-de-datos)
10. [Arquitectura del código](#10-arquitectura-del-código)
11. [Contratos de API](#11-contratos-de-api)
12. [Pantallas](#12-pantallas)
13. [Identidad visual](#13-identidad-visual)
14. [Dinero, fechas y zona horaria](#14-dinero-fechas-y-zona-horaria)
15. [Seguridad e integridad](#15-seguridad-e-integridad)
16. [Pruebas](#16-pruebas)
17. [Plan de ejecución](#17-plan-de-ejecución)
18. [Funcionalidades opcionales](#18-funcionalidades-opcionales)
19. [Glosario](#19-glosario)

---

## 0. Cómo se usa este documento

Este plan es el documento rector del proyecto. Copilot lo lee antes de cada tarea y los prompts remiten a sus secciones por número. Si un prompt y este plan no coinciden, prevalece el plan.

El proyecto El Caleño **ya está iniciado y bastante avanzado** (el repositorio tiene Next.js 16, Vitest configurado, alias a `src/` y `data/`, y persistencia en archivos JSON). Por eso P00 es un prompt de **auditoría y reconciliación**: Copilot compara el código real contra este plan y produce un dictamen de qué conservar, qué enriquecer y qué cambiar, antes de tocar nada. Cuando el código del estudiante ya es correcto y está probado, se conserva aunque difiera del plan en la forma; el plan solo prevalece cuando hay una regla de negocio, una validación o la integridad de los datos en juego.

| Archivo en el repositorio | Función |
|---|---|
| `doc/PLAN_ELCALENO.md` | Este documento |
| `doc/PROMPTS_ELCALENO.md` | Prompts en orden de ejecución |
| `doc/ESTADO_ACTUAL.md` | Radiografía del repositorio antes de empezar (lo crea P00) |
| `doc/DICTAMEN.md` | Veredicto de P00 por funcionalidad: conservar, enriquecer o cambiar |
| `doc/ESTADO_EJECUCION.md` | Avance prompt por prompt |
| `doc/checkpoints/FASE_N_COMPLETADA.md` | Evidencia del cierre de cada fase |
| `.github/copilot-instructions.md` | Reglas permanentes que Copilot aplica en todas las conversaciones |

---

## 1. Punto de partida

### 1.1 Lo que ya existe (según los archivos del repositorio) y no se reconstruye desde cero

- Proyecto Next.js 16.3.5 con React 19, TypeScript, Tailwind 4, Zod 4 y Framer Motion.
- Vitest configurado (con Testing Library y jsdom), scripts `test`, `test:watch`, `test:coverage`, `type-check`, `lint`, `format`.
- Alias de importación: `@/*` → `src/*`, `@data/*` → `data/*`.
- `.gitignore` que excluye `.env*` y `data/_backups/` (sugiere persistencia en `data/`).

El trabajo de estos prompts es: auditar lo ya construido (P00), llevar los datos de los archivos JSON a Supabase Postgres, formalizar las reglas en funciones puras con pruebas, y completar el flujo del MVP (menú, pedido, estados de cocina, cuenta) con una aceptación, conservando lo que ya funcione.

### 1.2 Lo que se verifica en P00 antes de escribir código

| Aspecto | Por qué importa |
|---|---|
| Qué funcionalidades ya están construidas y en qué estado | Para adaptarlas en vez de rehacerlas |
| Dónde viven hoy los datos (archivos JSON en `data/`, memoria, o ya Supabase) | Define cuánto se migra a Postgres |
| Si hay login hoy y cómo funciona | El plan no lo tenía; se decide en P03 (sección 4) |
| Variable de conexión directa a Postgres y claves de Supabase | Las operaciones con reglas usan transacciones con `pg`; si no hay, se obtienen en P00 |
| Mecanismo de migraciones | Las tablas se aplican con ese mecanismo; si no existe, se crea `npm run db:migrar` |
| Rutas y componentes ya existentes (menú, pedidos, cocina) | Para reconciliar, no duplicar |
| Pruebas que ya existan | No romperlas |

### 1.3 Regla sobre el acceso

El plan funcional describe un sistema de uso interno del restaurante, sin autenticación detallada en el MVP. En el stack del curso la aplicación queda publicada en una URL de Vercel; dejarla abierta expondría los pedidos y la caja. Se usa un login como puerta única de acceso para el personal (sin roles complejos: mesero, cocina y caja comparten el acceso; la separación mesero/cocina es por pantalla, no por permisos). P00 determina si ya hay login: si lo hay, se envuelve con `lib/auth/sesion.ts` sin reescribirlo; si no, P03 agrega uno mínimo o deja la app tras el login del curso. En cualquier caso, `/app` del restaurante y `/api` quedan protegidas, y el panel de cocina y la toma de pedidos son vistas distintas de la misma app.

---

## 2. Traducción de la persistencia

El plan funcional y el repositorio usan archivos JSON en `data/` (con backups en `data/_backups/`). El JSON no funciona en Vercel, que es serverless y de sistema de archivos efímero: lo que se escriba en un archivo en producción se pierde entre invocaciones. La única pieza que cambia es dónde viven los datos; toda la lógica y las reglas se conservan.

| Pieza del repositorio | En este plan técnico | Motivo |
|---|---|---|
| Datos en archivos JSON (`data/`) | Supabase Postgres | El JSON no persiste en Vercel; es el estándar del curso |
| Lectura/escritura de JSON (probable `lib` de acceso a `data/`) | Funciones de `lib/datos/` con SQL | Mismo papel de capa de datos, ahora contra Postgres |
| Alias `@data/*` | Puede quedar para datos estáticos (el menú semilla), pero los datos vivos van a Postgres | El menú inicial se puede sembrar desde un seed; los pedidos deben persistir |
| Lógica y validación (Zod ya está) | Igual, movida a `lib/reglas/` y `lib/validacion/` | El repo ya tiene Zod; se organiza en capas probables |

Lo que **no cambia**: el stack (Next 16, React 19, Tailwind 4, Zod 4, Vitest), el modelo de dominio (menú, pedido, ítems, estados), el flujo de cocina y el cálculo de la cuenta.

---

## 3. Alcance

### 3.1 Módulo mínimo (el MVP del plan funcional)

| ID | Funcionalidad (plan funcional) | Casos de uso | Prompts |
|---|---|---|---|
| F1 | Gestionar el menú (platos con nombre, categoría, precio, disponibilidad) | CU-01, CU-02 | P04, P05, P07 |
| F2 | Tomar un pedido para una mesa con sus ítems | CU-03 | P04, P05, P08 |
| F3 | Avanzar el estado del pedido en cocina (recibido → en preparación → listo → entregado) | CU-04 | P02, P04, P08 |
| F4 | Ver el panel de cocina con los pedidos activos | CU-05 | P08 |
| F5 | Calcular y cerrar la cuenta (subtotal + propina) | CU-06, CU-07 | P02, P04, P08 |

### 3.2 Funcionalidades opcionales

| ID | Funcionalidad | Prompts |
|---|---|---|
| F6 | Agregar o quitar ítems a un pedido ya tomado (mientras no esté cerrado) | P09 |
| F7 | Resumen del día: pedidos atendidos y total vendido | P09 |
| F8 | Productos más pedidos (rotación del menú) | P09 |

Se construyen solo con la fase 5 cerrada. Las concretas dependen de lo que el plan funcional marque como deseable; estas tres cierran bien el ciclo.

### 3.3 Fuera de alcance

Se mantiene la lista del plan funcional: pagos electrónicos o integración con datáfono, facturación electrónica DIAN, domicilios y apps de terceros, reservas de mesa, inventario de insumos de cocina, y roles con permisos diferenciados por cargo.

### 3.4 Decisiones de alcance de esta versión técnica

| Decisión | Motivo |
|---|---|
| Los datos viven en Supabase Postgres | Para que los pedidos persistan en producción; el JSON no sirve en Vercel (sección 2) |
| Precios y montos en pesos enteros | El peso colombiano no usa centavos; evita errores de redondeo en la cuenta |
| El total del pedido se calcula desde sus ítems; el precio del ítem se congela al agregarlo | Si el precio del plato cambia después, la cuenta del pedido no cambia |
| El estado avanza solo hacia adelante en el flujo de cocina (sin saltar ni retroceder, salvo cancelar) | Coherencia del flujo de cocina (sección 5) |
| Un pedido se puede cancelar mientras no esté entregado ni cerrado | Permite corregir un pedido equivocado sin borrarlo |
| La propina es un porcentaje opcional sobre el subtotal, redondeado a peso entero | El plan incluye propina; se fija su cálculo (sección 8) |
| Un plato no se elimina; se marca como no disponible | Un plato con pedidos debe seguir en el historial |
| Los pedidos cerrados y sus ítems no se editan | Son el registro de la venta |

---

## 4. Acceso

| Actor | Acceso | Puede hacer |
|---|---|---|
| Personal (mesero/caja) | Login como puerta | Gestionar el menú, tomar pedidos, cerrar cuentas |
| Cocina | Misma app, pantalla de cocina | Ver pedidos activos y avanzar su estado |
| Sistema | Interno | Valida entradas, controla el flujo de estados, calcula la cuenta |

No hay roles con permisos distintos (fuera de alcance, sección 3.3): mesero, cocina y caja usan la misma app y se diferencian por la pantalla que abren. Toda ruta privada exige sesión.

| Ruta | Sin sesión | Con sesión |
|---|:-:|:-:|
| `/` | Redirige al login | Redirige a `/restaurante` |
| `/restaurante/*` | Redirige al login | Sí |
| `/api/restaurante/*` | 401 | Sí |

---

## 5. Estados del pedido

### 5.1 Flujo de cocina

```text
recibido ──► en_preparacion ──► listo ──► entregado ──► cerrado
   │               │              │
   └───────────────┴──────────────┴────────► cancelado  (mientras no esté entregado ni cerrado)
```

| Código | Etiqueta | Significado |
|---|---|---|
| `recibido` | Recibido | El pedido se tomó; la cocina aún no empieza |
| `en_preparacion` | En preparación | La cocina lo está haciendo |
| `listo` | Listo | Terminado, por entregar |
| `entregado` | Entregado | Entregado en la mesa |
| `cerrado` | Cerrado | La cuenta se cobró; el pedido termina |
| `cancelado` | Cancelado | Anulado antes de entregar |

### 5.2 Transiciones (RN-03)

| Evento | Estado origen | Estado destino |
|---|---|---|
| Avanzar | `recibido` | `en_preparacion` |
| Avanzar | `en_preparacion` | `listo` |
| Avanzar | `listo` | `entregado` |
| Cerrar cuenta | `entregado` | `cerrado` |
| Cancelar | `recibido`, `en_preparacion` o `listo` | `cancelado` |

El estado solo avanza al siguiente del flujo (no salta ni retrocede). Cancelar solo procede antes de `entregado`. Cerrar solo procede desde `entregado`. Cualquier otra combinación produce `TRANSICION_INVALIDA`.

---

## 6. Reglas de negocio

| ID | Regla | Origen | Dónde se aplica |
|---|---|---|---|
| RN-01 | Un plato tiene nombre, categoría, precio (entero > 0) y disponibilidad; el nombre es único | Plan, sección de datos | BD UNIQUE, CHECK; Zod |
| RN-02 | Solo se pueden pedir platos disponibles | Plan | Servicio `agregarItem`; verificación al tomar el pedido |
| RN-03 | El estado del pedido avanza según el flujo de cocina; no salta ni retrocede; cancelar solo antes de entregar | Plan (flujo de cocina) | `lib/reglas/estados.ts` `siguienteEstado`, `puedeCancelar` |
| RN-04 | Un pedido tiene al menos un ítem; cada ítem tiene cantidad entera > 0 | Plan | `lib/reglas/pedido.ts`; Zod; BD CHECK |
| RN-05 | El precio del ítem se congela al agregarlo (copia del precio del plato) | Agregada (coherencia de la cuenta) | Servicio `agregarItem` |
| RN-06 | El subtotal del pedido es la suma de (cantidad × precio_unitario) de sus ítems | Plan (cuenta) | `lib/reglas/cuenta.ts` `subtotal` |
| RN-07 | La propina es un porcentaje (0 a 100) sobre el subtotal, redondeado a peso entero; el total es subtotal + propina | Plan (propina) | `lib/reglas/cuenta.ts` `calcularPropina`, `totalCuenta` |
| RN-08 | Un pedido se cierra solo cuando está entregado; al cerrarlo se fija su propina y su total | Plan | Servicio `cerrarCuenta`; RN-03 |
| RN-09 | Un pedido cancelado o cerrado no admite más ítems ni cambios de estado | Agregada | Servicio; dominio |
| RN-10 | El número de mesa es un entero positivo; una mesa puede tener un solo pedido activo a la vez (no cerrado ni cancelado) | Agregada | Servicio; BD índice único parcial |
| RN-11 | Un plato no se elimina; se marca como no disponible | Agregada | Servicio; BD `ON DELETE RESTRICT` |
| RN-12 | Los pedidos cerrados y sus ítems son inmutables | Agregada | Servicio |
| RN-13 | El total del pedido se calcula desde sus ítems; no se guarda hasta cerrar (al cerrar se guarda subtotal, propina y total del cierre) | Agregada (coherencia) | `lib/datos/pedidos.ts` |

### 6.1 Casos límite

| Caso | Resultado |
|---|---|
| Tomar un pedido sin ítems | Rechazo (`DATOS_INVALIDOS`) |
| Pedir un plato no disponible | Rechazo (`PLATO_NO_DISPONIBLE`) |
| Avanzar un pedido entregado | Rechazo (`TRANSICION_INVALIDA`): solo se puede cerrar |
| Cancelar un pedido entregado | Rechazo (`TRANSICION_INVALIDA`) |
| Cerrar un pedido no entregado | Rechazo (`TRANSICION_INVALIDA`) |
| Abrir un segundo pedido en una mesa con pedido activo | Rechazo (`MESA_OCUPADA`) |
| Propina de 0 % | Total = subtotal |
| Agregar ítem a un pedido cerrado | Rechazo (`PEDIDO_CERRADO`) |

---

## 7. Casos de uso

| ID | Entrada | Precondición | Efecto | Errores posibles |
|---|---|---|---|---|
| CU-01 Registrar plato | nombre, categoría, precio | nombre no repetido | Plato creado, disponible | `DATOS_INVALIDOS`, `PLATO_DUPLICADO` |
| CU-02 Cambiar disponibilidad o precio del plato | plato, disponible/precio | el plato existe | Plato actualizado | `PLATO_NO_ENCONTRADO`, `DATOS_INVALIDOS` |
| CU-03 Tomar pedido | mesa, ítems (plato + cantidad) | la mesa no tiene pedido activo; los platos existen y están disponibles | Pedido `recibido` con sus ítems (precio congelado) | `MESA_OCUPADA`, `PLATO_NO_DISPONIBLE`, `DATOS_INVALIDOS` |
| CU-04 Avanzar o cancelar estado | pedido, acción (avanzar/cancelar) | la transición es válida | Estado actualizado | `PEDIDO_NO_ENCONTRADO`, `TRANSICION_INVALIDA` |
| CU-05 Ver panel de cocina | — | — | Pedidos activos (no cerrados ni cancelados) con su estado y ítems, del más antiguo al más reciente | — |
| CU-06 Ver la cuenta | pedido | el pedido existe | Subtotal, y con un porcentaje de propina, la propina y el total | `PEDIDO_NO_ENCONTRADO` |
| CU-07 Cerrar cuenta | pedido, porcentaje de propina | el pedido está entregado | Pedido `cerrado` con subtotal, propina y total guardados | `PEDIDO_NO_ENCONTRADO`, `TRANSICION_INVALIDA`, `DATOS_INVALIDOS` |
| CU-08 Agregar/quitar ítem (opcional) | pedido, ítem | el pedido no está entregado, cerrado ni cancelado | Ítem agregado o quitado; el total se recalcula | `PEDIDO_NO_ENCONTRADO`, `PEDIDO_CERRADO`, `PLATO_NO_DISPONIBLE` |

### 7.1 Secuencia de CU-03 (tomar pedido)

Todo ocurre dentro de `conTransaccion`:

1. `validarPedido(mesa, items)` (mesa entero positivo; al menos un ítem; cantidades enteras > 0).
2. Verificar que la mesa no tenga un pedido activo (`MESA_OCUPADA`, RN-10).
3. Para cada ítem, obtener el plato; si no existe o no está disponible, `PLATO_NO_DISPONIBLE` (RN-02).
4. Insertar el pedido en estado `recibido` y sus ítems con `precio_unitario` congelado (RN-05).
5. Confirmar y devolver el pedido con sus ítems.

```ts
export async function tomarPedido(mesa: number, items: ItemEntrada[]): Promise<Pedido> {
  validarPedido(mesa, items);
  return conTransaccion(async (tx) => {
    if (await mesaTienePedidoActivo(tx, mesa)) throw new ErrorDeNegocio('MESA_OCUPADA');  // RN-10
    const pedidoId = await insertarPedido(tx, { mesa, estado: 'recibido' });
    for (const it of items) {
      const plato = await obtenerPlatoDisponible(tx, it.platoId);   // PLATO_NO_DISPONIBLE (RN-02)
      await insertarItem(tx, { pedidoId, platoId: plato.id, nombre: plato.nombre,
                               cantidad: it.cantidad, precioUnitario: plato.precio });  // RN-05
    }
    return leerPedido(tx, pedidoId);
  });
}
```

### 7.2 Secuencia de CU-07 (cerrar cuenta)

1. Bloquear el pedido; si no existe, `PEDIDO_NO_ENCONTRADO`.
2. Verificar que está `entregado` (si no, `TRANSICION_INVALIDA`, RN-08).
3. Validar el porcentaje de propina (0 a 100).
4. Calcular subtotal (de los ítems), propina (RN-07) y total.
5. Marcar el pedido `cerrado` guardando subtotal, propina, porcentaje y total, y la fecha de cierre.
6. Devolver la cuenta final.

---

## 8. El cálculo de la cuenta

Todo opera con pesos enteros.

```ts
export function subtotal(items: Array<{ cantidad: number; precioUnitario: number }>): number {
  return items.reduce((s, it) => s + it.cantidad * it.precioUnitario, 0);  // RN-06
}

export function calcularPropina(subtotal: number, porcentaje: number): number {
  return Math.round(subtotal * porcentaje / 100);   // redondeo a peso entero (RN-07)
}

export function totalCuenta(subtotal: number, propina: number): number {
  return subtotal + propina;
}
```

Ejemplos verificables (subtotal de 2×$18.000 + 1×$25.000 + 3×$6.000 = $79.000):

| Propina % | Propina | Total |
|---|---|---|
| 0 | 0 | 79.000 |
| 10 | 7.900 | 86.900 |
| 15 | 11.850 | 90.850 |

El porcentaje de propina se valida entre 0 y 100. El redondeo a peso entero evita centavos: 15 % de $33.333 = $4.999,95 → $5.000. Por eso los montos van en enteros: con decimales de punto flotante, el total podría quedar con fracciones de peso.

---

## 9. Modelo de datos

### 9.1 Relaciones

```text
platos 1 ──── N items_pedido
pedidos 1 ─── N items_pedido

v_pedidos = pedidos + subtotal calculado (suma de ítems) + número de ítems
```

Las migraciones se guardan en `supabase/migrations/`. En este documento se nombran M1 y M2. P00 confirma la numeración.

### 9.2 M1 · Tablas

```sql
-- M1: tablas de El Caleño

CREATE TABLE IF NOT EXISTS platos (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      VARCHAR(160)  NOT NULL,
  categoria   VARCHAR(40)   NOT NULL,
  precio      INTEGER       NOT NULL,                 -- pesos enteros (RN-01)
  disponible  BOOLEAN       NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT platos_nombre_minimo  CHECK (char_length(btrim(nombre)) >= 1),
  CONSTRAINT platos_precio_positivo CHECK (precio > 0)   -- RN-01
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_platos_nombre ON platos (lower(btrim(nombre)));  -- RN-01
CREATE INDEX IF NOT EXISTS idx_platos_categoria ON platos (categoria);
CREATE INDEX IF NOT EXISTS idx_platos_disponible ON platos (disponible);

CREATE TABLE IF NOT EXISTS pedidos (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa            SMALLINT      NOT NULL,
  estado          VARCHAR(16)   NOT NULL DEFAULT 'recibido',
  propina_pct     SMALLINT,                            -- se fija al cerrar
  subtotal_cierre INTEGER,                             -- guardado al cerrar
  propina_cierre  INTEGER,                             -- guardado al cerrar
  total_cierre    INTEGER,                             -- guardado al cerrar
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  cerrado_at      TIMESTAMPTZ,
  CONSTRAINT pedidos_mesa_positiva CHECK (mesa > 0),   -- RN-10
  CONSTRAINT pedidos_estado_valido CHECK (estado IN
    ('recibido', 'en_preparacion', 'listo', 'entregado', 'cerrado', 'cancelado')),  -- RN-03
  CONSTRAINT pedidos_propina_valida CHECK (propina_pct IS NULL OR (propina_pct BETWEEN 0 AND 100)),
  CONSTRAINT pedidos_cierre_coherente CHECK (
    (estado = 'cerrado' AND cerrado_at IS NOT NULL AND total_cierre IS NOT NULL) OR
    (estado <> 'cerrado' AND cerrado_at IS NULL))
);
-- Una mesa, un solo pedido activo (no cerrado ni cancelado) a la vez:
CREATE UNIQUE INDEX IF NOT EXISTS ux_pedidos_mesa_activa
  ON pedidos (mesa) WHERE estado NOT IN ('cerrado', 'cancelado');   -- RN-10
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos (estado, created_at);

CREATE TABLE IF NOT EXISTS items_pedido (
  id              BIGSERIAL     PRIMARY KEY,
  pedido_id       UUID          NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  plato_id        UUID          NOT NULL REFERENCES platos(id) ON DELETE RESTRICT,  -- RN-11
  nombre          VARCHAR(160)  NOT NULL,              -- copia al momento del pedido
  cantidad        SMALLINT      NOT NULL,
  precio_unitario INTEGER       NOT NULL,              -- congelado (RN-05)
  subtotal        INTEGER       GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,  -- RN-06
  CONSTRAINT items_cantidad_positiva CHECK (cantidad > 0),   -- RN-04
  CONSTRAINT items_precio_positivo   CHECK (precio_unitario > 0)
);
CREATE INDEX IF NOT EXISTS idx_items_pedido ON items_pedido (pedido_id);

CREATE OR REPLACE FUNCTION caleno_actualizar_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platos_updated_at ON platos;
CREATE TRIGGER trg_platos_updated_at BEFORE UPDATE ON platos
  FOR EACH ROW EXECUTE FUNCTION caleno_actualizar_updated_at();
DROP TRIGGER IF EXISTS trg_pedidos_updated_at ON pedidos;
CREATE TRIGGER trg_pedidos_updated_at BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION caleno_actualizar_updated_at();
```

### 9.3 M2 · Vista de pedidos, seed del menú y seguridad

```sql
-- M2: vista con subtotal calculado y cierre de acceso público

CREATE OR REPLACE VIEW v_pedidos
WITH (security_invoker = true) AS
SELECT
  p.*,
  COALESCE((SELECT SUM(i.subtotal) FROM items_pedido i WHERE i.pedido_id = p.id), 0) AS subtotal,  -- RN-13
  (SELECT COUNT(*) FROM items_pedido i WHERE i.pedido_id = p.id) AS num_items
FROM pedidos p;

ALTER TABLE platos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_pedido ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON platos, pedidos, items_pedido FROM anon, authenticated;
REVOKE ALL ON v_pedidos FROM anon, authenticated;
```

El menú inicial (los platos semilla) se carga desde `data/seed.json` (si el repo ya lo tiene) o desde un seed del script, en P04. Las tablas quedan sin políticas: la clave pública de Supabase no puede leerlas ni escribirlas; todo el acceso ocurre en el servidor con la conexión directa a Postgres.

### 9.4 Traducción de errores de la base de datos

| Código Postgres | Restricción | Código de negocio |
|---|---|---|
| `23505` | `ux_platos_nombre` | `PLATO_DUPLICADO` |
| `23505` | `ux_pedidos_mesa_activa` | `MESA_OCUPADA` |
| `23503` | llaves foráneas (`ON DELETE RESTRICT`) | `PLATO_CON_PEDIDOS` |
| `23514` | cualquier CHECK | `DATOS_INVALIDOS` |
| Otro | | `ERROR_INTERNO` (se registra en consola, no se muestra al usuario) |

---

## 10. Arquitectura del código

### 10.1 Capas

```text
Pantallas (app/restaurante/*) ──┐
                                ├──► Rutas API (app/api/restaurante/*) ──► lib/dataService.ts ──► lib/datos/* ──► Postgres
Componentes (components/*) ─────┘          │                                  │
                                           └──── lib/validacion (Zod)         └──── lib/reglas/* (funciones puras)
```

Las rutas y carpetas concretas se ajustan a las que el repo ya use (P00 lo confirma); el patrón de capas se mantiene. El proyecto usa `src/`, así que las rutas de `lib`, `components` y `app` cuelgan de `src/` según el alias `@/*`.

- `lib/reglas/`: reglas puras (flujo de estados, cálculo de la cuenta, validaciones). No importan datos, ni red, ni el reloj (salvo `fechas.ts`). Se prueban con Vitest (ya configurado).
- `lib/datos/`: consultas SQL y casos de uso con transacciones. Solo este directorio importa `lib/db/conexion.ts`.
- `lib/dataService.ts`: fachada única.
- Rutas API: validan con Zod, verifican sesión, llaman a `dataService`, responden con `lib/http/respuestas.ts`.

### 10.2 Árbol de archivos nuevos (bajo `src/`, salvo doc/ y supabase/)

```text
.github/copilot-instructions.md
doc/ESTADO_ACTUAL.md
doc/DICTAMEN.md
doc/ESTADO_EJECUCION.md
doc/checkpoints/FASE_N_COMPLETADA.md

supabase/migrations/NNNN_caleno_tablas.sql
supabase/migrations/NNNN_caleno_vista_seguridad.sql

scripts/migrar.mjs                 (solo si no existe mecanismo de migraciones)
scripts/verificar-bd.mjs
scripts/probar-flujo.ts
scripts/limpiar-prueba.mjs
scripts/cargar-menu.ts             (siembra el menú desde data/seed.json o valores por defecto)

src/lib/config/caleno.ts
src/lib/reglas/errores.ts
src/lib/reglas/fechas.ts
src/lib/reglas/plato.ts
src/lib/reglas/pedido.ts
src/lib/reglas/estados.ts
src/lib/reglas/cuenta.ts
src/lib/validacion/esquemas.ts
src/lib/db/conexion.ts
src/lib/auth/sesion.ts
src/lib/http/respuestas.ts
src/lib/formato.ts
src/lib/datos/tipos.ts
src/lib/datos/platos.ts
src/lib/datos/pedidos.ts
src/lib/datos/resumen.ts           (opcional)
src/lib/dataService.ts

src/tests/reglas/ayudas.ts
src/tests/reglas/estados.test.ts
src/tests/reglas/cuenta.test.ts
src/tests/reglas/pedido.test.ts
(o la carpeta de tests que el repo ya use)

src/app/page.tsx                                  (redirige a /restaurante)
src/app/restaurante/layout.tsx
src/app/restaurante/page.tsx                      (toma de pedidos / mesas)
src/app/restaurante/menu/page.tsx
src/app/restaurante/menu/nuevo/page.tsx
src/app/restaurante/pedidos/nuevo/page.tsx
src/app/restaurante/pedidos/[id]/page.tsx         (detalle + cuenta)
src/app/restaurante/cocina/page.tsx               (panel de cocina)
src/app/restaurante/resumen/page.tsx              (opcional)

src/app/api/restaurante/sesion/route.ts
src/app/api/restaurante/platos/route.ts
src/app/api/restaurante/platos/[id]/route.ts
src/app/api/restaurante/pedidos/route.ts
src/app/api/restaurante/pedidos/[id]/route.ts
src/app/api/restaurante/pedidos/[id]/estado/route.ts
src/app/api/restaurante/pedidos/[id]/cerrar/route.ts
src/app/api/restaurante/pedidos/[id]/items/route.ts   (opcional, F6)
src/app/api/restaurante/cocina/route.ts
src/app/api/restaurante/resumen/route.ts              (opcional)

src/components/ui/*  (Boton, Campo, Selector, Tarjeta, Insignia, Aviso, Modal, EstadoVacio)
src/components/caleno/NavegacionCaleno.tsx
src/components/caleno/InsigniaEstadoPedido.tsx
src/components/caleno/TablaMenu.tsx
src/components/caleno/FormularioPlato.tsx
src/components/caleno/SelectorPlatos.tsx
src/components/caleno/FormularioPedido.tsx
src/components/caleno/TarjetaPedidoCocina.tsx
src/components/caleno/Cuenta.tsx
src/components/caleno/TablaResumen.tsx            (opcional)
```

### 10.3 Responsabilidades y prohibiciones

| Regla de código | Motivo |
|---|---|
| Identificadores, comentarios y mensajes en español | Coherencia con el dominio |
| El flujo de estados y el cálculo de la cuenta viven en `lib/reglas/` y se prueban | Núcleo verificable |
| No romper las pruebas que ya existan en el repo | El proyecto ya tiene Vitest configurado |
| El total se calcula desde los ítems; el precio del ítem se congela al agregarlo | RN-05, RN-06, RN-13 |
| El estado solo avanza según el flujo; cancelar solo antes de entregar | RN-03 |
| El stock de la cuenta en pesos enteros; nunca decimales | Sección 14 |
| Solo `lib/datos/` importa `lib/db/conexion.ts` | Las rutas no escriben SQL |
| Las rutas solo importan datos desde `lib/dataService.ts` | Fachada única |
| Las rutas privadas llaman `exigirSesion()` como primera instrucción | Sección 4 |
| El pedido se toma y se cierra en una transacción, con la mesa/pedido bloqueados | RN-10, integridad |
| `params` de rutas dinámicas se obtiene con `await params` | Next.js 16 entrega `params` como Promise |
| Respetar los alias del repo (`@/*` → `src/*`, `@data/*` → `data/*`) | Ya definidos en tsconfig |

### 10.4 Configuración

```ts
// src/lib/config/caleno.ts
export const CATEGORIAS = ['Entrada', 'Plato fuerte', 'Bebida', 'Postre', 'Adicional'] as const;
export const PROPINA_SUGERIDA_PCT = 10;     // propina por defecto sugerida
export const PROPINA_MAX_PCT = 100;
export const CANTIDAD_MAXIMA_ITEM = 99;
export const ZONA_HORARIA = 'America/Bogota';
export const LIMITE_LISTADO = 500;
```

### 10.5 Firmas de las reglas puras

```ts
// src/lib/reglas/errores.ts
export type CodigoError =
  | 'DATOS_INVALIDOS' | 'NO_AUTORIZADO'
  | 'PLATO_DUPLICADO' | 'PLATO_NO_ENCONTRADO' | 'PLATO_NO_DISPONIBLE' | 'PLATO_CON_PEDIDOS'
  | 'PEDIDO_NO_ENCONTRADO' | 'MESA_OCUPADA' | 'TRANSICION_INVALIDA' | 'PEDIDO_CERRADO'
  | 'ERROR_INTERNO';
export const MENSAJES: Record<CodigoError, string>;     // sección 11.2
export const ESTADO_HTTP: Record<CodigoError, number>;  // sección 11.2
export class ErrorDeNegocio extends Error {
  constructor(public codigo: CodigoError, mensaje?: string, public detalles?: unknown);
}

// src/lib/reglas/fechas.ts
export function hoyBogota(reloj?: Date): string;                 // 'YYYY-MM-DD'

// src/lib/reglas/estados.ts
export type EstadoPedido = 'recibido' | 'en_preparacion' | 'listo' | 'entregado' | 'cerrado' | 'cancelado';
export const ETIQUETA_ESTADO: Record<EstadoPedido, string>;     // sección 5.1
export const ES_ACTIVO: (estado: EstadoPedido) => boolean;      // no cerrado ni cancelado
export function siguienteEstado(actual: EstadoPedido): EstadoPedido;   // avanza según el flujo; TRANSICION_INVALIDA si no avanza (RN-03)
export function puedeCancelar(actual: EstadoPedido): boolean;   // recibido/en_preparacion/listo
export function puedeCerrar(actual: EstadoPedido): boolean;     // solo entregado (RN-08)

// src/lib/reglas/plato.ts
export function validarPlato(d: { nombre: string; categoria: string; precio: number }): void;  // RN-01

// src/lib/reglas/pedido.ts
export interface ItemEntrada { platoId: string; cantidad: number }
export function validarPedido(mesa: number, items: ItemEntrada[]): void;  // mesa > 0; >=1 ítem; cantidades > 0 (RN-04, RN-10)
export function validarCantidad(cantidad: number): void;

// src/lib/reglas/cuenta.ts
export function subtotal(items: Array<{ cantidad: number; precioUnitario: number }>): number;  // RN-06
export function calcularPropina(subtotal: number, porcentaje: number): number;  // redondeo entero (RN-07)
export function totalCuenta(subtotal: number, propina: number): number;
export function validarPorcentajePropina(pct: number): void;   // 0 a 100
```

### 10.6 Firmas de `dataService`

```ts
// Sesión
obtenerSesion(): Promise<{ email: string } | null>

// Menú
listarPlatos(f?: { categoria?: string; soloDisponibles?: boolean }): Promise<Plato[]>
crearPlato(d: DatosPlato): Promise<{ id: string }>
actualizarPlato(id: string, cambios: { nombre?: string; categoria?: string; precio?: number; disponible?: boolean }): Promise<void>

// Pedidos
tomarPedido(mesa: number, items: ItemEntrada[]): Promise<Pedido>          // CU-03
obtenerPedido(id: string): Promise<PedidoConCuenta>                       // detalle + cuenta
avanzarEstado(id: string): Promise<Pedido>                               // RN-03
cancelarPedido(id: string): Promise<Pedido>                             // RN-03
cerrarCuenta(id: string, propinaPct: number): Promise<CuentaFinal>       // CU-07
pedidosDeCocina(): Promise<Pedido[]>                                     // activos, antiguo→reciente (CU-05)
agregarItem(id: string, item: ItemEntrada): Promise<Pedido>             // opcional, F6
quitarItem(id: string, itemId: number): Promise<Pedido>                 // opcional, F6

// Resumen (opcional)
resumenDelDia(fecha: string): Promise<ResumenDia>
platosMasPedidos(desde: string, hasta: string): Promise<FilaPlatoRanking[]>
```

Tipos (`src/lib/datos/tipos.ts`): `Plato { id, nombre, categoria, precio, disponible }`; `ItemPedido { id, platoId, nombre, cantidad, precioUnitario, subtotal }`; `Pedido { id, mesa, estado, items, subtotal, numItems, creadoEn }`; `PedidoConCuenta { pedido, subtotal, propinaSugerida, total }`; `CuentaFinal { subtotal, propinaPct, propina, total, cerradoEn }`; `DatosPlato`, `DatosPedido`, `ResumenDia`, `FilaPlatoRanking`.

### 10.7 Conexión y transacciones

```ts
// src/lib/db/conexion.ts
import { Pool, types, type PoolClient } from 'pg';

types.setTypeParser(1082, (v) => v);                 // DATE → texto
types.setTypeParser(1114, (v) => v);                 // TIMESTAMP → texto
types.setTypeParser(1184, (v) => v);                 // TIMESTAMPTZ → texto
types.setTypeParser(20, (v) => parseInt(v, 10));     // BIGINT (ids, COUNT, SUM) → number

const globalParaPool = globalThis as unknown as { poolCaleno?: Pool };

export const pool = globalParaPool.poolCaleno ?? new Pool({
  connectionString: process.env.DATABASE_URL,        // el nombre real lo confirma P00
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 10_000,
});
if (process.env.NODE_ENV !== 'production') globalParaPool.poolCaleno = pool;

export async function consultar<T>(sql: string, valores: unknown[] = []): Promise<T[]> { /* pool.query */ }
export async function conTransaccion<T>(trabajo: (tx: PoolClient) => Promise<T>): Promise<T> { /* BEGIN/COMMIT/ROLLBACK */ }
```

Hace falta agregar `pg` (y `@types/pg`) a las dependencias; el repo aún no lo tiene. `SUM(subtotal)` sobre `INTEGER` devuelve `BIGINT`; el parser lo pasa a número. Como todo es entero, no hace falta parser para `NUMERIC`.

---

## 11. Contratos de API

### 11.1 Formato de respuesta

```json
{ "ok": true, "datos": { } }
```

```json
{ "ok": false, "error": { "codigo": "MESA_OCUPADA", "mensaje": "Esa mesa ya tiene un pedido activo.", "detalles": null } }
```

Todas las respuestas llevan `Cache-Control: no-store`.

### 11.2 Códigos de error

| Código | HTTP | Mensaje para el usuario |
|---|---|---|
| `DATOS_INVALIDOS` | 400 | Revise los datos ingresados. |
| `NO_AUTORIZADO` | 401 | Debe iniciar sesión. |
| `PLATO_DUPLICADO` | 409 | Ya existe un plato con ese nombre. |
| `PLATO_NO_ENCONTRADO` | 404 | El plato no existe. |
| `PLATO_NO_DISPONIBLE` | 409 | Ese plato no está disponible. |
| `PLATO_CON_PEDIDOS` | 409 | El plato tiene pedidos registrados y no se puede eliminar; márquelo como no disponible. |
| `PEDIDO_NO_ENCONTRADO` | 404 | El pedido no existe. |
| `MESA_OCUPADA` | 409 | Esa mesa ya tiene un pedido activo. |
| `TRANSICION_INVALIDA` | 409 | Esa acción no es válida para el estado actual del pedido. |
| `PEDIDO_CERRADO` | 409 | El pedido ya está cerrado o cancelado y no se puede modificar. |
| `ERROR_INTERNO` | 500 | Ocurrió un error inesperado. Intente de nuevo. |

### 11.3 Endpoints (todos requieren sesión)

| Método y ruta | Cuerpo o parámetros | Respuesta `datos` |
|---|---|---|
| `GET /api/restaurante/sesion` | | `{ email }` |
| `GET /api/restaurante/platos?categoria=&soloDisponibles=` | | `Plato[]` |
| `POST /api/restaurante/platos` | `{ nombre, categoria, precio }` | `{ id }` (201) |
| `PATCH /api/restaurante/platos/[id]` | `{ nombre?, categoria?, precio?, disponible? }` | `{ actualizado: true }` |
| `POST /api/restaurante/pedidos` | `{ mesa, items: [{ platoId, cantidad }] }` | `Pedido` (201) |
| `GET /api/restaurante/pedidos/[id]` | | `PedidoConCuenta` |
| `POST /api/restaurante/pedidos/[id]/estado` | `{ accion: 'avanzar' \| 'cancelar' }` | `Pedido` |
| `POST /api/restaurante/pedidos/[id]/cerrar` | `{ propinaPct }` | `CuentaFinal` |
| `GET /api/restaurante/cocina` | | `Pedido[]` (activos) |
| `POST /api/restaurante/pedidos/[id]/items` | `{ platoId, cantidad }` o `{ quitar: itemId }` | `Pedido` (opcional, F6) |
| `GET /api/restaurante/resumen?fecha=` | | `ResumenDia` (opcional) |

### 11.4 Esquemas Zod (`src/lib/validacion/esquemas.ts`)

| Esquema | Reglas |
|---|---|
| `esquemaPlato` | nombre (1 a 160), categoria enum, precio entero ≥ 1 |
| `esquemaCambiosPlato` | nombre, categoria, precio, disponible opcionales; al menos uno |
| `esquemaItem` | platoId uuid, cantidad entero 1 a 99 |
| `esquemaPedido` | mesa entero ≥ 1, items arreglo no vacío de `esquemaItem` |
| `esquemaEstado` | accion enum ('avanzar' / 'cancelar') |
| `esquemaCerrar` | propinaPct entero 0 a 100 |
| `esquemaFiltrosPlatos` | categoria, soloDisponibles opcionales |

---

## 12. Pantallas

| Ruta | Contenido |
|---|---|
| `/` | Redirige a `/restaurante`. |
| Layout `/restaurante` | Verifica la sesión; sin sesión redirige al login. Barra con "El Caleño", navegación (Mesas/Pedidos, Menú, Cocina; Resumen cuando esté activo), y cerrar sesión. Mobile-First (se usa en tablet o celular en el salón). |
| `/restaurante` · Mesas / Pedidos | Vista de las mesas con pedido activo (número de mesa, estado, total parcial) y un botón "Nuevo pedido". Al tocar una mesa, se abre su pedido. `EstadoVacio` si no hay pedidos activos. |
| `/restaurante/menu` · Menú | `TablaMenu`: nombre, categoría, precio, disponibilidad (con un interruptor para marcar disponible/no disponible). Botón "Nuevo plato". Filtro por categoría. |
| `/restaurante/menu/nuevo` · Nuevo plato | `FormularioPlato`: nombre, categoría (selector), precio. Nombre duplicado muestra el mensaje. |
| `/restaurante/pedidos/nuevo` · Tomar pedido | `FormularioPedido`: número de mesa y `SelectorPlatos` (lista de platos disponibles por categoría, con cantidad por plato). Muestra el subtotal en vivo. Al confirmar, crea el pedido en estado Recibido. Mesa ocupada muestra el mensaje. |
| `/restaurante/pedidos/[id]` · Detalle y cuenta | Encabezado con mesa y `InsigniaEstadoPedido`. Lista de ítems (nombre, cantidad, precio, subtotal). `Cuenta`: subtotal; selector de porcentaje de propina (sugerido 10 %) que muestra la propina y el total en vivo. Botones según el estado: "Avanzar" (al siguiente estado), "Cancelar" (si aplica), y "Cerrar cuenta" (solo si entregado). Si F6 está activo y el pedido no está entregado/cerrado, permite agregar o quitar ítems. |
| `/restaurante/cocina` · Cocina | Panel con los pedidos activos como tarjetas (`TarjetaPedidoCocina`): mesa, ítems, tiempo desde que se recibió, estado, y un botón grande "Avanzar" que pasa al siguiente estado. Del más antiguo al más reciente, para atender por orden de llegada. Se puede filtrar por estado (recibido / en preparación / listo). |
| `/restaurante/resumen` · Resumen (opcional) | Pedidos atendidos y total vendido del día; platos más pedidos. |

### 12.1 Textos fijos

Cuenta:

> Subtotal: {subtotal}. Propina ({pct} %): {propina}. Total: {total}.

Confirmación de cierre:

> Cerrar la cuenta de la mesa {mesa} por {total} (incluye {pct} % de propina). Esta acción no se puede deshacer.

---

## 13. Identidad visual

| Token | Valor | Uso |
|---|---|---|
| `--color-primario` | `#C0392B` | Rojo cálido (sabor, comida): botones principales, barra superior |
| `--color-primario-suave` | `#F7E7E4` | Fondos de selección, hover |
| `--color-recibido` | `#5B6770` | Estado recibido |
| `--color-preparacion` | `#B7791F` | En preparación |
| `--color-listo` | `#2F7D4F` | Listo |
| `--color-entregado` | `#2E6E4E` | Entregado |
| `--color-cerrado` | `#3A5A7A` | Cerrado |
| `--color-cancelado` | `#B83232` | Cancelado, errores |
| `--color-fondo` | `#FAF7F5` | Fondo de página |
| `--color-superficie` | `#FFFFFF` | Tarjetas |
| `--color-texto` | `#1F2933` | Texto principal |
| `--color-texto-suave` | `#52606D` | Texto secundario |
| `--color-borde` | `#E6DCD8` | Bordes y divisores |

Los tokens se agregan a `globals.css` sin borrar estilos existentes (Tailwind 4: en `@theme`). Si el repo ya tiene una paleta, se respeta la suya.

Criterios: Mobile-First (tablet o celular en el salón y la cocina); el panel de cocina con tarjetas grandes y botones de avanzar fáciles de tocar; montos con fuente tabular y `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`; el estado del pedido con color y texto (nunca solo color); Framer Motion (ya está) para transiciones suaves al cambiar de estado una tarjeta de cocina; sin emojis; tarjetas apiladas en móvil.

---

## 14. Dinero, fechas y zona horaria

| Regla | Implementación |
|---|---|
| Montos | Pesos enteros (`INTEGER` en la base, `number` entero en el código); sin centavos |
| Presentación | `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })` |
| Propina | Porcentaje entero 0 a 100; propina redondeada a peso entero (sección 8) |
| "Hoy" (resumen) | Con `hoyBogota()` |
| Fecha/hora de los pedidos | `TIMESTAMPTZ`; se muestra en zona `America/Bogota` |
| Lectura desde BD | Parsers de `pg` devuelven texto para marcas de tiempo (sección 10.7) |

El cálculo de la cuenta no depende de fechas; la zona solo afecta la presentación de las horas y el periodo del resumen.

---

## 15. Seguridad e integridad

| Medida | Detalle |
|---|---|
| Acceso solo con sesión | Login como puerta y `exigirSesion()` en cada ruta de `/api/restaurante` |
| Base de datos cerrada al público | RLS activo sin políticas y permisos revocados a `anon` y `authenticated` |
| Integridad del pedido | El pedido se toma y se cierra en una transacción; una mesa tiene un solo pedido activo (índice único parcial) |
| Precio congelado | El `precio_unitario` del ítem se guarda al agregarlo; la cuenta no cambia si el plato sube de precio después |
| Flujo de estados protegido | `siguienteEstado`/`puedeCancelar`/`puedeCerrar` impiden saltos o retrocesos; la base valida el enum |
| Datos inmutables | Pedidos cerrados y sus ítems no se editan; un plato se marca no disponible, no se elimina |
| Validación en tres puntos | Formulario (Zod y reglas), API (Zod y reglas) y base (CHECK, UNIQUE, llaves foráneas) |
| SQL parametrizado | Ningún valor se concatena |
| Variables de entorno | `.gitignore` ya excluye `.env*`; las credenciales nunca se versionan |
| Errores internos | Se registran con `console.error`; el usuario recibe `ERROR_INTERNO` sin detalles técnicos |

---

## 16. Pruebas

### 16.1 Pruebas unitarias de reglas (Vitest)

Se suman a las pruebas que ya existan en el repo, sin alterarlas.

| ID | Función | Entrada | Resultado esperado |
|---|---|---|---|
| T-01 | `siguienteEstado` | 'recibido' | 'en_preparacion' |
| T-02 | `siguienteEstado` | 'en_preparacion' | 'listo' |
| T-03 | `siguienteEstado` | 'listo' | 'entregado' |
| T-04 | `siguienteEstado` | 'entregado' | `TRANSICION_INVALIDA` (se cierra, no se avanza) |
| T-05 | `siguienteEstado` | 'cerrado' | `TRANSICION_INVALIDA` |
| T-06 | `siguienteEstado` | 'cancelado' | `TRANSICION_INVALIDA` |
| T-07 | `puedeCancelar` | 'recibido' / 'en_preparacion' / 'listo' | `true` en los tres |
| T-08 | `puedeCancelar` | 'entregado' / 'cerrado' / 'cancelado' | `false` en los tres |
| T-09 | `puedeCerrar` | 'entregado' | `true` |
| T-10 | `puedeCerrar` | 'listo' / 'recibido' | `false` |
| T-11 | `ES_ACTIVO` | 'recibido' / 'entregado' | `true` / `true` |
| T-12 | `ES_ACTIVO` | 'cerrado' / 'cancelado' | `false` / `false` |
| T-13 | `subtotal` | [{2,18000},{1,25000},{3,6000}] | 79000 |
| T-14 | `subtotal` | [] | 0 |
| T-15 | `calcularPropina` | 79000, 10 | 7900 |
| T-16 | `calcularPropina` | 79000, 15 | 11850 |
| T-17 | `calcularPropina` | 79000, 0 | 0 |
| T-18 | `calcularPropina` | 33333, 15 | 5000 (redondeo) |
| T-19 | `totalCuenta` | 79000, 7900 | 86900 |
| T-20 | `validarPorcentajePropina` | -1 / 101 | `DATOS_INVALIDOS` en ambos |
| T-21 | `validarPorcentajePropina` | 0 / 100 | sin error |
| T-22 | `validarPedido` | mesa 0 | `DATOS_INVALIDOS` |
| T-23 | `validarPedido` | mesa 5, items [] | `DATOS_INVALIDOS` |
| T-24 | `validarPedido` | mesa 5, item cantidad 0 | `DATOS_INVALIDOS` |
| T-25 | `validarPedido` | mesa 5, item cantidad 2 | sin error |
| T-26 | `validarPlato` | precio 0 | `DATOS_INVALIDOS` |
| T-27 | `validarPlato` | nombre " " | `DATOS_INVALIDOS` |
| T-28 | `validarPlato` | "Bandeja paisa", Plato fuerte, 18000 | sin error |

Comando: `npm test`. Las 28 pruebas nuevas, más las existentes, deben pasar antes de continuar con la fase 3.

### 16.2 Prueba de flujo contra la base de datos

`scripts/probar-flujo.ts` (`npm run probar:flujo`) usa `dataService` con platos `Prueba *` y mesas altas de prueba (ej. 900+). Imprime `OK` o `FALLA` por paso y limpia al final.

| Paso | Operación | Esperado |
|---|---|---|
| 1 | Crear plato "Prueba Bandeja" (Plato fuerte, 18000) | Creado, disponible |
| 2 | Crear "prueba bandeja" otra vez | `PLATO_DUPLICADO` |
| 3 | Crear plato con precio 0 | `DATOS_INVALIDOS` |
| 4 | Crear "Prueba Gaseosa" (Bebida, 6000) | Creado |
| 5 | Marcar "Prueba Gaseosa" como no disponible | Actualizado |
| 6 | Tomar pedido mesa 901 con 2 Bandejas y 1 Gaseosa (no disponible) | `PLATO_NO_DISPONIBLE` |
| 7 | Volver a marcar la Gaseosa disponible; tomar pedido mesa 901 con 2 Bandejas y 3 Gaseosas | Pedido recibido; subtotal 54000 |
| 8 | Tomar otro pedido en la mesa 901 | `MESA_OCUPADA` |
| 9 | Avanzar el pedido: recibido → en_preparacion → listo → entregado | Cada avance OK |
| 10 | Avanzar el pedido entregado | `TRANSICION_INVALIDA` |
| 11 | Cancelar el pedido entregado | `TRANSICION_INVALIDA` |
| 12 | Cerrar la cuenta con 10 % de propina | subtotal 54000, propina 5400, total 59400; estado cerrado |
| 13 | Agregar un ítem al pedido cerrado | `PEDIDO_CERRADO` (o TRANSICION_INVALIDA) |
| 14 | Tomar un nuevo pedido en la mesa 901 (ya libre) | Pedido recibido (la mesa quedó libre al cerrar) |
| 15 | Tomar pedido mesa 902 y cancelarlo (en recibido) | Cancelado; la mesa 902 queda libre |

### 16.3 Aceptación (criterio de terminado)

Se ejecuta en el despliegue de Vercel y se documenta en `doc/ACEPTACION.md`.

| ID | Acción | Resultado esperado |
|---|---|---|
| A-01 | Abrir `/restaurante` sin sesión | Redirección al login |
| A-02 | Registrar "Bandeja paisa" (Plato fuerte, $18.000) y "Gaseosa" (Bebida, $6.000) | Aparecen en el menú, disponibles |
| A-03 | Intentar un plato con el mismo nombre | Rechazo por duplicado |
| A-04 | Marcar la Gaseosa como no disponible y volver a disponible | El interruptor funciona |
| A-05 | Tomar un pedido en la mesa 5: 2 bandejas, 3 gaseosas | Pedido Recibido; subtotal $54.000 |
| A-06 | Intentar otro pedido en la mesa 5 | Rechazo: mesa ocupada |
| A-07 | En Cocina, avanzar el pedido a En preparación, Listo y Entregado | Cada avance se refleja |
| A-08 | Intentar avanzar el pedido entregado | No se puede (solo cerrar) |
| A-09 | Abrir la cuenta y elegir 10 % de propina | Muestra subtotal $54.000, propina $5.400, total $59.400 |
| A-10 | Cerrar la cuenta | Pedido Cerrado; la mesa 5 queda libre |
| A-11 | Tomar un pedido nuevo en la mesa 5 | Se permite (la mesa está libre) |
| A-12 | Tomar un pedido en la mesa 6 y cancelarlo | Cancelado; la mesa 6 queda libre |
| A-13 | Ver el panel de cocina con varios pedidos | Ordenados por llegada, con su estado |
| A-14 | Cerrar el navegador y volver a entrar | Los datos persisten |
| A-15 | (Opcional) Ver el resumen del día | Pedidos atendidos y total vendido |

A-15 corresponde a las opcionales; se verifica tras P09.

---

## 17. Plan de ejecución

| Fase | Prompt | Resultado | Cierre |
|---|---|---|---|
| 0 · Auditoría y reconciliación | P00 | `ESTADO_ACTUAL.md`, `DICTAMEN.md`, `copilot-instructions.md`, `ESTADO_EJECUCION.md`; build y test de base | `FASE_0_COMPLETADA.md` |
| 1 · Base de datos | P01 | M1 y M2 aplicadas (o ajustadas); `npm run db:verificar` sin fallas | `FASE_1_COMPLETADA.md` |
| 2 · Reglas | P02 | `lib/config`, `lib/reglas`, 28 pruebas en verde (más las existentes) | `FASE_2_COMPLETADA.md` |
| 3 · Servidor | P03 | Conexión, sesión, respuestas, esquemas, formato; sesión protegida | `FASE_3_COMPLETADA.md` |
| 4 · Datos y API | P04, P05 | `lib/datos/*`, `dataService`, rutas; `npm run probar:flujo` sin fallas | `FASE_4_COMPLETADA.md` |
| 5 · Interfaz | P06, P07, P08 | Componentes base, menú, toma de pedidos, cocina, cuenta | `FASE_5_COMPLETADA.md` |
| 6 · Aceptación | (en P08) | `ACEPTACION.md` con A-01 a A-14; README | `FASE_6_COMPLETADA.md` |
| 7 · Opcionales | P09 | Editar ítems, resumen del día, platos más pedidos | `FASE_7_COMPLETADA.md` |

Condiciones entre fases: no se inicia una fase sin el archivo de cierre de la anterior; `npm run build` sin errores al final de cada prompt; `npm test` en verde desde P02 (incluidas las pruebas que ya existían); cada prompt termina con commit y push, y un fallo de despliegue en Vercel se corrige antes del siguiente prompt.

---

## 18. Funcionalidades opcionales

Se construyen solo con la fase 6 cerrada.

| Prompt | Funcionalidad | Implementación |
|---|---|---|
| P09 | F6 · Editar ítems de un pedido | `agregarItem` y `quitarItem` sobre pedidos no entregados/cerrados/cancelados (PEDIDO_CERRADO si no); el agregar congela el precio del momento y verifica disponibilidad; el total se recalcula. Ruta `/api/restaurante/pedidos/[id]/items`; controles en el detalle del pedido |
| P09 | F7 · Resumen del día | `resumenDelDia(fecha)`: número de pedidos cerrados y total vendido (suma de total_cierre) del día. Ruta y pantalla `/restaurante/resumen` |
| P09 | F8 · Platos más pedidos | `platosMasPedidos(desde, hasta)`: suma de cantidades por plato en pedidos cerrados del periodo, de mayor a menor. Se muestra en el resumen |

---

## 19. Glosario

| Término | Definición |
|---|---|
| Plato | Un ítem del menú, con nombre, categoría, precio y disponibilidad |
| Pedido | La orden de una mesa, con sus ítems y su estado de cocina |
| Ítem del pedido | Una línea del pedido: un plato, una cantidad y el precio congelado |
| Estado del pedido | Dónde está en el flujo de cocina: recibido, en preparación, listo, entregado, cerrado o cancelado |
| Cuenta | El cobro del pedido: subtotal, propina y total |
| Propina | Porcentaje opcional sobre el subtotal, redondeado a peso entero |
| Mesa activa | Una mesa con un pedido que no está cerrado ni cancelado |
| Precio congelado | El precio del ítem guardado al agregarlo; no cambia después |
| Regla pura | Función de `lib/reglas/` que solo depende de sus parámetros |
| Transacción | Conjunto de escrituras que se confirma completo o se revierte completo |
| Copilot en modo Agente | Modo de GitHub Copilot Chat que lee el repositorio, edita varios archivos y ejecuta comandos de terminal con aprobación |
