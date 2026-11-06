# Control de Inventario del Bar · Instrucciones para Copilot

## Documentos rectores
- Plan técnico: Doc/PLAN_INVENTARIO.md. Si una instrucción contradice el plan, prevalece el plan.
- Estado real del repositorio: Doc/ESTADO_ACTUAL.md.
- Dictamen: Doc/DICTAMEN.md. Antes de crear algo, revisa si dice REUTILIZAR o NO TOCAR. Su sección "Correcciones a los prompts" prevalece sobre el texto de los prompts, y sus nombres y rutas sobre los del plan.
- Avance: Doc/ESTADO_EJECUCION.md.

## Convivencia con otros módulos
- El repositorio tiene otros módulos (login, usuarios, notas, recuperación de contraseña). NO se modifica su código.
- El inventario vive bajo /inventario, /api/inventario y sus propios archivos. Si hay choque de nombres de tabla con otro módulo, avísalo antes de crear.

## Stack
- Next.js 16 App Router + React 19 + TypeScript (estricto) + Tailwind 4 + Zod 4 + Framer Motion. Despliegue en Vercel.
- Postgres de Supabase con el paquete pg y la variable ELCALENOSM_POSTGRES_URL. (pg está.)
- Pruebas con Vitest. No romper las pruebas existentes. Las pruebas van dentro de src/ (src/tests/reglas/).
- app/ está en src/app. Login: existe (/login, getCurrentUser en src/lib/auth.ts).

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
- Solo lib/datos/ importa lib/db/conexion.ts. Rutas y páginas importan datos únicamente desde src/lib/inventario/dataService.ts (src/lib/dataService.ts es de otro módulo).
- lib/db/conexion.ts usa un pool propio, sin server-only y con parsers por pool, no globales.
- Toda ruta en app/api/inventario/ llama exigirSesion() y, donde aplique, exigirRol('administrador') como primeras instrucciones.
- El turno se abre y se cierra en una transacción. Montos y cantidades en enteros.
- Fechas 'YYYY-MM-DD'. Zona horaria America/Bogota; "hoy" solo con hoyBogota().
- En rutas dinámicas params es una Promise: const { id } = await params.
- SQL siempre con parámetros. Nunca concatenar valores.
- Productos se desactivan, no se eliminan. Turnos cerrados y sus registros son inmutables.
- No instalar librerías de componentes (shadcn, MUI u otras). Usar components/ui/ con los componentes en español del inventario.
- Prefijo de imports: @/. Archivo de protección: src/proxy.ts. Ruta de login: /login. Migraciones: npm run db:migrate.

## Al terminar cada tarea
1. npm run build sin errores.
2. npm test sin fallas (incluidas las de otro módulo).
3. Actualizar Doc/ESTADO_EJECUCION.md.
4. No hacer commit: el estudiante revisa y hace el commit.
