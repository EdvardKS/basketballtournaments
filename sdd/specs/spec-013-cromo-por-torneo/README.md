# SPEC-013 — Cromo por torneo + carousel histórico

**ID**: `SPEC-013`
**Estado**: Accepted
**Owner**: producto (Edvard)
**Inicio**: 2026-05-22
**Constituciones afectadas**: [cromo.md](../../constitution/cromo.md) `v1.0.0`, [tournaments.md](../../constitution/tournaments.md) `v1.0.0`, [share.md](../../constitution/share.md) `v1.0.0`

## Resumen

El cromo de VBL pasa a ser **por torneo**: solo los inscritos en un torneo concreto reciben cromo de ese torneo, cada torneo tiene paleta visual única (mix fluor/pastel/metálico) no repetible, y un jugador con varios torneos navega por un carousel manual entre sus cromos históricos.

## Archivos del spec

| Archivo | Propósito |
|---------|-----------|
| [spec.md](spec.md) | Historia, reglas, criterios de aceptación |
| [plan.md](plan.md) | Plan técnico por fases |
| [data-model.md](data-model.md) | Schema DB (`tournament_themes`, FKs) |
| [api.md](api.md) | Endpoints nuevos + payloads |
| [ui.md](ui.md) | Carousel, header, share-of-active, animaciones |
| [themes.md](themes.md) | Catálogo curado + algoritmo de asignación |
| [versions.md](versions.md) | Historial del spec |

## Dependencias hacia spec anteriores

- SPEC-012 (informal, commit `8f833de` + `5098a24`): introdujo el render canonical 680×906, sandbox export, html-to-image + JS-driven preview scale + rediseño FUT.
