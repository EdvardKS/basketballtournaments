# Errores conocidos y decisiones de diseño

## Decisiones

### Astro + React islands en vez de React SPA puro

La versión anterior era un SPA React 19 enorme (varios archivos de
> 100KB). Se ha migrado a Astro con React sólo donde hace falta
interactividad real (formularios complejos, dashboards, draft en vivo).
Esto reduce JS en el cliente y hace más fácil respetar el límite de
130 líneas por archivo.

### `pg` plano en vez de Drizzle

El proyecto usaba Drizzle + migraciones. Se ha simplificado a `pg`
crudo + `db/init.sql` idempotente. Motivos:

- Elimina una capa de abstracción para un esquema que cambia poco.
- `init.sql` es más legible para un operador que abra Docker.
- Menos dependencias → build más ligero.

### Sesión en cookie firmada, no en Postgres

`express-session` con `MemoryStore` en dev. Para producción se puede
cambiar a `connect-pg-simple` con un cambio de 3 líneas en
`backend/src/app.ts`. No lo hacemos aún porque complica el test local.

## Errores conocidos

| # | Severidad | Descripción                                                         | Workaround |
|---|-----------|---------------------------------------------------------------------|------------|
| 1 | baja      | El avatar base64 puede hacer crecer la row y ralentizar listados.   | Limitar a 300KB en el frontend antes de subir. |
| 2 | media     | El recálculo de grupos es O(partidos × equipos). Para > 50 equipos habría que optimizar. | No hay torneos tan grandes en Villena. |
| 3 | baja      | `MemoryStore` pierde sesiones al reiniciar el contenedor.           | En dev está bien; usuarios vuelven a loguear. |
| 4 | baja      | El orden de picks dentro de una misma ronda se reshuffla por ronda (no snake). | Decisión explícita — más justo que snake corto. |
| 5 | media     | Si un capitán se da de baja en medio del draft, su equipo queda huérfano. | Validación en PATCH registration: si es capitán y hay draft activo, 409. |

## Migración desde la versión anterior

Si alguien tenía datos en la base antigua (con Drizzle):

```bash
pg_dump -U postgres villena > backup.sql
# editar search_path y borrar comandos de drizzle_migrations
psql -U postgres basket < backup.sql
```

El schema es compatible — las tablas tienen los mismos nombres y tipos.
