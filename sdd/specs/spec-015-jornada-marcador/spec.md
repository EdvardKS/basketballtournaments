# SPEC-015 — Jornada de Partido y Marcador Temporal

## Historia de usuario

> Como admin, el día del torneo quiero entrar al panel y ver como foco principal
> la clasificación de grupos y los partidos pendientes, poder puntuar un partido
> desde mi cuenta o compartir una URL temporal para que otra persona lleve el
> marcador, y que el resultado cierre el partido usando el flujo normal de la
> aplicación sin romper clasificación, eliminatorias ni cierre de torneo.

## Contexto actual del código

- El motor crítico ya existe en `backend/src/services/matches.ts`:
  - `updateScore(matchId, { homeScore, awayScore })` persiste marcador.
  - `completeMatch(matchId)` valida marcador, marca `completed`, calcula ganador,
    actualiza `group_members`, propaga ganadores de eliminatoria, genera bracket
    tras el último partido de grupos y llama al cierre real de SPEC-014.
- La generación de eliminatorias vive en `backend/src/services/bracket.ts` y se
  dispara desde `completeMatch` cuando todos los grupos están cerrados.
- El panel admin actual vive principalmente en
  `frontend/src/islands/admin/AdminPanel.tsx`.
- La fase visual se deriva en `frontend/src/lib/tournamentPhase.ts`.
- Ya existen dos entradas de marcador admin:
  - `QuickScoreSheet.tsx`: marcador rápido con `+1`, `+2`, `-1`, guardar y
    finalizar.
  - `MatchEditOverlay.tsx`: resultado final directo y edición/recalcular para
    partidos ya cerrados.

## Principios de implementación

1. **No duplicar reglas de negocio** — cualquier resultado definitivo debe pasar
   por `updateScore` + `completeMatch`. SPEC-015 añade una capa de jornada y
   captura, no un segundo motor de clasificación.
2. **Producción primero** — cada cambio debe ser pequeño, reversible y validado
   antes de pasar al siguiente. Si una validación falla, se detiene el trabajo.
3. **Forward-only DB** — cualquier schema nuevo se añade con migración nueva
   idempotente; no se renumeran migraciones ni se reescriben tablas existentes.
4. **No romper bracket dinámico** — no tocar la selección de clasificados, seeding
   ni propagación de ganadores salvo para consumir el mismo cierre de partido ya
   existente.
5. **Completed es terminal** — un partido completado no se reabre. Las
   correcciones posteriores siguen el flujo admin actual: editar marcador cerrado
   y recalcular clasificación si aplica.

## Reglas funcionales

### Activación de jornada

1. La vista especial de jornada se activa únicamente cuando
   `tournament.matchDate == hoy`.
2. La comparación de "hoy" se hace contra el día calendario de la app en
   `Europe/Madrid`, usando el valor `YYYY-MM-DD` de `matchDate`; no debe depender
   de parseos UTC que puedan mover la fecha en el navegador.
3. Antes del día del torneo, el panel mantiene el comportamiento actual de
   preparación, grupos, horarios, preview y configuración.
4. El día del torneo, si quedan partidos de grupos pendientes, el foco inicial
   del admin es `Clasificación`.
5. Cuando ya no quedan partidos de grupos pendientes y existen eliminatorias, el
   foco principal pasa a `Eliminatorias`, manteniendo el bracket actual.

### Panel admin durante grupos

1. Al entrar en `/dashboard/admin` el día del torneo, el admin debe ver:
   - bloque superior con clasificación de todos los grupos;
   - debajo, cards solo de partidos de grupo con `status != completed`;
   - acceso secundario a configuración/horarios/resultados sin ocultarlos.
2. Al hacer click en una card pendiente o en juego, se abre la vista de marcador
   del partido.
3. La vista de marcador admin debe permitir:
   - iniciar partido;
   - pausar/reanudar cronómetro;
   - sumar `+1`, `+2`;
   - restar `-1` con mínimo `0`;
   - finalizar tiempo manualmente;
   - enviar/finalizar resultado;
   - introducir resultado final directo sin cronómetro.
4. Si el admin puntúa desde su cuenta, no existe ratificación adicional: el
   cierre es directo porque ya está autenticado como admin.

