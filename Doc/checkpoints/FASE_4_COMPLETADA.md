# Fase 4 · Datos y API

Fecha: 2026-11-07. Estado: completada (P04 y P05).

## P04 · `npm run probar:flujo`

33 de 33 pasos OK, sin fallas. Son los pasos 1 a 21 de la sección 16.2 y estos extra:

| Paso | Qué comprueba |
|---|---|
| 13a | Lista "por reponer" |
| 14a, 14b | Devolver sin turno posterior y entregar de nuevo |
| 17a | El encargado no ve las finanzas |
| 19a | Finanzas en un turno cerrado |
| 22 a 25 | Resultado neto −7000; devolver con turno posterior da `TRANSICION_INVALIDA` |
| 26 | RN-13: producto nuevo entra al turno abierto con inicial 0 |
| 27 | RN-08: el turno abierto conserva el valor copiado |
| 28 | `TURNO_DUPLICADO` |

Cifras clave del flujo:
- **Gaseosa:** inicial 24 + entrada 12 − vendida 18 = 18, con total de venta 63000. Con conteo 16 queda un faltante de 2 y un valor a cancelar de 7000.
- **Helado:** inventario final 2, con alerta roja.
- **Turno:** venta total 103000, facturas 30000 y pago 40000, con resultado neto 33000 guardado al cerrar.
- **Siguiente turno:** el inicial sale del conteo anterior: 16 y 2.

## P05 · Rutas de `src/app/api/inventario/`

| Ruta | Métodos | Rol |
|---|---|---|
| `/sesion` | GET | ambos |
| `/productos` | GET (ambos), POST (administrador, 201) | |
| `/productos/[id]` | PATCH | administrador |
| `/inventario` | GET | ambos |
| `/turnos` | GET (administrador), POST (ambos, 201) | |
| `/turnos/[id]` | GET | ambos; sin finanzas para el encargado |
| `/turnos/[id]/registros/[registroId]` | PATCH | ambos; `inicial` solo administrador |
| `/turnos/[id]/entregar` | POST | ambos |
| `/turnos/[id]/devolver` | POST | administrador |
| `/turnos/[id]/finanzas` | PUT | administrador |
| `/turnos/[id]/cerrar` | POST | administrador |

Todas las rutas:
- Empiezan con `await exigirSesion()` y, en las acciones del administrador, `await exigirRol('administrador')`.
- Usan `conManejoDeErrores`, `leerCuerpo` con los esquemas de 11.4 y `export const dynamic = 'force-dynamic'`.
- Tipan los `params` como `Promise` explícita en vez de `RouteContext`, porque ese tipo solo existe después de la generación de tipos y el CI corre `type-check` antes del build.

## Verificación en vivo (`scripts/verificar-api.ps1`, con `next dev`)

37 de 37 OK, con los usuarios de demostración (un administrador y un encargado):

- **Sin sesión:** 401 `NO_AUTORIZADO`.
- **Administrador:**
  - Crea productos de bar y de helados (201). Un duplicado da 409 `PRODUCTO_DUPLICADO`.
  - Cambiar la sección o enviar JSON inválido da 400.
  - Ajusta el inicial.
  - Cerrar sin finanzas da 409 `TURNO_INCOMPLETO`. Registra facturas y pago, cierra (neto 33000) y ve el historial.
- **Encargado:**
  - Abre el turno (201). Uno segundo da 409 `TURNO_YA_ABIERTO`.
  - Registra entrada y vendida (final 18, total 63000). Vender de más da **409** `VENDIDO_EXCEDE_EXISTENCIA`.
  - Registra un conteo con faltante (2, valor a cancelar 7000).
  - Entregar con filas sin conteo da 409 `TURNO_INCOMPLETO`. Luego entrega.
  - Editar el turno entregado da 409 `TURNO_NO_EDITABLE`.
  - Ve su turno sin facturas, pago ni resultado neto.
- **El encargado no puede (403 `SIN_PERMISO`):** crear productos, cambiar valores, ajustar el inicial, registrar finanzas, cerrar, devolver ni ver el historial.
- **Otros:** turno inexistente o con id inválido da 404 `TURNO_NO_ENCONTRADO`; devolver un turno cerrado da 409 `TRANSICION_INVALIDA`.

Los datos "Prueba API …" se borraron con `npm run db:limpiar -- --solo-prueba`. La demostración quedó intacta.

## Pruebas

`npm run type-check`, `npm test` (123 pruebas), `npm run lint` y `npm run build`: todo correcto.
