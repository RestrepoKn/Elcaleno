# Estado de ejecución

| Prompt | Fase | Estado |
|---|---|---|
| P00 | 0 · Verificación | Completado, con un pendiente: tablas reales sin verificar |
| P01 | 1 · Base de datos | Completado (base nueva) |
| P02 | 2 · Reglas | Completado (adelantado; no depende de la base) |
| P03 | 3 · Servidor | Completado |
| P04 | 4 · Datos | Completado (la fase 4 sigue abierta hasta P05) |
| P05 | 4 · API | Completado (fase 4 cerrada) |
| P06 | 5 · Interfaz base | Completado |
| P07 | 5 · Turno | Completado |
| P08 | 5 y 6 · Cierre y aceptación | Completado (aceptación A-01 a A-21 pendiente en Vercel) |
| P09 | 7 · Opcionales | Completado |

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

### P04 · 2026-11-07

- Capa de datos en `src/lib/datos/`:
  - `comun.ts`: `filas`, `conErrores`, validación de ids.
  - `lecturas.ts`: lecturas de `v_registros_turno` y `v_turnos`; oculta las finanzas al encargado.
  - `productos.ts`: crear (con RN-13), actualizar, desactivar, `inicialSugerido`.
  - `turnos.ts`: abrir (7.1), entregar (7.2), finanzas, cerrar (7.3), devolver (`entregado_at = NULL`), lecturas e historial.
  - `registros.ts`: `actualizarRegistro` en una transacción, más `registrarMovimiento`, `registrarConteo` y `ajustarInicial`.
  - `inventario.ts`: `inventarioActual` con `nivelAlerta` y el filtro "por reponer".
  - `cocina.ts` y `facturas.ts`: vacíos, preparados para P09.
- `tipos.ts` completo (10.6). Se agregaron `ventaTotalCierre`, `resultadoNetoCierre`, `numRegistros`, `entregadoAt`, `cerradoAt` y `createdAt`.
- Fachada: `src/lib/inventario/dataService.ts`. No incluye la sesión, para que los scripts con `tsx` puedan usarla.
- Traducción de errores de Postgres (9.4) movida a `src/lib/reglas/errores-bd.ts`, que es pura. La usan la capa de datos y `lib/http/respuestas.ts`.
- Diferencias con el prompt:
  - `registrarFinanzas` (nombre del plan) en vez de `registrarCierreFinanciero`.
  - Las funciones que devuelven un turno reciben el `rol`, para ocultar las finanzas al encargado.
  - `obtenerTurnoAbierto(rol)`, para la pantalla de P07.
- Solo `lib/datos/` importa `lib/db/conexion.ts`, más una prueba unitaria y `cerrarConexion` en los scripts.
- Scripts:
  - `db:limpiar` (`scripts/limpiar-prueba.mjs`): borra turnos y productos "Prueba …" y "Demo …", y los usuarios `@demo.elcaleno.test`.
  - `db:demo` (`scripts/cargar-demo.ts`).
  - `probar:flujo` (`scripts/probar-flujo.ts`).
- `tsx` sigue como dependencia indirecta (viene con `vercel`). `npm install -D tsx` no pudo completarse porque el registro de npm no responde desde esta red. Pendiente agregarlo cuando haya red.
- Orden usado: `db:limpiar`, `probar:flujo`, `db:demo`.

`npm run probar:flujo`: 33 de 33 pasos OK, fallas 0. Son los pasos 1 a 21 de 16.2 más 13a, 14a, 14b, 17a, 19a y 22 a 28: devolver sin y con turno posterior, vista del encargado, resultado neto negativo (−7000), RN-08, RN-13 y `TURNO_DUPLICADO`.