### Enlace temporal

1. El admin puede crear una URL temporal única para un partido pendiente o en
   juego.
2. La URL no requiere login y solo permite operar sobre ese partido.
3. Crear una nueva URL para el mismo partido revoca cualquier URL activa previa.
4. La URL caduca cuando:
   - el partido pasa a `completed`;
   - el admin la revoca;
   - la sesión se marca como `submitted`;
   - la sesión se marca como `expired`.
5. La DB nunca debe guardar el token en claro; debe guardar un hash irreversible.
6. La persona externa con la URL puede:
   - ver equipos y marcador;
   - iniciar/pausar/reanudar cronómetro;
   - sumar `+1`, `+2`, restar `-1`;
   - enviar resultado.
7. Al pulsar **Enviar resultados**, el backend guarda el marcador y completa el
   partido usando el flujo existente. No hay ratificación previa en SPEC-015.

### Cronómetro

1. El cronómetro es persistido en servidor.
2. Refrescar la página o abrir la URL en otro dispositivo debe reconstruir el
   estado desde servidor.
3. El cronómetro no bloquea correcciones: tras llegar a cero, se permite ajustar
   el marcador antes de enviar resultado.
4. El fin automático del tiempo puede dejar el partido listo para enviar, pero
   no debe cerrar el partido sin una acción explícita de enviar/finalizar.

### Resultado final directo

1. Para partidos llevados en otra aplicación, el admin puede introducir marcador
   final sin iniciar cronómetro.
2. Ese flujo debe reutilizar el cierre actual: guardar marcador y llamar a
   `completeMatch`.
3. No debe crear sesión temporal si el admin no la solicita.

### Eliminatorias

1. Tras completar todos los grupos, las eliminatorias deben aparecer con el
   comportamiento actual.
2. SPEC-015 no cambia:
   - cómo se calculan clasificados;
   - cómo se ordenan grupos;
   - cómo se siembra el bracket;
   - cómo se propaga el ganador;
   - cuándo se completa el torneo según SPEC-014.
3. Los partidos de eliminatoria usan el mismo marcador admin/temporal, pero sin
   tocar la lógica del bracket.

## Modelo de datos propuesto

Nueva tabla obligatoria: `match_score_sessions`.

Campos obligatorios:

| Campo | Propósito |
|-------|-----------|
| `id` | Identificador interno de la sesión. |
| `match_id` | Partido asociado. |
| `token_hash` | Hash irreversible del token público. |
| `status` | `active`, `submitted`, `revoked`, `expired`. |
| `home_score` | Marcador provisional local. |
| `away_score` | Marcador provisional visitante. |
| `duration_seconds` | Duración prevista del partido. |
| `started_at` | Momento de arranque/reanudación actual. |
| `paused_at` | Momento de última pausa. |
| `elapsed_seconds` | Tiempo acumulado ya consumido. |
| `created_by` | Admin que creó la URL. |
| `created_at` | Creación. |
| `submitted_at` | Envío final. |
| `revoked_at` | Revocación admin. |
| `expired_at` | Caducidad por partido cerrado u otra regla. |

Restricciones necesarias:

- `home_score >= 0`.
- `away_score >= 0`.
- `duration_seconds > 0`.
- `elapsed_seconds >= 0`.
- `token_hash UNIQUE`.
- FK `match_id -> matches(id) ON DELETE CASCADE`.
- FK `created_by -> players(id)` nullable.
- Índice único parcial que impida más de una sesión `active` por `match_id`.
- Índice por `token_hash`.

Semántica de estados:

| Estado | Significado | Puede mutar |
|--------|-------------|-------------|
| `active` | Sesión vigente y partido no completado | Sí |
| `submitted` | La sesión ya envió resultado | No |
| `revoked` | Admin revocó la sesión | No |
| `expired` | El partido cerró por otro camino o la sesión quedó obsoleta | No |

## API propuesta

### Endpoints admin

#### `POST /matches/:id/score-session`

Auth: admin.

Crea una sesión temporal para el partido.

Reglas:

