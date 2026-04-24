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

## Usuarios de ejemplo (seed)

Todos con la misma contraseña: **`123123123`**.

El login admite dos tipos de `identifier`:

- Admins → entran con su **username**.
- Capitanes y jugadores → entran con su **móvil**.

### Admins (`identifier` = username)

| Username | Nombre              | Email                 |
|----------|---------------------|-----------------------|
| `base1`  | Administrador base1 | base1@villena.test    |
| `base2`  | Administrador base2 | base2@villena.test    |
| `base3`  | Administrador base3 | base3@villena.test    |

### Capitanes (`identifier` = móvil)

| Móvil       | Nombre       | Username | Posición  | Overall |
|-------------|--------------|----------|-----------|---------|
| `600000001` | Lucas Gil    | lucasg   | base      | 77      |
| `600000002` | Mario Ruiz   | marior   | escolta   | 74      |
| `600000003` | Sergio Diaz  | sergiod  | alero     | 75      |

### Jugadores (`identifier` = móvil)

| Móvil       | Nombre       | Username | Posición    | Overall |
|-------------|--------------|----------|-------------|---------|
| `600000004` | Adrian Lopez | adrianl  | base        | 71      |
| `600000005` | Iker Mora    | ikerm    | escolta     | 71      |
| `600000006` | Pablo Cruz   | pabloc   | alero       | 73      |
| `600000007` | Hugo Sanz    | hugos    | ala-pivot   | 71      |
| `600000008` | Nico Rojas   | nicor    | alero       | 73      |
| `600000009` | Daniel Vega  | danielv  | pivot       | 65      |
| `600000010` | Victor Luna  | victorl  | base        | 81      |
| `600000011` | Raul Soto    | rauls    | escolta     | 63      |
| `600000012` | Javi Costa   | javic    | ala-pivot   | 72      |

> Las contraseñas viven en claro en la DB de seed porque es un entorno
> de desarrollo. En el plan de hardening para producción está migrar a
> bcrypt (ver `docs/05-despliegue.md`).

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