`npm run db:demo`:
```text
Productos creados: 8.
Turno "Demo Mañana" del 2026-11-07: venta total $ 178.000, faltantes $ 11.500, resultado neto $ 108.000.
  bar      Demo Agua                    6  Sin alerta
  bar      Demo Cerveza                 4  Por reponer
  bar      Demo Chocolatina             4  Por reponer
  bar      Demo Gaseosa 400 ml         16  Sin alerta
  bar      Demo Papitas                 5  Por reponer
  helados  Demo Helado de chocolate     1  Alerta roja
  helados  Demo Helado de fresa         3  Alerta amarilla
  helados  Demo Helado de vainilla      5  Sin alerta
Usuarios: admin@demo.elcaleno.test (administrador) y encargado@demo.elcaleno.test (encargado).
Las contraseñas se generan en cada ejecución y no se guardan aquí.
```

`npm run type-check`, `npm test` (123 pruebas), `npm run lint` y `npm run build`: todo correcto.

### P05 · 2026-11-07

- Rutas de la tabla 11.3 (módulo mínimo) en `src/app/api/inventario/`. Detalle en `Doc/checkpoints/FASE_4_COMPLETADA.md`.
- `src/lib/http/consulta.ts`: `leerConsulta` (query string) y `ContextoRuta` (params como Promise).
- `scripts/verificar-api.ps1`: verificación en vivo con los dos roles. Dio 37 de 37 OK.
- `db:limpiar -- --solo-prueba`: limpia solo los datos "Prueba …" y conserva la demostración.
- Diagnóstico de producción: `registrarConexionElegida` (en `variables-conexion.mjs`) registra una vez por proceso la variable, el ref del proyecto y el puerto, nunca la cadena. La usan `conexion.ts` y `supabase-db.ts`.
- Pendiente: el login publicado responde 401 aunque Vercel ya solo tiene `POSTGRES_URL` y `POSTGRES_URL_NON_POOLING`. Con este registro, los logs de Vercel mostrarán qué proyecto usa producción.

### P06 · 2026-11-07

- Producción verificada antes de empezar.
  - Log de Vercel: `[db] conexión: POSTGRES_URL · proyecto lowkdcsbsnjxagfgkvvj · puerto 6543`, la misma base que en local.
  - Login con el administrador de demostración: 200. `/api/inventario/sesion`: 200 con rol administrador.
  - El 401 anterior con la cuenta del estudiante se debía a que la contraseña se cambió desde `/password`.
- Tokens de la sección 13 en un `@theme` nuevo de `globals.css`. Se agregaron variantes de texto oscuro (`-texto`) para las insignias. No se borró nada; el tema claro se aplica solo dentro de `/inventario`.
- `src/components/ui/`: `Boton`, `Campo`, `Selector`, `Tarjeta`, `Insignia`, `Aviso` y `Modal` (sobre `<dialog>`), `EstadoVacio`. Todos con foco visible. Los componentes en inglés del otro módulo no se tocaron: tienen estilos oscuros fijos.
- `src/components/inventario/`:
  - `NavegacionInventario`: enlaces según el rol, correo, rol y cerrar sesión.
  - `InsigniaAlerta` (D-3: azul "Por reponer" para el bar; amarilla y roja para helados; siempre con texto) e `InsigniaEstadoTurno`.
  - `TablaInventario`: tarjetas en móvil y tabla en escritorio.
  - `FormularioProducto`: alta y edición; umbrales precargados según la sección; la sección no se puede cambiar al editar.
  - `TablaProductos`: filtro por sección, editar en un modal, activar y desactivar.
  - `SinPermiso`.
- `src/lib/inventario/cliente.ts`: `llamarApi` y `ErrorApi` para los componentes de cliente; muestra el mensaje del servidor, por ejemplo `PRODUCTO_DUPLICADO`.
- Páginas:
  - `/inventario/layout.tsx`: sin sesión redirige a `/login`; con sesión pero sin rol muestra "Sin acceso al inventario".
  - `/inventario`: filtros por sección y "solo por reponer" en la URL.
  - `/inventario/productos` y `/inventario/productos/nuevo`: solo administrador.
  - Marcadores `/inventario/turno` (P07) e `/inventario/turnos` (P08).
