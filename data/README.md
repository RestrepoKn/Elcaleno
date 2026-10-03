# /data — JSON Database Layer

Cada archivo JSON representa una colección con `_meta` y `records`. Los esquemas Zod viven en `_schema/` y las copias previas de escritura en `_backups/`.

El almacenamiento local es adecuado para desarrollo. Los entornos serverless deben usar un adaptador externo antes de habilitar escrituras.

La autenticación local usa `users.json` y `sessions.json`, que no están expuestos por la API genérica de colecciones. Las contraseñas se almacenan derivadas con scrypt y las sesiones como hashes de tokens aleatorios. Para probar en desarrollo: `demo@elcaleno.com` / `demo1234`. Cambia o elimina esta cuenta antes de publicar el sistema.