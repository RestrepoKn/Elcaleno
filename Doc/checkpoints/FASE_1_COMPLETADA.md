# Fase 1 · Base de datos

Fecha: 2026-11-07. Estado: completada sobre la base nueva de Supabase (Postgres 17.11).

## Migraciones aplicadas (`npm run db:migrate`)

```text
Migración aplicada: 20261003170000_create_auth_tables.sql
Migración aplicada: 20261003180000_add_user_roles.sql
Migración aplicada: 20261003190000_restablecimientos_contrasena.sql
Migración aplicada: 20261106120000_inventario_tablas.sql
Migración aplicada: 20261106120100_inventario_vistas_seguridad.sql
```

## Salida de `npm run db:verificar`

```text
1. Existencia de tablas y vistas: acceso, productos, turnos, registros_turno,
   v_registros_turno, v_turnos, v_inventario_actual → OK
2. Filas por tabla: 0 en las cuatro
3. ux_productos_nombre, ux_turnos_un_abierto, ux_turnos_fecha_nombre,
   productos_umbrales_coherentes, registros_unico_por_turno, registros_vendida_excede,
   columnas generadas final_calculado y total_venta → OK
4. RLS activo en las cuatro tablas → OK
5. Pruebas de integridad (transacción con ROLLBACK)
   a) "verif gaseosa" repetido en bar → 23505 ux_productos_nombre; en helados → permitido
   b) helado sin crítico, y crítico 5 con alerta 5 → 23514 productos_umbrales_coherentes
   c) valor_unitario 0 → 23514 productos_valor_positivo
   d) segundo turno abierto → 23505 ux_turnos_un_abierto
   e) misma fecha y nombre → 23505 ux_turnos_fecha_nombre
   f) inicial 24, entrada 12, vendida 18, valor 3500 → final_calculado 18, total_venta 63000
   g) vendida 40 con 36 disponibles → 23514 registros_vendida_excede
   h) inicial −1 → 23514 registros_cantidades_validas
   ROLLBACK aplicado: no quedaron datos de prueba.
6. Total de fallas: 0
```

## Nota

La base original quedó inaccesible (`28P01` y luego `PAM authentication failed`, también desde el panel de Supabase) y se reemplazó por una conexión nueva. Los usuarios de la base anterior se perdieron. En la nueva se creó el administrador con `npm run db:usuario`.
