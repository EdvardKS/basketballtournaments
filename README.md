# Villena Basket League

Gestor de torneos de basket amateur (formato **3x3** por defecto). Tres
servicios Docker:

- **db** → Postgres 16 (puerto host `5434`)
- **backend** → Express + TypeScript (puerto host `4010`)
- **frontend** → Astro 5 + React islands (puerto host `4322`)

## Arranque rápido

```bash
docker compose up -d --build
# abre http://localhost:4322
```

## Datos de ejemplo — `EXAMPLE_DATA`

El stack soporta dos modos de arranque controlados por el env var
`EXAMPLE_DATA` dentro de `db/.env` (dev) y `db/.env.prod` (prod).

| Valor   | Qué hace                                                         |
|---------|------------------------------------------------------------------|
| `true`  | Crea schema **y** carga demo (jugadores, torneos, partidos)       |
| `false` | Crea schema solamente (DB vacía de datos de negocio)              |

Las tablas/columnas se crean **siempre** (idempotente via
`CREATE TABLE IF NOT EXISTS` y `ALTER TABLE ADD COLUMN IF NOT EXISTS`).
Los seeds viven en `db/seeds/` y sólo se cargan cuando
`EXAMPLE_DATA=true` (script de arranque `db/init/99_maybe_seed.sh`).

Defaults recomendados:

- `db/.env` → `EXAMPLE_DATA=true` (desarrollo, demo útil)
- `db/.env.prod` → `EXAMPLE_DATA=false` (producción, arrancar limpio)

## Usuarios de ejemplo (cuando `EXAMPLE_DATA=true`)

Todos los usuarios seed usan la misma contraseña: **`123123123`**.

El login admite dos tipos de `identifier`:

- **Admins** → entran con su **username**
- **Capitanes y jugadores** → entran con su **móvil**

### Admins (login por username)

| Username | Nombre              | Email                  |
|----------|---------------------|------------------------|
| `base1`  | Administrador base1 | base1@villena.test     |
| `base2`  | Administrador base2 | base2@villena.test     |
| `base3`  | Administrador base3 | base3@villena.test     |

### Capitanes (login por móvil)

Los 12 jugadores con `role=captain` — han capitaneado equipos en torneos
pasados o lo están haciendo en el torneo en curso.

| Móvil       | Nombre         | Username   | Posición   | Overall |
|-------------|----------------|------------|------------|---------|
| `600000001` | Lucas Gil      | `lucasg`   | base       | 77      |
| `600000002` | Mario Ruiz     | `marior`   | escolta    | 74      |
| `600000003` | Sergio Diaz    | `sergiod`  | alero      | 75      |
| `600000004` | Dario Navarro  | `darion`   | ala-pivot  | 75      |
| `600000005` | Manuel Torres  | `manuelt`  | pivot      | 70      |
| `600000006` | Alex Vidal     | `alexv`    | base       | 76      |
| `600000007` | Nicolas Pons   | `nicop`    | escolta    | 73      |
| `600000008` | Ivan Molina    | `ivanm`    | alero      | 76      |
| `600000009` | Rafa Gomez     | `rafag`    | ala-pivot  | 72      |
| `600000010` | Victor Luna    | `victorl`  | base       | 81      |
| `600000011` | Bruno Castro   | `brunoc`   | pivot      | 69      |
| `600000012` | Carlos Reyes   | `carlosr`  | escolta    | 76      |

### Jugadores (login por móvil)

Los 28 jugadores con `role=player`. Pueden ser reclutados por capitanes
durante el draft.

