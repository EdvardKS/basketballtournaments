# SPEC-013 — Plan técnico

## Fases

| Fase | Entregable | Archivos |
|------|------------|----------|
| F1 | Migración DB `tournament_themes` + `tournaments.theme_id` | `db/init/18_tournament_themes.sql` |
| F2 | Backend: theme service | `backend/src/services/cromo-themes.ts` |
| F3 | Backend: cromos service (resolver snapshot vs current) | `backend/src/services/cromos.ts` |
| F4 | Routes nuevos | `backend/src/routes/tournaments.ts` (GET `/:id/theme`, POST `/admin/tournament-themes/seed`), `backend/src/routes/players.ts` (GET `/:id/cromos`) |
| F5 | Lib frontend (fetch helper + tipos) | `frontend/src/lib/cromos.ts` |
| F6 | `CromoCard.astro` refactor — recibe `cromo` prop (theme + tournament + player) | `frontend/src/components/cromo/CromoCard.astro` |
| F7 | `CromoCarousel.tsx` con GSAP | `frontend/src/components/cromo/CromoCarousel.tsx` |
| F8 | `CromoEmptyState.astro` | `frontend/src/components/cromo/CromoEmptyState.astro` |
| F9 | `CromoShare.tsx` actualizado para share-of-active | `frontend/src/islands/CromoShare.tsx` |
| F10 | Mount en dashboards | `frontend/src/pages/dashboard/{captain,player}.astro` |
| F11 | Tests | `test/spec-013/*` |

## Reuso

- `lib/cromo-export.ts` — sin cambios estructurales; añade soporte para `source` (ya está expuesto).
- `lib/cromo-share.ts` — sin cambios.
- `html-to-image`, `gsap` — ya en deps.
- `lib/api.ts` — wrapper existente para fetch.

## Migración data

Para torneos existentes (datos legacy):

```sql
-- Pseudo-código que el migration runner ejecutará:
INSERT INTO tournament_themes (catalog_index, palette)
SELECT idx, palette FROM unnest($CATALOG) WITH ORDINALITY t(palette, idx);
-- Después, asignar a torneos sin theme:
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 AS n
  FROM tournaments WHERE theme_id IS NULL
)
UPDATE tournaments t SET theme_id = th.id
FROM ranked r
JOIN tournament_themes th ON th.catalog_index = r.n
WHERE t.id = r.id;
```

## Riesgos

- **Race condition al pedir theme en paralelo**: mitigado con `INSERT ... ON CONFLICT (catalog_index) DO NOTHING` + retry hasta obtener uno.
- **Catálogo agotado**: catálogo inicial de ≥ 32 entradas. Cuando queden < 8 libres, el endpoint `GET /tournaments/:id/theme` añade un log warning para que admin amplíe.
- **html-to-image + GSAP transform durante export**: durante la transición del carousel, si el usuario pulsa "compartir", podría capturarse un frame intermedio. Mitigación: `exportCardToPng()` pausa la animación (`gsap.killTweensOf(activeNode)`) antes de capturar.

## Test plan

- **Unit**: `cromo-themes.ts` — picking del catalog_index, retry en race, exhaustion.
- **Integration**: `test/spec-013/api.test.ts` — flujo completo (crear torneo, registrar jugador, GET cromos, completar torneo, GET cromos → frozen).
- **Manual / e2e**: dashboard captain + player con 0, 1, N cromos. WhatsApp share del cromo activo.
- **Curl**: contenedor dev arriba, curl a los nuevos endpoints (`/tournaments/:id/theme`, `/players/:id/cromos`).

## Estimación

- F1: 30 min
- F2-F4: 90 min
- F5-F10: 120 min
- F11: 60 min
- Total: ~5h. Con auto-mode hasta 15:00 cabe ajustado; priorizar F1-F10 + smoke tests.
