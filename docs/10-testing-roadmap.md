# Roadmap · testing E2E lineal

Documento de referencia para la prueba `backend/test/full_flow.py`.
Recorre paso a paso el ciclo de vida completo de un torneo desde la
creación hasta el día del partido (`active` con partidos pendientes).
La fase post-partido queda fuera de este documento y se cubrirá más
adelante.

## Estado machine (resumen)

```
                       fechas en backend/.env y por torneo
                       └─────────────┬─────────────┘
                                     ▼
   upcoming  ───►  open  ───►  draft  ───►  setup  ───►  active  ───►  completed
       │            │            │            │            │
       │   inscr     │   draft    │  draft     │  match     │  final
       │   start    start         end          date         match
       │   ≤ today  ≤ today      < today      ≤ today      done
       │   <        ≤ draft     < match                    +
       │   draft    end          date                      backend mark
       │   start
       └── seed         lifecycle.transitionTournament (services/lifecycle.ts)
           default      se invoca en CADA `getTournament(id)` y propaga el
                        status si la fecha lo permite. Forward-only: nunca
                        retrocede.
```

Side-effects automáticos:

- `open → draft`: `ensureDraftStarted` crea `draft_state.is_active=true`
  con orden aleatorio de equipos.
- `draft → setup`: lo dispara el último `pickPlayer` (`draft.ts:126-134`)
  cuando `remaining=0`. Llama a `endDraftInternal`:
  - `generateGroups(tid)` → reparte equipos en grupos (`ceil(n/4)`).
  - `generateSchedule(tid)` → asigna `scheduled_at` a todos los
    partidos de grupo.
  - `hours_confirmed=true`.
- `setup → active`: lifecycle, cuando `today ≥ matchDate`.

## Flujo paso a paso (el que sigue el script)

| # | Acción API                                                     | Status esperado | CSV esperado                          | Verificación humana (frontend)                                       |
|---|----------------------------------------------------------------|-----------------|---------------------------------------|----------------------------------------------------------------------|
| 1 | `POST /tournaments` con dates centradas en hoy                 | `open`          | (aún no se crea)                      | `/tournaments/:id` muestra "INSCRIPCIONES ABIERTAS"                  |
| 2 | `POST /players` × N + `POST /tournaments/:id/add-player` × N   | `open`          | `<matchDate>.csv` con N filas (0 cap) | `/dashboard/admin` tab Inscripciones lista los N nombres             |
| 3 | `POST /tournaments/:id/captains` × M (M de los N)              | `open`          | M filas con `is_captain=yes`, `team_id` y `team_name` rellenos | `/dashboard/admin` muestra chip "Capitán" en M cards              |
| 4 | `PATCH /tournaments/:id { draftStart=ayer, draftEnd=mañana }`  | `draft`         | mismo CSV (sin cambios)               | `/tournaments/:id` muestra "DRAFT EN VIVO"                           |
| 5 | bucle `POST /draft/:id/pick` hasta pool=0 (auto-cierra draft)  | `setup`         | mismo CSV (las picks no tocan registrations) | `/tournaments/:id` muestra "Fase de grupos" + tabla de grupos     |
| 6 | `PATCH /tournaments/:id { matchDate=ayer }`                    | `active`        | mismo CSV                             | landing `/` muestra "TORNEO EN JUEGO"                                |
| 7 | (sólo torneo A) `PATCH /tournaments/:id { status=completed }`  | `completed`     | mismo CSV                             | `/tournaments/:id` muestra "Torneo finalizado"                       |

Todas las transiciones de fechas pasan por `getTournament` (el GET
inmediatamente después del PATCH), que es donde `transitionTournament`
dispara el `setStatus` y los side-effects.

## Dos torneos consecutivos (los del test)

| Torneo | Capitanes | Jugadores | Inscritos | Pool draft | Estado final |
|--------|-----------|-----------|-----------|------------|--------------|
| A      | 6         | 53        | 59        | 53         | `completed`  |
| B      | 9         | 65        | 74        | 65         | `active`     |

