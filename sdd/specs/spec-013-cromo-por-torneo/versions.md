# SPEC-013 — Versiones

## Historial

```
0.1.0 — 2026-05-22 — Draft inicial
0.2.0 — 2026-05-22 — Promovido a Proposed: añadidos data-model, api, ui, themes
1.0.0 — 2026-05-22 — Accepted. Implementación iniciada en branch feat/spec-013-cromo-por-torneo
1.1.0 — 2026-05-22 — Implementación end-to-end:
  - DB: migración 18_tournament_themes.sql con 32 paletas curadas + backfill
  - Backend: cromo-themes (resolveTournamentTheme + procedural fallback) + cromos (listCromosForPlayer)
  - Backend: endpoints GET /tournaments/:id/theme, GET /players/:id/cromos,
    GET/POST /admin/tournament-themes
  - Frontend: CromoCard refactor (theme via inline CSS vars + tournament header)
  - Frontend: CromoCarousel.astro + CromoCarouselControls.tsx con animación GSAP power2.out
  - Frontend: CromoEmptyState.astro
  - Frontend: CromoShare.tsx con share-of-active vía [data-active="true"]
  - Cambio AC7: catálogo se auto-extiende procedural cuando los curados se agotan
```

## Constituciones afectadas

- `sdd/constitution/cromo.md` → bump `0.x → 1.0.0` (era inexistente; este spec define el contrato inicial del servicio cromo).
- `sdd/constitution/tournaments.md` → introduce `tournaments.theme_id` dependency. Sin breaking change → `1.0.0`.
- `sdd/constitution/share.md` → añade invariante de share-of-active. Sin breaking change → `1.0.0`.

## Política

- Cualquier cambio sustantivo a este spec añade una entrada en este archivo con fecha + autor + resumen.
- Una vez `Accepted`, el spec sólo se modifica para clarificaciones; cambios reales abren un nuevo spec (SPEC-014, ...) que marca este como `Superseded`.
