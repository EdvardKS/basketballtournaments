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
| `db`     | Postgres 16 + pgcrypto              | `5434`      |
| `backend`| Node 20 + Express + `pg`            | `4010`      |
| `frontend`| Node 20 + Astro 5 + React islands  | `4322`      |

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
- [09-changelog-2026-05-19.md](09-changelog-2026-05-19.md) — cambios cerrados en la sesión del 19 de mayo de 2026.
- [10-testing-roadmap.md](10-testing-roadmap.md) — roadmap del E2E lineal `crear torneo → día del partido`.
- [11-flujo-completo.md](11-flujo-completo.md) — explicación paso a paso (sin tecnicismos) del flujo completo de la app hasta el día del torneo.
- [11-flujo-completo.html](11-flujo-completo.html) — versión visual con estilos del mismo roadmap; ábrela directamente en el navegador.

## Credenciales de ejemplo

Cargadas por el seed SQL al arrancar la DB por primera vez:

| Usuario         | Rol      | Login        | Password     |
|-----------------|----------|--------------|--------------|
| `base1`         | admin    | username     | `123123123`  |
| `base2`         | admin    | username     | `123123123`  |
| Lucas Gil       | captain  | `600000001`  | `123123123`  |
| Mario Ruiz      | captain  | `600000002`  | `123123123`  |
| Adrian Lopez    | player   | `600000004`  | `123123123`  |