Reparto del pool:

- Torneo A: 53 picks repartidos entre 6 equipos = 8 ó 9 jugadores
  drafteados por equipo → plantilla final = capitán + 8 ó 9.
- Torneo B: 65 picks repartidos entre 9 equipos = 7 ú 8 → plantilla
  final = capitán + 7 ú 8.

Equipo i recibe `ceil((pool − i) / N)` picks aproximadamente, donde N
es el número de capitanes; el orden inicial es aleatorio pero el
algoritmo `nextRoundOrder` rota la posición para que ningún capitán
repita pick #k a lo largo del draft. Resultado: reparto desigual
controlado.

## Comportamientos cubiertos

- **ONE_ACTIVE_ONLY** — al crear el torneo B después de A (con A en
  `active`) el backend rechazaría con 409. Por eso el test cierra A
  con `PATCH status=completed` antes de crear B.
- **CAPTAIN_EDIT_STATUSES** — la promoción de capitanes ocurre con
  `status=open` (válido); intentarlo después de `draft` devolvería
  `CAPTAIN_EDIT_LOCKED`.
- **Lazy transitions** — el test no llama a ningún endpoint
  `/transition`; se apoya en `GET /tournaments/:id` para forzar el
  recálculo de status.
- **Draft auto-end** — `draft.pickPlayer` cierra el draft cuando
  `remaining=0` sin necesidad de `POST /draft/:id/end`.
- **CSV backup** — los hooks de `services/registration-backup.ts`
  reescriben `<matchDate>.csv` tras cada `register / unregister /
  captain / add-player / remove-player / patchPlayer / transferCaptain`.
  El test lo lee con `csv.DictReader` y valida filas + flag
  `is_captain`.
- **Grupos + calendario auto-generados** — al cerrar el draft.
- **Match day** — el cambio de `matchDate` a ayer + GET dispara
  `setup → active`.

## Fuera de scope (futuras iteraciones)

- `POST /matches/:id/start` · pasar pending → in_progress.
- `POST /matches/:id/score` + `POST /matches/:id/complete` · scoring.
- `generateKnockout` · bracket de eliminatorias tras grupos.
- Trades entre capitanes.
- Captain transfer post-draft (`POST /teams/:id/transfer-captain`).
- Verificación de detección de bots en `/foto/...` (ya no aplica, las
  fotos se sirven static directamente).

## Cómo extender

`backend/test/full_flow.py` está pensado para crecer linealmente. Para
añadir post-match:

1. Añadir una función `run_match_day(tid)` que liste los partidos y
   llame `start → score → complete` sobre uno por uno.
2. Llamarla desde `main()` justo antes (o en vez) de cerrar el torneo.
3. Añadir asserts: `GET /matches/tournament/:id/groups` con
   `gamesPlayed` actualizado, `winner_id` del partido, etc.

## Verificación end-to-end del operador

```bash
# 1. reset stack
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d --build

# 2. correr el test
docker exec basket_backend python3 /app/test/full_flow.py

# 3. salida esperada (cola)
#   ✓ E2E completo
#     · Torneo A = <uuid> · status=completed · matches=N_A
#     · Torneo B = <uuid> · status=active   · matches=N_B
#     abre el frontend en http://localhost:4322/ para ver el resultado

# 4. comprobar CSVs en host
ls backend/data/csv/        # dos ficheros (uno por matchDate)
head -3 backend/data/csv/*  # header + filas reales

# 5. abrir frontend
open http://localhost:4322/                 # landing con "TORNEO EN JUEGO" (B)
open http://localhost:4322/tournaments/<A>  # finalizado
open http://localhost:4322/tournaments/<B>  # 9 equipos + matches scheduled
```

Exit code:

- `0` — todo OK.
- `1` — primer fallo de aserción. La línea anterior con `✗` indica el
  punto exacto. La salida es lineal — el siguiente paso no se ejecuta
  hasta que el anterior está verde.