| Móvil       | Nombre           | Username    | Posición   | Overall |
|-------------|------------------|-------------|------------|---------|
| `600000013` | Adrian Lopez     | `adrianl`   | base       | 71      |
| `600000014` | Iker Mora        | `ikerm`     | escolta    | 71      |
| `600000015` | Pablo Cruz       | `pabloc`    | alero      | 73      |
| `600000016` | Hugo Sanz        | `hugos`     | ala-pivot  | 71      |
| `600000017` | Nico Rojas       | `nicor`     | alero      | 73      |
| `600000018` | Daniel Vega      | `danielv`   | pivot      | 65      |
| `600000019` | Raul Soto        | `rauls`     | escolta    | 63      |
| `600000020` | Javi Costa       | `javic`     | ala-pivot  | 72      |
| `600000021` | Marcos Parra     | `marcosp`   | base       | 72      |
| `600000022` | Joan Esteve      | `joane`     | escolta    | 70      |
| `600000023` | David Bernal     | `davidb`    | alero      | 72      |
| `600000024` | Toni Lara        | `tonil`     | pivot      | 66      |
| `600000025` | Samuel Peris     | `samuelp`   | base       | 73      |
| `600000026` | Marc Ibanez      | `marci`     | escolta    | 70      |
| `600000027` | Pedro Campos     | `pedroc`    | alero      | 73      |
| `600000028` | Jaume Serra      | `jaumes`    | ala-pivot  | 70      |
| `600000029` | Xavi Mena        | `xavim`     | pivot      | 66      |
| `600000030` | Isaac Pla        | `isaacp`    | base       | 70      |
| `600000031` | Oscar Ribes      | `oscarr`    | escolta    | 69      |
| `600000032` | Pau Marti        | `paum`      | alero      | 73      |
| `600000033` | Eric Fuentes     | `ericf`     | ala-pivot  | 72      |
| `600000034` | Dani Miro        | `danim`     | pivot      | 67      |
| `600000035` | Guillem Roig     | `guillemr`  | base       | 73      |
| `600000036` | Jose Salom       | `joses`     | escolta    | 70      |
| `600000037` | Aitor Palau      | `aitorp`    | alero      | 72      |
| `600000038` | Sergi Verdu      | `sergiv`    | ala-pivot  | 70      |
| `600000039` | Miquel Grau      | `miquelg`   | pivot      | 64      |
| `600000040` | Saul Cano        | `saulc`     | base       | 74      |

## Torneos de ejemplo

Cuatro torneos con distintos formatos de eliminatoria:

| ID             | Nombre                 | Estado      | Equipos | Formato                                  |
|----------------|------------------------|-------------|---------|------------------------------------------|
| `t-draft-now`  | Liga Primavera 2026    | **draft**   | 6       | Draft en curso (ronda 1, 3 picks hechos) |
| `t-past-8`     | Copa Invierno 2026     | completed   | 8       | 2 grupos de 4 → semis + final + 3º      |
| `t-past-6`     | Torneo Navidad 2025    | completed   | 6       | 2 grupos de 3 → semis + final + 3º      |
| `t-past-4`     | Copa Verano 2025       | completed   | 4       | 1 grupo round-robin → semis + final + 3º|

> Las contraseñas viven en claro en la DB de seed porque es un entorno
> de desarrollo. En el plan de hardening para producción está migrar a
> bcrypt (ver `docs/05-despliegue.md`).

## Testing (E2E)

```bash
# Batería de endpoints + draft parcial + restricciones de roles
bash test/e2e_test.sh

# Simulación completa: draft → grupos → knockout → campeón
bash test/e2e_full_tournament.sh
```

## Producción

```bash
cp db/.env.prod.example           db/.env.prod            # edita password
cp backend/.env.prod.example      backend/.env.prod       # edita secrets
cp frontend/.env.prod.example     frontend/.env.prod
docker compose -f docker-compose.prod.yml up -d --build
```

Por defecto `db/.env.prod.example` trae `EXAMPLE_DATA=false` → la DB se
levanta vacía (sólo tablas). Cambia a `true` si necesitas los datos demo
en un entorno de staging.

## Docs

Toda la documentación viva en [`docs/`](docs/00-README.md):

1. Arquitectura y flujo de datos
2. Modelo de datos
3. Referencia de la API REST
4. Flujos de negocio (draft, intercambios, grupos)
5. Despliegue
6. Testing
7. Errores conocidos y decisiones de diseño
8. Organización del frontend

## Layout del repo

```
frontend/   Astro + React islands
backend/    Express REST API
db/
  init/     Schema + migraciones (siempre se aplican)
  seeds/    Datos demo (sólo si EXAMPLE_DATA=true)
docs/       Documentación
test/       Smoke tests
docker-compose.yml         # desarrollo (HMR, mounts)
docker-compose.prod.yml    # producción (builds, sin mounts)
```

## Dev

Los tres servicios montan el código con volumen y recargan al vuelo
(`astro dev`, `tsx watch`, `pg` ya vivo). No hace falta rebuild salvo
al tocar dependencias.
