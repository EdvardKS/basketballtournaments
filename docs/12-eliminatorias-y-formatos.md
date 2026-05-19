# Eliminatorias, formatos y testeo automático

Documento de referencia para la segunda parte del proyecto: cómo
funciona ahora la fase de eliminatorias, qué cuadros admite la app,
qué bug se arregló (un equipo con más puntos que no entraba al
bracket), y cómo está montado el test automático que valida todo el
ciclo cada hora.

---

## 1. Clasificación de grupos · qué se ve y cómo se ordena

### Columnas en la tabla del grupo

| Sigla | Significado                                |
|-------|--------------------------------------------|
| #     | posición en el grupo                       |
| PJ    | partidos jugados                           |
| G     | ganados                                    |
| P     | perdidos                                   |
| PF    | puntos a favor                             |
| PC    | puntos en contra                           |
| **DIF**   | **diferencia = PF − PC** (verde / rojo)|
| Pts   | puntos del grupo (2 por victoria)          |

### Orden de los equipos (criterios en cascada)

1. `points` DESC (puntos del grupo, 2 por victoria).
2. **`points_for − points_against` DESC** (diferencia de canasta).
3. `points_for` DESC (anotación absoluta).
4. `games_won` DESC.

Estos cuatro criterios se aplican EN TODOS los puntos del programa:

- Cuando la API devuelve la clasificación de un grupo
  (`backend/src/services/matches.ts:groupsForTournament`).
- Cuando el servicio de bracket extrae a los clasificados de cada
  grupo (`backend/src/services/bracket.ts:getGroupRanking`).
- Cuando, al rellenar un cuadro, hay más clasificados que plazas y
  hay que recortar — el recorte se hace **globalmente por puntos**,
  no por rank dentro de grupo (esto era el bug, ver §3).

---

## 2. Formatos de eliminatoria disponibles

El admin elige dos cosas al crear o editar el torneo:

### Formato de clasificación

| Valor                       | Qué hace                                          |
|-----------------------------|---------------------------------------------------|
| `top2_per_group` (default)  | Los 2 mejores de cada grupo entran al cuadro.    |
| `top1_plus_best2_seconds`   | 1º de cada grupo + los 2 mejores segundos.        |

> Si el torneo tiene **un solo grupo** y se elige
> `top2_per_group`, la app coge los 4 primeros del grupo.

### Tamaño del cuadro inicial

| Valor       | Etapa inicial            |
|-------------|--------------------------|
| `4` (semis) | semifinal + final + 3er  |
| `8` (cuartos)| cuartos + semis + final + 3er |
| `16` (octavos)| octavos + cuartos + semis + final + 3er |
| `null` / auto | la app elige el mayor `4/8/16` que cabe en el pool |

> Si pides un cuadro mayor que los clasificados (p. ej. octavos con
> sólo 6 equipos), el backend devuelve `TOO_FEW_FOR_SIZE` al cerrar
> la fase de grupos. Solución: ajustar el formato o el tamaño en la
> pestaña Configuración del torneo.

### Cómo se siembra (seeding)

1. Se obtiene el pool de clasificados según el formato.
2. Se ordena **globalmente** por `(points DESC, diff DESC, PF DESC,
   wins DESC)`.
3. Se recorta al tamaño del cuadro elegido (los mejores entran).
4. Se cruza con la regla "groupmate-avoidance": en la 1ª ronda los
   compañeros de grupo no se enfrentan si hay otra opción posible.
   - **Cuadro de 4**: 1 vs 4 / 2 vs 3.
   - **Cuadro de 8**: top-mitad (1-4) vs bottom-mitad (5-8), evitando
     mismo grupo cuando se puede.
   - **Cuadro de 16**: idem, top-8 vs bottom-8.

---

## 3. Bug que se arregló · "Team A tenía más puntos y no entró"

### Síntoma

Con varios grupos, un equipo segundo-clasificado de un grupo fuerte
(con más puntos que un primero de un grupo flojo) podía quedarse
fuera del cuadro porque la app priorizaba `rank` (1 vs 2 dentro del
grupo) antes que los puntos absolutos.

### Diagnóstico

`backend/src/services/bracket.ts` antes ordenaba al recortar usando
`a.rank - b.rank || a.groupId.localeCompare(b.groupId)`. Eso decía:
"primero todos los #1 (sea cual sea su grupo), luego todos los #2".

### Fix

`provisionBracket` ahora calcula la clasificación de cada grupo con
todas las métricas (puntos, diff, PF, wins), las junta en un único
pool, y las ordena con `cmpGlobal` (puntos absolutos → diff → PF →
wins). Sólo entonces recorta a `size` y siembra el cuadro.

Resultado: el equipo con más puntos siempre entra al cuadro, esté
donde esté en el rank de su grupo.

---

## 4. Vista admin de las eliminatorias

Antes la pestaña "Eliminatorias" del panel admin enlazaba al
bracket público. Ahora pinta el cuadro **completo y editable**
directamente dentro del panel:

1. Banda superior con el formato + tamaño del cuadro elegidos.
2. Una sección por etapa (Octavos / Cuartos / Semis / Final / 3er
   puesto) — sólo aparecen las que existen.
3. Cada partido es una `BracketMatchCard` con:
   - Nombres de los dos equipos (TBD si todavía no se han propagado).
   - Marcador en grande, ganador en verde.
   - Hora y estado (`pending` / `in_progress` / `completed`).
   - Icono lápiz para abrir `MatchEditOverlay` y meter el marcador
     final + finalizar el partido.
