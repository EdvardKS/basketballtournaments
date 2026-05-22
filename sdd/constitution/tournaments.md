# Tournaments — Constitución del servicio

**Versión**: `1.0.0` — 2026-05-22
**Owner**: producto
**Estado**: vigente

## Misión

Modelar el ciclo de vida de un torneo de VBL: creación, ventana de inscripción, draft, fase de grupos, eliminatorias y cierre. Es el bounded context con más responsabilidades agregadas — todo lo demás cuelga de él.

## Invariantes

1. **Status flow** sólo puede progresar hacia adelante:
   ```
   upcoming → open → draft → setup → scheduled → active → completed
   ```
   No se permite retroceder. Cambios sólo vía endpoints admin que validen el delta.
2. **Inscripciones** sólo se aceptan en `open` o `draft`. En cuanto un torneo pasa a `setup`, la lista se congela.
3. **Snapshots de skills** se crean al cierre de inscripciones, indexados por `(tournament_id, player_id)`. Son inmutables.
4. **Fechas** (`inscription_start`, `inscription_end`, `draft_start`, `draft_end`, `match_date`) son monotónicas.
5. **Soft delete** — un torneo nunca se elimina físicamente. `tournaments.deleted_at` marca el archivo.

## Dependencias

- `players`
- `tournament_registrations` (pivote N:N)
- `teams`, `team_players`, `draft_state`, `draft_history`
- `tournament_groups`, `matches`, `player_skill_snapshots`
- `tournament_themes` ← SPEC-013 introduce esta dependencia

## No-objetivos

- Ligas multi-temporada — un torneo es un evento aislado.
- Categorías por edad/género dentro de un mismo torneo — un torneo = una categoría.
- Reescritura de resultados después de `completed` — fuera de scope.

## API pública (resumen)

Detalle en `backend/src/routes/tournaments.ts`. Endpoints principales:

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/tournaments` | público | listar todos |
| GET | `/tournaments/:id` | público | detalle + registrations + teams |
| POST | `/tournaments` | admin | crear |
| PATCH | `/tournaments/:id` | admin | editar metadata + status |
| DELETE | `/tournaments/:id` | admin | soft delete |
| POST | `/tournaments/:id/register` | player | inscripción propia |
| DELETE | `/tournaments/:id/register` | player | baja propia |
| GET | `/tournaments/:id/theme` | público | theme persistido del torneo *(SPEC-013)* |

## Historial

```
1.0.0 — 2026-05-22 — Constitución inicial. Lista status, fechas, invariantes y dependencias.
```
