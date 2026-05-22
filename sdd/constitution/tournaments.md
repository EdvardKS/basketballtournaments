# Tournaments — Constitución del servicio

**Versión**: `1.1.0` — 2026-05-22
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
3.1. **Cierre real** *(SPEC-014)* — `tournaments.status = 'completed'` requiere que **todos** los matches del torneo estén `completed`. Adjudicar campeón/subcampeón/tercer puesto sin haber cerrado grupos no completa el torneo: el sistema espera a que cada match tenga winner.
3.2. **Historial extendido** *(SPEC-014)* — la vista del historial agrupa torneos con `status='completed'` y torneos con `match_date < CURRENT_DATE` aunque no estén `completed` todavía; los últimos llevan badge "PENDIENTE DE CIERRE".
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
| GET | `/tournaments/historical` | público | completed + match_date pasada *(SPEC-014)* |

## Historial

```
1.0.0 — 2026-05-22 — Constitución inicial. Lista status, fechas, invariantes y dependencias.
1.1.0 — 2026-05-22 — SPEC-014. Status='completed' requiere todos los matches completed. Historial extendido (completed + match_date pasada). Endpoint GET /tournaments/historical.
```
