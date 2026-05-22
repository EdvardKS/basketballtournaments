# SPEC-015 — Tests

## Estrategia

Los tests deben probar SPEC-015 sin confiar en la UI como única garantía. La
base es backend/API, porque ahí viven los riesgos reales: token anónimo,
cronómetro persistido, cierre idempotente y no duplicar clasificación.

Capas:

1. API/backend: obligatorio.
2. Frontend build/typecheck: obligatorio.
3. Smoke UI manual: obligatorio antes de producción.
4. Regresión completa: obligatorio.

## Matriz de cobertura

| Riesgo | Test mínimo |
|--------|-------------|
| Token en claro o reutilizable | Crear sesión, comprobar que solo se devuelve URL/token público y que revocación bloquea mutaciones |
| Doble submit | Enviar dos veces y comparar `group_members` |
| Caducidad por completed | Completar partido por admin y luego intentar mutar con token |
| Cronómetro perdido al refresh | Start/pause/get y comprobar `elapsedSeconds` persistente |
| Bracket roto | Cerrar último grupo por token y comprobar que aparecen KO matches |
| Propagación KO rota | Cerrar semifinal por token y comprobar final/third_place |
| UI admin rompe pre-matchday | Abrir panel antes del día y verificar flujo de preparación |
| UI pública requiere login por error | Abrir `/score/:token` sin cookie |
| Fecha matchday desplazada por timezone | Probar `matchDate` hoy/ayer/mañana como string `YYYY-MM-DD` |
| Carrera admin vs token | Admin completa mientras token intenta submit/score |

## Contrato de errores a testear

| Escenario | Endpoint | Esperado |
|-----------|----------|----------|
| Token inexistente | `GET /api/match-score/:token` | `404 SCORE_SESSION_NOT_FOUND` |
| Token revocado muta | `POST /api/match-score/:token/score` | `410 SCORE_SESSION_CLOSED` |
| Token submitted muta | `POST /api/match-score/:token/score` | `410 SCORE_SESSION_CLOSED` |
| Match completed muta | `POST /api/match-score/:token/score` | `410 MATCH_ALREADY_COMPLETED` |
| Delta no permitido | `POST /api/match-score/:token/score` | `400 VALIDATION` |
| Score negativo absoluto | `POST /api/match-score/:token/score` | `400 VALIDATION` |

## Test API principal — `test/spec-015.sh`

Objetivo: smoke reproducible con `curl`, similar a `test/spec-014.sh`.

Precondiciones:

- Backend accesible en `${BASE:-http://localhost:4000}`.
- Admin bootstrap disponible.
- DB de dev o test, nunca producción.

Flujo recomendado:

1. Login admin.
2. Crear o reutilizar un torneo controlado para test.
3. Preparar torneo con:
   - al menos 4 equipos;
   - grupos generados;
   - al menos un partido de grupo pending.
4. Crear score session:

```bash
POST /api/matches/:id/score-session
```

5. Extraer URL/token.
6. Limpiar cookie jar o usar curl sin cookie.
7. `GET /api/match-score/:token` debe devolver estado editable.
8. `POST /api/match-score/:token/start`.
9. `POST /api/match-score/:token/score`:
   - `{ "side": "home", "delta": 1 }`
   - `{ "side": "home", "delta": 2 }`
   - `{ "side": "home", "delta": -1 }`
   - `{ "side": "away", "delta": 2 }`
10. `POST /api/match-score/:token/pause`.
11. `GET` verifica marcador esperado y reloj pausado.
12. `POST /api/match-score/:token/submit`.
13. Verificar match:
   - `status = completed`;
   - `winnerId` correcto;
   - marcador definitivo correcto.
14. Verificar clasificación:
   - `gamesPlayed` sube una vez por equipo;
   - `pointsFor/pointsAgainst` correctos;
   - puntos de grupo correctos.
15. Repetir submit.
16. Verificar clasificación no cambia.
17. Intentar score tras submit.
18. Debe devolver error/caducado y no mutar.

Criterio de éxito:

- Todos los checks `[OK]`.
- Cualquier fallo imprime payload de respuesta y aborta.

## Test robusto Python — `backend/test/match_score_sessions.py`

Objetivo: test más expresivo usando helpers de `backend/test/_lib.py`.

Casos:

### Caso 1 — Create/Get/Revoke

1. Crear torneo y llegar a setup con grupos.
2. Crear sesión para partido pending.
3. `GET` público devuelve `editable=true`.
4. Revocar sesión.
5. `GET` devuelve `editable=false` con estado `revoked`.
6. `score` devuelve `410 SCORE_SESSION_CLOSED` y no muta.

