# Control de Inventario del Bar · Prompts para GitHub Copilot

> Plan de referencia: `doc/PLAN_INVENTARIO.md`
> Herramienta: GitHub Copilot Chat en modo Agente (VS Code)
> Punto de partida: repositorio Next.js 16 ya iniciado (puede convivir con otro módulo, p. ej. El Caleño); datos en papel, sin persistencia digital previa

---

## Importante: no tocar otros módulos

El inventario puede vivir en el mismo repositorio que otro módulo (por ejemplo, el de pedidos de El Caleño). **El código de ese otro módulo no se modifica.** El inventario vive bajo sus propias rutas (`/inventario`, `/api/inventario`) y sus propios archivos. P00 verifica qué hay y escribe un dictamen de qué se reutiliza (conexión, sesión, componentes base), qué se crea y qué no se toca. Lee `doc/DICTAMEN.md` después de P00.

## Dos roles

El sistema distingue `administrador` (el estudiante y su padre) y `encargado` del bar. La separación es de integridad: el encargado responde por los faltantes, así que no puede cambiar valores, el inicial ni su propio pago. Una tabla `acceso` asigna el rol a cada correo; un correo sin rol no entra.

## Cómo ejecutar estos prompts

1. Crear la carpeta `doc/` en la raíz del repositorio (si no existe) y copiar allí `PLAN_INVENTARIO.md` y `PROMPTS_INVENTARIO.md`. Si tienes el plan funcional original, cópialo como `doc/PLAN.md`.
2. Abrir el proyecto en VS Code y abrir Copilot Chat. En el selector de modo elegir **Agent**. En el selector de modelo elegir el más capaz disponible.
3. Cada prompt se ejecuta en una **conversación nueva** (botón `+` del chat).
4. Copiar el bloque gris completo del prompt, pegarlo en el chat y enviarlo. No hay datos que reemplazar.
5. Cuando Copilot pida permiso para ejecutar un comando en la terminal, leerlo y aceptarlo.
6. Al terminar cada prompt: revisar los cambios y aceptarlos (**Keep**); hacer la verificación indicada; hacer commit con el mensaje sugerido y `git push`. Vercel desplegará; si falla, usar el prompt de despliegue fallido antes de continuar.
7. No saltar prompts. Si algo falla, usar el prompt de corrección del final.

| Fase | Prompts |
|---|---|
| 0 · Verificación del punto de partida | P00 |
| 1 · Base de datos | P01 |
| 2 · Reglas de negocio | P02 |
| 3 · Servidor | P03 |
| 4 · Datos y API | P04, P05 |
| 5 · Interfaz | P06, P07, P08 |
| 7 · Opcionales | P09 |

---

## P00 · Verificación del punto de partida y dictamen

**Fase:** 0 · **Modifica código:** no · **Crea:** `doc/ESTADO_ACTUAL.md`, `doc/DICTAMEN.md`, `.github/copilot-instructions.md`, `doc/ESTADO_EJECUCION.md`, `doc/checkpoints/FASE_0_COMPLETADA.md`

````text
Actúa como ingeniero de software senior trabajando en modo agente sobre este repositorio Next.js.

Contexto IMPORTANTE: el proyecto "Control de Inventario del Bar" (inventario por turnos de un restaurante: bar y helados, conteo físico con faltantes, resumen financiero) se construye sobre el stack del curso (Next.js 16 + TypeScript + Tailwind 4 + Supabase + Vercel). El repositorio PUEDE contener ya otro módulo (por ejemplo, el de pedidos de El Caleño): ese código NO se modifica. Este prompt NO implementa funcionalidades: verifica qué existe y produce un dictamen. El plan técnico está en doc/PLAN_INVENTARIO.md; si existe el plan funcional, está en doc/PLAN.md.

Lee completo doc/PLAN_INVENTARIO.md, en especial las secciones 0, 1, 2, 3, 4, 5 y 17.

TAREA 1. Crea doc/ESTADO_ACTUAL.md con una radiografía fiel. No supongas: revisa el repositorio. Secciones:
1. Versiones (package.json): next, react, typescript, tailwindcss, zod, vitest; indica si pg y @types/pg están o FALTAN.
2. Scripts de package.json.
3. Estructura: árbol de src/, app/, lib/, components/, supabase/, data/, scripts/ hasta 3 niveles. Indica qué pertenece a OTRO módulo ya existente (no se tocará).
4. Alias en tsconfig.json y si TypeScript está en modo estricto (noUncheckedIndexedAccess, exactOptionalPropertyTypes).
5. Autenticación: ¿hay login? Si lo hay, archivos, mecanismo, función de sesión, cómo se obtiene el correo del usuario. Si no, indícalo (se agrega en P03).
6. Base de datos: ¿hay conexión directa a Postgres en .env.local? (solo NOMBRES). ¿Hay tablas ya existentes (de otro módulo)? Lista sus nombres para evitar choques con productos/turnos/acceso/registros_turno.
7. Dónde viven los datos hoy (se espera: en papel, nada digital).
8. Migraciones: ¿hay mecanismo? Si no, se crea.
9. Qué del dominio de inventario ya está construido, si algo. (Se espera que no.)
10. Estilos: Tailwind 4, globals.css, tokens, fuentes, uso de Framer Motion.
11. Pruebas: configuración de Vitest y pruebas existentes (de otro módulo): NO romperlas.
12. Conflictos: existencia previa de app/inventario, app/api/inventario, lib/dataService, components/ui; contenido de app/page.tsx (si es de otro módulo, no se toca).
13. Decisiones derivadas: ruta de login (existe o se agrega); archivo de protección (proxy.ts en Next 16); mecanismo de migraciones; nombre de la variable de conexión a Postgres; nombres de M1, M2 y M3; prefijo de imports; dónde está app/ (src/app).
14. Compilación de base: resultado de npm run build y npm test (TAREA 4).

