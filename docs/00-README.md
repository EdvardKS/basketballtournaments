# Villena Basket League — Documentación del proyecto

Gestor de torneos de basket amateur. Permite:

- Registro de jugadores con carta estilo FIFA (6 estadísticas + overall).
- Creación y gestión de torneos con ciclo de vida:
  `open → draft → setup → scheduled → active → completed`.
- Draft por rondas con capitanes y orden aleatorio.
- Gestión de equipos, grupos de WhatsApp, intercambios entre capitanes.
- Fase de grupos + eliminatorias con marcadores en vivo.
- Historial de snapshots de stats por torneo para ver la evolución.

## Arquitectura

Tres servicios Docker conectados en una red interna `basket_net`:

| Servicio | Stack                               | Puerto host |
|----------|-------------------------------------|-------------|
| `db`     | Postgres 16 + pgcrypto              | `5433`      |
| `backend`| Node 20 + Express + `pg`            | `4000`      |
| `frontend`| Node 20 + Astro 5 + React islands  | `4321`      |

Todo corre en **modo desarrollo** con hot-reload por volúmenes montados.

## Documentos

- [01-arquitectura.md](01-arquitectura.md) — diagrama y flujo de datos.
- [02-modelo-datos.md](02-modelo-datos.md) — esquema relacional.
- [03-api.md](03-api.md) — referencia de endpoints REST.
- [04-flujos-negocio.md](04-flujos-negocio.md) — draft, intercambios, partidos.
- [05-despliegue.md](05-despliegue.md) — cómo levantar el stack.
- [06-testing.md](06-testing.md) — pruebas E2E y credenciales.
- [07-errores-conocidos.md](07-errores-conocidos.md) — issues y decisiones.
- [08-frontend.md](08-frontend.md) — cómo está organizada la UI en Astro.

## Credenciales de ejemplo

Cargadas por el seed SQL al arrancar la DB por primera vez:

| Usuario         | Rol      | Login        | Password     |
|-----------------|----------|--------------|--------------|
| `base1`         | admin    | username     | `123123123`  |
| `base2`         | admin    | username     | `123123123`  |
| Lucas Gil       | captain  | `600000001`  | `123123123`  |
| Mario Ruiz      | captain  | `600000002`  | `123123123`  |
| Adrian Lopez    | player   | `600000004`  | `123123123`  |