- Verificación con `next dev`:
  - Sin sesión, `/inventario` da 307 al login.
  - El administrador ve el inventario con "Por reponer", "Alerta amarilla", "Alerta roja" y "Conteo físico"; el filtro de helados por reponer muestra fresa y chocolate pero no vainilla (5) ni cerveza (bar); productos y formulario cargan.
  - Un encargado temporal (creado y borrado) ve el inventario sin los enlaces Productos e Historial, y "No tiene permiso" en `/productos`, `/productos/nuevo` y `/turnos`.
- La contraseña de `encargado@demo.elcaleno.test` se cambió a las 14:42 UTC desde la cuenta del estudiante; no se modificó.
- Pendiente:
  - Revisión visual en celular y tablet. No hay navegador en esta sesión, así que se verificó el contenido HTML, no el aspecto.
  - Decisión sobre el acceso desde el login: hoy redirige a `/dashboard`.
- `npm run type-check`, `npm test` (123 pruebas), `npm run lint` y `npm run build`: todo correcto.

### Acceso al inventario desde el login · 2026-11-07

- Problema reportado: después del login se iba siempre a `/dashboard`, sin enlace al inventario.
- `destinoTrasLogin(email)` en `src/lib/auth/sesion.ts`: `/inventario` si el correo tiene rol en `acceso`; si no, `/dashboard`. Si la consulta falla, también `/dashboard`, para no bloquear el login.
- Cambios mínimos en el login (otro módulo, autorizados por el estudiante):
  - `api/auth/login/route.ts` devuelve también `destino`.
  - `LoginPage.tsx` navega a ese destino.
  - `AppShell.tsx` muestra "Inventario" en el menú del panel solo a quien tiene rol.
- La barra del inventario tiene "Panel", para volver a Usuarios y Cambiar contraseña.
- Pruebas: 2 nuevas en `sesion.test.ts` (125 en total). En vivo, el login del administrador da `destino: /inventario` y los dos enlaces aparecen.

### P07 · 2026-11-07

- `src/components/inventario/FormularioTurno.tsx`: fecha (hoy en Bogotá por defecto), nombre libre con sugerencias Mañana, Tarde y Noche (D-4), y encargado. Muestra `TURNO_YA_ABIERTO` y `TURNO_DUPLICADO` con su mensaje.
- `src/components/inventario/FilaRegistro.tsx`:
  - Inicial (solo lectura para el encargado, RN-09), entrada, vendida, inventario final y total de venta en vivo (con `inventarioFinalCalculado` y `totalVenta`), contado y resultado del conteo (cuadra, faltante o sobrante).
  - Usa los textos fijos de 12.1 para faltante y sobrante.
  - Guarda al salir de cada campo o con Enter, con una cola por fila. `VENDIDO_EXCEDE_EXISTENCIA` se muestra junto a la fila, antes de enviar y también si lo responde el servidor.
  - Muestra "Guardando…", "Guardado" o el error.
  - Framer Motion: el fondo de la fila cambia con faltante o sobrante, y el mensaje aparece con transición. `MotionConfig reducedMotion="user"` respeta la preferencia de menos movimiento.
- `src/components/inventario/PlanillaTurno.tsx`:
  - Secciones Bar y Helados.
  - Resumen fijo abajo: venta total, a cancelar por faltantes y filas sin conteo.
  - "Entregar turno" con la confirmación de 12.1, que avisa cuántas filas faltan. El servidor responde `TURNO_INCOMPLETO` con el número.