TAREA 2. Crea doc/DICTAMEN.md: para cada pieza di su estado y qué hacer, distinguiendo lo que es del inventario de lo que es de otro módulo:

```markdown
## [Pieza]
- Estado: EXISTE (otro módulo) | EXISTE Y REUTILIZABLE | NO EXISTE
- Qué hacer: NO TOCAR | REUTILIZAR | CREAR
- Detalle: [qué exactamente, en qué prompt]
```

Cubre al menos: proyecto Next/TS, Tailwind, conexión a Postgres, login/sesión, componentes ui base, migraciones, y las funcionalidades del inventario (productos, turno de bar, turno de helados, conteo físico, alertas, resumen financiero). Lo de otro módulo es NO TOCAR; la conexión, la sesión y los componentes ui base, si existen y sirven, son REUTILIZAR; lo del inventario que no exista es CREAR. Incluye una tabla resumen y una lista de "qué necesita conseguir el estudiante" (conexión a Postgres, etc.).

TAREA 3. Crea .github/copilot-instructions.md reemplazando [AJUSTAR] con lo hallado:

```markdown
# Control de Inventario del Bar · Instrucciones para Copilot

## Documentos rectores
- Plan técnico: doc/PLAN_INVENTARIO.md. Si una instrucción contradice el plan, prevalece el plan.
- Estado real del repositorio: doc/ESTADO_ACTUAL.md.
- Dictamen: doc/DICTAMEN.md. Antes de crear algo, revisa si dice REUTILIZAR o NO TOCAR.
- Avance: doc/ESTADO_EJECUCION.md.

## Convivencia con otros módulos
- El repositorio puede tener otro módulo (p. ej. pedidos de El Caleño). NO se modifica su código.
- El inventario vive bajo /inventario, /api/inventario y sus propios archivos. Si hay choque de nombres de tabla con otro módulo, avísalo antes de crear.

## Stack
- Next.js 16 App Router + React 19 + TypeScript (estricto) + Tailwind 4 + Zod 4 + Framer Motion. Despliegue en Vercel.
- Postgres de Supabase con el paquete pg y la variable [AJUSTAR: conexión]. (pg [AJUSTAR: está / falta].)
- Pruebas con Vitest. No romper las pruebas existentes.
- app/ está en [AJUSTAR: src/app]. Login: [AJUSTAR: existe / se agrega en P03].

## Dos roles (integridad, no jerarquía)
- Tabla acceso (correo → rol: administrador | encargado). Un correo sin rol no entra.
- El encargado registra el turno (entrada, vendida, conteo) y entrega. El administrador gestiona productos, valores, umbrales, el inicial, facturas en efectivo, pago al encargado, y cierra o devuelve turnos. El encargado responde por los faltantes, por eso no cambia valores ni el inicial ni su pago.

## Lo más importante del dominio
- Inventario final calculado = inicial + entrada − vendida. Total de venta = vendida × valor unitario. (Columnas generadas en la base.)
- Faltante = calculado − contado (si contado < calculado); valor a cancelar = faltante × valor unitario, a cargo del encargado. Sobrante si contado > calculado, sin cobro.
- Alertas sobre el inventario de referencia (contado si existe, si no calculado). Bar: menos de 6 → "por reponer". Helados: menos de 3 → roja; menos de 5 → amarilla. Umbrales estrictos.
- Resumen del turno: venta total = suma de totales de venta (bar + helados); resultado neto = venta total − facturas en efectivo − pago al encargado (puede ser negativo). Informativo.
- El valor unitario se copia al registro al abrir el turno. Un solo turno abierto a la vez. Flujo: abierto → en_revision → cerrado (devolver solo si no hay turno posterior).

## Convenciones
- Identificadores, comentarios, mensajes y textos de interfaz en español.
- Reglas de negocio solo en lib/reglas/: funciones puras, sin pg, sin red, sin variables de entorno y sin reloj (excepto fechas.ts). Se prueban con Vitest.
- Solo lib/datos/ importa lib/db/conexion.ts. Rutas y páginas importan datos únicamente desde lib/dataService.ts.
- Toda ruta en app/api/inventario/ llama exigirSesion() y, donde aplique, exigirRol('administrador') como primeras instrucciones.
- El turno se abre y se cierra en una transacción. Montos y cantidades en enteros.
- Fechas 'YYYY-MM-DD'. Zona horaria America/Bogota; "hoy" solo con hoyBogota().
- En rutas dinámicas params es una Promise: const { id } = await params.
- SQL siempre con parámetros. Nunca concatenar valores.
- Productos se desactivan, no se eliminan. Turnos cerrados y sus registros son inmutables.
- No instalar librerías de componentes (shadcn, MUI u otras). Usar components/ui/.
- Prefijo de imports: [AJUSTAR]. Archivo de protección: [AJUSTAR]. Ruta de login: [AJUSTAR].

## Al terminar cada tarea
1. npm run build sin errores.
2. npm test sin fallas (incluidas las de otro módulo, si hay).
3. Actualizar doc/ESTADO_EJECUCION.md.
4. No hacer commit: el estudiante revisa y hace el commit.
```

TAREA 4. Si falta node_modules, ejecuta npm install y luego npm run build y npm test; registra el resultado en la sección 14 de ESTADO_ACTUAL.md. Si algo falla, NO lo arregles: descríbelo.

TAREA 5. Crea doc/ESTADO_EJECUCION.md con la tabla de prompts (P00 a P09) en estado pendiente y una sección de bitácora.

TAREA 6. Según lo que falte, explícame qué necesito conseguir antes de P01: la cadena de conexión a Postgres (Connect, Transaction pooler, puerto 6543) en .env.local y en Vercel, y los correos que irán en la tabla acceso con su rol. Solo diagnosticar.

