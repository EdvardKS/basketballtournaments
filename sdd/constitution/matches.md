# Matches — Constitución del servicio

**Versión**: `1.1.0` — 2026-05-22
**Owner**: producto
**Estado**: vigente

## Misión

Modelar los partidos del torneo: fase de grupos, eliminatorias y final. Persistir scores y cerrar el torneo cuando se decide el campeón.

## Invariantes

1. **Bracket lock** — el bracket se genera una vez por torneo y se bloquea (`bracket_lock=true`). Cambios posteriores sólo vía admin override.
2. **Group order** — los grupos se asignan al cierre del draft. Cada equipo pertenece a un solo grupo.
3. **Scoring forward-only** — un match `completed` no se reabre. Si hay error, admin lo edita con motivo audited.
4. **Cierre del torneo** — cuando la final tiene resultado, `tournaments.status` pasa a `completed` y `winner_id` se rellena.

## Dependencias

- `tournaments`, `teams`, `tournament_groups`, `matches`.

## No-objetivos

- Live scoring por jugador individual (puntos personales) — sólo equipo.
- Estadísticas avanzadas (rebotes, asistencias) — fuera de scope.

## API pública (resumen)

Detalle en `backend/src/routes/matches.ts`.

## Historial

```
1.0.0 — 2026-05-22 — Constitución inicial documentando el estado actual del servicio.
1.1.0 — 2026-05-22 — SPEC-015: sesiones temporales de marcador (URL pública /score/:token,
                     cronómetro persistido, submit idempotente vía updateScore + completeMatch).
                     No cambia semántica de `completed` ni motor de clasificación/bracket.
```
