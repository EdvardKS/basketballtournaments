# SPEC-015 — Tasks

## Reglas de ejecución

- Ejecutar las tareas en orden.
- No empezar una tarea marcada como dependiente si su gate anterior no está
  verde.
- No mezclar refactors ajenos a SPEC-015.
- No tocar el motor de clasificación/bracket salvo para llamarlo por las
  funciones existentes.
- Si aparece una regresión en producción local, parar y documentar antes de
  continuar.

## F0 — Baseline

| ID | Tarea | Archivos | Gate |
|----|-------|----------|------|
| T0.1 | Revisar `git status --short` y anotar cambios previos del usuario | repo | Sin cambios inesperados en archivos a tocar |
| T0.2 | Confirmar stack dev disponible o documentar que se trabajará solo con typecheck local | Docker / paquetes | Estado del entorno conocido |
| T0.3 | Ejecutar checks baseline si el entorno lo permite | backend/frontend | Fallos existentes documentados |

Salida esperada:

- Nota de baseline con fecha, comandos ejecutados y fallos previos si existen.

## F1 — DB

| ID | Tarea | Archivos | Gate |
|----|-------|----------|------|
| T1.1 | Crear migración forward-only de `match_score_sessions` | `db/init/19_match_score_sessions.sql` | Migración idempotente |
| T1.2 | Añadir constraints de estado, scores y tiempo | mismo | No acepta valores inválidos |
| T1.3 | Añadir índices de token y sesión activa por match | mismo | Consultas esperadas cubiertas |
| T1.3b | Añadir índice único parcial para una sola sesión `active` por match | mismo | No hay doble link activo |
| T1.4 | Levantar backend y comprobar que migraciones aplican | Docker/backend | Backend arranca |

No hacer:

- No añadir columnas a `matches`.
- No crear triggers.
- No modificar migraciones previas.

Gate de fase:

- Backend arranca con migración aplicada.
- `pnpm check` backend no introduce errores nuevos.

## F2 — Servicio Backend

| ID | Tarea | Archivos | Gate |
|----|-------|----------|------|
| T2.1 | Crear servicio de sesiones | `backend/src/services/match-score-sessions.ts` | Typecheck |
| T2.2 | Implementar generación token + hash SHA-256 | mismo | Token claro nunca persistido |
| T2.3 | Implementar crear sesión admin | mismo | Rechaza match completed |
| T2.4 | Revocar sesiones activas previas al crear una nueva | mismo | Solo una activa por match |
| T2.5 | Implementar resolver token público | mismo | No expone hash |
| T2.6 | Implementar caducidad si match completed | mismo | Token completed no muta |
| T2.7 | Implementar revocación idempotente | mismo | Revocar dos veces no falla |

Gate de fase:

- Tests/API manuales de create/get/revoke verdes.
- No hay cambios en `completeMatch`.

## F3 — Rutas Backend

| ID | Tarea | Archivos | Gate |
|----|-------|----------|------|
| T3.1 | Añadir endpoints admin de crear/revocar sesión | `backend/src/routes/matches.ts` o router nuevo | Admin auth correcta |
| T3.2 | Montar router público `/match-score/:token` | `backend/src/routes/index.ts` | No requiere login |
| T3.3 | Implementar `GET` público | router/servicio | Devuelve active/caducado |
| T3.4 | Implementar `start` idempotente | router/servicio | Match pending pasa a in_progress |
| T3.5 | Implementar `pause` idempotente | router/servicio | Acumula elapsed una vez |
| T3.6 | Implementar `score` por delta y absoluto | router/servicio | Nunca baja de 0 |
| T3.7 | Implementar `submit` vía `updateScore` + `completeMatch` | router/servicio | Cierra match correctamente |
| T3.8 | Añadir manejo doble submit | router/servicio | No doble contabiliza |
| T3.9 | Normalizar errores públicos `404/410/400` | router/servicio | UI puede distinguir estados |
| T3.10 | Bloquear sesión y match en submit | router/servicio | Sin carreras entre dispositivos/admin |

Gate de fase:

- `pnpm check` backend verde.
- Smoke API de start/pause/score/submit verde.
- Doble submit verificado.

## F4 — Tipos y Cliente Frontend

| ID | Tarea | Archivos | Gate |
|----|-------|----------|------|
| T4.1 | Añadir tipos públicos de score session | `frontend/src/lib/types.ts` | Typecheck |
| T4.2 | Crear cliente frontend de score sessions | `frontend/src/lib/matchScore.ts` | Sin duplicar wrapper API innecesario |
| T4.3 | Añadir helper puro de cálculo de reloj visual | `frontend/src/lib/matchScore.ts` | Tests manuales simples |