- `src/app/inventario/turno/page.tsx`: con turno abierto muestra la planilla; sin turno, avisa de los turnos en revisión y muestra el formulario.
- Corrección del lint (`react-hooks/refs`): los valores guardados de la fila se leen desde estado durante el render.
- Verificación con `next dev`, con un encargado temporal (creado y borrado):
  - Formulario sin turno.
  - El encargado abre "Prueba P07" con 8 filas; la gaseosa trae inicial 16, el conteo del turno demo.
  - Planilla completa para el encargado, con el inicial de solo lectura; el administrador ve el aviso de que puede ajustarlo.
  - 16 + 4 − 3 = 17; conteo 15 → faltante 2, valor a cancelar 7000.
  - Entregar con 7 filas sin conteo da `TURNO_INCOMPLETO`.
  - Datos de prueba borrados con `db:limpiar -- --solo-prueba`; no quedó ningún turno abierto.
- Pendiente: revisión visual en celular y tablet. Sin navegador en esta sesión, se verificó el HTML.
- `npm run type-check`, `npm test` (125 pruebas), `npm run lint` y `npm run build`: todo correcto.

### P08 · 2026-11-07

- Rutas del plan y del dictamen: `/inventario/turnos` (historial) y `/inventario/turnos/[id]` (detalle y resumen), no `historial/` ni `resumen/`.
- `src/components/inventario/RevisionTurno.tsx` (administrador):
  - Facturas en efectivo y pago al encargado (PUT `finanzas`).
  - Resumen en vivo con `resultadoNeto`, incluido el negativo.
  - "Cerrar turno" con la confirmación de 12.1, que avisa si faltan finanzas o hay cambios sin guardar.
  - "Devolver al encargado", deshabilitado si hay un turno posterior.
  - Turno cerrado: valores guardados en solo lectura.
- `src/components/inventario/PlanillaLectura.tsx`: planilla en solo lectura, con tarjetas en móvil y tabla en escritorio.
- `src/components/inventario/TablaHistorial.tsx`.
- Páginas `turnos/page.tsx`, con historial y totales de los turnos cerrados, y `turnos/[id]/page.tsx`, donde el encargado ve la planilla sin finanzas.
- `tieneTurnoPosterior(turnoId)` agregado a `lib/datos/turnos.ts` y a la fachada.
- "Turno actual" enlaza cada turno en revisión: "Revisar y cerrar" para el administrador, "Ver la planilla" para el encargado.
- Revisión de código: sin hallazgos. Detalle en `Doc/checkpoints/FASE_6_COMPLETADA.md`.
- Verificación en vivo, solo lectura, porque el estudiante tenía abierto el turno "Mañana" para su revisión y no se tocó:
  - Historial: $178.000 de venta, $11.500 de faltantes y $108.000 de neto.
  - Detalle cerrado (administrador): resumen guardado, planilla con faltante, sobrante y cuadra, sin campos ni botones.
  - Detalle cerrado (encargado temporal): sin finanzas.
  - Detalle del turno abierto (administrador): aviso "sigue abierto", sin botón de cerrar.
  - Turno inexistente: página de no encontrado.
- `probar:flujo` no se repitió (ver FASE_6).
- `Doc/ACEPTACION.md`, la sección del README, `FASE_5_COMPLETADA.md` y `FASE_6_COMPLETADA.md` creados.
- `.gitignore` y credenciales revisados.
- `npm run type-check`, `npm test` (125), `npm run lint` y `npm run build`: todo correcto.

### P09 · 2026-11-07

- Adelantado a pedido del estudiante, antes de diligenciar la aceptación.
- M3 aplicada y verificada; reglas, datos, API y pantallas de cocina (F5) y facturas de compra (F6). Detalle en `Doc/checkpoints/FASE_7_COMPLETADA.md`.
- Numeración del plan: T-62 a T-65 para `hayAumento(valorAnterior, valorNuevo)` y T-66 a T-68 para `inventarioFinalCocina`. El prompt las tenía invertidas, igual que el orden de los parámetros.
- `db:limpiar` ahora borra también las facturas y los registros de cocina de prueba.
- Verificación en vivo: 13 de 13. No se tocó el turno abierto "Mañana" del estudiante.
- `npm test` (134), `type-check`, `lint` y `build`: todo correcto.

### Extensión · Fotos de facturas del turno · 2026-11-07

