# Fase 5 · Interfaz

Fecha: 2026-11-07. Estado: completada (P06, P07 y P08).

## Pantallas

| Ruta | Rol | Contenido |
|---|---|---|
| `/inventario` | ambos | Inventario actual en bloques Bar y Helados, alertas con texto (bar "Por reponer" en azul; helados amarilla y roja) y filtros por sección y "solo por reponer" |
| `/inventario/turno` | ambos | Sin turno: avisos de turnos en revisión y formulario para abrir. Con turno: planilla en vivo, guardado por campo y "Entregar turno" con confirmación |
| `/inventario/turnos` | administrador | Historial con venta, faltantes y resultado neto por turno, y totales de los turnos cerrados |
| `/inventario/turnos/[id]` | ambos | Planilla en solo lectura. Para el administrador, además: facturas, pago, resultado neto en vivo, "Cerrar turno" y "Devolver al encargado". El encargado no ve finanzas |
| `/inventario/productos` | administrador | Lista con filtro por sección, edición en modal, activar y desactivar |
| `/inventario/productos/nuevo` | administrador | Alta con umbrales precargados según la sección |

## Acceso

- Sin sesión: redirige al login.
- Con sesión pero sin rol: aviso de "sin acceso", sin datos.
- Encargado en una sección del administrador: "No tiene permiso".
- Después del login: `/inventario` si el correo tiene rol; si no, el panel. El panel tiene el enlace "Inventario" y el inventario tiene "Panel".

## Verificación

Con `next dev` y los dos roles se revisó el contenido de cada pantalla (detalle en la bitácora de P06, P07 y P08). No había navegador en la sesión, así que el aspecto en celular y tablet lo revisa el estudiante en Vercel.

## Pruebas

`npm run type-check`, `npm test` (125 pruebas), `npm run lint` y `npm run build`: todo correcto.
