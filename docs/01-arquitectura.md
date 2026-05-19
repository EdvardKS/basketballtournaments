# Arquitectura

```
┌──────────────────────────── docker-compose (basket_net) ────────────────────────────┐
│                                                                                     │
│   ┌──────────────┐     HTTP /api     ┌──────────────┐     TCP 5432     ┌─────────┐  │
│   │   frontend   │ ────────────────▶ │   backend    │ ───────────────▶ │   db    │  │
│   │ Astro + React│ ◀──────────────── │ Express + pg │ ◀─────────────── │ Postgres│  │
│   └──────────────┘    JSON + cookie  └──────────────┘                  └─────────┘  │
│       :4321                               :4000                           :5432      │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
        ▲                                    ▲                                ▲
        │localhost:4322                      │localhost:4010                  │localhost:5434
```

## Carpetas del repo

```
.
├── frontend/     # Astro 5 con islas React donde hace falta interactividad
├── backend/      # Express + pg, endpoints REST bajo /api
├── db/           # Postgres 16, init.sql con schema + seed
├── docs/         # Esta documentación
├── test/         # Scripts bash para smoke-test por sprint (gitignored)
├── docker-compose.yml       # producción por defecto
├── docker-compose.dev.yml   # stack de desarrollo (HMR, mounts)
└── .gitignore
```

> Gestor de paquetes: **pnpm** (`packageManager: pnpm@10.33.3`).
> Build dentro de los contenedores usa corepack para invocarlo.

## Capas del backend

```
backend/src
├── index.ts             # bootstrap Express
├── app.ts               # middlewares, sesiones, montaje de routers
├── db/                  # pool pg + funciones de acceso por dominio
├── routes/              # routers REST por recurso
├── services/            # lógica de negocio (draft, grupos, marcadores)
├── middleware/          # auth, error handler
└── util/                # helpers comunes
```

## Capas del frontend (Astro)

```
frontend/src
├── pages/        # rutas Astro (SSR)
├── layouts/      # layouts compartidos
├── components/   # componentes .astro estáticos
├── islands/      # componentes React hidratados client:load|idle
├── lib/          # cliente API, utilidades
└── styles/       # Tailwind 4 global
```

## Comunicación

- El frontend hace `fetch` relativo a `/api/...`, y Astro proxy-pasa al
  servicio `backend` dentro de la red Docker.
- La sesión vive en una cookie `basket_sid` firmada con `SESSION_SECRET`.
- El backend sirve sólo JSON; Astro pinta el HTML inicial y cargas
  siguientes son React islands.

## Persistencia en disco

- Postgres → volumen `basket_pgdata` (dev) / `basket_pgdata_prod` (prod).
- Backup CSV de inscripciones → `backend/data/csv/<matchDate>.csv`
  (montado en `/app/data/csv`). Reescrito en cada cambio relevante.
  Ver `services/registration-backup.ts` y
  [09-changelog-2026-05-19.md](09-changelog-2026-05-19.md) §5.
- Fotos de ediciones pasadas → `frontend/photos/`, montadas read-only
  en dev (`/app/photos`) y copiadas en build de prod. No están en
  `/public`: las sirve el endpoint `pages/foto/[...path].ts` con
  gate de UA + `X-Robots-Tag`.
