# Control de Inventario del Bar · Plan técnico de implementación

> Sistema de Control de Inventario para el Bar y la Cocina de un Restaurante · versión técnica 1.0, derivada del plan funcional (`PLAN.md`)
> Asignatura: Lógica y Programación (SIST0200) · Universidad Sergio Arboleda, Santa Marta · Docente: Jhonatan Castro Polo
> Stack: Next.js 16 (App Router) + TypeScript + Tailwind 4 + Supabase Postgres + Zod 4 · Despliegue en Vercel
> Ejecución: GitHub Copilot en modo Agente, con los prompts de `doc/PROMPTS_INVENTARIO.md`

---

## Índice

0. [Cómo se usa este documento](#0-cómo-se-usa-este-documento)
1. [Punto de partida](#1-punto-de-partida)
2. [Traducción de la persistencia](#2-traducción-de-la-persistencia)
3. [Alcance](#3-alcance)
4. [Acceso](#4-acceso)
5. [Estados del turno](#5-estados-del-turno)
6. [Reglas de negocio](#6-reglas-de-negocio)
7. [Casos de uso](#7-casos-de-uso)
8. [Los cálculos del turno](#8-los-cálculos-del-turno)
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

El plan funcional (`PLAN.md`) describe un proceso que hoy vive en una planilla de papel; no hay datos digitales previos que migrar. Por eso P00 es un prompt de **verificación del punto de partida**: Copilot revisa el repositorio real, confirma qué existe y qué no, y produce un dictamen antes de tocar nada. Si el módulo de inventario convive en el mismo repositorio que otro módulo (por ejemplo el de pedidos de El Caleño), el código de ese otro módulo **no se modifica**: el inventario vive bajo sus propias rutas (`/inventario`, `/api/inventario`).

| Archivo en el repositorio | Función |
|---|---|
| `doc/PLAN_INVENTARIO.md` | Este documento |
| `doc/PROMPTS_INVENTARIO.md` | Prompts en orden de ejecución |
| `doc/ESTADO_ACTUAL.md` | Radiografía del repositorio antes de empezar (lo crea P00) |
| `doc/DICTAMEN.md` | Veredicto de P00: qué se reutiliza, qué se crea, qué no se toca |
| `doc/ESTADO_EJECUCION.md` | Avance prompt por prompt |
| `doc/checkpoints/FASE_N_COMPLETADA.md` | Evidencia del cierre de cada fase |
| `.github/copilot-instructions.md` | Reglas permanentes que Copilot aplica en todas las conversaciones |

---

## 1. Punto de partida

### 1.1 Lo que se sabe (según los archivos del repositorio compartido) y no se reconstruye

- Proyecto Next.js 16.3.5 con React 19, TypeScript, Tailwind 4, Zod 4 y Framer Motion.
- Vitest configurado (con Testing Library y jsdom), scripts `test`, `test:watch`, `test:coverage`, `type-check`, `lint`, `format`.
- Alias de importación: `@/*` → `src/*`, `@data/*` → `data/*`.
- `.gitignore` que excluye `.env*` y `data/_backups/`.
- TypeScript estricto (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`): el código nuevo debe compilar bajo esa configuración.

Del plan funcional se sabe que el inventario se lleva hoy **a mano, en papel**, y que no existe sistema para cocina. El trabajo de estos prompts es: verificar el repositorio (P00), crear la base de datos en Supabase Postgres, formalizar las reglas del plan en funciones puras con pruebas, y construir el flujo del módulo mínimo (productos, turno de bar y de helados, conteo físico, alertas, resumen financiero del turno).

### 1.2 Lo que se verifica en P00 antes de escribir código

| Aspecto | Por qué importa |
|---|---|
| Si el repositorio ya tiene código de otro módulo (pedidos, menú, etc.) | Para no tocarlo y para reutilizar su capa de conexión, sesión y componentes base |
| Si ya existe login y cómo funciona | Define cómo se obtiene el correo del usuario para asignarle un rol (sección 4) |
| Variable de conexión directa a Postgres y claves de Supabase | Las operaciones con reglas usan transacciones con `pg`; si no hay, se obtienen en P00 |
| Mecanismo de migraciones | Las tablas se aplican con ese mecanismo; si no existe, se crea `npm run db:migrar` |
| Si `pg` y `@types/pg` ya están en las dependencias | El `package.json` conocido no los tiene |
| Prefijos de tablas ya usados en la base | Evitar choques de nombres (`productos`, `turnos`, `acceso`) con otro módulo |
| Pruebas que ya existan | No romperlas |

### 1.3 Regla sobre el acceso

El plan funcional limita el acceso al **encargado del bar** y a los **administradores** (el estudiante y su padre); no contempla rol de mesero ni de cajero. En el stack del curso la aplicación queda publicada en una URL de Vercel; dejarla abierta expondría ventas, faltantes y pagos. Se usa el login existente como puerta y una tabla `acceso` que asigna a cada correo uno de dos roles: `administrador` o `encargado`. Un correo que no esté en `acceso` no entra. La razón de separar los dos roles es de integridad, no de jerarquía: el encargado es quien responde por los faltantes, por lo que no debe poder cambiar los valores de los productos, el inventario inicial ni su propio pago (sección 4). P00 determina si ya hay login: si lo hay, se envuelve con `lib/auth/sesion.ts` sin reescribirlo; si no, P03 agrega uno mínimo. En cualquier caso, `/inventario` y `/api/inventario` quedan protegidos.

---

## 2. Traducción de la persistencia

El plan funcional no tiene persistencia digital: la planilla de papel es el registro. Esta versión técnica reemplaza la planilla por tablas en Supabase Postgres. El JSON en archivos no sirve en Vercel (serverless, sistema de archivos efímero): lo que se escriba en un archivo en producción se perdería entre invocaciones.

| Pieza de la planilla o del plan | En este plan técnico | Motivo |
|---|---|---|
| Planilla de papel de un turno | `turnos` + `registros_turno` | Una planilla = un turno; cada fila de la planilla = un registro por producto |
| Casillas Inicial, Entrada, Cantidad vendida | Columnas `inicial`, `entrada`, `vendida` | Se digitan por el encargado |
| Casillas Inv. Final y Total de venta (calculadas a mano) | Columnas generadas `final_calculado` y `total_venta` | Elimina el error de cálculo (problema 1 del plan) |
| Casilla Valor | `valor_unitario` copiado al abrir el turno | La planilla de un turno no cambia si el precio sube después |
| Revisión del dueño al cambio de turno | Conteo físico (`contado`) + vista con `faltante` y `valor_a_cancelar` | Hace explícito el descuadre (problema 2 del plan) |
| Cobro del faltante al encargado | `valor_a_cancelar` informativo, ligado al encargado del turno | El sistema calcula; el cobro sigue siendo fuera del sistema |
| Sección de helados | Productos con `seccion = 'helados'` en las mismas tablas | Misma mecánica; se separan por sección y por umbrales |
| Facturas canceladas en efectivo y pago al encargado | Columnas `facturas_efectivo` y `pago_encargado` del turno | Datos manuales por turno |
| Alertas de reposición | Función pura `nivelAlerta` + vista `v_inventario_actual` | Se calculan al leer; no se guardan |

Lo que **no cambia**: las fórmulas, los umbrales (6 para el bar; 5 y 3 para helados), la regla del faltante y el resumen financiero del turno.

---

## 3. Alcance

### 3.1 Módulo mínimo (el módulo mínimo del plan funcional)

La numeración F1 a F8 conserva la de las funcionalidades 1 a 8 del plan funcional.

| ID | Funcionalidad (plan funcional) | Casos de uso | Prompts |
|---|---|---|---|
| F1 | Registrar turno de bar (inicial, entrada, cantidad vendida) | CU-03, CU-04, CU-06 | P04, P05, P08 |
| F2 | Calcular inventario final y total de venta | CU-04 | P02, P04, P08 |
| F3 | Detectar faltante con el conteo físico y calcular el valor a cancelar | CU-05 | P02, P04, P08 |
| F4 | Alertar reposición (bar: menos de 6 unidades) | CU-11 | P02, P07 |
| F7 | Resumen financiero del turno (venta total, facturas en efectivo, pago al encargado, resultado neto) | CU-08, CU-09, CU-12 | P02, P04, P08 |
| F8 | Módulo de Helados con alerta amarilla (menos de 5) y roja (menos de 3) | CU-01 a CU-12 con sección helados | P01, P02, P07, P08 |

### 3.2 Funcionalidades opcionales

| ID | Funcionalidad | Prompts |
|---|---|---|
| F5 | Turno de cocina: existencia inicial, salida e inventario final esperado | P09 |
| F6 | Facturas de compra y notificación de aumento de precio | P09 |

Se construyen solo con la fase 6 cerrada.

### 3.3 Fuera de alcance

Se mantiene la lista del plan funcional: venta al cliente y caja registradora, área de comedor y mesas, pedidos automáticos a proveedores, nómina y turnos de personal, y cualquier proceso administrativo distinto al inventario de bar y cocina. No hay roles de mesero ni de cajero.

### 3.4 Decisiones de alcance de esta versión técnica

| Decisión | Motivo |
|---|---|
| Los datos viven en Supabase Postgres | Para que los registros persistan en producción (sección 2) |
| Valores y montos en pesos enteros (el plan decía "decimal") | El peso colombiano no usa centavos; evita errores de redondeo en los totales |
| Bar y helados comparten tablas y se distinguen por `seccion` | Misma mecánica; evita duplicar tablas, reglas y pantallas. La sección no se cambia después de creado el producto |
| El valor unitario se copia al registro al abrir el turno | Si el precio cambia después, la planilla del turno no cambia |
| El inicial se sugiere desde el último inventario de referencia del producto | El plan dice que el inicial es normalmente el inventario final del turno anterior |
| Un solo turno `abierto` a la vez | Los turnos son consecutivos; evita inicial ambiguo |
| El turno pasa por `abierto` → `en_revision` → `cerrado` | Refleja la revisión del dueño al cambio de turno (sección 5) |
| La alerta usa el conteo físico si existe; si no, el calculado | El plan dice "calculado o contado"; el conteo es lo real |
| El resultado neto del turno puede ser negativo | Si las facturas y el pago superan la venta, debe verse |
| Las facturas en efectivo del turno son un monto manual, **no** las facturas de compra de F6 | Son conceptos distintos (gasto de caja vs. historial de precios de proveedores) |
| Un producto no se elimina; se desactiva | Un producto con registros debe seguir en el historial |
| Los turnos cerrados y sus registros no se editan | Son el registro oficial del turno |

### 3.5 Decisiones pendientes de confirmar

Estas decisiones son propuestas de esta versión técnica, no están en el plan funcional. Si se descartan, se ajustan las reglas y pruebas indicadas.

| ID | Propuesta | Alternativa | Si se descarta, cambia |
|---|---|---|---|
| D-1 | Dos roles: `administrador` y `encargado`, con permisos distintos (sección 4) | Acceso único para los tres usuarios | RN-09, RN-15, sección 4, A-04, A-06 |
| D-2 | Un turno cerrado no se reabre; antes del cierre, el administrador puede devolverlo al encargado si no hay turno posterior | Permitir correcciones también después del cierre | RN-12, RN-14 |
| D-3 | El aviso del bar ("Por reponer") usa un color propio (azul); el semáforo amarillo/rojo queda solo para helados | Usar el mismo color para ambos | Sección 13 |
| D-4 | El nombre del turno es texto libre (1 a 40 caracteres), como en el plan | Lista fija (mañana, tarde, noche) | `esquemaTurno`, sección 12 |

---

## 4. Acceso

| Actor | Acceso | Puede hacer |
|---|---|---|
| Administrador (el estudiante y su padre) | Login + rol `administrador` | Todo lo del encargado, más: gestionar productos, valores y umbrales; ajustar el inicial; registrar facturas en efectivo y pago al encargado; cerrar o devolver turnos; ver el historial y el resumen financiero |
| Encargado del bar | Login + rol `encargado` | Abrir turno; registrar entrada, cantidad vendida y conteo físico; entregar el turno; ver el inventario, las alertas y los faltantes de sus turnos |
| Sistema | Interno | Valida entradas, calcula inventarios, faltantes y resumen, controla el flujo del turno |

No hay roles de mesero ni de cajero (fuera de alcance, sección 3.3).

| Acción | Encargado | Administrador |
|---|:-:|:-:|
| Ver inventario actual y alertas | Sí | Sí |
| Abrir turno, registrar entrada, vendida y conteo | Sí | Sí |
| Entregar turno | Sí | Sí |
| Ajustar el inicial de un producto en el turno | No | Sí |
| Crear o cambiar productos, valores y umbrales | No | Sí |
| Registrar facturas en efectivo y pago al encargado | No | Sí |
| Ver facturas, pago y resultado neto del turno | No | Sí |
| Cerrar o devolver un turno | No | Sí |

| Ruta | Sin sesión | Con sesión |
|---|:-:|:-:|
| `/` | No se modifica | No se modifica |
| `/inventario/*` | Redirige al login | Sí (según rol) |
| `/api/inventario/*` | 401 | Sí (403 si el rol no alcanza) |

---

## 5. Estados del turno

### 5.1 Flujo del turno

```text
abierto ──► en_revision ──► cerrado
   ▲             │
   └─────────────┘   (devolver: solo el administrador, y solo si no hay un turno posterior)
```

| Código | Etiqueta | Significado |
|---|---|---|
| `abierto` | Abierto | El encargado registra entradas, ventas y conteo físico |
| `en_revision` | En revisión | El encargado entregó la planilla; el administrador registra facturas en efectivo y pago, y revisa |
| `cerrado` | Cerrado | El administrador cerró el turno; ya no se edita |

### 5.2 Transiciones (RN-12)

| Evento | Estado origen | Estado destino | Condición |
|---|---|---|---|
| Entregar | `abierto` | `en_revision` | Todas las filas tienen conteo físico |
| Cerrar | `en_revision` | `cerrado` | Facturas en efectivo y pago al encargado registrados (puede ser 0) |
| Devolver | `en_revision` | `abierto` | No existe un turno posterior al actual |

Cualquier otra combinación produce `TRANSICION_INVALIDA`. Solo un turno `abierto` admite cambios en entrada, vendida o conteo; un turno `en_revision` admite únicamente el registro de facturas y pago; un turno `cerrado` no admite cambios (`TURNO_NO_EDITABLE`).

### 5.3 Resultado del conteo de una fila (derivado, no se guarda)

| Código | Etiqueta | Condición |
|---|---|---|
| `sin_conteo` | Sin conteo | Aún no se ingresó el conteo físico |
| `cuadra` | Cuadra | Contado = calculado |
| `faltante` | Faltante | Contado < calculado |
| `sobrante` | Sobrante | Contado > calculado |

---

## 6. Reglas de negocio

| ID | Regla | Origen | Dónde se aplica |
|---|---|---|---|
| RN-01 | Un producto tiene nombre (único dentro de su sección), sección (`bar` o `helados`), categoría, valor unitario (entero > 0) y umbrales. La sección no cambia después de creado | Plan, datos y regla 6 | BD UNIQUE, CHECK; Zod; `lib/reglas/producto.ts` |
| RN-02 | Umbrales: bar con umbral de alerta 6 y sin umbral crítico; helados con umbral amarillo 5 y umbral rojo 3 (el rojo siempre menor que el amarillo) | Plan, reglas 3 y 6 | BD CHECK; `lib/config/inventario.ts`; `validarProducto` |
| RN-03 | Inventario final calculado = inicial + entrada − cantidad vendida | Plan, regla 1 | `lib/reglas/registro.ts` `inventarioFinalCalculado`; BD columna generada |
| RN-04 | Total de venta = cantidad vendida × valor unitario | Plan, regla 2 | `totalVenta`; BD columna generada |
| RN-05 | Si contado < calculado: faltante = calculado − contado y valor a cancelar = faltante × valor unitario, a cargo del encargado del turno. Si contado = calculado: sin faltante ni cobro. Si contado > calculado: sobrante registrado, sin cobro | Plan, regla 4 | `faltante`, `sobrante`, `valorACancelar`; vista `v_registros_turno` |
| RN-06 | Alerta sobre el inventario de referencia (el contado si existe; si no, el calculado). Bar: menos de 6 → "por reponer". Helados: menos de 3 → roja; menos de 5 → amarilla (la roja reemplaza a la amarilla). Los umbrales son estrictos: con 6 (bar) o 5 (helados) no hay alerta; con 3 en helados la alerta es amarilla | Plan, reglas 3 y 6 | `lib/reglas/alertas.ts` `nivelAlerta` |
| RN-07 | Valor de venta total del turno = suma de los totales de venta de todos los registros (bar + helados). Resultado neto = valor de venta total − facturas en efectivo − pago al encargado. Las facturas y el pago se ingresan manualmente en cada turno. El resultado es informativo: no genera cobros ni ajustes | Plan, regla 7 | `lib/reglas/turno.ts` `valorVentaTotal`, `resultadoNeto`; vista `v_turnos` |
| RN-08 | El valor unitario se copia al registro al abrir el turno; cambiar el valor del producto no altera turnos ya abiertos o cerrados | Agregada (coherencia) | Servicio `abrirTurno` |
| RN-09 | El inicial se sugiere desde el último inventario de referencia del producto (el contado si existe). El encargado no lo modifica; solo el administrador. Un producto sin historial arranca en 0 | Plan (descripción de "Inicial") y agregada | `inicialSugerido`; `ajustarInicial` exige rol `administrador` |
| RN-10 | Entrada, vendida, inicial y conteo son enteros ≥ 0 (máximo 9.999); la cantidad vendida no puede superar inicial + entrada | Agregada | `lib/reglas/registro.ts` `validarMovimiento`, `validarConteo`; Zod; BD CHECK |
| RN-11 | Solo puede haber un turno `abierto` a la vez; la combinación fecha + nombre del turno es única | Agregada | Servicio; BD índices únicos |
| RN-12 | El turno sigue el flujo `abierto` → `en_revision` → `cerrado` (sección 5); entregar exige conteo en todas las filas; cerrar exige facturas y pago registrados; devolver solo si no hay turno posterior | Agregada, a partir de la revisión del dueño al cambio de turno | `lib/reglas/turno.ts` `puedeEntregar`, `puedeCerrar`, `puedeDevolver` |
| RN-13 | Un producto no se elimina; se desactiva. Un producto desactivado no entra en turnos nuevos. Un producto creado con un turno abierto entra en ese turno con inicial 0 | Agregada | Servicio; BD `ON DELETE RESTRICT` |
| RN-14 | Un turno cerrado y sus registros son inmutables; al cerrar se guardan el valor de venta total y el resultado neto | Agregada | Servicio; BD CHECK |
| RN-15 | Dos roles: el administrador gestiona productos, inicial, facturas, pago y cierre; el encargado registra el turno. Un correo sin rol no entra | Plan, acceso, y agregada (D-1) | `lib/auth/sesion.ts` `exigirRol`; tabla `acceso` |
| RN-16 *(opc.)* | Al registrar una factura, si el valor unitario es mayor al último valor registrado para ese producto, se notifica el aumento | Plan, regla 5 | `lib/reglas/precios.ts` `hayAumento` |
| RN-17 *(opc.)* | Inventario final de cocina = existencia inicial − salida; la salida no supera la existencia inicial | Plan, función 5 y agregada | `lib/reglas/cocina.ts` |

### 6.1 Casos límite

| Caso | Resultado |
|---|---|
| Producto del bar con inventario de referencia 6 | Sin alerta |
| Producto del bar con inventario 5 | "Por reponer" |
| Helado con inventario 5 | Sin alerta |
| Helado con inventario 4 o 3 | Alerta amarilla |
| Helado con inventario 2, 1 o 0 | Alerta roja |
| Conteo físico igual al calculado | Cuadra; sin faltante ni cobro |
| Conteo físico mayor al calculado | Sobrante registrado; sin cobro |
| Cantidad vendida mayor a inicial + entrada | Rechazo (`VENDIDO_EXCEDE_EXISTENCIA`) |
| Entregar el turno con filas sin conteo | Rechazo (`TURNO_INCOMPLETO`), indicando cuántas faltan |
| Cerrar el turno sin facturas o sin pago registrados | Rechazo (`TURNO_INCOMPLETO`) |
| Facturas en efectivo o pago en 0 | Permitido |
| Resultado neto negativo | Permitido; se muestra con signo menos |
| Abrir un turno con otro `abierto` | Rechazo (`TURNO_YA_ABIERTO`) |
| Modificar un turno entregado o cerrado | Rechazo (`TURNO_NO_EDITABLE`) |
| Devolver un turno cuando ya existe uno posterior | Rechazo (`TRANSICION_INVALIDA`) |
| Cambiar el valor de un producto con turno abierto | Aplica desde el siguiente turno; el abierto conserva el valor copiado |
| Producto sin ningún registro | No aparece en el inventario actual |
| Un encargado intenta cambiar un valor, el inicial o el pago | Rechazo (`SIN_PERMISO`) |

---

## 7. Casos de uso

| ID | Entrada | Precondición | Efecto | Errores posibles |
|---|---|---|---|---|
| CU-01 Registrar producto (administrador) | nombre, sección, categoría, valor unitario, umbrales (opcionales) | nombre no repetido en la sección | Producto activo con los umbrales por defecto de su sección; si hay turno abierto, entra en él con inicial 0 | `DATOS_INVALIDOS`, `PRODUCTO_DUPLICADO`, `SIN_PERMISO` |
| CU-02 Cambiar producto (administrador) | producto, cambios (nombre, categoría, valor, umbrales, activo) | el producto existe | Producto actualizado; no afecta turnos ya abiertos (RN-08) | `PRODUCTO_NO_ENCONTRADO`, `DATOS_INVALIDOS`, `PRODUCTO_DUPLICADO`, `SIN_PERMISO` |
| CU-03 Abrir turno | fecha, nombre del turno, encargado | no hay turno `abierto`; fecha + nombre no repetidos | Turno `abierto` con una fila por producto activo, con inicial sugerido y valor copiado | `DATOS_INVALIDOS`, `TURNO_YA_ABIERTO`, `TURNO_DUPLICADO` |
| CU-04 Registrar entrada y cantidad vendida | turno, fila, entrada y/o vendida | turno `abierto` | Fila actualizada con inventario final calculado y total de venta | `TURNO_NO_ENCONTRADO`, `REGISTRO_NO_ENCONTRADO`, `TURNO_NO_EDITABLE`, `DATOS_INVALIDOS`, `VENDIDO_EXCEDE_EXISTENCIA` |
| CU-05 Registrar conteo físico | turno, fila, contado | turno `abierto` | Fila con conteo; muestra faltante y valor a cancelar, o sobrante | `TURNO_NO_ENCONTRADO`, `REGISTRO_NO_ENCONTRADO`, `TURNO_NO_EDITABLE`, `DATOS_INVALIDOS` |
| CU-06 Ajustar inicial (administrador) | turno, fila, inicial | turno `abierto` | Inicial actualizado y totales recalculados | `SIN_PERMISO`, `TURNO_NO_EDITABLE`, `DATOS_INVALIDOS`, `VENDIDO_EXCEDE_EXISTENCIA` |
| CU-07 Entregar turno | turno | turno `abierto` con conteo en todas las filas | Turno `en_revision` | `TURNO_NO_ENCONTRADO`, `TRANSICION_INVALIDA`, `TURNO_INCOMPLETO` |
| CU-08 Registrar facturas en efectivo y pago (administrador) | turno, facturas en efectivo, pago al encargado | turno no cerrado | Montos guardados; resultado neto calculado | `SIN_PERMISO`, `TURNO_NO_EDITABLE`, `DATOS_INVALIDOS` |
| CU-09 Cerrar turno (administrador) | turno | turno `en_revision` con facturas y pago registrados | Turno `cerrado` con venta total y resultado neto guardados | `SIN_PERMISO`, `TRANSICION_INVALIDA`, `TURNO_INCOMPLETO` |
| CU-10 Devolver turno al encargado (administrador) | turno | turno `en_revision` sin turno posterior | Turno `abierto` de nuevo | `SIN_PERMISO`, `TRANSICION_INVALIDA` |
| CU-11 Ver inventario actual y alertas | filtro: sección, solo por reponer | — | Productos con inventario de referencia y nivel de alerta; lista "por reponer" | — |
| CU-12 Ver resumen financiero e historial (administrador) | turno o rango | — | Venta total, facturas, pago, resultado neto y faltantes por turno | `SIN_PERMISO`, `TURNO_NO_ENCONTRADO` |
| CU-13 *(opc.)* Registrar turno de cocina | producto, fecha, existencia inicial, salida | salida ≤ existencia | Inventario final esperado | `DATOS_INVALIDOS` |
| CU-14 *(opc.)* Registrar factura de compra (administrador) | número, proveedor, producto, valor unitario, fecha, turno (opcional) | producto existente | Factura guardada; notifica si el valor subió | `DATOS_INVALIDOS`, `PRODUCTO_NO_ENCONTRADO`, `FACTURA_DUPLICADA` |

### 7.1 Secuencia de CU-03 (abrir turno)

Todo ocurre dentro de `conTransaccion`:

1. `validarTurno(datos)` (nombre y encargado no vacíos; fecha válida).
2. Verificar que no exista un turno `abierto` (`TURNO_YA_ABIERTO`, RN-11).
3. Insertar el turno en estado `abierto` (`TURNO_DUPLICADO` si fecha + nombre ya existen).
4. Para cada producto activo, calcular el inicial sugerido (RN-09) e insertar su fila con el valor unitario copiado (RN-08).
5. Confirmar y devolver el turno con sus filas.

```ts
export async function abrirTurno(datos: DatosTurno): Promise<TurnoDetalle> {
  validarTurno(datos);
  return conTransaccion(async (tx) => {
    if (await hayTurnoAbierto(tx)) throw new ErrorDeNegocio('TURNO_YA_ABIERTO');          // RN-11
    const turnoId = await insertarTurno(tx, { ...datos, estado: 'abierto' });
    for (const p of await listarProductosActivos(tx)) {
      const inicial = await inicialSugerido(tx, p.id);                                       // RN-09
      await insertarRegistro(tx, {
        turnoId, productoId: p.id, nombre: p.nombre, seccion: p.seccion,
        valorUnitario: p.valorUnitario, inicial,                                             // RN-08
      });
    }
    return leerTurno(tx, turnoId);
  });
}
```

### 7.2 Secuencia de CU-07 (entregar turno)

1. Bloquear el turno (`FOR UPDATE`); si no existe, `TURNO_NO_ENCONTRADO`.
2. Contar las filas sin conteo físico.
3. `puedeEntregar(estado, filasSinConteo)`: si el estado no es `abierto`, `TRANSICION_INVALIDA`; si faltan conteos, `TURNO_INCOMPLETO` con el número de filas pendientes en `detalles`.
4. Marcar el turno `en_revision` y guardar `entregado_at`.

### 7.3 Secuencia de CU-09 (cerrar turno)

1. Bloquear el turno; si no existe, `TURNO_NO_ENCONTRADO`.
2. Verificar que está `en_revision` (si no, `TRANSICION_INVALIDA`).
3. Verificar que facturas en efectivo y pago están registrados (si no, `TURNO_INCOMPLETO`).
4. Calcular el valor de venta total (suma de los totales de venta de sus filas) y el resultado neto (RN-07).
5. Marcar el turno `cerrado` guardando `venta_total_cierre`, `resultado_neto_cierre` y `cerrado_at`.
6. Devolver el turno cerrado.

---

## 8. Los cálculos del turno

Todo opera con pesos enteros y con cantidades enteras.

```ts
export function inventarioFinalCalculado(inicial: number, entrada: number, vendida: number): number {
  return inicial + entrada - vendida;                                   // RN-03
}

export function totalVenta(vendida: number, valorUnitario: number): number {
  return vendida * valorUnitario;                                       // RN-04
}

export function faltante(calculado: number, contado: number | null): number {
  return contado !== null && contado < calculado ? calculado - contado : 0;   // RN-05
}

export function sobrante(calculado: number, contado: number | null): number {
  return contado !== null && contado > calculado ? contado - calculado : 0;   // RN-05
}

export function valorACancelar(unidadesFaltantes: number, valorUnitario: number): number {
  return unidadesFaltantes * valorUnitario;                             // RN-05
}

export function nivelAlerta(
  inventario: number, umbralAlerta: number, umbralCritico: number | null,
): NivelAlerta {
  if (umbralCritico !== null && inventario < umbralCritico) return 'roja';          // RN-06
  if (inventario < umbralAlerta) return umbralCritico === null ? 'reponer' : 'amarilla';
  return 'ninguna';
}

export function resultadoNeto(ventaTotal: number, facturasEfectivo: number, pagoEncargado: number): number {
  return ventaTotal - facturasEfectivo - pagoEncargado;                 // RN-07
}
```

Ejemplo de una fila (inicial 24, entrada 12, cantidad vendida 18, valor unitario $3.500):

| Concepto | Resultado |
|---|---|
| Inventario final calculado | 24 + 12 − 18 = 18 |
| Total de venta | 18 × 3.500 = $63.000 |

| Conteo físico | Resultado del conteo | Faltante | Valor a cancelar |
|---|---|---|---|
| 18 | Cuadra | 0 | $0 |
| 16 | Faltante | 2 | 2 × 3.500 = $7.000 |
| 20 | Sobrante (2) | 0 | $0 |

Ejemplo de alertas (inventario de referencia):

| Inventario | Bar (umbral 6) | Helados (umbrales 5 y 3) |
|---|---|---|
| 6 | Sin alerta | Sin alerta |
| 5 | Por reponer | Sin alerta |
| 4 | Por reponer | Amarilla |
| 3 | Por reponer | Amarilla |
| 2 | Por reponer | Roja |
| 0 | Por reponer | Roja |

Ejemplo de resumen de un turno (bar $63.000 + bar $20.000 + helados $24.000):

| Concepto | Monto |
|---|---|
| Valor de venta total | $107.000 |
| Facturas canceladas en efectivo | − $30.000 |
| Pago al encargado | − $40.000 |
| **Resultado neto** | **$37.000** |

Si la venta total fuera $50.000 con las mismas facturas y el mismo pago, el resultado neto sería −$20.000. Los montos van en enteros: no hay decimales que redondear.

---

## 9. Modelo de datos

### 9.1 Relaciones

```text
productos 1 ──── N registros_turno
turnos    1 ──── N registros_turno
acceso (correo → rol), sin relación con las demás

v_registros_turno = registros_turno + inventario de referencia, faltante, sobrante y valor a cancelar
v_turnos          = turnos + venta total, total a cancelar, filas sin conteo y resultado neto
v_inventario_actual = último inventario de referencia por producto activo
```

Las migraciones se guardan en `supabase/migrations/`. En este documento se nombran M1 y M2 (y M3 para los opcionales). P00 confirma la numeración.

### 9.2 M1 · Tablas

```sql
-- M1: tablas del inventario

CREATE TABLE IF NOT EXISTS acceso (
  email  VARCHAR(160) PRIMARY KEY,
  rol    VARCHAR(14)  NOT NULL,
  CONSTRAINT acceso_email_minimo CHECK (char_length(btrim(email)) >= 3),
  CONSTRAINT acceso_rol_valido   CHECK (rol IN ('administrador', 'encargado'))   -- RN-15
);

CREATE TABLE IF NOT EXISTS productos (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         VARCHAR(160) NOT NULL,
  seccion        VARCHAR(10)  NOT NULL,                  -- 'bar' | 'helados'
  categoria      VARCHAR(40)  NOT NULL,
  valor_unitario INTEGER      NOT NULL,                  -- pesos enteros
  umbral_alerta  SMALLINT     NOT NULL,                  -- bar: 6 · helados: 5 (amarilla)
  umbral_critico SMALLINT,                               -- solo helados: 3 (roja)
  activo         BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT productos_nombre_minimo   CHECK (char_length(btrim(nombre)) >= 1),
  CONSTRAINT productos_valor_positivo  CHECK (valor_unitario > 0),
  CONSTRAINT productos_seccion_valida  CHECK (seccion IN ('bar', 'helados')),
  CONSTRAINT productos_umbral_positivo CHECK (umbral_alerta > 0),
  CONSTRAINT productos_umbrales_coherentes CHECK (                                  -- RN-02
    (seccion = 'bar' AND umbral_critico IS NULL) OR
    (seccion = 'helados' AND umbral_critico IS NOT NULL
       AND umbral_critico > 0 AND umbral_critico < umbral_alerta))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_productos_nombre ON productos (seccion, lower(btrim(nombre)));  -- RN-01
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos (seccion, activo);

CREATE TABLE IF NOT EXISTS turnos (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha                 DATE         NOT NULL,
  nombre                VARCHAR(40)  NOT NULL,
  encargado             VARCHAR(80)  NOT NULL,
  estado                VARCHAR(12)  NOT NULL DEFAULT 'abierto',
  facturas_efectivo     INTEGER,                         -- lo registra el administrador (RN-07)
  pago_encargado        INTEGER,                         -- lo registra el administrador (RN-07)
  venta_total_cierre    INTEGER,                         -- guardado al cerrar (RN-14)
  resultado_neto_cierre INTEGER,                         -- guardado al cerrar; puede ser negativo
  entregado_at          TIMESTAMPTZ,
  cerrado_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT turnos_nombre_minimo    CHECK (char_length(btrim(nombre)) >= 1),
  CONSTRAINT turnos_encargado_minimo CHECK (char_length(btrim(encargado)) >= 1),
  CONSTRAINT turnos_estado_valido    CHECK (estado IN ('abierto', 'en_revision', 'cerrado')),   -- RN-12
  CONSTRAINT turnos_facturas_validas CHECK (facturas_efectivo IS NULL OR facturas_efectivo >= 0),
  CONSTRAINT turnos_pago_valido      CHECK (pago_encargado IS NULL OR pago_encargado >= 0),
  CONSTRAINT turnos_entrega_coherente CHECK ((estado = 'abierto') = (entregado_at IS NULL)),
  CONSTRAINT turnos_cierre_coherente CHECK (                                                     -- RN-14
    (estado = 'cerrado' AND cerrado_at IS NOT NULL AND facturas_efectivo IS NOT NULL
       AND pago_encargado IS NOT NULL AND venta_total_cierre IS NOT NULL
       AND resultado_neto_cierre IS NOT NULL) OR
    (estado <> 'cerrado' AND cerrado_at IS NULL))
);
-- Un solo turno abierto a la vez y fecha + nombre únicos (RN-11):
CREATE UNIQUE INDEX IF NOT EXISTS ux_turnos_un_abierto ON turnos (estado) WHERE estado = 'abierto';
CREATE UNIQUE INDEX IF NOT EXISTS ux_turnos_fecha_nombre ON turnos (fecha, lower(btrim(nombre)));
CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos (fecha DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS registros_turno (
  id              BIGSERIAL    PRIMARY KEY,
  turno_id        UUID         NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  producto_id     UUID         NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,    -- RN-13
  nombre          VARCHAR(160) NOT NULL,                 -- copia al abrir el turno
  seccion         VARCHAR(10)  NOT NULL,                 -- copia al abrir el turno
  valor_unitario  INTEGER      NOT NULL,                 -- copiado al abrir el turno (RN-08)
  inicial         INTEGER      NOT NULL DEFAULT 0,
  entrada         INTEGER      NOT NULL DEFAULT 0,
  vendida         INTEGER      NOT NULL DEFAULT 0,
  contado         INTEGER,                               -- conteo físico; NULL hasta que se ingresa
  final_calculado INTEGER GENERATED ALWAYS AS (inicial + entrada - vendida) STORED,         -- RN-03
  total_venta     INTEGER GENERATED ALWAYS AS (vendida * valor_unitario) STORED,            -- RN-04
  CONSTRAINT registros_cantidades_validas CHECK (inicial >= 0 AND entrada >= 0 AND vendida >= 0),  -- RN-10
  CONSTRAINT registros_contado_valido     CHECK (contado IS NULL OR contado >= 0),
  CONSTRAINT registros_valor_positivo     CHECK (valor_unitario > 0),
  CONSTRAINT registros_vendida_excede     CHECK (vendida <= inicial + entrada),             -- RN-10
  CONSTRAINT registros_unico_por_turno    UNIQUE (turno_id, producto_id)
);
CREATE INDEX IF NOT EXISTS idx_registros_turno ON registros_turno (turno_id);
CREATE INDEX IF NOT EXISTS idx_registros_producto ON registros_turno (producto_id);

CREATE OR REPLACE FUNCTION inventario_actualizar_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_productos_updated_at ON productos;
CREATE TRIGGER trg_productos_updated_at BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION inventario_actualizar_updated_at();
DROP TRIGGER IF EXISTS trg_turnos_updated_at ON turnos;
CREATE TRIGGER trg_turnos_updated_at BEFORE UPDATE ON turnos
  FOR EACH ROW EXECUTE FUNCTION inventario_actualizar_updated_at();
```

### 9.3 M2 · Vistas y seguridad

```sql
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
```

Las tablas quedan sin políticas: la clave pública de Supabase no puede leerlas ni escribirlas; todo el acceso ocurre en el servidor con la conexión directa a Postgres. Los usuarios iniciales (correo y rol) se cargan con `scripts/cargar-acceso.ts`. El catálogo de productos real lo registra el administrador desde la aplicación; no se siembra.

### 9.4 Traducción de errores de la base de datos

| Código Postgres | Restricción | Código de negocio |
|---|---|---|
| `23505` | `ux_productos_nombre` | `PRODUCTO_DUPLICADO` |
| `23505` | `ux_turnos_un_abierto` | `TURNO_YA_ABIERTO` |
| `23505` | `ux_turnos_fecha_nombre` | `TURNO_DUPLICADO` |
| `23505` | `ux_facturas_numero_producto` (opcional) | `FACTURA_DUPLICADA` |
| `23503` | llaves foráneas (`ON DELETE RESTRICT`) | `PRODUCTO_CON_REGISTROS` |
| `23514` | `registros_vendida_excede` | `VENDIDO_EXCEDE_EXISTENCIA` |
| `23514` | cualquier otro CHECK | `DATOS_INVALIDOS` |
| Otro | | `ERROR_INTERNO` (se registra en consola, no se muestra al usuario) |

---

## 10. Arquitectura del código

### 10.1 Capas

```text
Pantallas (app/inventario/*) ──┐
                               ├──► Rutas API (app/api/inventario/*) ──► lib/dataService.ts ──► lib/datos/* ──► Postgres
Componentes (components/*) ────┘          │                                   │
                                          └──── lib/validacion (Zod)          └──── lib/reglas/* (funciones puras)
```

Las rutas y carpetas concretas se ajustan a las que el repositorio ya use (P00 lo confirma); el patrón de capas se mantiene. El proyecto usa `src/`, así que las rutas de `lib`, `components` y `app` cuelgan de `src/` según el alias `@/*`. Si otro módulo ya definió `lib/db/conexion.ts`, `lib/auth/sesion.ts` o `lib/http/respuestas.ts`, el inventario los reutiliza en vez de duplicarlos.

- `lib/reglas/`: reglas puras (cálculos, alertas, flujo del turno, validaciones). No importan datos, ni red, ni el reloj (salvo `fechas.ts`). Se prueban con Vitest (ya configurado).
- `lib/datos/`: consultas SQL y casos de uso con transacciones. Solo este directorio importa `lib/db/conexion.ts`.
- `lib/dataService.ts`: fachada única.
- Rutas API: validan con Zod, verifican sesión y rol, llaman a `dataService`, responden con `lib/http/respuestas.ts`.

### 10.2 Árbol de archivos nuevos (bajo `src/`, salvo doc/ y supabase/)

```text
.github/copilot-instructions.md
doc/ESTADO_ACTUAL.md
doc/DICTAMEN.md
doc/ESTADO_EJECUCION.md
doc/checkpoints/FASE_N_COMPLETADA.md

supabase/migrations/NNNN_inventario_tablas.sql
supabase/migrations/NNNN_inventario_vistas_seguridad.sql
supabase/migrations/NNNN_inventario_opcionales.sql      (solo P09)

scripts/migrar.mjs                 (solo si no existe mecanismo de migraciones)
scripts/verificar-bd.mjs
scripts/probar-flujo.ts
scripts/limpiar-prueba.mjs
scripts/cargar-acceso.ts           (carga correos y roles)

src/lib/config/inventario.ts
src/lib/reglas/errores.ts
src/lib/reglas/fechas.ts
src/lib/reglas/producto.ts
src/lib/reglas/registro.ts
src/lib/reglas/alertas.ts
src/lib/reglas/turno.ts
src/lib/reglas/precios.ts          (opcional)
src/lib/reglas/cocina.ts           (opcional)
src/lib/validacion/esquemas.ts
src/lib/db/conexion.ts
src/lib/auth/sesion.ts
src/lib/http/respuestas.ts
src/lib/formato.ts
src/lib/datos/tipos.ts
src/lib/datos/productos.ts
src/lib/datos/turnos.ts
src/lib/datos/registros.ts
src/lib/datos/inventario.ts
src/lib/datos/cocina.ts            (opcional)
src/lib/datos/facturas.ts          (opcional)
src/lib/dataService.ts

src/tests/reglas/ayudas.ts
src/tests/reglas/registro.test.ts
src/tests/reglas/alertas.test.ts
src/tests/reglas/turno.test.ts
src/tests/reglas/producto.test.ts
(o la carpeta de tests que el repo ya use)

src/app/inventario/layout.tsx
src/app/inventario/page.tsx                       (inventario actual y alertas)
src/app/inventario/turno/page.tsx                 (turno actual: abrir o planilla digital)
src/app/inventario/turnos/page.tsx                (historial, administrador)
src/app/inventario/turnos/[id]/page.tsx           (detalle y resumen financiero)
src/app/inventario/productos/page.tsx             (administrador)
src/app/inventario/productos/nuevo/page.tsx       (administrador)
src/app/inventario/cocina/page.tsx                (opcional)
src/app/inventario/facturas/page.tsx              (opcional)

src/app/api/inventario/sesion/route.ts
src/app/api/inventario/productos/route.ts
src/app/api/inventario/productos/[id]/route.ts
src/app/api/inventario/inventario/route.ts
src/app/api/inventario/turnos/route.ts
src/app/api/inventario/turnos/[id]/route.ts
src/app/api/inventario/turnos/[id]/registros/[registroId]/route.ts
src/app/api/inventario/turnos/[id]/entregar/route.ts
src/app/api/inventario/turnos/[id]/devolver/route.ts
src/app/api/inventario/turnos/[id]/finanzas/route.ts
src/app/api/inventario/turnos/[id]/cerrar/route.ts
src/app/api/inventario/cocina/route.ts            (opcional)
src/app/api/inventario/facturas/route.ts          (opcional)

src/components/ui/*  (Boton, Campo, Selector, Tarjeta, Insignia, Aviso, Modal, EstadoVacio)
src/components/inventario/NavegacionInventario.tsx
src/components/inventario/InsigniaAlerta.tsx
src/components/inventario/InsigniaEstadoTurno.tsx
src/components/inventario/TablaInventario.tsx
src/components/inventario/FormularioProducto.tsx
src/components/inventario/FormularioTurno.tsx
src/components/inventario/PlanillaTurno.tsx
src/components/inventario/FilaRegistro.tsx
src/components/inventario/ResumenFinanciero.tsx
src/components/inventario/TablaHistorial.tsx
```

### 10.3 Responsabilidades y prohibiciones

| Regla de código | Motivo |
|---|---|
| Identificadores, comentarios y mensajes en español | Coherencia con el dominio |
| Los cálculos, las alertas y el flujo del turno viven en `lib/reglas/` y se prueban | Núcleo verificable |
| No romper las pruebas que ya existan en el repo | El proyecto ya tiene Vitest configurado |
| Los totales se calculan desde las filas; el valor unitario se copia al abrir el turno | RN-04, RN-07, RN-08 |
| Los umbrales salen de `lib/config/inventario.ts` o del producto; nunca números sueltos en el código | RN-02 |
| El estado del turno solo cambia según el flujo | RN-12 |
| Montos en pesos enteros; nunca decimales | Sección 14 |
| Solo `lib/datos/` importa `lib/db/conexion.ts` | Las rutas no escriben SQL |
| Las rutas solo importan datos desde `lib/dataService.ts` | Fachada única |
| Las rutas privadas llaman `exigirSesion()` y, si la acción es del administrador, `exigirRol('administrador')` como primeras instrucciones | Sección 4 |
| Abrir, entregar y cerrar un turno ocurren en una transacción, con el turno bloqueado | RN-11, RN-12, integridad |
| `params` de rutas dinámicas se obtiene con `await params` | Next.js 16 entrega `params` como Promise |
| Respetar los alias del repo (`@/*` → `src/*`, `@data/*` → `data/*`) y la configuración estricta de TypeScript | Ya definidos en tsconfig |
| No modificar el código de otros módulos del repositorio | Sección 0 |

### 10.4 Configuración

```ts
// src/lib/config/inventario.ts
export const SECCIONES = ['bar', 'helados'] as const;
export const CATEGORIAS_BAR = ['Bebida', 'Papitas', 'Confitería', 'Otro'] as const;
export const CATEGORIA_HELADOS = 'Helado';
export const UMBRAL_BAR = 6;               // alerta "por reponer" del bar
export const UMBRAL_HELADOS_AMARILLO = 5;  // helados: alerta amarilla (menos de 5)
export const UMBRAL_HELADOS_ROJO = 3;      // helados: alerta roja (menos de 3)
export const CANTIDAD_MAXIMA = 9999;
export const ZONA_HORARIA = 'America/Bogota';
export const LIMITE_LISTADO = 200;
```

### 10.5 Firmas de las reglas puras

```ts
// src/lib/reglas/errores.ts
export type CodigoError =
  | 'DATOS_INVALIDOS' | 'NO_AUTORIZADO' | 'SIN_PERMISO'
  | 'PRODUCTO_DUPLICADO' | 'PRODUCTO_NO_ENCONTRADO' | 'PRODUCTO_CON_REGISTROS'
  | 'TURNO_NO_ENCONTRADO' | 'REGISTRO_NO_ENCONTRADO' | 'TURNO_YA_ABIERTO' | 'TURNO_DUPLICADO'
  | 'TURNO_NO_EDITABLE' | 'TURNO_INCOMPLETO' | 'TRANSICION_INVALIDA' | 'VENDIDO_EXCEDE_EXISTENCIA'
  | 'FACTURA_DUPLICADA'
  | 'ERROR_INTERNO';
export const MENSAJES: Record<CodigoError, string>;     // sección 11.2
export const ESTADO_HTTP: Record<CodigoError, number>;  // sección 11.2
export class ErrorDeNegocio extends Error {
  constructor(public codigo: CodigoError, mensaje?: string, public detalles?: unknown);
}

// src/lib/reglas/fechas.ts
export function hoyBogota(reloj?: Date): string;                 // 'YYYY-MM-DD'

// src/lib/reglas/producto.ts
export type Seccion = 'bar' | 'helados';
export function validarProducto(d: {
  nombre: string; seccion: Seccion; categoria: string; valorUnitario: number;
  umbralAlerta: number; umbralCritico: number | null;
}): void;                                                        // RN-01, RN-02

// src/lib/reglas/registro.ts
export type EstadoConteo = 'sin_conteo' | 'cuadra' | 'faltante' | 'sobrante';
export function inventarioFinalCalculado(inicial: number, entrada: number, vendida: number): number;  // RN-03
export function totalVenta(vendida: number, valorUnitario: number): number;                            // RN-04
export function faltante(calculado: number, contado: number | null): number;                           // RN-05
export function sobrante(calculado: number, contado: number | null): number;                           // RN-05
export function valorACancelar(unidadesFaltantes: number, valorUnitario: number): number;              // RN-05
export function estadoConteo(calculado: number, contado: number | null): EstadoConteo;                 // sección 5.3
export function inventarioReferencia(calculado: number, contado: number | null): number;               // RN-06
export function validarMovimiento(inicial: number, entrada: number, vendida: number): void;            // RN-10
export function validarConteo(contado: number): void;                                                   // RN-10

// src/lib/reglas/alertas.ts
export type NivelAlerta = 'ninguna' | 'reponer' | 'amarilla' | 'roja';
export const ETIQUETA_ALERTA: Record<NivelAlerta, string>;
export function nivelAlerta(inventario: number, umbralAlerta: number, umbralCritico: number | null): NivelAlerta;  // RN-06

// src/lib/reglas/turno.ts
export type EstadoTurno = 'abierto' | 'en_revision' | 'cerrado';
export const ETIQUETA_ESTADO_TURNO: Record<EstadoTurno, string>;   // sección 5.1
export function esEditable(estado: EstadoTurno): boolean;          // solo 'abierto' admite cambios de filas
export function puedeEntregar(estado: EstadoTurno, filasSinConteo: number): boolean;        // RN-12
export function puedeCerrar(estado: EstadoTurno, finanzasRegistradas: boolean): boolean;    // RN-12
export function puedeDevolver(estado: EstadoTurno, hayTurnoPosterior: boolean): boolean;    // RN-12
export function validarTurno(d: { nombre: string; encargado: string; fecha: string }): void;
export function validarFinanzas(d: { facturasEfectivo: number; pagoEncargado: number }): void;   // enteros ≥ 0
export function valorVentaTotal(totalesVenta: number[]): number;                                 // RN-07
export function resultadoNeto(ventaTotal: number, facturasEfectivo: number, pagoEncargado: number): number;  // RN-07

// src/lib/reglas/precios.ts  (opcional)
export function hayAumento(valorAnterior: number | null, valorNuevo: number): boolean;           // RN-16

// src/lib/reglas/cocina.ts  (opcional)
export function inventarioFinalCocina(existenciaInicial: number, salida: number): number;        // RN-17
```

### 10.6 Firmas de `dataService`

```ts
// Sesión
obtenerSesion(): Promise<{ email: string; rol: Rol } | null>

// Productos
listarProductos(f?: { seccion?: Seccion; soloActivos?: boolean }): Promise<Producto[]>
crearProducto(d: DatosProducto): Promise<{ id: string }>                        // CU-01 (administrador)
actualizarProducto(id: string, cambios: CambiosProducto): Promise<void>         // CU-02 (administrador)

// Inventario
inventarioActual(f?: { seccion?: Seccion; soloPorReponer?: boolean }): Promise<FilaInventario[]>   // CU-11

// Turnos
abrirTurno(d: DatosTurno): Promise<TurnoDetalle>                                // CU-03
obtenerTurno(id: string, rol: Rol): Promise<TurnoDetalle>                       // oculta finanzas al encargado
listarTurnos(limite?: number): Promise<TurnoResumen[]>                          // CU-12 (administrador)
registrarMovimiento(turnoId: string, registroId: number, m: { entrada?: number; vendida?: number }): Promise<RegistroTurno>   // CU-04
registrarConteo(turnoId: string, registroId: number, contado: number): Promise<RegistroTurno>                                 // CU-05
ajustarInicial(turnoId: string, registroId: number, inicial: number): Promise<RegistroTurno>                                  // CU-06 (administrador)
entregarTurno(turnoId: string): Promise<TurnoDetalle>                           // CU-07
registrarFinanzas(turnoId: string, f: { facturasEfectivo: number; pagoEncargado: number }): Promise<TurnoDetalle>            // CU-08 (administrador)
cerrarTurno(turnoId: string): Promise<TurnoDetalle>                             // CU-09 (administrador)
devolverTurno(turnoId: string): Promise<TurnoDetalle>                           // CU-10 (administrador)

// Opcionales
registrarTurnoCocina(d: DatosCocina): Promise<RegistroCocina>                   // CU-13, F5
listarCocina(fecha: string): Promise<RegistroCocina[]>
registrarFactura(d: DatosFactura): Promise<FacturaConAumento>                   // CU-14, F6
listarFacturas(f?: { productoId?: string }): Promise<FacturaConAumento[]>
```

Tipos (`src/lib/datos/tipos.ts`): `Rol = 'administrador' | 'encargado'`; `Producto { id, nombre, seccion, categoria, valorUnitario, umbralAlerta, umbralCritico, activo }`; `RegistroTurno { id, productoId, nombre, seccion, valorUnitario, inicial, entrada, vendida, contado, finalCalculado, totalVenta, faltante, sobrante, valorACancelar, estadoConteo, nivelAlerta }`; `TurnoDetalle { id, fecha, nombre, encargado, estado, registros, ventaTotal, totalACancelar, sinConteo, facturasEfectivo, pagoEncargado, resultadoNeto }` (las tres últimas quedan en `null` para el encargado); `TurnoResumen`; `FilaInventario { productoId, nombre, seccion, categoria, inventario, conteoFisico, nivelAlerta }`; `DatosProducto`, `CambiosProducto`, `DatosTurno`, `DatosCocina`, `DatosFactura`, `FacturaConAumento`.

### 10.7 Conexión y transacciones

```ts
// src/lib/db/conexion.ts
import { Pool, types, type PoolClient } from 'pg';

types.setTypeParser(1082, (v) => v);                 // DATE → texto
types.setTypeParser(1114, (v) => v);                 // TIMESTAMP → texto
types.setTypeParser(1184, (v) => v);                 // TIMESTAMPTZ → texto
types.setTypeParser(20, (v) => parseInt(v, 10));     // BIGINT (ids, COUNT, SUM) → number

const globalParaPool = globalThis as unknown as { poolInventario?: Pool };

export const pool = globalParaPool.poolInventario ?? new Pool({
  connectionString: process.env.DATABASE_URL,        // el nombre real lo confirma P00
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 10_000,
});
if (process.env.NODE_ENV !== 'production') globalParaPool.poolInventario = pool;

export async function consultar<T>(sql: string, valores: unknown[] = []): Promise<T[]> { /* pool.query */ }
export async function conTransaccion<T>(trabajo: (tx: PoolClient) => Promise<T>): Promise<T> { /* BEGIN/COMMIT/ROLLBACK */ }
```

Hace falta agregar `pg` (y `@types/pg`) a las dependencias si P00 confirma que no están. `SUM` y `COUNT` devuelven `BIGINT`; el parser lo pasa a número. Como todo es entero, no hace falta parser para `NUMERIC`.

---

## 11. Contratos de API

### 11.1 Formato de respuesta

```json
{ "ok": true, "datos": { } }
```

```json
{ "ok": false, "error": { "codigo": "TURNO_YA_ABIERTO", "mensaje": "Ya hay un turno abierto.", "detalles": null } }
```

Todas las respuestas llevan `Cache-Control: no-store`.

### 11.2 Códigos de error

| Código | HTTP | Mensaje para el usuario |
|---|---|---|
| `DATOS_INVALIDOS` | 400 | Revise los datos ingresados. |
| `NO_AUTORIZADO` | 401 | Debe iniciar sesión. |
| `SIN_PERMISO` | 403 | No tiene permiso para esta acción. |
| `PRODUCTO_DUPLICADO` | 409 | Ya existe un producto con ese nombre en esta sección. |
| `PRODUCTO_NO_ENCONTRADO` | 404 | El producto no existe. |
| `PRODUCTO_CON_REGISTROS` | 409 | El producto tiene registros y no se puede eliminar; desactívelo. |
| `TURNO_NO_ENCONTRADO` | 404 | El turno no existe. |
| `REGISTRO_NO_ENCONTRADO` | 404 | La fila del turno no existe. |
| `TURNO_YA_ABIERTO` | 409 | Ya hay un turno abierto. Entréguelo antes de abrir otro. |
| `TURNO_DUPLICADO` | 409 | Ya existe un turno con ese nombre en esa fecha. |
| `TURNO_NO_EDITABLE` | 409 | El turno ya fue entregado o cerrado y no se puede modificar. |
| `TURNO_INCOMPLETO` | 409 | Faltan datos para continuar (conteos, facturas o pago). |
| `TRANSICION_INVALIDA` | 409 | Esa acción no es válida para el estado actual del turno. |
| `VENDIDO_EXCEDE_EXISTENCIA` | 409 | La cantidad vendida supera lo disponible (inicial más entrada). |
| `FACTURA_DUPLICADA` | 409 | Ya existe una factura con ese número para ese producto. |
| `ERROR_INTERNO` | 500 | Ocurrió un error inesperado. Intente de nuevo. |

### 11.3 Endpoints (todos requieren sesión)

| Método y ruta | Rol | Cuerpo o parámetros | Respuesta `datos` |
|---|---|---|---|
| `GET /api/inventario/sesion` | ambos | | `{ email, rol }` |
| `GET /api/inventario/productos?seccion=&soloActivos=` | ambos | | `Producto[]` |
| `POST /api/inventario/productos` | administrador | `{ nombre, seccion, categoria, valorUnitario, umbralAlerta?, umbralCritico? }` | `{ id }` (201) |
| `PATCH /api/inventario/productos/[id]` | administrador | `{ nombre?, categoria?, valorUnitario?, umbralAlerta?, umbralCritico?, activo? }` | `{ actualizado: true }` |
| `GET /api/inventario/inventario?seccion=&soloPorReponer=` | ambos | | `FilaInventario[]` |
| `GET /api/inventario/turnos?limite=` | administrador | | `TurnoResumen[]` |
| `POST /api/inventario/turnos` | ambos | `{ fecha?, nombre, encargado }` | `TurnoDetalle` (201) |
| `GET /api/inventario/turnos/[id]` | ambos | | `TurnoDetalle` (sin finanzas para el encargado) |
| `PATCH /api/inventario/turnos/[id]/registros/[registroId]` | ambos (`inicial` solo administrador) | `{ entrada?, vendida?, contado?, inicial? }` (al menos uno) | `RegistroTurno` |
| `POST /api/inventario/turnos/[id]/entregar` | ambos | | `TurnoDetalle` |
| `POST /api/inventario/turnos/[id]/devolver` | administrador | | `TurnoDetalle` |
| `PUT /api/inventario/turnos/[id]/finanzas` | administrador | `{ facturasEfectivo, pagoEncargado }` | `TurnoDetalle` |
| `POST /api/inventario/turnos/[id]/cerrar` | administrador | | `TurnoDetalle` |
| `GET /api/inventario/cocina?fecha=` | ambos | | `RegistroCocina[]` (opcional) |
| `POST /api/inventario/cocina` | ambos | `{ producto, fecha, existenciaInicial, salida }` | `RegistroCocina` (opcional) |
| `GET /api/inventario/facturas?productoId=` | administrador | | `FacturaConAumento[]` (opcional) |
| `POST /api/inventario/facturas` | administrador | `{ numero, proveedor, fecha, productoId, valorUnitario, turnoId? }` | `FacturaConAumento` (opcional) |

### 11.4 Esquemas Zod (`src/lib/validacion/esquemas.ts`)

| Esquema | Reglas |
|---|---|
| `esquemaProducto` | nombre (1 a 160), seccion enum, categoria (1 a 40), valorUnitario entero ≥ 1, umbrales opcionales enteros ≥ 1 |
| `esquemaCambiosProducto` | nombre, categoria, valorUnitario, umbrales, activo opcionales; al menos uno; sin `seccion` |
| `esquemaTurno` | fecha opcional (`YYYY-MM-DD`), nombre (1 a 40), encargado (1 a 80) |
| `esquemaCambioRegistro` | entrada, vendida, contado, inicial opcionales; enteros 0 a 9999; al menos uno |
| `esquemaFinanzas` | facturasEfectivo y pagoEncargado enteros ≥ 0 |
| `esquemaFiltrosInventario` | seccion y soloPorReponer opcionales |
| `esquemaCocina` *(opc.)* | producto (1 a 160), fecha, existenciaInicial y salida enteros ≥ 0 |
| `esquemaFactura` *(opc.)* | numero (1 a 40), proveedor (1 a 120), fecha, productoId uuid, valorUnitario entero ≥ 1, turnoId uuid opcional |

---

## 12. Pantallas

| Ruta | Contenido |
|---|---|
| Layout `/inventario` | Verifica la sesión; sin sesión redirige al login. Barra con "Inventario del bar", navegación (Inventario, Turno actual; Productos, Historial y Facturas solo para el administrador; Cocina cuando esté activo) y cerrar sesión. Mobile-First (se usa en tablet o celular en el bar). |
| `/inventario` · Inventario actual | Dos bloques, **Bar** y **Helados**, con una tarjeta o fila por producto: nombre, inventario de referencia, si proviene de conteo físico o de cálculo, y `InsigniaAlerta`. Filtro "Por reponer" que deja solo los productos con alerta (la lista para pedir al proveedor). `EstadoVacio` si aún no hay registros. |
| `/inventario/turno` · Turno actual | Sin turno abierto: `FormularioTurno` (fecha de hoy por defecto, nombre del turno, encargado) y botón "Abrir turno". Con turno abierto: `PlanillaTurno`, la planilla digital en dos secciones (Bar y Helados). Cada `FilaRegistro` muestra Inicial (solo lectura para el encargado), Entrada, Vendida, Inv. final calculado (en vivo), Valor, Total de venta, Contado y, según el conteo, el faltante con su valor a cancelar o el sobrante. Botón "Entregar turno", deshabilitado hasta completar todos los conteos, con el número de filas pendientes. |
| `/inventario/turnos` · Historial (administrador) | `TablaHistorial`: fecha, turno, encargado, estado, venta total, total a cancelar por faltantes y resultado neto. |
| `/inventario/turnos/[id]` · Detalle y resumen financiero | Encabezado con fecha, nombre, encargado e `InsigniaEstadoTurno`. La planilla en solo lectura. `ResumenFinanciero` (administrador): venta total (bar + helados), campos de facturas canceladas en efectivo y pago al encargado, y resultado neto en vivo. Botones según el estado: "Cerrar turno" y "Devolver al encargado" (solo `en_revision`). |
| `/inventario/productos` · Productos (administrador) | Tabla separada por sección: nombre, categoría, valor, umbrales, interruptor activo/inactivo. Botón "Nuevo producto". |
| `/inventario/productos/nuevo` · Nuevo producto (administrador) | `FormularioProducto`: nombre, sección, categoría, valor. Los umbrales aparecen con su valor por defecto (6 en bar; 5 y 3 en helados). Nombre duplicado muestra el mensaje. |
| `/inventario/cocina` · Cocina *(opcional)* | Registro de existencia inicial, salida e inventario final esperado. |
| `/inventario/facturas` · Facturas *(opcional, administrador)* | Registro de facturas y historial por producto, con el aviso de aumento de precio. |

### 12.1 Textos fijos

Faltante:

> Faltan {n} unidades de {producto}: valor a cancelar {valor}.

Sobrante:

> Sobran {n} unidades de {producto}. No genera cobro.

Resumen financiero:

> Venta total: {venta}. Facturas en efectivo: {facturas}. Pago al encargado: {pago}. Resultado neto: {neto}.

Confirmación de entrega:

> Entregar el turno para revisión. Después de entregarlo no podrá modificar los datos.

Confirmación de cierre:

> Cerrar el turno {nombre} del {fecha}. Resultado neto: {neto}. Esta acción no se puede deshacer.

---

## 13. Identidad visual

| Token | Valor | Uso |
|---|---|---|
| `--color-primario` | `#990011` | Cereza: botones principales, barra superior |
| `--color-primario-suave` | `#F3E2E2` | Fondos de selección, hover |
| `--color-reponer` | `#2F3C7E` | Aviso "Por reponer" del bar (D-3) |
| `--color-alerta-amarilla` | `#E8A500` | Helados: menos de 5 unidades |
| `--color-alerta-roja` | `#C62828` | Helados: menos de 3 unidades; faltantes; errores |
| `--color-ok` | `#3E7C4A` | Conteo que cuadra |
| `--color-sobrante` | `#3A5A7A` | Conteo con sobrante |
| `--color-turno-abierto` | `#2E6E8E` | Turno abierto |
| `--color-turno-revision` | `#6B4E9B` | Turno en revisión |
| `--color-turno-cerrado` | `#5B6770` | Turno cerrado |
| `--color-fondo` | `#FCF6F5` | Fondo de página |
| `--color-superficie` | `#FFFFFF` | Tarjetas |
| `--color-texto` | `#2B2B2B` | Texto principal |
| `--color-texto-suave` | `#5A4D4C` | Texto secundario |
| `--color-borde` | `#E9D9D8` | Bordes y divisores |

Los tokens se agregan a `globals.css` sin borrar estilos existentes (Tailwind 4: en `@theme`). Si el repo ya tiene una paleta, se respeta la suya y solo se agregan los tokens de alertas y estados.

Criterios: Mobile-First (tablet o celular en el bar); las alertas y estados con color **y** texto (nunca solo color), con el texto de las insignias en color oscuro sobre un fondo suave del mismo tono para mantener el contraste (en especial la alerta amarilla); filas de la planilla con campos numéricos grandes y fáciles de tocar; montos con fuente tabular y `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`; resultado neto negativo con signo menos; Framer Motion (ya está) para transiciones suaves al cambiar el estado de una fila o de un turno; sin emojis; tarjetas apiladas en móvil.

---

## 14. Dinero, fechas y zona horaria

| Regla | Implementación |
|---|---|
| Montos | Pesos enteros (`INTEGER` en la base, `number` entero en el código); sin centavos |
| Cantidades | Enteros ≥ 0, máximo 9.999 |
| Presentación | `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })` |
| Resultado neto | Puede ser negativo; se muestra con signo menos |
| "Hoy" (fecha por defecto del turno) | Con `hoyBogota()` |
| Fecha del turno | `DATE`; la fecha y el nombre del turno la definen quien abre el turno |
| Fecha/hora de entrega y cierre | `TIMESTAMPTZ`; se muestra en zona `America/Bogota` |
| Lectura desde BD | Parsers de `pg` devuelven texto para fechas y marcas de tiempo (sección 10.7) |

Los cálculos de inventario, faltantes y resumen no dependen de fechas; la zona solo afecta la presentación de las horas y la fecha por defecto.

---

## 15. Seguridad e integridad

| Medida | Detalle |
|---|---|
| Acceso solo con sesión y rol | Login como puerta, `exigirSesion()` y `exigirRol()` en cada ruta de `/api/inventario`; un correo que no está en `acceso` no entra |
| Separación de funciones | El encargado no cambia valores, umbrales, inicial, facturas en efectivo ni su propio pago; no ve el resultado neto |
| Base de datos cerrada al público | RLS activo sin políticas y permisos revocados a `anon` y `authenticated` |
| Integridad del turno | Abrir, entregar y cerrar ocurren en transacción con el turno bloqueado; un solo turno abierto (índice único parcial) |
| Cálculos en la base | `final_calculado` y `total_venta` son columnas generadas: no pueden quedar desalineadas de sus factores |
| Valor congelado | El valor unitario se copia al abrir el turno; cambiar el precio después no altera la planilla del turno |
| Inicial encadenado | El inicial sale del turno anterior; solo el administrador lo ajusta, de modo que el encargado no pueda ocultar un faltante cambiando el inicial |
| Flujo protegido | `puedeEntregar`, `puedeCerrar` y `puedeDevolver` impiden saltos; la base valida el estado con CHECK |
| Datos inmutables | Turnos cerrados y sus filas no se editan; un producto se desactiva, no se elimina |
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
| T-01 | `inventarioFinalCalculado` | inicial 24, entrada 12, vendida 18 | 18 |
| T-02 | `inventarioFinalCalculado` | 10, 0, 10 | 0 |
| T-03 | `inventarioFinalCalculado` | 5, 0, 0 | 5 |
| T-04 | `totalVenta` | vendida 18, valor 3500 | 63000 |
| T-05 | `totalVenta` | vendida 0, valor 3500 | 0 |
| T-06 | `faltante` | calculado 18, contado 16 | 2 |
| T-07 | `faltante` | calculado 18, contado 18 | 0 |
| T-08 | `faltante` | calculado 18, contado 20 | 0 (un sobrante no es faltante) |
| T-09 | `sobrante` | calculado 18, contado 20 | 2 |
| T-10 | `sobrante` | calculado 18, contado 16 | 0 |
| T-11 | `valorACancelar` | 2 unidades, valor 3500 | 7000 |
| T-12 | `valorACancelar` | 0 unidades, valor 3500 | 0 |
| T-13 | `estadoConteo` | calculado 18, contado `null` | 'sin_conteo' |
| T-14 | `estadoConteo` | 18, 18 | 'cuadra' |
| T-15 | `estadoConteo` | 18, 16 | 'faltante' |
| T-16 | `estadoConteo` | 18, 20 | 'sobrante' |
| T-17 | `inventarioReferencia` | calculado 18, contado 16 | 16 |
| T-18 | `inventarioReferencia` | calculado 18, contado `null` | 18 |
| T-19 | `nivelAlerta` (bar) | inventario 6, umbral 6, crítico `null` | 'ninguna' |
| T-20 | `nivelAlerta` (bar) | inventario 5, umbral 6, crítico `null` | 'reponer' |
| T-21 | `nivelAlerta` (bar) | inventario 0, umbral 6, crítico `null` | 'reponer' |
| T-22 | `nivelAlerta` (helados) | inventario 5, umbrales 5 y 3 | 'ninguna' |
| T-23 | `nivelAlerta` (helados) | inventario 4, umbrales 5 y 3 | 'amarilla' |
| T-24 | `nivelAlerta` (helados) | inventario 3, umbrales 5 y 3 | 'amarilla' |
| T-25 | `nivelAlerta` (helados) | inventario 2, umbrales 5 y 3 | 'roja' |
| T-26 | `nivelAlerta` (helados) | inventario 0, umbrales 5 y 3 | 'roja' |
| T-27 | `validarMovimiento` | inicial 24, entrada 12, vendida 18 | sin error |
| T-28 | `validarMovimiento` | inicial 5, entrada 0, vendida 6 | `VENDIDO_EXCEDE_EXISTENCIA` |
| T-29 | `validarMovimiento` | inicial 5, entrada 1, vendida 6 | sin error (inventario final 0) |
| T-30 | `validarMovimiento` | inicial 24, entrada −1, vendida 0 | `DATOS_INVALIDOS` |
| T-31 | `validarMovimiento` | inicial 24, entrada 0, vendida 1.5 | `DATOS_INVALIDOS` |
| T-32 | `validarConteo` | −1 | `DATOS_INVALIDOS` |
| T-33 | `validarConteo` | 0 | sin error |
| T-34 | `valorVentaTotal` | [63000, 20000, 24000] | 107000 |
| T-35 | `valorVentaTotal` | [] | 0 |
| T-36 | `resultadoNeto` | venta 107000, facturas 30000, pago 40000 | 37000 |
| T-37 | `resultadoNeto` | venta 50000, facturas 30000, pago 40000 | −20000 |
| T-38 | `resultadoNeto` | 0, 0, 0 | 0 |
| T-39 | `validarTurno` | nombre " " | `DATOS_INVALIDOS` |
| T-40 | `validarTurno` | encargado " " | `DATOS_INVALIDOS` |
| T-41 | `validarTurno` | "Noche", "Carlos", '2026-11-06' | sin error |
| T-42 | `validarFinanzas` | pago −1 | `DATOS_INVALIDOS` |
| T-43 | `validarFinanzas` | facturas −1 | `DATOS_INVALIDOS` |
| T-44 | `validarFinanzas` | facturas 0, pago 0 | sin error |
| T-45 | `validarProducto` | valor 0 | `DATOS_INVALIDOS` |
| T-46 | `validarProducto` | nombre " " | `DATOS_INVALIDOS` |
| T-47 | `validarProducto` | "Gaseosa", bar, Bebida, 3500, umbral 6, crítico `null` | sin error |
| T-48 | `validarProducto` | helados, umbral 3, crítico 5 | `DATOS_INVALIDOS` (el crítico debe ser menor) |
| T-49 | `validarProducto` | bar con crítico 3 | `DATOS_INVALIDOS` |
| T-50 | `puedeEntregar` | 'abierto', 0 filas sin conteo | `true` |
| T-51 | `puedeEntregar` | 'abierto', 2 filas sin conteo | `false` |
| T-52 | `puedeEntregar` | 'en_revision', 0 | `false` |
| T-53 | `puedeCerrar` | 'en_revision', finanzas registradas | `true` |
| T-54 | `puedeCerrar` | 'en_revision', sin finanzas | `false` |
| T-55 | `puedeCerrar` | 'abierto', finanzas registradas | `false` |
| T-56 | `puedeDevolver` | 'en_revision', sin turno posterior | `true` |
| T-57 | `puedeDevolver` | 'en_revision', con turno posterior | `false` |
| T-58 | `puedeDevolver` | 'cerrado', sin turno posterior | `false` |
| T-59 | `esEditable` | 'abierto' | `true` |
| T-60 | `esEditable` | 'en_revision' | `false` |
| T-61 | `esEditable` | 'cerrado' | `false` |

Comando: `npm test`. Las 61 pruebas nuevas, más las existentes, deben pasar antes de continuar con la fase 3. Las pruebas de los opcionales (T-62 a T-68) se agregan en P09:

| ID | Función | Entrada | Resultado esperado |
|---|---|---|---|
| T-62 | `hayAumento` | anterior 2000, nuevo 2500 | `true` |
| T-63 | `hayAumento` | anterior 2000, nuevo 2000 | `false` |
| T-64 | `hayAumento` | anterior 2000, nuevo 1800 | `false` |
| T-65 | `hayAumento` | anterior `null`, nuevo 2500 | `false` (primera factura del producto) |
| T-66 | `inventarioFinalCocina` | existencia 10, salida 4 | 6 |
| T-67 | `inventarioFinalCocina` | existencia 10, salida 10 | 0 |
| T-68 | `inventarioFinalCocina` | existencia 10, salida 11 | `DATOS_INVALIDOS` |

### 16.2 Prueba de flujo contra la base de datos

`scripts/probar-flujo.ts` (`npm run probar:flujo`) usa `dataService` con productos `Prueba *`, en nombre de un administrador de prueba. Se ejecuta antes de cargar el catálogo real o en una base de pruebas: el script se detiene si hay un turno abierto o si hay productos activos que no empiecen por `Prueba`. Imprime `OK` o `FALLA` por paso y limpia al final.

| Paso | Operación | Esperado |
|---|---|---|
| 1 | Crear "Prueba Gaseosa" (bar, Bebida, 3500) | Creado, activo, umbral 6 |
| 2 | Crear "prueba gaseosa" otra vez en el bar | `PRODUCTO_DUPLICADO` |
| 3 | Crear un producto con valor 0 | `DATOS_INVALIDOS` |
| 4 | Crear "Prueba Helado" (helados, 4000) | Creado, umbrales 5 y 3 |
| 5 | Abrir el turno "Prueba" | Turno abierto con 2 filas, inicial 0 |
| 6 | Abrir otro turno estando uno abierto | `TURNO_YA_ABIERTO` |
| 7 | Ajustar el inicial: gaseosa 24, helado 12 | Actualizado |
| 8 | Gaseosa: entrada 12, vendida 18 | Inventario final 18; total de venta 63000 |
| 9 | Gaseosa: vendida 40 | `VENDIDO_EXCEDE_EXISTENCIA` |
| 10 | Helado: vendida 10 | Inventario final 2; total de venta 40000 |
| 11 | Entregar el turno sin conteos | `TURNO_INCOMPLETO` (2 filas sin conteo) |
| 12 | Conteo gaseosa 16 | Faltante 2; valor a cancelar 7000; alerta 'ninguna' |
| 13 | Conteo helado 2 | Cuadra; alerta 'roja' |
| 14 | Entregar el turno | `en_revision` |
| 15 | Registrar entrada en el turno entregado | `TURNO_NO_EDITABLE` |
| 16 | Cerrar el turno sin facturas ni pago | `TURNO_INCOMPLETO` |
| 17 | Registrar facturas en efectivo 30000 y pago 40000 | Venta total 103000; resultado neto 33000 |
| 18 | Cerrar el turno | `cerrado`; venta total y resultado neto guardados (103000 y 33000) |
| 19 | Devolver el turno cerrado | `TRANSICION_INVALIDA` |
| 20 | Abrir el turno "Prueba 2" | Filas con inicial 16 (gaseosa) y 2 (helado) |
| 21 | Devolver el turno "Prueba" (ya cerrado) con un turno posterior | `TRANSICION_INVALIDA` |

### 16.3 Aceptación (criterio de terminado)

Se ejecuta en el despliegue de Vercel y se documenta en `doc/ACEPTACION.md`.

| ID | Acción | Resultado esperado |
|---|---|---|
| A-01 | Abrir `/inventario` sin sesión | Redirección al login |
| A-02 | Como administrador, registrar "Gaseosa" (bar, Bebida, $3.500) y "Helado de vainilla" (helados, $4.000) | Cada uno aparece en su sección; los helados con umbrales 5 y 3 |
| A-03 | Registrar otra vez "Gaseosa" en el bar | Rechazo por duplicado |
| A-04 | Con sesión de encargado, intentar cambiar el valor de la Gaseosa | Rechazo: sin permiso |
| A-05 | Abrir el turno "Noche" con un encargado | Una fila por producto activo; inicial 0 si es el primer turno |
| A-06 | Como administrador, ajustar el inicial de la Gaseosa a 24; como encargado, intentar hacerlo | El administrador lo logra; el encargado no puede editar el campo |
| A-07 | Gaseosa: entrada 12, vendida 18 | Inventario final calculado 18; total de venta $63.000 |
| A-08 | Intentar vendida 40 | Rechazo: supera lo disponible |
| A-09 | Registrar conteo 16 | Faltante 2; valor a cancelar $7.000 asociado al encargado del turno |
| A-10 | Cambiar el conteo a 20 | Sobrante 2; sin cobro |
| A-11 | Bar con inventario 6 y luego 5 | Con 6 sin alerta; con 5 "Por reponer" |
| A-12 | Helado con inventario 5, 4, 3 y 2 | 5 sin alerta; 4 y 3 amarilla; 2 roja |
| A-13 | Intentar entregar con filas sin conteo | Rechazo, indicando cuántas faltan |
| A-14 | Completar los conteos y entregar | Turno En revisión; el encargado ya no puede modificar |
| A-15 | Como administrador, devolver el turno al encargado y volver a entregarlo | Vuelve a Abierto y se puede entregar de nuevo |
| A-16 | Intentar cerrar sin registrar facturas ni pago | Rechazo |
| A-17 | Registrar facturas en efectivo y pago al encargado | Muestra venta total (bar + helados), las restas y el resultado neto |
| A-18 | Cerrar el turno | Turno Cerrado; no se puede modificar |
| A-19 | Abrir el siguiente turno | El inicial de cada producto es el inventario final contado del turno anterior |
| A-20 | Ver el historial de turnos (administrador) | Venta total, faltantes y resultado neto por turno |
| A-21 | Cerrar el navegador y volver a entrar | Los datos persisten |
| A-22 | *(Opcional)* Registrar un turno de cocina | Inventario final esperado = existencia − salida |
| A-23 | *(Opcional)* Registrar una factura con valor mayor al anterior del mismo producto | Notificación de aumento de precio |

A-22 y A-23 corresponden a las opcionales; se verifican tras P09.

---

## 17. Plan de ejecución

| Fase | Prompt | Resultado | Cierre |
|---|---|---|---|
| 0 · Verificación del punto de partida | P00 | `ESTADO_ACTUAL.md`, `DICTAMEN.md`, `copilot-instructions.md`, `ESTADO_EJECUCION.md`; build y test de base | `FASE_0_COMPLETADA.md` |
| 1 · Base de datos | P01 | M1 y M2 aplicadas (o ajustadas); `npm run db:verificar` sin fallas | `FASE_1_COMPLETADA.md` |
| 2 · Reglas | P02 | `lib/config`, `lib/reglas`, 61 pruebas en verde (más las existentes) | `FASE_2_COMPLETADA.md` |
| 3 · Servidor | P03 | Conexión, sesión y roles, respuestas, esquemas, formato; rutas protegidas | `FASE_3_COMPLETADA.md` |
| 4 · Datos y API | P04, P05 | `lib/datos/*`, `dataService`, rutas; `npm run probar:flujo` sin fallas | `FASE_4_COMPLETADA.md` |
| 5 · Interfaz | P06, P07, P08 | Componentes base; productos e inventario con alertas; turno, planilla y resumen financiero | `FASE_5_COMPLETADA.md` |
| 6 · Aceptación | (en P08) | `ACEPTACION.md` con A-01 a A-21; README | `FASE_6_COMPLETADA.md` |
| 7 · Opcionales | P09 | Turno de cocina, facturas y aviso de aumento de precio | `FASE_7_COMPLETADA.md` |

Condiciones entre fases: no se inicia una fase sin el archivo de cierre de la anterior; `npm run build` sin errores al final de cada prompt; `npm test` en verde desde P02 (incluidas las pruebas que ya existían); cada prompt termina con commit y push, y un fallo de despliegue en Vercel se corrige antes del siguiente prompt.

---

## 18. Funcionalidades opcionales

Se construyen solo con la fase 6 cerrada. Todas las tablas opcionales van en una migración aparte (M3), para no tocar M1 ni M2.

| Prompt | Funcionalidad | Implementación |
|---|---|---|
| P09 | F5 · Turno de cocina | Tabla `registros_cocina` (fecha, producto en texto, existencia inicial, salida, inventario final esperado como columna generada, con la restricción `salida <= existencia_inicial`). Regla `inventarioFinalCocina`. Ruta `/api/inventario/cocina` y pantalla `/inventario/cocina` |
| P09 | F6 · Facturas y aviso de aumento de precio | Tabla `facturas` (número, proveedor, fecha, producto, valor unitario, turno opcional). Al registrar una factura se compara su valor contra el último valor registrado del mismo producto con `hayAumento`; si subió, la respuesta incluye el aumento (anterior, nuevo y diferencia). Ruta `/api/inventario/facturas` y pantalla `/inventario/facturas` |

```sql
-- M3: opcionales

CREATE TABLE IF NOT EXISTS registros_cocina (
  id                 BIGSERIAL    PRIMARY KEY,
  fecha              DATE         NOT NULL,
  producto           VARCHAR(160) NOT NULL,
  existencia_inicial INTEGER      NOT NULL,
  salida             INTEGER      NOT NULL,
  final_esperado     INTEGER GENERATED ALWAYS AS (existencia_inicial - salida) STORED,   -- RN-17
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT cocina_producto_minimo CHECK (char_length(btrim(producto)) >= 1),
  CONSTRAINT cocina_cantidades_validas CHECK (existencia_inicial >= 0 AND salida >= 0 AND salida <= existencia_inicial)
);
CREATE INDEX IF NOT EXISTS idx_cocina_fecha ON registros_cocina (fecha DESC);

CREATE TABLE IF NOT EXISTS facturas (
  id             BIGSERIAL    PRIMARY KEY,
  numero         VARCHAR(40)  NOT NULL,
  proveedor      VARCHAR(120) NOT NULL,
  fecha          DATE         NOT NULL,
  producto_id    UUID         NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  valor_unitario INTEGER      NOT NULL,                 -- costo de compra, no el valor de venta del producto
  turno_id       UUID         REFERENCES turnos(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT facturas_valor_positivo CHECK (valor_unitario > 0),
  CONSTRAINT facturas_texto_minimo   CHECK (char_length(btrim(numero)) >= 1 AND char_length(btrim(proveedor)) >= 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_facturas_numero_producto ON facturas (lower(btrim(numero)), producto_id);
CREATE INDEX IF NOT EXISTS idx_facturas_producto ON facturas (producto_id, fecha DESC, id DESC);

ALTER TABLE registros_cocina ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas         ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON registros_cocina, facturas FROM anon, authenticated;
```

Las facturas de F6 son un historial de **costos de compra** para vigilar el precio de los proveedores; no alimentan el monto manual de "facturas canceladas en efectivo" del turno (RN-07).

---

## 19. Glosario

| Término | Definición |
|---|---|
| Producto | Un artículo del inventario, con nombre, sección, categoría, valor unitario y umbrales de alerta |
| Sección | Agrupación del producto: `bar` (bebidas, papitas, confitería, otros) o `helados` |
| Turno | Un periodo de trabajo del encargado; equivale a una planilla de papel |
| Registro de turno | Una fila de la planilla: un producto dentro de un turno, con sus cantidades |
| Inicial | Cantidad con la que arranca el turno; normalmente, el inventario final del turno anterior |
| Entrada | Cantidad de producto nuevo que llegó durante el turno |
| Cantidad vendida | Unidades vendidas durante el turno |
| Inventario final calculado | Inicial + entrada − cantidad vendida |
| Conteo físico (inventario final contado) | Lo que el encargado cuenta realmente al final del turno |
| Faltante | Diferencia cuando el conteo físico es menor al inventario final calculado |
| Sobrante | Diferencia cuando el conteo físico es mayor al calculado; no genera cobro |
| Valor a cancelar | Faltante × valor unitario; lo que el encargado debe pagar por el faltante |
| Inventario de referencia | El conteo físico si existe; si no, el inventario final calculado. Es el que se usa para las alertas |
| Alerta de reposición | Aviso de que un producto bajó del umbral: "por reponer" en el bar; amarilla (menos de 5) o roja (menos de 3) en helados |
| Valor congelado | El valor unitario copiado al turno al abrirlo; no cambia después |
| Facturas canceladas en efectivo | Monto manual del turno: efectivo pagado desde la caja. No es lo mismo que una factura de compra de F6 |
| Pago al encargado | Monto manual del turno que registra el administrador |
| Valor de venta total | Suma de los totales de venta de todas las filas del turno (bar + helados) |
| Resultado neto | Valor de venta total − facturas en efectivo − pago al encargado; informativo, puede ser negativo |
| Turno en revisión | Turno que el encargado ya entregó y que el administrador revisa antes de cerrarlo |
| Factura de compra *(opc.)* | Registro de lo que cuesta un producto al comprarlo, con su proveedor y número |
| Regla pura | Función de `lib/reglas/` que solo depende de sus parámetros |
| Transacción | Conjunto de escrituras que se confirma completo o se revierte completo |
| Copilot en modo Agente | Modo de GitHub Copilot Chat que lee el repositorio, edita varios archivos y ejecuta comandos de terminal con aprobación |