- Solicitud del estudiante, fuera del plan. Los recibos pagados con la caja son las mismas facturas de compra; se pidió fotografiarlos, guardar las fotos en el turno y revisarlas después.
- Definido con el estudiante: solo se guarda la foto, sin lectura automática; suben fotos el encargado y el administrador.
- M4 `20261107120000_inventario_fotos_turno.sql`: tabla `fotos_turno` con RLS y permisos revocados, y espacio privado `facturas-turno` en Supabase Storage (4 MB; JPG, PNG o WEBP). Aplicada; el acceso público se rechaza.
- `src/lib/db/almacenamiento.mjs`: Storage por su API REST, sin dependencias nuevas. La llave de servicio solo se usa en el servidor; `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya existen en Vercel.
- Reglas en `src/lib/reglas/fotos.ts`:

| Estado del turno | Subir | Borrar | Ver |
|---|---|---|---|
| Abierto | Ambos roles | El administrador, cualquiera; el encargado, solo las suyas | Siempre, con sesión |
| En revisión | Solo el administrador | Solo el administrador | Siempre, con sesión |
| Cerrado | Nadie (RN-14) | Nadie | Siempre, con sesión |

- Datos (`src/lib/datos/fotos.ts`): si el registro falla después de subir el archivo, el archivo se borra.
- Códigos nuevos: `FOTO_INVALIDA` (400) y `FOTO_NO_ENCONTRADA` (404).
- API: `GET/POST /api/inventario/turnos/[id]/fotos` y `GET/DELETE /api/inventario/turnos/[id]/fotos/[fotoId]`. La imagen se entrega por la API con sesión y caché privada; la ruta de Storage nunca sale del servidor.
- `FotosTurno`:
  - "Tomar foto" abre la cámara trasera en el celular; también está "Elegir de la galería".
  - El navegador reduce la imagen a JPEG de 1.600 px como máximo, por el límite de 4,5 MB de Vercel.
  - Miniaturas, vista ampliada y borrado según permisos.
  - Está en "Turno actual" y en el detalle del turno.
- `db:limpiar` borra también los archivos de Storage de los turnos de prueba.
- Pruebas: 4 nuevas de reglas (`fotos.test.ts`), 138 en total.
- Verificación en vivo con `next dev`, sobre un turno temporal en revisión, sin tocar el turno "Mañana" del estudiante: 12 de 12 OK.
  - El administrador sube (201); el encargado en revisión recibe 403; un PDF da 400; un turno cerrado da 409.
  - Se lista; la imagen descargada es idéntica a la subida y tiene caché privada; sin sesión da 401.
  - El encargado la ve; el detalle muestra la miniatura.
  - El encargado no borra (403); el administrador sí (200); la foto borrada da 404.
  - Limpieza: 0 filas y 0 archivos.
- La primera versión de la prueba (PowerShell con `curl.exe`) no sirvió porque el JSON del login perdió las comillas. Se rehízo en TypeScript con `fetch`.
- Pendiente: la cámara y la reducción de la imagen en un celular real. No hay navegador en esta sesión.
- `npm run type-check`, `npm test` (138), `npm run lint` y `npm run build`: todo correcto.

### Turno de día completo · 2026-11-07

- Pedido del estudiante: el turno cubre el día completo, así que no se ofrecen "Mañana, Tarde, Noche".
- `FormularioTurno`: se quitaron las sugerencias. El nombre viene escrito como "Completo" y se puede cambiar solo si se abre otro turno en la misma fecha (fecha más nombre es único). Sigue siendo texto libre (D-4).
- Base de datos: el turno abierto "Mañana" del estudiante se renombró a "Completo", con sus 8 filas intactas; el turno de demostración "Demo Mañana" (cerrado), a "Demo Completo". Este último es una excepción a RN-14, justificada porque es un dato de demostración y solo cambió el nombre.
- `scripts/cargar-demo.ts` y A-05 de `Doc/ACEPTACION.md` usan el nombre nuevo.
