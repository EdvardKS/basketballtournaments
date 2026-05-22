# SPEC-013 — Versiones

## Historial

```
0.1.0 — 2026-05-22 — Draft inicial
0.2.0 — 2026-05-22 — Promovido a Proposed: añadidos data-model, api, ui, themes
1.0.0 — 2026-05-22 — Accepted. Implementación iniciada en branch feat/spec-013-cromo-por-torneo
```

## Constituciones afectadas

- `sdd/constitution/cromo.md` → bump `0.x → 1.0.0` (era inexistente; este spec define el contrato inicial del servicio cromo).
- `sdd/constitution/tournaments.md` → introduce `tournaments.theme_id` dependency. Sin breaking change → `1.0.0`.
- `sdd/constitution/share.md` → añade invariante de share-of-active. Sin breaking change → `1.0.0`.

## Política

- Cualquier cambio sustantivo a este spec añade una entrada en este archivo con fecha + autor + resumen.
- Una vez `Accepted`, el spec sólo se modifica para clarificaciones; cambios reales abren un nuevo spec (SPEC-014, ...) que marca este como `Superseded`.