### Caso 2 — Cronómetro persistido

1. Crear sesión.
2. Start.
3. Esperar 1-2 segundos.
4. Pause.
5. GET.
6. Comprobar `elapsedSeconds >= 1`.
7. Start de nuevo.
8. GET inmediato indica corriendo.

### Caso 3 — Submit grupo idempotente

1. Crear sesión.
2. Score local 11, visitante 8.
3. Submit.
4. Snapshot de standings.
5. Submit otra vez.
6. Snapshot igual.
7. Repetir con dos submits casi simultáneos si el test runner lo permite.

### Caso 4 — Último grupo genera bracket

1. Cerrar todos los grupos salvo uno por endpoints existentes.
2. Cerrar último por token.
3. Listar matches.
4. Verificar `stage != group` existe.

### Caso 5 — KO propaga

1. Llegar a bracket.
2. Crear sesión para semifinal.
3. Submit ganador.
4. Verificar final tiene ese equipo.
5. Verificar third_place tiene perdedor si aplica.

### Caso 6 — Admin completa antes que token

1. Crear sesión.
2. Admin guarda y completa mismo match con endpoints existentes.
3. Intentar score con token.
4. Debe fallar sin mutar marcador.

### Caso 7 — Matchday timezone

1. Construir helper o test UI con `matchDate = hoy` en `YYYY-MM-DD`.
2. Verificar que activa jornada.
3. Cambiar a ayer y mañana.
4. Verificar que no activa jornada.
5. Ejecutar en entorno local sin depender de `new Date(matchDate)` UTC.

## Tests frontend

### Typecheck/build

Comandos:

```bash
docker exec basket_frontend pnpm check
docker exec basket_frontend pnpm build
```

Debe cubrir:

- Tipos de payload público.
- Ruta `/score/[token].astro`.
- Islands nuevas.
- Integración en `AdminPanel`.

### Smoke manual UI pública

Desktop:

1. Abrir `/score/:token`.
2. Iniciar.
3. Sumar y restar puntos.
4. Pausar.
5. Refrescar.
6. Confirmar marcador/reloj conservados.
7. Enviar.
8. Ver pantalla de enviado/caducado.

Mobile:

1. Abrir con viewport móvil.
2. Comprobar que botones son grandes y no se solapan.
3. Comprobar que nombres largos no rompen layout.
4. Enviar resultado.

Token caducado:

1. Abrir token tras partido completed.
2. No deben aparecer controles mutables.

### Smoke manual admin

Antes de matchday:

- Abrir `/dashboard/admin`.
- Confirmar que preparación, grupos editables, horarios, preview y configuración
  siguen disponibles como antes.

Matchday grupos:

- Confirmar tab/foco `Clasificación`.
- Confirmar tablas arriba.
- Confirmar solo partidos de grupo pendientes debajo.
- Completar uno y confirmar que desaparece.

Matchday eliminatorias:

- Cerrar último grupo.
- Confirmar bracket aparece.
- Completar semifinal.
- Confirmar propagación visual.

## Regresión obligatoria

Comandos:

```bash
docker exec basket_backend pnpm check
docker exec basket_frontend pnpm check
docker exec basket_frontend pnpm build
bash test/spec-014.sh
docker exec basket_backend python3 /app/test/full_cycle.py
```

Resultado aceptable:

- Todo verde.

Resultado excepcional:

- Si `full_cycle.py` no puede correr por entorno, se debe documentar:
  - comando exacto;
  - error exacto;
  - por qué es ambiental;
  - qué pruebas alternativas pasaron.

## Datos de prueba recomendados

Usar torneos creados por test con nombres prefijados:

- `SPEC015-*`

Cleanup:

- Al final, marcar torneos test como `completed` o eliminarlos si el entorno de
  test lo permite.
- No limpiar datos reales/manuales.

## Criterios de fallo bloqueante

Bloquea release:

- Doble submit cambia clasificación.
- Token permite mutar partido completed.
- Último grupo no genera bracket.
- Semifinal no propaga ganador.
- Frontend build falla.
- Panel admin pre-matchday cambia comportamiento esperado.
- Cualquier endpoint nuevo requiere cookie por accidente.

No bloquea release si está documentado:

- Falta pulido visual menor que no impide operar.
- `full_cycle.py` no ejecuta por contenedor no disponible, siempre que el runner
  pase después en entorno válido antes de producción.