RESTRICCIONES: no modifiques código, configuración ni dependencias. No toques el código de otro módulo. Solo creas los archivos de este prompt.

AL TERMINAR:
- Crea doc/checkpoints/FASE_0_COMPLETADA.md con: estado de la infraestructura, qué pertenece a otro módulo (no se toca), resumen del dictamen y qué necesita conseguir el estudiante.
- Marca P00 en ESTADO_EJECUCION.md.
- Muéstrame el dictamen resumido y qué me falta conseguir antes de P01.
````

**Verificación del estudiante:** leer `doc/DICTAMEN.md`. Confirmar que lo de otro módulo está marcado como NO TOCAR y que identifica la conexión a Postgres. Conseguir lo que falte antes de P01.

**Commit sugerido:** `docs: verificación del punto de partida y dictamen del inventario`

---

## P01 · Base de datos del módulo

**Fase:** 1 · **Crea:** dependencia `pg`, migraciones M1 y M2, `scripts/verificar-bd.mjs`, `scripts/migrar.mjs`

````text
Antes de escribir código lee completos: doc/DICTAMEN.md, doc/PLAN_INVENTARIO.md (secciones 4, 5, 6, 9 y 15), doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md. Si el dictamen dice que falta la conexión a Postgres, detente y avísame.

OBJETIVO: crear las tablas del inventario en Supabase Postgres y dejar un script que demuestre que la base protege las reglas (un solo turno abierto, umbrales coherentes por sección, cantidades válidas, vendida no excede existencia, inmutabilidad del cierre).

TAREA 1. Si falta pg, agrégalo (y @types/pg).

TAREA 2. Si el dictamen reporta tablas de otro módulo con nombres que choquen (productos, turnos, acceso, registros_turno), detente y avísame. Si no hay choque, crea en supabase/migrations/ dos archivos con los nombres de la sección 13 de ESTADO_ACTUAL.md:
- M1 (tablas: acceso, productos, turnos, registros_turno) con el SQL exacto de la sección 9.2 del plan.
- M2 (vistas v_registros_turno, v_turnos, v_inventario_actual y seguridad) con el SQL exacto de la sección 9.3.
No cambies nombres, columnas generadas, índices únicos ni restricciones: el código depende de ellos (secciones 9.4 y 9.5).

TAREA 3. Aplica las migraciones con el mecanismo existente o creando scripts/migrar.mjs (patrón estándar: variable de conexión, tabla _migrations, orden alfabético, transacción, aplicada/omitida, código 1 si falla) y "db:migrar". Ejecútalo.

TAREA 4. Crea scripts/verificar-bd.mjs y "db:verificar". Debe imprimir:
1. Existencia de acceso, productos, turnos, registros_turno y las vistas v_registros_turno, v_turnos, v_inventario_actual.
2. Número de filas de cada tabla.
3. Restricciones e índices clave: ux_productos_nombre (por sección), productos_umbrales_coherentes, ux_turnos_un_abierto, ux_turnos_fecha_nombre, registros_unico_por_turno, registros_vendida_excede, las columnas generadas final_calculado y total_venta.
4. Si RLS está activo en las cuatro tablas.
5. Pruebas de integridad en UNA transacción que SIEMPRE termina en ROLLBACK, con SAVEPOINT antes de cada caso que debe fallar:
   a) Insertar producto bar "Verif Gaseosa" (valor 3500, umbral_alerta 6, umbral_critico NULL): funciona; "verif gaseosa" otra vez en bar: 23505 (ux_productos_nombre); "Verif Gaseosa" en helados: funciona (otra sección).
   b) Insertar producto helados con umbral_critico NULL: 23514 (umbrales coherentes); con umbral_critico 5 y umbral_alerta 5 (crítico no menor): 23514.
   c) Insertar producto con valor_unitario 0: 23514.
   d) Insertar turno abierto; insertar otro turno abierto: 23505 (ux_turnos_un_abierto).
   e) Insertar dos turnos con la misma fecha y nombre: el segundo 23505 (ux_turnos_fecha_nombre).
   f) Insertar un registro (inicial 24, entrada 12, vendida 18, valor 3500) y comprobar final_calculado = 18 y total_venta = 63000 (columnas generadas).
   g) Insertar un registro con vendida 40 (inicial 24 + entrada 12 = 36): 23514 (registros_vendida_excede).
   h) Insertar un registro con inicial −1: 23514.
   Imprime OK o FALLA por caso.
6. Total de fallas; código 1 si hubo alguna.

Ejecuta npm run db:verificar y copia la salida en la bitácora.

RESTRICCIONES: no toques el login, app/ ni el código de otro módulo. No crees tablas distintas a las del plan.

AL TERMINAR:
- npm run build sin errores.
- Crea doc/checkpoints/FASE_1_COMPLETADA.md con la salida de db:verificar.
- Marca P01 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** en Supabase aparecen `acceso`, `productos`, `turnos`, `registros_turno`. La salida de `npm run db:verificar` no tiene FALLA; el caso f confirma las columnas calculadas y el d, que solo hay un turno abierto.

**Commit sugerido:** `feat(bd): tablas, vistas y restricciones del inventario`

---

## P02 · Reglas de negocio y pruebas unitarias

**Fase:** 2 · **Crea:** `src/lib/config/inventario.ts`, `src/lib/reglas/*`, pruebas

````text
Antes de escribir código lee completos: doc/DICTAMEN.md, doc/PLAN_INVENTARIO.md (secciones 5, 6, 8, 10, 11.2 y 16.1), doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md.

OBJETIVO: implementar las reglas puras del plan y probarlas con Vitest. Son el corazón del sistema: cálculo de inventario y venta, faltante, alertas por sección y resumen financiero del turno.

