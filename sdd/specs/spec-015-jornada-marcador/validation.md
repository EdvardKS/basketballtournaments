# SPEC-015 — Validation

## Propósito

Este documento es el runbook de validación para decidir si SPEC-015 puede pasar
de una fase a la siguiente y, finalmente, si puede considerarse listo para
producción.

La regla central: **si algo falla, no se continúa**. Se corrige o se documenta el
bloqueo antes de avanzar.

## Estado de validación

| Área | Estado | Evidencia |
|------|--------|-----------|
| Baseline | Completada | `pnpm check` backend/frontend con errores legacy `-ISS-` documentados; no introducidos por SPEC-015 |
| DB | Completada | Migración `db/init/19_match_score_sessions.sql` aplicada vía `[migrate] applying 19_match_score_sessions.sql` |
| Backend sesiones | Completada | `backend/src/services/match-score-sessions.ts` + admin endpoints; smoke `test/spec-015.sh` T1–T4 verde |
| Backend submit/idempotencia | Completada | `test/spec-015.sh` T10–T13 verde: standings sum=2 invariante tras doble submit |
| Frontend pública | Completada | `pnpm build` verde; ruta `/score/[token].astro` + `MatchScorePage.tsx` empaquetados |
| Admin matchday | Completada | `AdminPanel.tsx` enfoca clasificación + `MatchdayPendingMatches` bajo tablas; `isMatchday()` por TZ `Europe/Madrid` |
| Eliminatorias | Completada | `AdminBracketEditor` integra `MatchdayPendingMatches` en KO sin tocar bracket dinámico |
| SPEC-014 regresión | Completada | `test/spec-014.sh` PASS=7 FAIL=0 |
| Full cycle | Completada | `docker exec basket_backend python3 /app/test/full_cycle.py` → "ciclo completo" |
| Revisión documental | Completada | Contratos reforzados: timezone, errores, payload, transacción, tests de carrera |

### 2026-05-22 — Implementación SPEC-015

- Rama: `feat/spec-014-tournament-lifecycle-completion`
- Comandos:
  - `bash test/spec-015.sh` → PASS=16 FAIL=0
  - `bash test/spec-014.sh` → PASS=7 FAIL=0
  - `docker exec basket_backend python3 /app/test/full_cycle.py` → ✓ ciclo completo
  - `docker exec basket_frontend pnpm build` → built without errors
- Evidencia funcional:
  - Admin POST/GET/DELETE `/api/matches/:id/score-session` operativo (sólo rol admin)
  - Token público: `GET/POST start|pause|score|submit /api/match-score/:token` sin cookie
  - Doble submit → `410 SCORE_SESSION_CLOSED`, `group_members` no doble-contabiliza
  - Admin completa partido → token caduca a `410 MATCH_ALREADY_COMPLETED`
  - Token inexistente → `404 SCORE_SESSION_NOT_FOUND`
  - Delta no permitido (`{delta:7}`) → `400 VALIDATION`
- Decisión: Avanza — implementación lista para QA UI.

## Checklist por fase

### F0 — Baseline

Comandos:

```bash
git status --short
docker ps
docker exec basket_backend pnpm check
docker exec basket_frontend pnpm check
```

Registrar:

- fecha/hora;
- rama;
- cambios previos;
- contenedores activos;
- resultado de checks.

Gate:

- Si hay fallos previos, deben quedar anotados antes de implementar SPEC-015.

### F1 — DB

Comandos:

```bash
docker compose -f docker-compose.dev.yml up -d db backend
docker logs basket_backend --tail 120
docker exec basket_backend pnpm check
```

Comprobaciones:

- La migración nueva aparece aplicada.
- La tabla `match_score_sessions` existe.
- Constraints existen.
- Backend arranca sin error.

Gate:

- No avanzar con errores de migración.

### F2 — Sesiones Backend

Comandos orientativos:

```bash
docker exec basket_backend pnpm check
```

Pruebas API:

- Crear sesión admin.
- GET público sin cookie.
- Revocar sesión.
- GET posterior no editable.

Gate:

- Token hash no se expone.
- Revocación idempotente.
- Match completed rechazado.

### F3 — Submit e Idempotencia

Pruebas obligatorias:

1. Start/pause/score/submit desde token.
2. Doble submit.
3. Doble submit concurrente si el entorno lo permite.
4. Score después de submit.
5. Admin complete antes de token.
6. Códigos de error `404/410/400`.

Consultas de verificación:

- `matches.status = completed`.
- `matches.winner_id` correcto.
- `group_members.games_played` incrementado una sola vez.
- `group_members.points_for/points_against` correctos.

