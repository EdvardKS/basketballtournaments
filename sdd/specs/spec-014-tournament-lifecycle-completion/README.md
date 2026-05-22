# SPEC-014 — Cierre de torneo + historial por fecha

**ID**: `SPEC-014`
**Estado**: Accepted
**Owner**: producto (Edvard)
**Inicio**: 2026-05-22
**Constituciones afectadas**: [tournaments.md](../../constitution/tournaments.md) `v1.0.0 → v1.1.0`

## Resumen

Un torneo se considera **cerrado** sólo cuando los tres puestos del podio (champion + runner_up + third) están adjudicados; sólo entonces el panel del admin libera el botón "Crear nuevo torneo". Hasta ese momento, el torneo permanece "en curso" (estado `active` o anterior) aunque ya haya pasado la fecha del partido. Eso sí: un torneo cuya `match_date` ya pasó aparece en el **historial** del admin junto a los `completed`, para que sea fácil ver "qué hubo ese día" aunque queden eliminatorias por puntuar.

## Archivos del spec

| Archivo | Propósito |
|---------|-----------|
| [spec.md](spec.md) | Reglas, criterios de aceptación |
| [plan.md](plan.md) | Plan técnico |
| [api.md](api.md) | Endpoints afectados |
| [ui.md](ui.md) | Admin panel + historial |
| [versions.md](versions.md) | Historial del spec |

## Dependencias

- SPEC-013 (cromo por torneo) — los cromos de torneos con `match_date < today` siguen mostrando stats live hasta que el torneo se complete realmente; luego se congelan.