TAREA 1. Si Vitest ya está (de otro módulo), respétalo y no rompas sus pruebas. Asegura que las pruebas de reglas (environment node) conviven con las existentes.

TAREA 2. Crea src/lib/config/inventario.ts con los umbrales por defecto (bar: alerta 6, sin crítico; helados: alerta 5, crítico 3) y topes, según la sección 10 del plan (lib/config/inventario.ts).

TAREA 3. Crea src/lib/reglas/ con las firmas exactas de la sección 10.5 y los cálculos de la sección 8:
- errores.ts: CodigoError; MENSAJES y ESTADO_HTTP (tabla 11.2); clase ErrorDeNegocio.
- fechas.ts: hoyBogota; esFechaValida.
- producto.ts: validarProducto (nombre no vacío; sección bar/helados; valor entero > 0; umbrales coherentes por sección según RN-02); esSeccionValida.
- registro.ts: inventarioFinalCalculado(inicial, entrada, vendida); totalVenta(vendida, valorUnitario); faltante(calculado, contado); sobrante(calculado, contado); valorACancelar(unidades, valorUnitario); estadoConteo(calculado, contado) (sin_conteo/cuadra/faltante/sobrante); validarMovimiento (inicial, entrada, vendida enteros ≥ 0, ≤ 9999; vendida ≤ inicial + entrada, si no VENDIDO_EXCEDE_EXISTENCIA); validarConteo (entero ≥ 0).
- alertas.ts: nivelAlerta(inventario, umbralAlerta, umbralCritico) EXACTO como la sección 8 (crítico no nulo e inventario < crítico → 'roja'; inventario < alerta → 'reponer' si crítico nulo, si no 'amarilla'; si no → 'ninguna').
- turno.ts: valorVentaTotal(totales); resultadoNeto(ventaTotal, facturasEfectivo, pagoEncargado); puedeEntregar(estado, filasSinConteo); puedeCerrar(estado, facturas, pago); puedeDevolver(estado, hayTurnoPosterior); inicialSugerido se calcula en datos, no aquí.

Ninguna regla importa pg, red, next ni process.env, ni llama new Date() (excepto el parámetro por defecto de hoyBogota).

TAREA 4. Crea tests/reglas/ayudas.ts con esperarCodigo(fn, codigo). Crea las pruebas (registro, alertas, turno, producto) cubriendo T-01 a T-61 de la sección 16.1 (las T-62 a T-68 son de los opcionales, van en P09). Cada caso con su ID. Presta especial atención a: los bordes de nivelAlerta (bar 6 sin alerta, 5 reponer; helados 5 sin alerta, 3 amarilla, 2 roja); faltante vs sobrante; vendida que excede; resultado neto negativo.

TAREA 5. Ejecuta npm test hasta que pasen las 61 (más las existentes). Si una falla, corrige la regla, no la prueba, salvo que contradiga el plan; explícalo.

RESTRICCIONES: no toques app/, el login ni el código de otro módulo.

AL TERMINAR:
- npm run build y npm test sin errores.
- Crea doc/checkpoints/FASE_2_COMPLETADA.md con la salida de npm test.
- Marca P02 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** `npm test` (61 pruebas nuevas + las existentes). Abrir `src/lib/reglas/alertas.ts` y comprobar los bordes: helado con 3 da amarilla, con 2 da roja; bar con 6 no alerta.

**Commit sugerido:** `feat(reglas): cálculos, faltante, alertas y resumen con 61 pruebas`

---

## P03 · Servidor, sesión y roles

**Fase:** 3 · **Crea:** conexión, sesión con roles, respuestas, esquemas, formato · **Modifica:** protección de rutas

````text
Antes de escribir código lee completos: doc/DICTAMEN.md, doc/PLAN_INVENTARIO.md (secciones 4, 9.4, 10, 11.1, 11.2, 14 y 15), doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md.

OBJETIVO: la infraestructura del servidor y el control de acceso por rol. Reutiliza lo que el dictamen marque como REUTILIZABLE (conexión o sesión de otro módulo), sin modificar ese otro módulo.

TAREA 1. src/lib/db/conexion.ts como la sección 10.7. Si ya hay un pool reutilizable (otro módulo), reúsalo; si no, créalo. Usa el nombre real de la variable de conexión.

TAREA 2. src/lib/auth/sesion.ts:
- obtenerSesion(): el correo del usuario desde el login existente (o el que se agregue). Si el dictamen dice que hay login, envuélvelo sin reescribirlo; si no, agrega uno mínimo como puerta.
- Consulta la tabla acceso por el correo para obtener el rol. obtenerUsuario() devuelve { email, rol } o null si el correo no está en acceso.
- exigirSesion() lanza NO_AUTORIZADO si no hay sesión o el correo no tiene rol.
- exigirRol('administrador') lanza SIN_PERMISO (403) si el rol no alcanza.

TAREA 3. Protección de rutas (proxy.ts en Next 16, o el archivo del dictamen): protege /inventario/:path* y /api/inventario/:path*, SIN tocar las rutas de otro módulo. Sin sesión: páginas al login; API 401. Correo sin rol: fuera.

TAREA 4. src/lib/http/respuestas.ts: responderOk; responderError (ErrorDeNegocio → ESTADO_HTTP; ZodError → 400 DATOS_INVALIDOS con flatten; pg 23505/23503/23514 → la tabla de la sección 9.4 por error.constraint; otro → console.error y 500 ERROR_INTERNO); conManejoDeErrores; leerCuerpo. Todas con Cache-Control: no-store. Si otro módulo ya tiene utilidades equivalentes y el dictamen lo permite, puedes reutilizarlas sin modificarlas.

