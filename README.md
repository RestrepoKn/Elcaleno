This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Módulo de inventario

Control de inventario por turnos para el bar y los helados de un restaurante. Reemplaza la planilla de papel: registro de entrada, venta y conteo físico; faltantes con su valor a cancelar; alertas de reposición y resumen financiero del turno. Vive en `/inventario` y `/api/inventario`, sin cambiar el resto de la aplicación.

### Funcionalidades

- **Productos** (administrador): nombre, sección (bar o helados), categoría, valor unitario y umbrales. Se desactivan, no se eliminan.
- **Turno**: se abre con una fila por producto activo. El inicial se toma del conteo del turno anterior y el valor unitario se copia del producto.
- **Planilla**: entrada, cantidad vendida y conteo físico, con el inventario final, el total de venta y el resultado del conteo calculados en vivo.
- **Flujo del turno**: abierto → en revisión → cerrado. El administrador puede devolver un turno en revisión si no hay uno posterior.
- **Resumen financiero** (administrador): venta total, facturas en efectivo, pago al encargado y resultado neto.
- **Historial** (administrador) e **inventario actual con alertas** (ambos roles).

### Roles

Los roles se asignan por correo en la tabla `acceso`. Un correo sin rol no entra.

| Rol | Puede |
|---|---|
| `administrador` | Todo: productos, valores y umbrales; ajustar el inicial; facturas y pago; cerrar y devolver turnos; historial |
| `encargado` | Abrir el turno, registrar entrada, vendida y conteo, y entregar el turno. No cambia valores, el inicial ni su pago, y no ve el resultado neto |

La separación es de integridad: el encargado responde por los faltantes.

### Cálculos

| Concepto | Fórmula |
|---|---|
| Inventario final calculado | inicial + entrada − vendida |
| Total de venta | vendida × valor unitario |
| Faltante | calculado − contado, si el conteo es menor |
| Valor a cancelar | faltante × valor unitario, a cargo del encargado |
| Resultado neto | venta total − facturas en efectivo − pago al encargado |

- Un conteo mayor que el calculado es sobrante y no genera cobro.
- El resultado neto puede ser negativo y es informativo.
- Las alertas usan el conteo si existe; si no, el calculado:
  - **Bar:** menos de 6 → "Por reponer".
  - **Helados:** menos de 5 → amarilla; menos de 3 → roja.
- Todos los montos son pesos enteros.

### Requisitos

- Node.js 20 o superior.
- Base Postgres de Supabase conectada al proyecto en Vercel. Variables `POSTGRES_URL` y `POSTGRES_URL_NON_POOLING`; también se aceptan los prefijos `ELCALENO_` y `ELCALENOSM_`.
- Correos con rol en la tabla `acceso` (`npm run db:usuario`).

### Correr en local

```bash
npm install
# .env.local con las variables de Postgres (nunca se versiona)
npm run db:migrate     # crea o actualiza las tablas (se puede repetir)
npm run db:usuario     # crea un usuario y su rol (administrador o encargado)
npm run db:demo        # opcional: productos y un turno de demostración
npm run dev            # http://localhost:3000 → /login → /inventario
```

### Scripts del inventario

| Script | Uso |
|---|---|
| `npm run db:migrate` | Aplica `supabase/migrations/` |
| `npm run db:verificar` | Verifica tablas, vistas, restricciones y RLS (transacción con ROLLBACK) |
| `npm run db:usuario` | Crea o actualiza un usuario del login con su rol del inventario |
| `npm run db:demo` | Carga datos "Demo …" |
| `npm run db:limpiar` | Borra datos "Prueba …" y "Demo …" (`-- --solo-prueba` conserva la demostración) |
| `npm run probar:flujo` | Prueba el flujo completo contra la base (necesita una base sin catálogo real) |
| `npm test` | Pruebas unitarias (reglas y servidor) |

Plan técnico completo: [Doc/PLAN_INVENTARIO.md](Doc/PLAN_INVENTARIO.md). Avance: [Doc/ESTADO_EJECUCION.md](Doc/ESTADO_EJECUCION.md).
