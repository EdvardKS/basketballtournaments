# SPEC-015 — Plan técnico quirúrgico

## Objetivo

Implementar jornada de partido y marcador temporal sin alterar el motor crítico
actual:

- `updateScore` sigue siendo la única operación que persiste marcador definitivo
  en `matches`.
- `completeMatch` sigue siendo la única operación que cierra partido, actualiza
  clasificación de grupos, propaga eliminatorias y puede cerrar el torneo.
- La generación dinámica de bracket no se reimplementa ni se bifurca.

Este plan está pensado para producción: cada fase debe dejar la aplicación en un
estado compilable y verificable. Si una fase falla, no se continúa.

## Invariantes de seguridad

1. No modificar la semántica de `completeMatch`.
2. No modificar el orden de clasificación de grupos.
3. No modificar `generateKnockout`, `provisionBracket` ni
   `propagateBracketWinner`.
4. No cambiar firmas ni respuestas de endpoints existentes.
5. No introducir dependencia de cookie/sesión en la URL pública `/score/:token`.
6. No guardar tokens públicos en claro.
7. No permitir mutación por token cuando el partido está `completed`.
8. No doble-contabilizar `group_members` bajo ningún reintento.
9. No ocultar al admin las herramientas actuales de configuración, horarios,
   resultados y corrección.
10. Cada slice se valida antes de pasar al siguiente.
11. La comparación de matchday usa día calendario `Europe/Madrid` contra
    `matchDate` en formato `YYYY-MM-DD`.
12. Los errores públicos quedan normalizados: token inexistente `404`,
    sesión cerrada `410`, payload inválido `400`.

## Fases

| Fase | Entregable | Riesgo | Validación mínima |
|------|------------|--------|-------------------|
| F0 | Baseline limpio y tests actuales conocidos | Bajo | `git status`, checks actuales si el entorno está arriba |
| F1 | DB forward-only para sesiones temporales | Medio | migración aplica y backend arranca |
| F2 | Servicio backend de sesiones sin submit | Medio | typecheck + tests API create/get/revoke |
| F3 | Submit público usando `updateScore` + `completeMatch` | Alto | doble submit, completed caduca token, standings una vez |
| F4 | Tipos frontend + cliente de score session | Bajo | frontend check |
| F5 | UI pública `/score/:token` | Medio | check/build + prueba manual token activo/caducado |
| F6 | Modal/shared scorer para admin | Medio | admin puede puntuar directo y resultado final directo |
| F7 | Vista jornada en panel admin | Alto | antes de matchDate no cambia; matchDate hoy enfoca clasificación |
| F8 | Eliminatorias con mismo scorer | Medio | cierre KO propaga ganador |
| F9 | E2E SPEC-015 + regresión SPEC-014/full_cycle | Alto | batería completa verde |

## F0 — Baseline

Antes de tocar código:

1. Confirmar que solo existe el trabajo esperado en git.
2. Identificar si el entorno Docker dev está activo.
3. Ejecutar checks disponibles si no son prohibitivos.

Comandos sugeridos:

```bash
git status --short
docker ps
docker exec basket_backend pnpm check
docker exec basket_frontend pnpm check
```

Regla:

- Si el baseline ya falla, registrar el fallo y no mezclarlo con SPEC-015.

## F1 — Modelo de datos

Crear una migración nueva, sin tocar migraciones existentes.

Archivo probable:

- `db/init/19_match_score_sessions.sql`

Tabla propuesta: `match_score_sessions`.

Campos:

- `id`
- `match_id`
- `token_hash`
- `status`
- `home_score`
- `away_score`
- `duration_seconds`
- `started_at`
- `paused_at`
- `elapsed_seconds`
- `created_by`
- `created_at`
- `submitted_at`
- `revoked_at`
- `expired_at`

Restricciones:

- `status IN ('active','submitted','revoked','expired')`
- scores `>= 0`
- `duration_seconds > 0`
- `elapsed_seconds >= 0`
- `token_hash UNIQUE`
- FK `match_id -> matches(id) ON DELETE CASCADE`
- FK opcional `created_by -> players(id)`
- índice único parcial para una sola sesión `active` por `match_id`

Índices:

- búsqueda por `token_hash`
- búsqueda de sesión activa por `match_id`