TAREA 5. src/lib/validacion/esquemas.ts con los esquemas de la sección 11.4, con tipos z.infer.

TAREA 6. src/lib/formato.ts: formatearPesos (Intl es-CO, COP, sin decimales); formatearFecha.

TAREA 7. src/app/api/inventario/sesion/route.ts: GET con conManejoDeErrores; primera instrucción await exigirSesion(); responde { email, rol }. export const dynamic = 'force-dynamic'.

VERIFICACIÓN: npm run build y npm test. Inicia npm run dev; sin sesión, la ruta de sesión da 401; con un correo sin rol en acceso, también fuera; con sesión y rol, 200 con el rol. Las pruebas de otro módulo siguen pasando.

AL TERMINAR:
- Crea doc/checkpoints/FASE_3_COMPLETADA.md con los resultados y qué reutilizaste.
- Marca P03 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** la ruta de sesión da 401 sin sesión y 200 con el rol cuando el correo está en `acceso`; un correo sin rol no entra. Lo de otro módulo sigue intacto.

**Commit sugerido:** `feat(servidor): conexión, sesión con roles y utilidades`

---

## P04 · Datos: productos y turnos

**Fase:** 4 (primera parte) · **Crea:** `src/lib/datos/*`, `src/lib/dataService.ts`, scripts de prueba y demo

````text
Antes de escribir código lee completos: doc/DICTAMEN.md, doc/PLAN_INVENTARIO.md (secciones 5, 6, 7, 7.1, 7.2, 7.3, 8, 9, 10.5, 10.6 y 16.2), doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md. Revisa lib/reglas/, lib/db/conexion.ts y lib/validacion/esquemas.ts.

OBJETIVO: la capa de datos y los casos de uso contra Postgres, con transacciones, y comprobar el flujo. Lo crítico: abrir el turno (copia de valor, inicial sugerido), registrar movimientos y conteo, entregar/cerrar/devolver, y el resumen.

TAREA 1. src/lib/datos/tipos.ts con los tipos de la sección 10.6.

TAREA 2. src/lib/datos/productos.ts (las de escritura exigen rol administrador en la ruta, no aquí):
- listarProductos({ seccion, incluirInactivos }); crearProducto(d) (validarProducto; umbrales por defecto de su sección si no se dan; PRODUCTO_DUPLICADO por sección); actualizarProducto(id, cambios); desactivarProducto(id); listarProductosActivos(tx) (interna); inicialSugerido(tx, productoId) (último inventario de referencia del producto: contado si existe, si no calculado; 0 si no hay historial, RN-09).

TAREA 3. src/lib/datos/turnos.ts:
- abrirTurno(d): secuencia EXACTA de la sección 7.1 dentro de conTransaccion (validarTurno; si hayTurnoAbierto → TURNO_YA_ABIERTO; insertar turno abierto, TURNO_DUPLICADO si fecha+nombre existe; por cada producto activo insertar su registro con valor copiado e inicial sugerido). Devuelve el turno con sus filas.
- registrarMovimiento(turnoId, registroId, { entrada, vendida }): turno abierto (TURNO_NO_EDITABLE si no); validarMovimiento; actualiza (los calculados se derivan solos). VENDIDO_EXCEDE_EXISTENCIA si aplica.
- registrarConteo(turnoId, registroId, contado): turno abierto; validarConteo; guarda el contado.
- ajustarInicial(turnoId, registroId, inicial): turno abierto; solo lo llama una ruta con rol administrador; valida vendida ≤ inicial + entrada.
- entregarTurno(turnoId): secuencia de la sección 7.2 (bloquear; puedeEntregar; si faltan conteos TURNO_INCOMPLETO con el número en detalles; a en_revision con entregado_at).
- registrarCierreFinanciero(turnoId, { facturasEfectivo, pagoEncargado }): turno no cerrado; guarda los montos.
- cerrarTurno(turnoId): secuencia de la sección 7.3 (en_revision; facturas y pago registrados o TURNO_INCOMPLETO; calcular venta total y resultado neto; a cerrado con los valores de cierre).
- devolverTurno(turnoId): en_revision y sin turno posterior (puedeDevolver); vuelve a abierto.
- Lecturas: inventarioActual({ seccion, soloPorReponer }) desde v_inventario_actual con nivelAlerta; obtenerTurno(id) desde v_turnos con sus registros (v_registros_turno); listarTurnos(rango); resumenTurno(id).

TAREA 4. src/lib/datos/cocina.ts y precios.ts: créalos preparados para los opcionales (F5, F6); en el mínimo no se usan.

TAREA 5. src/lib/dataService.ts como fachada: reexporta las funciones públicas y los tipos. Verifica que ningún archivo fuera de lib/datos importe lib/db/conexion.ts.

TAREA 6. scripts/limpiar-prueba.mjs ("db:limpiar") y scripts/cargar-demo.ts ("db:demo"): demo con productos de bar y de helados (algunos bajo umbral para ver alertas), un turno de ejemplo con movimientos y conteo, y correos de prueba en acceso (un administrador, un encargado). Limpia los demo antes. Ejecútalo.

TAREA 7. Instala tsx si falta. scripts/probar-flujo.ts ("probar:flujo") con los pasos de la sección 16.2 usando solo dataService. Imprime OK/FALLA por paso; los que esperan error verifican el código; limpia antes y en finally; cierra el pool; código 1 si hay fallas. CRÍTICO: comprobar abrir turno (copia de valor e inicial sugerido), un solo turno abierto, vendida que excede, faltante con valor a cancelar, alerta de helados roja/amarilla, entregar con filas sin conteo rechazado, cerrar sin facturas rechazado, resultado neto correcto (y negativo), y devolver solo sin turno posterior. Ejecuta y corrige hasta 0 fallas.

