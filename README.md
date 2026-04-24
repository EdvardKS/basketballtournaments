# Villena Basket League

Gestor de torneos de basket amateur. Tres servicios Docker:

- **db** → Postgres 16 (puerto host `5434`)
- **backend** → Express + TypeScript (puerto host `4010`)
- **frontend** → Astro 5 + React islands (puerto host `4322`)

## Arranque rápido

```bash
docker compose up -d --build
# abre http://localhost:4322
```

Seed automático: ver `docs/00-README.md` para credenciales.

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
db/         Postgres init + seed
docs/       Documentación
test/       Smoke tests (gitignored)
docker-compose.yml
```

## Dev

Los tres servicios montan el código con volumen y recargan al vuelo
(`astro dev`, `tsx watch`, `pg` ya vivo). No hace falta rebuild salvo
al tocar dependencias.