Decisión quirúrgica:

- No añadir columnas a `matches` en esta fase.
- No añadir triggers. La caducidad por partido cerrado se resuelve en servicio
  leyendo `matches.status` y marcando sesión al consultar/mutar.

Validación:

```bash
docker compose -f docker-compose.dev.yml up -d db backend
docker logs basket_backend --tail 120
docker exec basket_backend pnpm check
```

No avanzar si:

- La migración no aplica.
- El backend no arranca.
- El typecheck falla por cambios de schema/types.

## F2 — Servicio backend de sesiones

Crear servicio aislado.

Archivo probable:

- `backend/src/services/match-score-sessions.ts`

Responsabilidades:

- generar token seguro;
- hashear token;
- crear sesión admin;
- revocar sesión activa previa del mismo partido;
- resolver token público;
- devolver payload público sin filtrar token hash;
- caducar sesión si el match ya está `completed`;
- revocar sesión activa.

Funciones sugeridas:

- `createScoreSession(matchId, adminPlayerId)`
- `revokeScoreSession(matchId)`
- `getPublicScoreSession(token)`
- `assertMutableSessionByToken(token)`
- `expireActiveSessionsForMatch(matchId)` si hace falta para limpieza explícita

Detalles críticos:

- Usar `crypto.randomBytes(32).toString("base64url")`.
- Guardar `sha256(token)`, nunca token.
- Crear sesión dentro de transacción:
  - leer match;
  - rechazar si `completed`;
  - revocar activas previas;
  - insertar nueva sesión.
- Inicializar marcador provisional con `matches.home_score/away_score ?? 0`.
- Duración por defecto:
  - preferir `matches.duration_minutes`;
  - fallback a `tournaments.game_duration_minutes`;
  - fallback final 20 minutos.

Payload público mínimo:

- sesión editable o caducada;
- estado de reloj;
- marcador provisional;
- match con equipos y nombres;
- duración;
- motivo de caducidad si aplica.

Validación:

- Typecheck backend.
- Test API manual o script:
  - admin crea sesión;
  - `GET` público devuelve sesión activa;
  - revocar hace que `GET` devuelva no editable.

No avanzar si:

- Un token revocado permite mutar.
- El payload público expone `token_hash`.

## F3 — Endpoints backend y submit

Archivos probables:

- `backend/src/routes/matches.ts`
- o router nuevo `backend/src/routes/match-score.ts`
- `backend/src/routes/index.ts`

Endpoints admin:

- `POST /matches/:id/score-session`
- `DELETE /matches/:id/score-session`

Endpoints públicos:

- `GET /match-score/:token`
- `POST /match-score/:token/start`
- `POST /match-score/:token/pause`
- `POST /match-score/:token/score`
- `POST /match-score/:token/submit`

Validación de body:

- `score` acepta:
  - `{ side: "home" | "away", delta: -1 | 1 | 2 }`
  - o `{ homeScore: int >= 0, awayScore: int >= 0 }`
- `start/pause/submit` no requieren body.

Lógica de reloj:

- Start:
  - si `started_at` es null o está pausado, poner `started_at=NOW()`,
    `paused_at=NULL`;
  - si ya corre, no-op idempotente;
  - si match `pending`, llamar a `startMatch` o hacer la misma transición segura.
- Pause:
  - si corre, sumar diferencia `NOW() - started_at` a `elapsed_seconds`;
  - poner `paused_at=NOW()`, `started_at=NULL`;
  - si ya pausado, no-op.
- Tiempo agotado:
  - la UI puede mostrar `elapsed >= duration`;
  - backend no completa automáticamente sin `submit`.

Lógica de submit:

Debe estar en transacción. No es opcional.

Secuencia:

1. Resolver token por `sha256(token)`.
2. Bloquear la sesión con `SELECT ... FOR UPDATE`.
3. Bloquear el match asociado con `SELECT ... FOR UPDATE`.
4. Si la sesión no está `active`, devolver `410 SCORE_SESSION_CLOSED`.
5. Si el match ya está `completed`, marcar sesión `expired` cuando siga
   `active` y devolver no-op seguro sin llamar a `completeMatch`.
6. Persistir marcador provisional con `updateScore`.
7. Llamar a `completeMatch`.
8. Marcar sesión `submitted`.
9. Expirar/revocar otras sesiones activas del mismo match.