Gate:

- Cualquier doble conteo bloquea.
- Cualquier mutación por token no activo bloquea.

### F4/F5 — Frontend Público

Comandos:

```bash
docker exec basket_frontend pnpm check
docker exec basket_frontend pnpm build
```

Smoke:

- `/score/:token` activo desktop.
- `/score/:token` activo móvil.
- refresh conserva estado.
- token caducado sin controles.

Gate:

- Build verde.
- No hay solapes graves en móvil.
- No requiere login.

### F6/F7 — Admin Matchday

Casos:

1. Torneo antes de `matchDate`.
2. Torneo con `matchDate = hoy` y grupos pendientes.
3. Torneo con `matchDate = hoy` y grupos cerrados.

Comprobar:

- Antes de matchday se conserva flujo actual.
- En matchday la clasificación es foco inicial.
- `matchDate` se compara como `YYYY-MM-DD` en calendario `Europe/Madrid`.
- Solo aparecen partidos de grupo pendientes bajo clasificación.
- Configuración/horarios/resultados siguen accesibles.
- Completar partido actualiza UI.

Gate:

- Si se rompe flujo pre-matchday, no avanzar.

### F8 — Eliminatorias

Casos:

- Cerrar último grupo y verificar bracket.
- Cerrar semifinal y verificar final.
- Cerrar semifinal y verificar tercer puesto si existe.
- Cerrar final y verificar `winner_id`.

Gate:

- Cualquier fallo de propagación bloquea.

### F9 — Regresión completa

Comandos:

```bash
docker exec basket_backend pnpm check
docker exec basket_frontend pnpm check
docker exec basket_frontend pnpm build
bash test/spec-015.sh
bash test/spec-014.sh
docker exec basket_backend python3 /app/test/full_cycle.py
```

Gate final:

- Todo verde o bloqueo ambiental documentado.

## Plantilla de evidencia

Usar este bloque por cada fase validada:

```md
### YYYY-MM-DD HH:mm — Fase FX

- Rama:
- Commit:
- Comandos:
  - `...` → PASS/FAIL
- Evidencia funcional:
  - ...
- Observaciones:
  - ...
- Decisión:
  - Avanza / Bloqueado
```

## Criterios de release

Release permitido solo si:

- No hay cambios accidentales fuera del scope.
- Todos los endpoints existentes siguen funcionando.
- SPEC-015 smoke pasa.
- SPEC-014 pasa.
- Full cycle pasa.
- El admin puede completar torneo completo desde grupos hasta final.
- La URL temporal no puede mutar partidos cerrados.
- La UI pública funciona en móvil.

## Revisión documental — 2026-05-22

Resultado: apto para implementación quirúrgica.

Cobertura revisada:

- Alcance funcional de `spec.md`.
- Decisiones cerradas de `clarifications.md`.
- Fases y gates de `plan.md`.
- Tareas ejecutables de `tasks.md`.
- Casos de test de `tests.md`.
- Gates de release/rollback de `validation.md`.

Refuerzos añadidos durante la revisión:

- Definición exacta de matchday con calendario `Europe/Madrid`.
- Contrato de errores públicos `404/410/400`.
- Payload mínimo de `GET /match-score/:token`.
- Índice único parcial para una sola sesión activa por partido.
- Submit con transacción obligatoria y bloqueos `SELECT ... FOR UPDATE`.
- Tests de carrera admin vs token y doble submit concurrente.

Riesgo documental residual estimado: bajo. Los errores previsibles de
implementación quedan cubiertos por una regla, una tarea y una validación
explícita.

## Criterios de rollback

Rollback inmediato si en staging/producción se detecta:

- Clasificación duplicada por doble submit.
- Token anónimo mutando partido cerrado.
- Bracket no generado tras grupos completos.
- Admin no puede cerrar resultados manualmente.
- Frontend admin deja de cargar.

Rollback preferente:

1. Desactivar UI que crea enlaces temporales.
2. Mantener endpoints existentes de admin.
3. Si hace falta, revocar sesiones activas en DB.
4. No tocar partidos ya completados salvo corrección manual admin.

## Consulta de sanity post-release

Después de primer torneo real con SPEC-015:

- Número de sesiones creadas.
- Número de sesiones submitted.
- Número de sesiones revoked/expired.
- Partidos completed por admin directo.
- Partidos completed por URL temporal.
- Incidencias de corrección posterior.

Estos datos sirven para decidir si una futura SPEC añade ratificación previa,
auditoría o live multiusuario.
