# Aceptación del MVP · Control de Inventario del Bar

Se ejecuta en el despliegue de Vercel: https://elcalenosm.vercel.app (plan, sección 16.3).
Diligenciar las tres últimas columnas durante la prueba. Evidencia: captura de pantalla o descripción breve.

## Preparación

1. En una terminal de VS Code (Terminal → Nuevo terminal), entrar al proyecto:
   `cd "C:\Users\MARIA PAULA\Documents\El caleno"`
2. Cerrar o dejar sin turno abierto la base: A-05 abre un turno nuevo.
3. Borrar los datos de prueba y de demostración, porque A-02 crea "Gaseosa" y A-05 espera inicial 0:
   `npm run db:limpiar`
4. Tener dos cuentas: un administrador y un encargado. Para crearlas: `npm run db:usuario`, una vez por cuenta.
5. Probar en el celular o la tablet que se usará en el bar, además del computador.

## Pruebas

| ID | Acción | Resultado esperado | Resultado obtenido | Evidencia | Observación |
|---|---|---|---|---|---|
| A-01 | Abrir `/inventario` sin sesión | Redirección al login | | | |
| A-02 | Como administrador, registrar "Gaseosa" (bar, Bebida, $3.500) y "Helado de vainilla" (helados, $4.000) | Cada uno aparece en su sección; los helados con umbrales 5 y 3 | | | |
| A-03 | Registrar otra vez "Gaseosa" en el bar | Rechazo por duplicado | | | |
| A-04 | Con sesión de encargado, intentar cambiar el valor de la Gaseosa | Rechazo: sin permiso | | | |
| A-05 | Abrir el turno "Noche" con un encargado | Una fila por producto activo; inicial 0 si es el primer turno | | | |
| A-06 | Como administrador, ajustar el inicial de la Gaseosa a 24; como encargado, intentar hacerlo | El administrador lo logra; el encargado no puede editar el campo | | | |
| A-07 | Gaseosa: entrada 12, vendida 18 | Inventario final calculado 18; total de venta $63.000 | | | |
| A-08 | Intentar vendida 40 | Rechazo: supera lo disponible | | | |
| A-09 | Registrar conteo 16 | Faltante 2; valor a cancelar $7.000 asociado al encargado del turno | | | |
| A-10 | Cambiar el conteo a 20 | Sobrante 2; sin cobro | | | |
| A-11 | Bar con inventario 6 y luego 5 | Con 6 sin alerta; con 5 "Por reponer" | | | |
| A-12 | Helado con inventario 5, 4, 3 y 2 | 5 sin alerta; 4 y 3 amarilla; 2 roja | | | |
| A-13 | Intentar entregar con filas sin conteo | Rechazo, indicando cuántas faltan | | | |
| A-14 | Completar los conteos y entregar | Turno En revisión; el encargado ya no puede modificar | | | |
| A-15 | Como administrador, devolver el turno al encargado y volver a entregarlo | Vuelve a Abierto y se puede entregar de nuevo | | | |
| A-16 | Intentar cerrar sin registrar facturas ni pago | Rechazo | | | |
| A-17 | Registrar facturas en efectivo y pago al encargado | Muestra venta total (bar + helados), las restas y el resultado neto | | | |
| A-18 | Cerrar el turno | Turno Cerrado; no se puede modificar | | | |
| A-19 | Abrir el siguiente turno | El inicial de cada producto es el inventario final contado del turno anterior | | | |
| A-20 | Ver el historial de turnos (administrador) | Venta total, faltantes y resultado neto por turno | | | |
| A-21 | Cerrar el navegador y volver a entrar | Los datos persisten | | | |

## Dónde se hace cada prueba

| Pruebas | Pantalla |
|---|---|
| A-02, A-03, A-04 | Productos → Nuevo producto / Editar |
| A-05 a A-14 | Turno actual |
| A-11, A-12 | Inventario. Para los bordes se pueden ajustar el conteo o el umbral del producto |
| A-15 a A-18 | Turno actual → "Revisar y cerrar", o Historial → el turno |
| A-20 | Historial |

## Opcionales

A-22 (turno de cocina) y A-23 (factura con aumento de precio) corresponden a las funcionalidades opcionales F5 y F6. Se agregan y verifican después de P09.
