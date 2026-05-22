# VBL — Constitución del sistema

**Versión raíz**: `1.0.0` — 2026-05-22

Este documento es la raíz de las constituciones por servicio de VBL (Villena Basket League). Cada servicio tiene su propia constitución versionada en este mismo directorio. Una constitución describe el contrato inmutable (invariantes), las dependencias y los no-objetivos de un bounded context. Los cambios sustantivos a una constitución son tracked como nuevas versiones SemVer.

## 1. Misión

VBL es la plataforma de torneos de baloncesto base de Villena. La unidad central de coleccionismo, competición e historia es el **torneo** — no el jugador, no el equipo, no la temporada. Todo lo relevante (cromos, snapshots de skills, brackets, paletas) pertenece a un torneo concreto y se congela cuando ese torneo se completa.

## 2. Principios

1. **Inmutabilidad histórica** — lo que ocurrió en un torneo es inmutable. Los snapshots, paletas, brackets y resultados de un torneo `completed` no se reescriben.
2. **Single source of truth visual** — el cromo (`CromoCard`) se renderiza siempre a tamaño canónico 680×906 px; el preview escala, el export captura el mismo box.
3. **Idempotencia** — todos los endpoints de mutación (registro, draft, score) toleran retry sin duplicar efectos.
4. **Bounded contexts** — cada servicio de negocio tiene su propia constitución y versión. Cambios cruzados requieren bump en cada constitución afectada.
5. **Forward-only migrations** — el schema de DB sólo crece. Nunca se renumeran ficheros aplicados.
6. **Pixel parity export** — lo que se ve en pantalla es lo que se exporta. Si el browser puede pintarlo, el PNG lo lleva.

## 3. Servicios de negocio (bounded contexts)

Los servicios listados aquí son **dominios de negocio**, no contenedores físicos. Cada uno define su contrato en su propio `<servicio>.md`.

| Servicio | Archivo | Versión vigente | Resumen |
|----------|---------|-----------------|---------|
| Auth | [auth.md](auth.md) | 1.0.0 | Login, sesión cookie, roles, CSRF |
| Tournaments | [tournaments.md](tournaments.md) | 1.0.0 | Ciclo de vida, registro, fechas |
| Cromo | [cromo.md](cromo.md) | 1.0.0 | Render canonical, export PNG, theme por torneo |
| Draft | [draft.md](draft.md) | 1.0.0 | Turnos snake, snapshot al cierre |
| Matches | [matches.md](matches.md) | 1.0.0 | Grupos, eliminatorias, scoring |
| Share | [share.md](share.md) | 1.0.0 | Web Share API, deep links, descarga |

## 4. Versionado

- Cada constitución sigue **SemVer**: `major.minor.patch`.
- **Major** — rompe contrato (cambia invariante, elimina endpoint, cambia semántica). Requiere migración + spec nuevo.
- **Minor** — añade capacidad sin romper contrato (nuevo endpoint, nuevo campo opcional).
- **Patch** — bugfix sin cambio de contrato.
- Cada spec aceptado declara en su `versions.md` qué constituciones bumpa y cómo.

## 5. Governance

### Workflow de un cambio

```
Idea → Draft (spec-NNN/) → Proposed → Accepted → Implemented → Superseded
```

1. **Draft** — `sdd/specs/spec-NNN-slug/spec.md` con historia, AC y preguntas abiertas.
2. **Proposed** — añade `plan.md`, `data-model.md`, `api.md`, `ui.md` según corresponda.
3. **Accepted** — el owner del producto firma. Se bumpean las constituciones afectadas.
4. **Implemented** — PR del código referencia el spec en el commit message (`refs SPEC-NNN`).
5. **Superseded** — futuro spec marca este como obsoleto en su `versions.md`.

### Estructura del repo

```
backend/      ← API Node + Postgres
frontend/     ← Astro + React islands
db/init/      ← migraciones SQL forward-only (NN_*.sql)
docs/         ← runbook operacional (no contrato)
sdd/          ← specs + constituciones (contrato)
validation/   ← log de auditoría de wake-ups
test/         ← e2e + integration tests
```

`docs/` es **runbook**: cómo se opera el sistema. `sdd/` es **contrato**: qué garantiza el sistema. Nunca se mezclan.

## 6. Estado del repo

- Branch protegida: `main`. Toda mutación pasa por PR.
- CI ejecuta lint + tests + build de los tres componentes (`backend`, `frontend`, `db`).
- Wake-up validations registradas en `validation/` no implican cambios de código sin PR.

## 7. Historial

```
1.0.0 — 2026-05-22 — Constitución raíz inicial. Servicios: auth, tournaments, cromo, draft, matches, share.
```