- Rechaza si el partido no existe.
- Rechaza si el partido está `completed`.
- Revoca sesiones activas previas del mismo partido.
- Inicializa marcador desde `matches.home_score/away_score` si existen; si no,
  `0-0`.
- Devuelve URL pública construible por frontend.
- Debe usar token aleatorio de 32 bytes mínimo y persistir solo `sha256(token)`.

Respuesta:

```json
{
  "url": "/score/<token>",
  "expiresWhen": "match_completed",
  "session": {
    "id": "uuid",
    "matchId": "uuid",
    "status": "active"
  }
}
```

#### `DELETE /matches/:id/score-session`

Auth: admin.

Revoca la sesión activa del partido si existe. Debe ser idempotente.

### Endpoints públicos por token

Contrato de errores:

| Caso | Código HTTP | Error |
|------|-------------|-------|
| Token inexistente | `404` | `SCORE_SESSION_NOT_FOUND` |
| Sesión no mutable (`submitted`, `revoked`, `expired`) | `410` | `SCORE_SESSION_CLOSED` |
| Partido ya `completed` | `410` | `MATCH_ALREADY_COMPLETED` |
| Payload inválido | `400` | `VALIDATION` |

`GET` puede devolver `200` con `editable=false` para una sesión conocida ya no
mutable, de forma que la UI pueda mostrar un estado explicativo. Los endpoints
de mutación sí deben devolver `410` si no se puede operar.

#### `GET /match-score/:token`

Auth: pública.

Devuelve estado de partido y sesión.

Debe devolver modo caducado/no editable si:

- token no existe;
- sesión no está `active`;
- partido está `completed`.

Payload mínimo:

```json
{
  "editable": true,
  "closedReason": null,
  "session": {
    "id": "uuid",
    "status": "active",
    "homeScore": 0,
    "awayScore": 0,
    "durationSeconds": 1200,
    "elapsedSeconds": 0,
    "startedAt": null,
    "pausedAt": null
  },
  "match": {
    "id": "uuid",
    "status": "pending",
    "stage": "group",
    "homeTeamName": "Equipo A",
    "awayTeamName": "Equipo B",
    "homeScore": null,
    "awayScore": null
  }
}
```

#### `POST /match-score/:token/start`

Auth: pública por token.

Arranca o reanuda cronómetro.

Reglas:

- Si el partido estaba `pending`, puede iniciar el estado de partido usando el
  endpoint/servicio existente equivalente a `startMatch`.
- Si ya estaba corriendo, debe ser idempotente.

#### `POST /match-score/:token/pause`

Auth: pública por token.

Pausa cronómetro y acumula tiempo.

#### `POST /match-score/:token/score`

Auth: pública por token.

Permite dos formas:

```json
{ "side": "home", "delta": 1 }
```

```json
{ "homeScore": 11, "awayScore": 8 }
```

Reglas:

- `delta` permitido: `-1`, `1`, `2`.
- Nunca baja de `0`.
- No cierra el partido.

#### `POST /match-score/:token/submit`

Auth: pública por token.

Guarda marcador provisional en `matches`, llama a `completeMatch` y marca la
sesión como `submitted`.

Debe ser seguro ante reintentos:

- Si el partido ya está `completed`, no debe volver a contabilizar standings.
- Debe devolver el partido cerrado actual.

Debe ejecutarse con protección transaccional:

- bloquear la sesión por `token_hash`;
- bloquear el match asociado;
- comprobar estado del match antes de llamar a `completeMatch`;
- marcar la sesión como `submitted` solo después de que el cierre haya terminado;
- si el cierre ya ocurrió, devolver no-op seguro sin tocar `group_members`.

## UI propuesta

### Admin

- Reutilizar diseño y comportamiento de `QuickScoreSheet` donde sea posible.
- Evitar introducir una UI paralela incompatible: la nueva vista de marcador
  debe hablar con los mismos endpoints de score/complete para admin.
- En grupos, añadir una sección de jornada que combine:
  - clasificación;
  - lista de partidos de grupo pendientes;
  - modal/panel de marcador al click.
- En eliminatorias, mantener `AdminBracketView` como vista principal y añadir la
  misma acción de marcador sobre cada match pendiente/en juego.