Punto delicado:

- `completeMatch` ya es idempotente para `completed`, pero no se debe llamar en
  doble submit si se puede evitar. El servicio debe comprobar `matches.status`.

Validación específica obligatoria:

- Doble submit no cambia `group_members` dos veces.
- Submit de último partido de grupos genera bracket.
- Submit de eliminatoria propaga ganador.
- Token activo caduca si admin completó antes.

No avanzar si:

- Hay cualquier camino donde `completeMatch` se esquive.
- Doble submit altera clasificación.

## F4 — Tipos y cliente frontend

Archivos probables:

- `frontend/src/lib/types.ts`
- `frontend/src/lib/matchScore.ts`

Tipos nuevos:

- `MatchScoreSessionStatus`
- `PublicMatchScoreState`
- `ScoreSide`
- `ScoreDelta`

Cliente:

- `getScoreSession(token)`
- `startScoreSession(token)`
- `pauseScoreSession(token)`
- `updateScoreSession(token, payload)`
- `submitScoreSession(token)`
- `createMatchScoreSession(matchId)`
- `revokeMatchScoreSession(matchId)`

Reglas:

- Usar `api.ts` para admin.
- Para página pública, usar `fetch('/api/match-score/...', { credentials:
  'omit' })` desde el cliente específico de score session. No depender de
  cookies aunque el usuario tenga sesión abierta en otra pestaña.
- No meter lógica de negocio de reloj en múltiples sitios; crear helper de
  cálculo visual de elapsed.

Validación:

```bash
docker exec basket_frontend pnpm check
```

## F5 — Página pública `/score/:token`

Archivos probables:

- `frontend/src/pages/score/[token].astro`
- `frontend/src/islands/MatchScorePage.tsx`

UI:

- layout simple, sin requerir sesión;
- equipos visibles;
- marcador grande;
- controles táctiles grandes:
  - local `-1`, `+1`, `+2`;
  - visitante `-1`, `+1`, `+2`;
- cronómetro:
  - iniciar;
  - pausar/reanudar;
  - estado tiempo agotado;
- enviar resultados con confirmación.

Estados:

- loading;
- active;
- submitted;
- expired/revoked/completed;
- error.

Decisiones UX:

- El botón enviar debe pedir confirmación.
- Si marcador `0-0`, pedir confirmación extra.
- Si tiempo está agotado, permitir seguir ajustando marcador.

Validación:

```bash
docker exec basket_frontend pnpm check
docker exec basket_frontend pnpm build
```

Prueba manual:

- Abrir token activo sin login.
- Refrescar tras sumar puntos.
- Pausar/refrescar.
- Enviar y comprobar pantalla cerrada.

## F6 — Scorer compartido para admin

Archivos probables:

- `frontend/src/islands/admin/MatchdayScoreModal.tsx`
- o componente compartido `frontend/src/islands/MatchScoreControls.tsx`

Objetivo:

- No duplicar demasiado la UI de `QuickScoreSheet`, pero tampoco romperlo.
- La forma segura es crear un componente nuevo para SPEC-015 y dejar los
  componentes existentes funcionando.

Funcionalidades admin:

- abrir sobre un match;
- iniciar partido;
- marcador `+1`, `+2`, `-1`;
- guardar/finalizar;
- resultado final directo;
- crear/copiar URL temporal;
- revocar URL temporal si existe.

Reglas:

- Admin directo usa endpoints existentes `/matches/:id/score` y
  `/matches/:id/complete`.
- Link temporal usa endpoints nuevos.
- Resultado final directo no inicia cronómetro.

Validación:

- Admin completa partido de grupo desde modal.
- Clasificación cambia.
- Partido desaparece de pendientes.
- Resultado directo funciona con `0-0` solo tras confirmación.

## F7 — Vista jornada en admin

Archivo probable:

- `frontend/src/islands/admin/AdminPanel.tsx`

Helper recomendado:

- `isMatchday(tournament.matchDate): boolean`
  - comparar `YYYY-MM-DD` en calendario `Europe/Madrid`;
  - no usar `new Date(matchDate)` como única fuente porque puede desplazar día
    por timezone.

Cambios mínimos:

