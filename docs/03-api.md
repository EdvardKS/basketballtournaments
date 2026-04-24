# API REST

Base URL: `http://localhost:4010/api` (o `/api` si usas el proxy del frontend).

Todas las respuestas son JSON. Los endpoints que requieren sesión
devuelven `401` si no hay login. Los que requieren rol `admin`
devuelven `403` si el usuario no es admin.

## Auth

| Método | Path                    | Rol     | Descripción                          |
|--------|-------------------------|---------|--------------------------------------|
| POST   | `/auth/login`           | público | `{ identifier, password }`           |
| POST   | `/auth/logout`          | sesión  | termina sesión                       |
| GET    | `/auth/me`              | sesión  | devuelve el player actual            |
| POST   | `/auth/register`        | público | alta de jugador nuevo                |

`identifier` admite username (admins) o móvil (capitán/jugador).

## Players

| Método | Path                     | Rol    | Descripción                      |
|--------|--------------------------|--------|----------------------------------|
| GET    | `/players`               | sesión | lista (según visibilidad)        |
| GET    | `/players/:id`           | sesión | detalle                          |
| PATCH  | `/players/:id`           | propio/admin | actualiza perfil / stats   |
| GET    | `/players/:id/history`   | sesión | snapshots por torneo             |

## Tournaments

| Método | Path                             | Rol    | Descripción                |
|--------|----------------------------------|--------|----------------------------|
| GET    | `/tournaments`                   | pub    | lista con estado           |
| GET    | `/tournaments/:id`               | pub    | detalle + equipos + grupos |
| POST   | `/tournaments`                   | admin  | crea                       |
| PATCH  | `/tournaments/:id`               | admin  | edita campos / estado      |
| POST   | `/tournaments/:id/register`      | sesión | inscribe al player actual  |
| DELETE | `/tournaments/:id/register`      | sesión | se da de baja              |
| POST   | `/tournaments/:id/captains`      | admin  | marca capitán              |

## Draft

| Método | Path                             | Rol    | Descripción                |
|--------|----------------------------------|--------|----------------------------|
| POST   | `/draft/:tournamentId/start`     | admin  | arranca draft              |
| GET    | `/draft/:tournamentId/state`     | sesión | estado actual              |
| POST   | `/draft/:tournamentId/pick`      | cap/adm| `{ teamId, playerId }`     |
| POST   | `/draft/:tournamentId/end`       | admin  | cierra draft → setup       |

## Teams

| Método | Path                         | Rol          | Descripción              |
|--------|------------------------------|--------------|--------------------------|
| GET    | `/teams/:id`                 | sesión       | detalle con jugadores    |
| PATCH  | `/teams/:id`                 | capitán/admin| nombre, WhatsApp         |
| POST   | `/teams/:id/move-player`     | admin        | reasigna jugador         |

## Trades

| Método | Path                     | Rol           | Descripción                |
|--------|--------------------------|---------------|----------------------------|
| GET    | `/trades?tournamentId=`  | sesión        | ofertas del torneo         |
| POST   | `/trades`                | capitán       | crea oferta                |
| POST   | `/trades/:id/resolve`    | cap. target/adm| `{ action: accept|reject }`|

## Matches & Groups

| Método | Path                                     | Rol    | Descripción           |
|--------|------------------------------------------|--------|-----------------------|
| GET    | `/tournaments/:id/groups`                | pub    | grupos + tabla        |
| GET    | `/tournaments/:id/matches`               | pub    | todos los partidos    |
| POST   | `/matches/:id/start`                     | admin  | arranca partido       |
| POST   | `/matches/:id/score`                     | admin  | `{ homeScore, awayScore }` |
| POST   | `/matches/:id/complete`                  | admin  | finaliza + propaga    |
