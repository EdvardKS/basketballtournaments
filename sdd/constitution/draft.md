# Draft — Constitución del servicio

**Versión**: `1.0.0` — 2026-05-22
**Owner**: producto
**Estado**: vigente

## Misión

Asignar a cada capitán los jugadores de su equipo mediante un draft snake (turnos alternados). Disparar el snapshot de skills al cerrar el draft.

## Invariantes

1. **Snake order** — los turnos van 1,2,...N,N,...2,1 y se repiten. El orden inicial es aleatorio + persistido (ver `draft_state`).
2. **Lock** — un capitán que ya eligió en su turno no puede revertir su pick (sólo admin override en `draft_history`).
3. **Snapshot** — al cerrar el draft (status → `setup`) se crea `player_skill_snapshots` para todos los inscritos. Inmutable a partir de ahí.
4. **Trade lock por bracket** — una vez generado el bracket (`bracket_lock=true`), no se permiten trades entre equipos.

## Dependencias

- `tournaments`, `tournament_registrations`, `teams`, `team_players`, `draft_state`, `draft_history`, `player_skill_snapshots`.

## No-objetivos

- Draft auctioneer (pujas) — fuera de scope.
- Draft con timer estricto — el actual no tiene timer hard, queda a discreción del admin.

## API pública (resumen)

Detalle en `backend/src/routes/draft.ts`.

## Historial

```
1.0.0 — 2026-05-22 — Constitución inicial documentando el estado actual del servicio.
```
