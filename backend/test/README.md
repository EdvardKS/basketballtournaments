# `backend/test/` · E2E lineal

Prueba real (sin mocks) que recorre el ciclo de vida completo de un
torneo desde la creación hasta el día del partido. No corre todavía la
fase post-partido (scoring, knockouts) — eso queda para una iteración
futura.

## Requisitos

1. `backend/.env` con:
   ```
   EXAMPLE_DATA=false
   BOOTSTRAP_ADMIN_USERNAME=tester
   BOOTSTRAP_ADMIN_PASSWORD=test1234
   ```
   (Ya viene con esos valores por defecto en este repo.)

2. Reset limpio del stack — la DB tiene que arrancar vacía:
   ```bash
   docker compose -f docker-compose.dev.yml down -v
   docker compose -f docker-compose.dev.yml up -d --build
   ```

## Ejecutar

Un único comando dentro del contenedor backend:

```bash
docker exec basket_backend python3 /app/test/full_flow.py
```

Para el stack de producción es el mismo comando contra el otro
contenedor:

```bash
docker exec basket_backend_prod python3 /app/test/full_flow.py
```

## Qué hace

Dos torneos consecutivos:

| Torneo | Capitanes | Jugadores | Estado final |
|--------|-----------|-----------|--------------|
| A      | 6         | 53        | `completed` (cerrado tras llegar a match day) |
| B      | 9         | 65        | `active`    (parado en match day con partidos pendientes) |

Cada flujo:

1. Crea el torneo con `status=open` y fechas centradas en hoy.
2. Da de alta y registra al total (`captains + players`) de jugadores.
3. Promueve los primeros N a capitán.
4. Verifica el backup CSV: filas totales + capitanes correctos.
5. PATCH a las fechas para entrar en ventana de draft + GET para
   disparar `lifecycle.transitionTournament` → `status=draft`.
6. Bucle de picks consultando `GET /draft/:id/state` y picando el
   primer jugador disponible para el equipo de turno, hasta vaciar la
   pool. El backend auto-cierra el draft (genera grupos + calendario).
7. Verifica `status=setup`, partidos generados, `hoursConfirmed=true`.
8. PATCH `matchDate` a ayer + GET → `status=active`.
9. Verifica que todos los partidos tienen `scheduledAt`.

Tras el script:

- Torneo A queda en `completed` (PATCH manual para liberar
  `ONE_ACTIVE_ONLY`).
- Torneo B queda en `active`.
- Frontend muestra ambos: `http://localhost:4322/`.

## Cookie `Secure` en producción

`backend/.env.prod` suele tener `COOKIE_SECURE=true` (a la espera de
HTTPS real). El test corre dentro del contenedor contra
`http://localhost:4000` plano, así que tras el `login` recorre la
cookie jar y le baja el flag `Secure`. Sin eso, `requests` se la
guardaría pero no la enviaría sobre HTTP loopback, y todas las
llamadas siguientes caerían en `401 UNAUTHENTICATED`.

## Variables de entorno opcionales

| Var                          | Default                | Para qué |
|------------------------------|------------------------|----------|
| `API_BASE`                   | `http://localhost:4000/api` | base URL del backend dentro del container |
| `BOOTSTRAP_ADMIN_USERNAME`   | `tester`               | usuario admin |
| `BOOTSTRAP_ADMIN_PASSWORD`   | `test1234`             | password admin |
| `CSV_BACKUP_DIR`             | `/app/data/csv`        | ubicación del CSV de respaldo |

## Volumen / mount

- Dev: `docker-compose.dev.yml` monta `./backend/test:/app/test:ro` —
  editar el script en host se ve dentro al instante.
- Prod: `backend/Dockerfile.prod` hace `COPY test ./test`, así que la
  imagen viene con el script empotrado.

Ambos Dockerfiles instalan `python3` + `py3-requests` via apk.

## Roadmap completo

Diagrama paso×paso, expectativas de status, CSV y URLs frontend:
[../../docs/10-testing-roadmap.md](../../docs/10-testing-roadmap.md).
