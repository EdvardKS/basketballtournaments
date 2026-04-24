# Modelo de datos

Todas las tablas viven en el schema `public` de Postgres. El init SQL
(`db/init.sql`) las crea idempotentemente con datos de ejemplo.

## Tablas principales

| Tabla                    | Qué guarda                                              |
|--------------------------|---------------------------------------------------------|
| `players`                | Usuarios (jugadores, capitanes, admins) + stats.        |
| `tournaments`            | Torneos con estado y configuración.                     |
| `tournament_registrations` | Inscripción de un jugador a un torneo (N:N).          |
| `teams`                  | Equipos por torneo con un capitán referenciado.         |
| `team_players`           | Plantilla del equipo (N:N entre equipos y jugadores).   |
| `draft_state`            | Estado en curso del draft por torneo.                   |
| `draft_history`          | Log de cada pick (para auditoría y animaciones).        |
| `trade_offers`           | Ofertas de intercambio de jugadores entre capitanes.    |
| `tournament_groups`      | Grupos de la fase de grupos.                            |
| `group_members`          | Equipo dentro de un grupo con su clasificación.         |
| `matches`                | Partidos (grupo y eliminatorias) con marcador.          |
| `player_skill_snapshots` | Fotografía de stats por jugador y torneo.               |

## Estados de `tournaments.status`

```
open     ──► abierto a inscripciones (jugadores se registran)
draft    ──► capitanes eligen en rondas
setup    ──► confirmación de nombres de equipo y grupo WhatsApp
scheduled──► calendario publicado, esperando fecha
active   ──► partidos en juego
completed──► torneo finalizado, ganador asignado
```

## Reglas de integridad

- Un `player` no puede inscribirse dos veces al mismo torneo
  (`UNIQUE(player_id, tournament_id)`).
- Un `team` no puede tener al mismo jugador dos veces
  (`UNIQUE(team_id, player_id)`).
- Un capitán no puede ser drafteado (él mismo ocupa 1 plaza en su equipo).
- `matches.winner_id` siempre coincide con home o away cuando
  `status = completed`.

## Stats del jugador

6 atributos en escala 0–99: `pace`, `shooting`, `passing`,
`dribbling`, `defense`, `physical`. El campo `overall` se calcula
en el backend como media redondeada de las 6 stats.