- El botón de enlace temporal debe copiar/mostrar `/score/:token`.
- El modo "resultado final directo" debe quedar claramente separado del
  cronómetro.

### Página pública `/score/:token`

- No requiere sesión.
- Debe usar layout simple y enfocado al partido.
- Estados visuales:
  - cargando;
  - activo;
  - enviado;
  - caducado/cerrado;
  - error.
- En activo muestra:
  - equipos;
  - marcador grande;
  - botones `+1`, `+2`, `-1` para cada equipo;
  - iniciar/pausar;
  - finalizar tiempo;
  - enviar resultados con confirmación.

## Criterios de aceptación

| # | Escenario | Resultado esperado |
|---|-----------|--------------------|
| AC1 | Admin abre panel en `matchDate = hoy` con grupos pendientes | Ve `Clasificación` como foco inicial, tablas de grupo y solo partidos de grupo pendientes debajo. |
| AC2 | Admin abre panel antes de `matchDate` | Se conserva el flujo actual; no se fuerza la vista de jornada. |
| AC3 | Admin crea URL temporal para partido pendiente | Recibe URL `/score/:token`; cualquier sesión activa anterior queda revocada. |
| AC4 | Persona externa abre URL activa | Ve marcador, equipos y cronómetro sin login. |
| AC5 | Persona externa inicia, pausa, refresca | El reloj y marcador se reconstruyen desde servidor. |
| AC6 | Persona externa suma `+1`, `+2`, resta `-1` | El marcador provisional cambia sin bajar de `0`. |
| AC7 | Persona externa envía resultado | El partido queda `completed`, se actualiza clasificación si es grupo y el token deja de mutar. |
| AC8 | Se reintenta submit del mismo token | No se doble-contabiliza clasificación; respuesta segura/idempotente. |
| AC9 | Admin completa partido mientras existe URL activa | Al abrir la URL aparece caducada/cerrada y no permite acciones. |
| AC10 | Admin cierra todos los grupos | El bracket se genera automáticamente como ahora. |
| AC11 | Admin usa resultado final directo | Se guarda y completa sin cronómetro ni sesión temporal. |
| AC12 | Final y tercer puesto se cierran con SPEC-015 | SPEC-014 sigue vigente: torneo solo pasa a `completed` cuando todos los partidos están cerrados. |

## Plan de validación exigido

No pasar de una tarea a la siguiente si falla una validación.

1. **Tras DB/backend de sesiones**
   - Typecheck backend.
   - Test manual/API: crear sesión, leer token, revocar.
2. **Tras scoring público**
   - Test API: start/pause/score/submit.
   - Verificar doble submit.
   - Verificar token caducado por partido completed.
3. **Tras UI pública**
   - Typecheck frontend.
   - Build frontend.
   - Prueba móvil/desktop de `/score/:token`.
4. **Tras integración admin**
   - Typecheck frontend.
   - Build frontend.
   - Validar que panel pre-matchday conserva tabs actuales.
   - Validar que panel matchday enfoca clasificación.
5. **Regresión completa**
   - `backend pnpm check`.
   - `frontend pnpm check`.
   - `frontend pnpm build`.
   - `backend/test/full_cycle.py`.
   - `test/spec-014.sh`.

## Checklist de cumplimiento documental

Antes de implementar, otro agente/ingeniero debe poder responder "sí" a estas
preguntas leyendo solo esta carpeta:

- ¿Cuándo se activa matchday?
- ¿Qué endpoints se añaden y cuáles no cambian?
- ¿Qué datos persisten el token y el reloj?
- ¿Qué pasa con un token revocado, enviado, expirado o con match completado?
- ¿Qué función cierra realmente el partido?
- ¿Cómo se evita doble conteo?
- ¿Qué se prueba antes de avanzar?
- ¿Qué queda explícitamente fuera de scope?

## Fuera de scope

- Puntos por jugador individual.
- Estadísticas avanzadas.
- WebSockets o live multiusuario sofisticado.
- Notificaciones push al admin.
- Ratificación previa antes de cerrar resultado externo.
- Auditoría completa de motivos de corrección.
- Cambiar reglas de bracket o clasificación.