RESTRICCIONES: no romper el login, las pruebas ni el código de otro módulo. No dupliques lógica (vive en lib/reglas/).

AL TERMINAR:
- npm run build y npm test sin errores.
- Marca P04 en ESTADO_EJECUCION.md y agrega la salida de probar:flujo y db:demo en la bitácora. La fase 4 sigue abierta hasta P05.
- Muéstrame un resumen.
````

**Verificación del estudiante:** `npm run probar:flujo` (todos OK). Confirma el inicial sugerido al abrir turno, el faltante con su valor a cancelar y el resultado neto del turno.

**Commit sugerido:** `feat(datos): productos y turnos con cálculos y flujo completo`

---

## P05 · API

**Fase:** 4 (cierre) · **Crea:** rutas de `src/app/api/inventario/`

````text
Antes de escribir código lee completos: doc/DICTAMEN.md, doc/PLAN_INVENTARIO.md (secciones 4, 11.1 a 11.4), doc/ESTADO_EJECUCION.md, lib/dataService.ts, lib/http/respuestas.ts, lib/validacion/esquemas.ts y lib/auth/sesion.ts.

OBJETIVO: exponer las operaciones del módulo mínimo con rutas protegidas por sesión y, donde aplique, por rol.

TAREA 1. Crea las rutas del módulo mínimo de la tabla 11.3 (deja cocina y facturas para P09). Reglas de cada handler:
- Primera instrucción: await exigirSesion(). En las acciones de administrador (crear/editar producto, ajustar inicial, registrar cierre financiero, cerrar/devolver turno, ver resumen e historial), además await exigirRol('administrador').
- conManejoDeErrores; cuerpos con leerCuerpo y los esquemas de 11.4; [id] con await params; export const dynamic = 'force-dynamic'.
- POST de crear responden 201; las transiciones de turno responden 200.
- Todas las rutas bajo /api/inventario; no tocar las de otro módulo.

TAREA 2. Verificación sin sesión: las rutas de /api/inventario dan 401.

TAREA 3. Verificación con sesión y rol: pídeme que inicie sesión. Como administrador: crear productos de bar y de helados; abrir un turno. Como encargado (o simulando el rol): registrar entrada, vendida y conteo; entregar. Como administrador: registrar facturas y pago, cerrar. Comprueba que un encargado NO puede crear un producto ni cerrar el turno (403 SIN_PERMISO), y que vendida que excede da 409/422. Documenta.

AL TERMINAR:
- npm run build y npm test sin errores.
- Crea doc/checkpoints/FASE_4_COMPLETADA.md con probar:flujo (P04) y las verificaciones.
- Marca P05 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** las rutas piden sesión; un administrador abre y cierra el turno; un encargado registra pero no puede cambiar valores ni cerrar (403).

**Commit sugerido:** `feat(api): rutas del inventario protegidas por sesión y rol`

---

## P06 · Interfaz base, productos e inventario con alertas

**Fase:** 5 · **Crea:** `src/components/ui/*` (si faltan), layout de `/inventario`, productos e inventario · **Modifica:** `globals.css`

````text
Antes de escribir código lee completos: doc/DICTAMEN.md, doc/PLAN_INVENTARIO.md (secciones 4, 6, 8, 11, 12, 13), doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md.

OBJETIVO: la estructura del inventario, la gestión de productos (administrador) y la vista de inventario actual con alertas. Reutiliza componentes base de otro módulo si el dictamen lo permite, sin modificarlos.

TAREA 1. Agrega los tokens de color de la sección 13 sin borrar nada existente (Tailwind 4: @theme). Respeta la paleta existente. Nota D-3: el aviso del bar ("Por reponer") usa un color propio (azul); el semáforo amarillo/rojo queda solo para helados.

TAREA 2. src/components/ui/: si ya existen (otro módulo) y el dictamen lo permite, reutilízalos SIN modificarlos; si faltan, crea Boton, Campo, Selector, Tarjeta, Insignia, Aviso, Modal, EstadoVacio con foco visible y contraste.

TAREA 3. src/components/inventario/NavegacionInventario.tsx y src/app/inventario/layout.tsx (servidor): obtenerUsuario(); sin sesión o sin rol, redirige al login. Navegación según rol: Inventario y Turno para ambos; Productos, Historial y Resumen solo para administrador. Muestra el rol y cerrar sesión. Mobile-First.

TAREA 4. src/components/inventario/InsigniaAlerta.tsx (Por reponer en azul para bar; Amarilla y Roja para helados; con texto además de color) e InsigniaEstadoTurno.tsx.

TAREA 5. Productos (solo administrador): src/components/inventario/FormularioProducto.tsx y TablaProductos.tsx, y src/app/inventario/productos/page.tsx + productos/nuevo/page.tsx: nombre, sección (bar/helados; no se cambia luego), categoría, valor unitario, umbrales (precargados por sección). Lista con filtro por sección; alternar activo; PRODUCTO_DUPLICADO muestra el mensaje. Si un encargado abre esta ruta, redirige o muestra "sin permiso".

TAREA 6. Inventario actual: src/components/inventario/TablaInventario.tsx y src/app/inventario/page.tsx (servidor): inventarioActual con filtro por sección y "solo por reponer"; muestra producto, sección, inventario de referencia y nivel de alerta (InsigniaAlerta). Para ambos roles.

VERIFICACIÓN: pídeme que inicie sesión si lo necesitas. Con los datos demo: ver el inventario actual con las alertas (azul para bar bajo 6; amarilla/roja para helados); como administrador crear un producto; comprobar que un encargado no accede a productos. Revisa en móvil.

AL TERMINAR:
- npm run build y npm test sin errores.
- Marca P06 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** ver el inventario con las alertas bien diferenciadas (bar azul, helados amarilla/roja); crear un producto como administrador; el encargado no puede.

