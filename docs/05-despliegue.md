# Despliegue en local

## Requisitos

- Docker Desktop (Windows → con WSL2).
- Puertos libres: `4322`, `4010`, `5434`.

## Arranque en desarrollo

Los `.env` están gitignoreados. Copia los ejemplos antes del primer build:

```bash
cp db/.env.example db/.env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up -d --build
```

## Arranque en producción (mismos puertos, build real)

```bash
cp db/.env.prod.example db/.env.prod           # edita las contraseñas
cp backend/.env.prod.example backend/.env.prod # edita SESSION_SECRET
cp frontend/.env.prod.example frontend/.env.prod
docker compose -f docker-compose.prod.yml up -d --build
```

Diferencias con el stack de desarrollo:

| Aspecto        | Dev                        | Prod                                  |
|----------------|----------------------------|---------------------------------------|
| Imágenes       | `Dockerfile` + bind mount  | `Dockerfile.prod` multi-stage         |
| Backend        | `tsx watch` sobre `src/`   | `tsc` → `dist/`, `node dist/index.js` |
| Frontend       | `astro dev` con HMR        | `astro build` → `node dist/server/entry.mjs` |
| Env file       | `.env`                     | `.env.prod` (gitignored)              |
| Cookies        | `Secure=false`             | `COOKIE_SECURE=true` cuando haya HTTPS |
| Volúmenes      | Código montado del host    | Ninguno — imagen autosuficiente        |
| Healthchecks   | Sólo `db`                  | `db` + `backend` + `frontend`         |

### Trampa clásica al cambiar la password de la DB

`POSTGRES_PASSWORD` solo se aplica en el **primer arranque** del volumen
(`basket_pgdata_prod`). Si editas `db/.env.prod` después de que el volumen
ya exista, el servidor sigue con la password vieja y verás:

```
FATAL: password authentication failed for user "basket"
```

Soluciones:

```bash
# A — recrear el volumen (destructivo, sólo si no hay datos reales)
docker compose -f docker-compose.prod.yml down
docker volume rm basketballtournaments_basket_pgdata_prod
docker compose -f docker-compose.prod.yml up -d --build

# B — cambiar la password dentro de la DB (conserva los datos)
docker compose -f docker-compose.prod.yml exec db \
  psql -U basket -d basket -c "ALTER USER basket WITH PASSWORD 'nueva';"
# y luego actualiza backend/.env.prod con la misma password.
```

### Pendientes para producción real (no incluidos todavía)

- Hash de contraseñas con bcrypt (hoy están en claro en la DB).
- Session store persistente (`connect-pg-simple`) en lugar de `MemoryStore`.
- Reverse proxy con TLS (Caddy/Traefik) delante.
- Separar seed de desarrollo (`04-07_seed_*.sql`) del schema productivo.

Al primer arranque:

1. `db` aplica los `db/init/*.sql` en orden alfabético (schema + seed).
2. `backend` espera a que `db` esté healthy y arranca en `:4010`.
3. `frontend` (Astro) arranca en `:4322` con HMR.

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
