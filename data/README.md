# /data — JSON Database Layer

Cada archivo JSON representa una colección con `_meta` y `records`. Los esquemas Zod viven en `_schema/` y las copias previas de escritura en `_backups/`.

El almacenamiento local es adecuado para desarrollo. Los entornos serverless deben usar un adaptador externo antes de habilitar escrituras.

La autenticación usa las tablas privadas `public.users` y `public.user_sessions` de Supabase. La migración está en `supabase/migrations/`; aplícala con `npm run db:migrate`. Las contraseñas usan scrypt y solo la clave de conexión server-side accede a las tablas. En desarrollo se siembra la cuenta `demo@elcaleno.com` / `demo1234`; cámbiala o elimínala antes de publicar.