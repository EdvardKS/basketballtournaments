# Despliegue en local

## Requisitos

- Docker Desktop (Windows → con WSL2).
- Puertos libres: `4321`, `4000`, `5433`.

## Arranque

```bash
docker compose up -d --build
```

Al primer arranque:

1. `db` aplica `db/init.sql` (schema + seed).
2. `backend` espera a que `db` esté healthy y arranca en `:4000`.
3. `frontend` (Astro) arranca en `:4321` con HMR.

## Dev loop

El código de `backend/` y `frontend/` se monta con volumen, así que
editar en local recarga automáticamente.

- Backend: `tsx watch` recarga en < 1s.
- Frontend: Astro HMR recarga en el navegador al guardar.

## Comandos útiles

```bash
# Logs en vivo de un servicio
docker compose logs -f backend

# Abrir una shell en el contenedor
docker compose exec backend sh
docker compose exec db psql -U postgres -d basket

# Reset total de la base de datos
docker compose down -v && docker compose up -d --build

# Correr los smoke tests del sprint
./test/smoke.sh
```

## Variables de entorno

Cada servicio tiene su propio `.env` (commited, sólo valores de
desarrollo). En producción se deben sobreescribir:

- `db/.env`: credenciales de Postgres.
- `backend/.env`: `DATABASE_URL`, `SESSION_SECRET`, `PORT`, `CORS_ORIGIN`.
- `frontend/.env`: `PUBLIC_API_BASE` (URL interna para SSR), `PORT`.
