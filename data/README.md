# /data — JSON Database Layer

Cada archivo JSON representa una colección con `_meta` y `records`. Los esquemas Zod viven en `_schema/` y las copias previas de escritura en `_backups/`.

El almacenamiento local es adecuado para desarrollo. Los entornos serverless deben usar un adaptador externo antes de habilitar escrituras.