4. Debajo del bracket, el `QuickScoreSheet` mantiene el flujo
   "bumpea ±1 / ±2 y guarda" como atajo rápido.

Cuando el último partido de grupos se cierra, el bracket se genera
solo. Si la conf del torneo cambia (formato o tamaño), al regenerar
el bracket toma los cambios.

---

## 5. Test automático cada hora

### Qué hace

Un orquestador en Python (`backend/test/runner.py`) ejecuta una y
otra vez el ciclo completo de torneo, **con datos diferentes cada
vez** (capitanes, jugadores, formato y tamaño aleatorios pero
coherentes). Para cada iteración:

1. Limpia los torneos en curso (`status` ∈ live → `completed`) para
   sortear `ONE_ACTIVE_ONLY`.
2. Crea un torneo con fechas centradas en hoy.
3. Da de alta a N jugadores y los inscribe.
4. Promueve M capitanes.
5. Avanza fechas para forzar la transición a `draft`.
6. Hace todos los picks hasta vaciar la pool (el backend cierra el
   draft solo).
7. Avanza fechas para entrar en `active`.
8. Marca todos los partidos de grupos con un resultado plausible.
9. Verifica que se genera el cuadro automáticamente con el formato
   elegido.
10. Marca todos los partidos del bracket en orden de etapa.
11. Comprueba que `tournaments.winner_id` queda fijado al equipo
    ganador y `status='completed'`.

Cada iteración escribe a `/app/data/test-runs/run-<ts>-<seq>.log`
y añade una línea PASS/FAIL al `findings.md`. Si falla, el tail del
log se incrusta en el findings para inspección rápida.

### Cómo se lanza

#### Modo servicio (recomendado · overnight)

`docker-compose.dev.yml` incluye un servicio `test-runner` bajo el
profile `runner`:

```bash
docker compose -f docker-compose.dev.yml --profile runner up -d test-runner
docker logs -f basket_test_runner   # ver iteraciones en vivo
```

- Misma imagen que el backend (ya trae python3 + requests).
- Talks a `http://backend:4000/api` por la red de Docker.
- Bind-mount `./backend/data` para que los logs persistan en el host.
- `restart: unless-stopped`.

Para detenerlo:

```bash
docker compose -f docker-compose.dev.yml --profile runner stop test-runner
```

#### Modo one-shot · ad-hoc

```bash
# Una sola iteración
docker exec basket_backend python3 /app/test/runner.py --once

# N iteraciones consecutivas, parar al acabar
docker exec basket_backend python3 /app/test/runner.py --iterations 50

# Modo bucle infinito (Ctrl+C para parar)
docker exec basket_backend python3 /app/test/runner.py --loop --interval 1800
```

### Cómo se leen los resultados

```bash
# Resumen de todos los runs (1 línea por iter, PASS/FAIL + params)
docker exec basket_test_runner cat /app/data/test-runs/findings.md | head -50

# Cuántos fallos
docker exec basket_test_runner sh -c "grep -c rc=1 /app/data/test-runs/findings.md"

# Log completo de la última iteración
docker exec basket_test_runner sh -c "ls -t /app/data/test-runs/run-*.log | head -1 | xargs cat"
```

Los logs son visibles también desde el host en
`backend/data/test-runs/`.

### Variables del orquestador

| Var                 | Default  | Para qué                                  |
|---------------------|----------|-------------------------------------------|
| `CYCLE_INTERVAL`    | `3600`   | segundos entre iteraciones en `--loop`    |
| `API_BASE`          | localhost: 4000 | URL del backend desde el container |
| `BOOTSTRAP_ADMIN_*` | tester/test1234 | credenciales admin              |

### Parámetros aleatorios coherentes

`runner.py:gen_params` garantiza que las combinaciones tienen
sentido:

- Formato `top2_per_group`: 4-16 capitanes.
- Formato `top1_plus_best2_seconds`: 5-12 capitanes (necesita ≥2
  grupos).
- `bracket_size` sólo se elige entre los valores que caben en el
  pool de clasificados que cada combinación produce.
- Jugadores extra: 2-6 por equipo + jitter.

### Estructura de `_lib.py`

Helpers compartidos por `full_cycle.py` y `runner.py`:

- `ApiClient`: sesión `requests` con `Secure`-cookie stripped al
  login (necesario para hablar plain-HTTP a un backend con
  `COOKIE_SECURE=true`), wait_backend con polling de `/api/health`,
  asserts uniformes.
- `seed_player`, `add_to_tournament`, `make_captain`,
  `create_tournament`, `patch_tournament`, `get_draft_state`,
  `pick`, `list_matches`, `list_groups`, `score_match`,
  `complete_match`, `assert_csv`, `random_basketball_score`.

---

## 6. Roadmap pendiente

- Healthcheck dedicado en backend (`docker-compose.dev.yml` ya tiene
  `depends_on: { backend: service_started }` — promover a
  `service_healthy` cuando definamos un endpoint /health más
  estricto).
- Eliminación automática de torneos viejos del runner (cleanup
  diario) para que la DB no crezca sin parar.
- Vista admin para reasignar manualmente los enfrentamientos antes
  del bracket (drag&drop sobre el cuadro). Para casos donde el
  groupmate-avoidance no es suficiente.
- Tests específicos para grupos de 1 solo (debería usar top4).
- Documentar el formato CSV de salida para integradores externos
  (Excel, hojas de gestión deportiva, etc.).