**Commit sugerido:** `feat(interfaz): productos e inventario con alertas`

---

## P07 · El turno: planilla de bar y de helados

**Fase:** 5 · **Crea:** apertura del turno y la planilla de registro

````text
Antes de escribir código lee completos: doc/DICTAMEN.md, doc/PLAN_INVENTARIO.md (secciones 4, 5, 6, 7, 8, 11, 12), doc/ESTADO_EJECUCION.md y los componentes existentes.

OBJETIVO: abrir un turno y registrar la planilla (entrada, vendida, conteo) por producto, separando bar y helados, con los cálculos en vivo.

TAREA 1. src/app/inventario/turno/page.tsx (servidor): si hay un turno abierto, lo muestra; si no, ofrece abrir uno (FormularioTurno: fecha, nombre del turno, encargado). Abrir turno llama abrirTurno; TURNO_YA_ABIERTO y TURNO_DUPLICADO muestran su mensaje.

TAREA 2. src/components/inventario/PlanillaTurno.tsx (cliente): la planilla del turno abierto, con dos secciones (Bar y Helados). Por fila: producto, inicial (editable solo por administrador; para el encargado es de solo lectura, RN-09), entrada, cantidad vendida, inventario final calculado (en vivo con inventarioFinalCalculado), total de venta (en vivo), conteo físico, y el resultado del conteo (cuadra/faltante/sobrante) con el valor a cancelar si hay faltante. Guardar entrada/vendida llama registrarMovimiento; guardar conteo llama registrarConteo; ajustar inicial (administrador) llama la ruta correspondiente. VENDIDO_EXCEDE_EXISTENCIA se muestra junto a la fila.

TAREA 3. Botón "Entregar turno" (encargado o administrador): llama entregarTurno; si faltan conteos, muestra TURNO_INCOMPLETO con cuántas filas faltan. Tras entregar, el turno pasa a en revisión y la planilla queda de solo lectura para el encargado.

TAREA 4. Usa Framer Motion (si está disponible) para una transición suave al marcar una fila con faltante o al cambiar el estado del turno. El inventario final y el total se actualizan al instante al escribir.

VERIFICACIÓN: pídeme que inicie sesión si lo necesitas. Abrir un turno (ver que cada producto trae su inicial sugerido y su valor); registrar entrada y vendida (ver el cálculo en vivo); intentar vender más que inicial + entrada (rechazo); registrar conteo con un faltante (ver el valor a cancelar); intentar entregar con una fila sin conteo (rechazo); completar y entregar. Documenta.

AL TERMINAR:
- npm run build y npm test sin errores.
- Marca P07 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** abrir un turno, llenar la planilla con los cálculos en vivo, ver un faltante con su valor a cancelar y entregar el turno (que exige conteo en todas las filas).

**Commit sugerido:** `feat(interfaz): apertura de turno y planilla de bar y helados`

---

## P08 · Revisión, cierre, resumen financiero y aceptación del MVP

**Fase:** 5 y 6 · **Crea:** revisión del turno con resumen, historial, `doc/ACEPTACION.md` · **Modifica:** `README.md`

````text
Antes de escribir código lee completos: doc/DICTAMEN.md, doc/PLAN_INVENTARIO.md (secciones 4, 5, 7.3, 8, 11, 12, 14, 15, 16 y 17), doc/ESTADO_EJECUCION.md y los componentes existentes.

OBJETIVO: la revisión del turno por el administrador (facturas, pago, resultado neto, cierre o devolución), el historial, y el cierre del MVP con la aceptación.

TAREA 1. src/components/inventario/RevisionTurno.tsx y la vista del turno en revisión (en /inventario/turno o /inventario/turnos/[id]), solo administrador: muestra la planilla de solo lectura con los faltantes y el total a cancelar; campos para facturas en efectivo y pago al encargado (registrarCierreFinanciero); el resumen financiero en vivo (valor de venta total, facturas, pago, resultado neto con resultadoNeto, que puede ser negativo). Botón "Cerrar turno" (cerrarTurno; TURNO_INCOMPLETO si faltan facturas o pago) y "Devolver al encargado" (devolverTurno; solo si no hay turno posterior). Confirmación antes de cerrar.

TAREA 2. src/app/inventario/historial/page.tsx y resumen/page.tsx (solo administrador): listarTurnos por rango con venta total, total a cancelar, resultado neto y estado; al abrir un turno cerrado, su detalle de solo lectura.

TAREA 3. Revisa el código contra las secciones 4, 8 y 15. Reporta y corrige en la bitácora: cálculos fuera de lib/reglas/ o que no usen las columnas generadas; valor no copiado al abrir el turno; alerta que no use el inventario de referencia correcto; más de un turno abierto; acciones de administrador accesibles al encargado; turno cerrado editable; "hoy" con new Date() fuera de fechas.ts; SQL concatenado; montos con decimales; alerta comunicada solo con color; y que NO se haya tocado el código de otro módulo.

TAREA 4. Ejecuta npm test y npm run probar:flujo; corrige fallas en el código. Prepara la aceptación: db:limpiar; deja los demo.

TAREA 5. Crea doc/ACEPTACION.md con la tabla A-01 a A-21 de la sección 16.3 (columnas: ID, acción, resultado esperado, resultado obtenido, evidencia, observación; las tres últimas vacías) y una nota de que A-22 y A-23 son de los opcionales (P09).

TAREA 6. Actualiza o crea el README (sin pisar el de otro módulo si comparten raíz; si hay uno, añade una sección "Módulo de inventario"): descripción; funcionalidades; los dos roles; requisitos (conexión a Postgres, correos en acceso); cómo correr en local (npm install, .env.local, db:migrar, db:demo, dev); scripts; una nota sobre los cálculos del turno (inventario final, faltante, resumen con resultado neto) y los umbrales (6; 5 y 3); enlace a doc/PLAN_INVENTARIO.md.