- Ajustar tab inicial cuando:
  - `matchDate == hoy`;
  - fase visual es `groups`;
  - existen grupos.
- En tab `grupos`, durante matchday:
  - renderizar clasificación;
  - debajo renderizar solo `matches.filter(stage='group' && status!='completed')`;
  - cada card abre el scorer de F6.
- Mantener tabs secundarios:
  - `Marcador rápido`;
  - `Eliminatorias`;
  - `Resultados`;
  - `Configuración`.

No tocar:

- `GroupEditor` pre-matchday.
- `BracketConfigPicker`.
- `PreviewTab`.
- `DangerZone`.

Validación:

- Antes de matchDate:
  - grupos editables siguen editables si aplica;
  - preview/config siguen visibles.
- En matchDate:
  - tab inicial clasificación;
  - solo pendientes bajo tablas;
  - completado un grupo match desaparece de pendientes.
- Después de cerrar grupos:
  - bracket aparece.

## F8 — Eliminatorias con scorer

Archivos probables:

- `AdminBracketView.tsx`
- `MatchEditOverlay.tsx`
- nuevo scorer modal de F6

Enfoque quirúrgico:

- No reemplazar `MatchEditOverlay` de golpe.
- Añadir acción de "marcador" para partidos no completed, o ampliar overlay con
  entrada al scorer.
- Mantener resultado final directo disponible.

Validación:

- Cerrar semifinal propaga ganador a final.
- Cerrar final fija `winner_id`.
- SPEC-014 sigue impidiendo completar torneo hasta todos los matches completed.

## F9 — Tests

### Test backend SPEC-015

Archivo sugerido:

- `test/spec-015.sh` para smoke curl rápido.
- `backend/test/match_score_sessions.py` para validación robusta de carreras,
  idempotencia y propagación.

Escenarios mínimos:

1. Login admin.
2. Preparar torneo con grupos y partido pendiente.
3. Crear score session.
4. GET público sin cookie.
5. Start.
6. Score `+1`, `+2`, `-1`.
7. Pause.
8. Submit.
9. Verificar:
   - match `completed`;
   - clasificación actualizada;
   - token ya no permite score;
   - doble submit no cambia clasificación.
10. Crear otro partido, completar como admin y verificar token caducado.
11. Cerrar último grupo vía token y verificar bracket generado.

### Regresión obligatoria

```bash
docker exec basket_backend pnpm check
docker exec basket_frontend pnpm check
docker exec basket_frontend pnpm build
bash test/spec-014.sh
docker exec basket_backend python3 /app/test/full_cycle.py
```

Si `full_cycle.py` no puede ejecutarse por entorno:

- documentar causa exacta;
- ejecutar al menos checks + SPEC-014 + SPEC-015 smoke;
- no marcar el spec como implementado hasta que el runner pase en entorno válido.

## Orden de commits sugerido

1. `refs SPEC-015 docs: add matchday scoring plan`
2. `refs SPEC-015 db: add match score sessions`
3. `refs SPEC-015 backend: add score session service`
4. `refs SPEC-015 backend: expose score session routes`
5. `refs SPEC-015 frontend: add public score page`
6. `refs SPEC-015 frontend: add admin matchday scorer`
7. `refs SPEC-015 test: add score session acceptance`

Cada commit debe poder explicarse y revertirse sin arrastrar fases posteriores.

## Checklist de no regresión visual

- `/dashboard/admin` sin torneo.
- `/dashboard/admin` con torneo `open`.
- `/dashboard/admin` en `draft`.
- `/dashboard/admin` en `setup` antes de matchday.
- `/dashboard/admin` en matchday con grupos pendientes.
- `/dashboard/admin` en matchday tras grupos cerrados.
- `/score/:token` móvil.
- `/score/:token` desktop.
- `/score/:token` caducado.
- Página pública de torneo con grupos y bracket.

## Definición de terminado

SPEC-015 se considera implementable/implementado solo si:

- Los docs del spec están actualizados.
- La constitución `Matches` refleja el bump minor.
- La app compila backend y frontend.
- El flujo externo por token cierra partido sin doble conteo.
- El admin conserva resultado final directo.
- El último grupo genera bracket sin intervención adicional.
- SPEC-014 sigue pasando.
- `full_cycle.py` pasa o queda un bloqueo ambiental documentado y reproducible.
