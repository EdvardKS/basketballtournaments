# SPEC-013 — Data model

## Tabla nueva: `tournament_themes`

```sql
CREATE TABLE IF NOT EXISTS tournament_themes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_index   INT  NOT NULL UNIQUE,           -- 0..N, índice en el catálogo curado
  palette         JSONB NOT NULL,                 -- ver themes.md
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Notas:
- `catalog_index` es UNIQUE → impide que dos torneos compartan el mismo slot del catálogo.
- `palette` es JSONB → flexible si se añaden campos en futuras versiones.
- No hay FK directo a `tournaments`; la dirección de la relación es `tournaments → tournament_themes` (1:1) vía `tournaments.theme_id`.

## Columna nueva: `tournaments.theme_id`

```sql
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS theme_id UUID NULL
  REFERENCES tournament_themes(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tournaments_theme_id
  ON tournaments(theme_id) WHERE theme_id IS NOT NULL;
```

Notas:
- NULL permitido en torneos legacy hasta que se asigne theme.
- UNIQUE parcial → un theme puede pertenecer a un solo torneo, pero múltiples torneos pueden estar sin theme (NULL).
- `ON DELETE SET NULL` permite limpiar themes huérfanos sin perder torneos.

## Backfill (en la misma migración)

1. Insertar el catálogo curado (32 entradas) en `tournament_themes`.
2. Asignar `theme_id` a torneos legacy en orden cronológico (más antiguo primero).
3. Si hay más torneos que entradas del catálogo, los torneos sin theme quedan `NULL` y un admin debe ampliar el catálogo.

## Tablas reutilizadas

- `tournament_registrations` — pivote N:N, ya existente (`db/init/01_schema_core.sql:38-46`).
- `player_skill_snapshots` — snapshot por `(tournament_id, player_id)`, ya existente (`db/init/03_schema_matches.sql:41-54`).

## Helpers SQL (en código backend)

`backend/src/services/cromos.ts` ejecuta:

```sql
-- Listar los cromos de un jugador, ordenados desc.
SELECT
  t.id, t.name, t.date, t.created_at, t.status, t.theme_id,
  tr.registered_at,
  EXTRACT(YEAR FROM COALESCE(t.date::DATE, t.created_at::DATE))::INT AS year
FROM tournament_registrations tr
JOIN tournaments t ON t.id = tr.tournament_id
WHERE tr.player_id = $1
  AND t.deleted_at IS NULL
ORDER BY COALESCE(t.date, t.created_at::TEXT) DESC;

-- Stats a usar:
SELECT pace, shooting, passing, dribbling, defense, physical, overall
FROM player_skill_snapshots
WHERE tournament_id = $1 AND player_id = $2;
-- Si NULL → leer de players.
```

## Constraints sociales

- Política de borrado: un theme NO se borra mientras tenga torneos asignados (vía `ON DELETE SET NULL` el sistema permitiría, pero el endpoint admin rechazaría).
- Política de edición: una vez asignado a un torneo `completed`, el theme no se edita. Endpoint admin solo edita themes de torneos `upcoming` o `open`.