TAREA 7. Verifica que .env.local esté en .gitignore (ya lo está) y que ningún archivo versionado tenga credenciales.

AL TERMINAR:
- npm run build y npm test sin errores.
- Crea doc/checkpoints/FASE_5_COMPLETADA.md (interfaz) y doc/checkpoints/FASE_6_COMPLETADA.md (revisión y pruebas).
- Marca P08 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen y recuérdame que A-01 a A-21 se ejecutan en el despliegue de Vercel.
````

**Verificación del estudiante:** como administrador, revisar un turno entregado, registrar facturas y pago, ver el resultado neto (incluido uno negativo) y cerrar; comprobar que un turno cerrado no se edita. Hacer push y ejecutar A-01 a A-21 en Vercel.

**Commit sugerido:** `feat(interfaz): revisión, cierre, resumen financiero y aceptación del MVP`

---

## P09 · Opcionales: cocina y facturas con aviso de aumento de precio

**Fase:** 7 · **Requisito:** `doc/checkpoints/FASE_6_COMPLETADA.md` existe y `doc/ACEPTACION.md` está diligenciado

````text
Antes de escribir código lee completos: doc/DICTAMEN.md, doc/PLAN_INVENTARIO.md (secciones 3.2, 6 (RN-16, RN-17), 7 (CU-13, CU-14), 9 (M3), 16.1 (T-62 a T-68), 16.3 (A-22, A-23) y 18), doc/ESTADO_EJECUCION.md y doc/checkpoints/FASE_6_COMPLETADA.md. Si FASE_6_COMPLETADA.md no existe, detente y avísame.

OBJETIVO: F5 (turno de cocina) y F6 (facturas de compra con aviso de aumento de precio).

TAREA 1. Base de datos: crea la migración M3 con las tablas de los opcionales (registros_cocina y facturas) con el SQL de la sección 9 del plan. Aplícala con db:migrar y verifícala.

TAREA 2. F5 · Cocina:
- src/lib/reglas/cocina.ts: inventarioFinalCocina(existenciaInicial, salida) y validarCocina (salida ≤ existencia inicial, enteros ≥ 0), con las pruebas T-62 a T-64.
- src/lib/datos/cocina.ts: registrarTurnoCocina y listar; reexporta en dataService.
- Ruta y pantalla /inventario/cocina: registrar existencia inicial y salida; muestra el inventario final esperado.

TAREA 3. F6 · Facturas:
- src/lib/reglas/precios.ts: hayAumento(valorNuevo, ultimoValor) con las pruebas T-65 a T-68.
- src/lib/datos/precios.ts: registrarFactura (compara con el último valor del producto; si sube, lo marca) y listar historial; reexporta en dataService.
- Ruta y pantalla /inventario/facturas (solo administrador): registrar número, proveedor, producto, valor, fecha; notifica si el valor subió respecto a la factura anterior del mismo producto. (Nota del plan: estas facturas de compra son distintas de las "facturas en efectivo" del turno.)

VERIFICACIÓN: pídeme que inicie sesión si lo necesitas. Registrar un turno de cocina (ver el inventario final esperado); registrar dos facturas del mismo producto con el segundo valor mayor (ver el aviso de aumento). Documenta.

AL TERMINAR:
- npm run build y npm test sin errores (ahora 68 pruebas).
- Agrega a doc/ACEPTACION.md los resultados de A-22 y A-23.
- Crea doc/checkpoints/FASE_7_COMPLETADA.md.
- Marca P09 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** registrar un turno de cocina con su inventario final esperado; registrar una factura con valor mayor al anterior y ver el aviso de aumento de precio.

**Commit sugerido:** `feat(opcional): turno de cocina y facturas con aviso de aumento`

---

## Prompts auxiliares

### Corrección de un error

Reemplazar `[NN]` por el número del prompt y pegar el error completo donde se indica.

````text
Durante la ejecución del prompt P[NN] apareció este error:

[PEGAR AQUÍ EL ERROR COMPLETO]

Lee doc/DICTAMEN.md, doc/PLAN_INVENTARIO.md, doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md. Encuentra la causa y corrígela sin salir del alcance de P[NN] y sin tocar el código de otro módulo. No modifiques pruebas ni scripts de prueba para que pasen; corrige el código que prueban. Ejecuta npm run build y npm test. Registra en la bitácora la causa, la corrección y los archivos modificados. Muéstrame un resumen.
````

### Reanudación de un prompt interrumpido

````text
La ejecución anterior del prompt P[NN] se interrumpió. Lee doc/ESTADO_EJECUCION.md, doc/DICTAMEN.md, doc/PLAN_INVENTARIO.md y doc/PROMPTS_INVENTARIO.md (sección P[NN]). Revisa qué archivos de P[NN] ya existen y cuáles faltan, y continúa desde la primera tarea incompleta sin rehacer lo terminado ni tocar el código de otro módulo. Al final ejecuta npm run build y npm test, y actualiza la bitácora.
````

### Despliegue fallido en Vercel

````text
El despliegue en Vercel falló con este registro:

[PEGAR AQUÍ EL REGISTRO DEL BUILD DE VERCEL]

Lee doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md. Identifica la causa (error de compilación, variable de entorno faltante en Vercel —incluida la conexión a Postgres—, o diferencia entre local y producción). Si es de código, corrígelo y verifica con npm run build. Si es una variable de entorno, dime exactamente qué NOMBRE de variable falta y en qué entornos de Vercel agregarla, sin pedir ni mostrar valores. Registra la causa y la solución en la bitácora.
````