Gate de fase:

- `pnpm check` frontend verde.

## F5 — Página Pública

| ID | Tarea | Archivos | Gate |
|----|-------|----------|------|
| T5.1 | Crear ruta `/score/[token].astro` | `frontend/src/pages/score/[token].astro` | Render sin sesión |
| T5.2 | Crear island de marcador público | `frontend/src/islands/MatchScorePage.tsx` | Estados cubiertos |
| T5.3 | Implementar controles `-1`, `+1`, `+2` por equipo | mismo | Mobile usable |
| T5.4 | Implementar start/pause/reanudar | mismo | Refresh conserva estado |
| T5.5 | Implementar confirmar envío | mismo | No submit accidental |
| T5.6 | Implementar estados caducado/enviado/error | mismo | Token cerrado no muta |

Gate de fase:

- `pnpm check` frontend verde.
- `pnpm build` frontend verde.
- Prueba manual token activo/caducado.

## F6 — Marcador Admin

| ID | Tarea | Archivos | Gate |
|----|-------|----------|------|
| T6.1 | Crear modal/panel admin de marcador SPEC-015 | `frontend/src/islands/admin/MatchdayScoreModal.tsx` | No rompe overlay actual |
| T6.2 | Admin directo usa endpoints actuales de score/complete | mismo | Clasificación actualiza |
| T6.3 | Añadir resultado final directo | mismo | Sin cronómetro |
| T6.4 | Añadir crear/copiar URL temporal | mismo | URL válida |
| T6.5 | Añadir revocar URL temporal | mismo | URL deja de mutar |

Gate de fase:

- Admin completa partido de grupo.
- Admin crea URL y la URL funciona.
- Resultado final directo funciona.

## F7 — Panel Admin Matchday

| ID | Tarea | Archivos | Gate |
|----|-------|----------|------|
| T7.1 | Añadir helper `isMatchday` por fecha `YYYY-MM-DD` y calendario `Europe/Madrid` | `AdminPanel.tsx` o helper lib | Sin desplazamiento por timezone |
| T7.2 | Ajustar tab inicial solo en matchday con grupos pendientes | `AdminPanel.tsx` | Antes de matchday no cambia |
| T7.3 | En tab clasificación, mostrar tablas de grupo arriba | mismo | UI actual reutilizada |
| T7.4 | Debajo mostrar solo partidos de grupo pendientes | mismo | Completed no aparece |
| T7.5 | Abrir marcador admin desde card | mismo | Flujo directo |
| T7.6 | Mantener acceso a horarios/resultados/config | mismo | Nada queda oculto |

Gate de fase:

- Pre-matchday conserva `GroupEditor`/preview/config.
- Matchday enfoca clasificación.
- Al cerrar último grupo aparece bracket.

## F8 — Eliminatorias

| ID | Tarea | Archivos | Gate |
|----|-------|----------|------|
| T8.1 | Añadir entrada al scorer en partidos KO pendientes | `AdminBracketView.tsx` / overlay | Bracket visual intacto |
| T8.2 | Mantener resultado final directo actual | `MatchEditOverlay.tsx` o nuevo modal | Corrección sigue disponible |
| T8.3 | Probar semifinal/final/tercer puesto | UI + backend | Propagación correcta |

Gate de fase:

- Ganador de semifinal llega a final.
- Perdedor de semifinal llega a tercer puesto.
- Final fija `winner_id`.

## F9 — Tests y Regresión

| ID | Tarea | Archivos | Gate |
|----|-------|----------|------|
| T9.1 | Crear smoke SPEC-015 | `test/spec-015.sh` | Reproducible |
| T9.2 | Crear test Python robusto | `backend/test/match_score_sessions.py` | Integra con helpers |
| T9.3 | Ejecutar SPEC-014 | `test/spec-014.sh` | Verde |
| T9.4 | Ejecutar full cycle | `backend/test/full_cycle.py` | Verde |
| T9.5 | Documentar resultados en `validation.md` | SDD | Evidencia clara |

Gate final:

- Backend check verde.
- Frontend check verde.
- Frontend build verde.
- SPEC-015 smoke verde.
- SPEC-014 verde.
- Full cycle verde o bloqueo ambiental documentado.

## Definition of Done

- `spec.md`, `clarifications.md`, `plan.md`, `tasks.md`, `tests.md` y
  `validation.md` actualizados.
- Constitución `Matches` actualizada con bump minor cuando se implemente código.
- No hay cambios accidentales fuera del scope.
- Cada fase tiene evidencia de validación.
- La aplicación conserva el flujo actual completo de torneo.
