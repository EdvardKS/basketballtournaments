# Test runner findings

Cada línea es una iteración del orquestador (`backend/test/runner.py`). Si falla, abajo va el tail del log.

- [20260519-151319] iter=1 rc=1 elapsed=4.4s params={'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '16', 'CAPTAINS_N': '10', 'LABEL': 'R-151319-10c-52p-top2', 'PLAYERS_N': '52'} log=run-20260519-151319-0001.log
  ```
  # 20260519-151319 · iter 1
  # params: {'CAPTAINS_N': '10', 'PLAYERS_N': '52', 'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '16', 'LABEL': 'R-151319-10c-52p-top2'}
  
  [36m▶ login admin · tester[0m
    [32m✓[0m login OK · playerId=1b70fc35-f36b-48e9-92f3-a0ebc8d64887 · cookies_secure_stripped=0
  
  === R-151319-10c-52p-top2 ===
    captains=10  players=52  total=62
    bracket_format=top2_per_group  bracket_size=16
  [36m▶ crear torneo · matchDate=2026-06-18[0m
    [32m✓[0m id=b1da732c-6792-4586-9679-7bfb16dbdadd
  [36m▶ alta e inscripción de 62 jugadores[0m
    [2m  25/62[0m
    [2m  50/62[0m
    [2m  62/62[0m
  [36m▶ promover 10 capitanes[0m
    [32m✓[0m CSV 2026-06-18.csv · 62 filas · 10 capitanes
  [36m▶ PATCH fechas → ventana de draft[0m
    [32m✓[0m status=draft
    [32m✓[0m draft activo · teamOrder n=10
  [36m▶ draft loop · 52 picks[0m
    [32m✓[0m draft auto-cerrado · pool vacía
  [36m▶ verificar setup (grupos + calendario)[0m
    [32m✓[0m status=setup
    [32m✓[0m 12 partidos generados
  [36m▶ PATCH matchDate=ayer → status active[0m
    [32m✓[0m status=active
  [36m▶ jugar fase de grupos (12 partidos)[0m
    [2m  10/12  último: 11-10[0m
  [31m✗ POST /matches/4739c720-20d6-49d3-9c73-4b6baabaea18/complete → 400: {'error': 'TOO_FEW_FOR_SIZE', 'message': 'Hay 6 clasificados pero el cuadro está fijado a 16.'}[0m
  ```
- [20260519-151324] iter=2 rc=1 elapsed=0.3s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '4', 'LABEL': 'R-151324-4c-12p-top1', 'PLAYERS_N': '12'} log=run-20260519-151324-0002.log
  ```
  # 20260519-151324 · iter 2
  # params: {'CAPTAINS_N': '4', 'PLAYERS_N': '12', 'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'BRACKET_SIZE': '4', 'LABEL': 'R-151324-4c-12p-top1'}
  
  [36m▶ login admin · tester[0m
    [32m✓[0m login OK · playerId=1b70fc35-f36b-48e9-92f3-a0ebc8d64887 · cookies_secure_stripped=0
  
  === R-151324-4c-12p-top1 ===
    captains=4  players=12  total=16
    bracket_format=top1_plus_best2_seconds  bracket_size=4
  [36m▶ crear torneo · matchDate=2026-06-18[0m
  [31m✗ POST /tournaments → 409: {'error': 'ONE_ACTIVE_ONLY', 'message': 'Ya existe un torneo en curso (R-151319-10c-52p-top2).'}[0m
  ```
- [20260519-151324] iter=3 rc=1 elapsed=0.3s params={'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '8', 'CAPTAINS_N': '6', 'LABEL': 'R-151324-6c-32p-top2', 'PLAYERS_N': '32'} log=run-20260519-151324-0003.log
  ```
  # 20260519-151324 · iter 3
  # params: {'CAPTAINS_N': '6', 'PLAYERS_N': '32', 'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '8', 'LABEL': 'R-151324-6c-32p-top2'}
  
  [36m▶ login admin · tester[0m
    [32m✓[0m login OK · playerId=1b70fc35-f36b-48e9-92f3-a0ebc8d64887 · cookies_secure_stripped=0
  
  === R-151324-6c-32p-top2 ===
    captains=6  players=32  total=38
    bracket_format=top2_per_group  bracket_size=8
  [36m▶ crear torneo · matchDate=2026-06-18[0m
  [31m✗ POST /tournaments → 409: {'error': 'ONE_ACTIVE_ONLY', 'message': 'Ya existe un torneo en curso (R-151319-10c-52p-top2).'}[0m
  ```
- [20260519-151510] iter=1 rc=0 elapsed=3.2s params={'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '7', 'LABEL': 'R-151510-7c-37p-top2-4', 'PLAYERS_N': '37'} log=run-20260519-151510-0001.log
- [20260519-151513] iter=2 rc=0 elapsed=2.1s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '7', 'LABEL': 'R-151513-7c-19p-top1-4', 'PLAYERS_N': '19'} log=run-20260519-151513-0002.log
- [20260519-151515] iter=3 rc=0 elapsed=2.0s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '7', 'LABEL': 'R-151515-7c-17p-top1-4', 'PLAYERS_N': '17'} log=run-20260519-151515-0003.log
- [20260519-151517] iter=4 rc=0 elapsed=3.9s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '8', 'LABEL': 'R-151517-8c-40p-top1-4', 'PLAYERS_N': '40'} log=run-20260519-151517-0004.log
- [20260519-151521] iter=5 rc=0 elapsed=1.9s params={'BRACKET_FORMAT': 'top2_per_group', 'CAPTAINS_N': '4', 'LABEL': 'R-151521-4c-15p-top2-auto', 'PLAYERS_N': '15'} log=run-20260519-151521-0005.log
- [20260519-151533] iter=1 rc=1 elapsed=1.7s params={'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '3', 'LABEL': 'R-151533-3c-20p-top2-4', 'PLAYERS_N': '20'} log=run-20260519-151533-0001.log
  ```
  # 20260519-151533 · iter 1
  # params: {'CAPTAINS_N': '3', 'PLAYERS_N': '20', 'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '4', 'LABEL': 'R-151533-3c-20p-top2-4'}
  
  [36m▶ login admin · tester[0m
    [32m✓[0m login OK · playerId=1b70fc35-f36b-48e9-92f3-a0ebc8d64887 · cookies_secure_stripped=0
  
  === R-151533-3c-20p-top2-4 ===
    captains=3  players=20  total=23
    bracket_format=top2_per_group  bracket_size=4
  [36m▶ crear torneo · matchDate=2026-06-18[0m
    [32m✓[0m id=96217cc1-cb6e-4589-b2f1-a51bd7548b88
  [36m▶ alta e inscripción de 23 jugadores[0m
    [2m  23/23[0m
  [36m▶ promover 3 capitanes[0m
    [32m✓[0m CSV 2026-06-18.csv · 23 filas · 3 capitanes
  [36m▶ PATCH fechas → ventana de draft[0m
    [32m✓[0m status=draft
    [32m✓[0m draft activo · teamOrder n=3
  [36m▶ draft loop · 20 picks[0m
    [32m✓[0m draft auto-cerrado · pool vacía
  [36m▶ verificar setup (grupos + calendario)[0m
    [32m✓[0m status=setup
    [32m✓[0m 3 partidos generados
  [36m▶ PATCH matchDate=ayer → status active[0m
    [32m✓[0m status=active
  [36m▶ jugar fase de grupos (3 partidos)[0m
  [31m✗ POST /matches/7cdc94d7-e304-404c-9e29-e45848785796/complete → 400: {'error': 'TOO_FEW_TEAMS', 'message': 'Faltan equipos para montar un cuadro (hay 3, hacen falta 4 mínimo).'}[0m
  ```
- [20260519-151536] iter=2 rc=0 elapsed=2.1s params={'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '4', 'LABEL': 'R-151536-4c-20p-top2-4', 'PLAYERS_N': '20'} log=run-20260519-151536-0002.log
- [20260519-151538] iter=3 rc=0 elapsed=4.6s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'CAPTAINS_N': '12', 'LABEL': 'R-151538-12c-40p-top1-auto', 'PLAYERS_N': '40'} log=run-20260519-151538-0003.log
- [20260519-151542] iter=4 rc=1 elapsed=1.3s params={'BRACKET_FORMAT': 'top2_per_group', 'CAPTAINS_N': '3', 'LABEL': 'R-151542-3c-10p-top2-auto', 'PLAYERS_N': '10'} log=run-20260519-151542-0004.log
  ```
  # 20260519-151542 · iter 4
  # params: {'CAPTAINS_N': '3', 'PLAYERS_N': '10', 'BRACKET_FORMAT': 'top2_per_group', 'LABEL': 'R-151542-3c-10p-top2-auto'}
  
  [36m▶ login admin · tester[0m
    [32m✓[0m login OK · playerId=1b70fc35-f36b-48e9-92f3-a0ebc8d64887 · cookies_secure_stripped=0
  
  === R-151542-3c-10p-top2-auto ===
    captains=3  players=10  total=13
    bracket_format=top2_per_group  bracket_size=None
  [36m▶ crear torneo · matchDate=2026-06-18[0m
    [32m✓[0m id=d607d42b-b2bc-4b6d-b12d-6d6c76abdbf4
  [36m▶ alta e inscripción de 13 jugadores[0m
    [2m  13/13[0m
  [36m▶ promover 3 capitanes[0m
    [32m✓[0m CSV 2026-06-18.csv · 13 filas · 3 capitanes
  [36m▶ PATCH fechas → ventana de draft[0m
    [32m✓[0m status=draft
    [32m✓[0m draft activo · teamOrder n=3
  [36m▶ draft loop · 10 picks[0m
    [32m✓[0m draft auto-cerrado · pool vacía
  [36m▶ verificar setup (grupos + calendario)[0m
    [32m✓[0m status=setup
    [32m✓[0m 3 partidos generados
  [36m▶ PATCH matchDate=ayer → status active[0m
    [32m✓[0m status=active
  [36m▶ jugar fase de grupos (3 partidos)[0m
  [31m✗ POST /matches/3eb7b912-123c-4fc3-8d1f-6788f76b560c/complete → 400: {'error': 'TOO_FEW_TEAMS', 'message': 'Faltan equipos para montar un cuadro (hay 3, hacen falta 4 mínimo).'}[0m
  ```
- [20260519-151544] iter=5 rc=0 elapsed=6.7s params={'BRACKET_FORMAT': 'top2_per_group', 'CAPTAINS_N': '12', 'LABEL': 'R-151544-12c-72p-top2-auto', 'PLAYERS_N': '72'} log=run-20260519-151544-0005.log
- [20260519-151551] iter=6 rc=0 elapsed=1.8s params={'BRACKET_FORMAT': 'top2_per_group', 'CAPTAINS_N': '4', 'LABEL': 'R-151551-4c-14p-top2-auto', 'PLAYERS_N': '14'} log=run-20260519-151551-0006.log
- [20260519-151553] iter=7 rc=0 elapsed=2.6s params={'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '4', 'LABEL': 'R-151553-4c-24p-top2-4', 'PLAYERS_N': '24'} log=run-20260519-151553-0007.log
- [20260519-151555] iter=8 rc=1 elapsed=1.5s params={'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '3', 'LABEL': 'R-151555-3c-12p-top2-4', 'PLAYERS_N': '12'} log=run-20260519-151555-0008.log
  ```
  # 20260519-151555 · iter 8
  # params: {'CAPTAINS_N': '3', 'PLAYERS_N': '12', 'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '4', 'LABEL': 'R-151555-3c-12p-top2-4'}
  
  [36m▶ login admin · tester[0m
    [32m✓[0m login OK · playerId=1b70fc35-f36b-48e9-92f3-a0ebc8d64887 · cookies_secure_stripped=0
  
  === R-151555-3c-12p-top2-4 ===
    captains=3  players=12  total=15
    bracket_format=top2_per_group  bracket_size=4
  [36m▶ crear torneo · matchDate=2026-06-18[0m
    [32m✓[0m id=d4b0fbc6-4875-4136-a2ca-a44684d85959
  [36m▶ alta e inscripción de 15 jugadores[0m
    [2m  15/15[0m
  [36m▶ promover 3 capitanes[0m
    [32m✓[0m CSV 2026-06-18.csv · 15 filas · 3 capitanes
  [36m▶ PATCH fechas → ventana de draft[0m
    [32m✓[0m status=draft
    [32m✓[0m draft activo · teamOrder n=3
  [36m▶ draft loop · 12 picks[0m
    [32m✓[0m draft auto-cerrado · pool vacía
  [36m▶ verificar setup (grupos + calendario)[0m
    [32m✓[0m status=setup
    [32m✓[0m 3 partidos generados
  [36m▶ PATCH matchDate=ayer → status active[0m
    [32m✓[0m status=active
  [36m▶ jugar fase de grupos (3 partidos)[0m
  [31m✗ POST /matches/2d681336-8f13-4c45-a025-616a7ddcc84c/complete → 400: {'error': 'TOO_FEW_TEAMS', 'message': 'Faltan equipos para montar un cuadro (hay 3, hacen falta 4 mínimo).'}[0m
  ```
- [20260519-151557] iter=9 rc=0 elapsed=2.6s params={'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '6', 'LABEL': 'R-151557-6c-24p-top2-4', 'PLAYERS_N': '24'} log=run-20260519-151557-0009.log
- [20260519-151600] iter=10 rc=0 elapsed=8.8s params={'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '16', 'LABEL': 'R-151600-16c-95p-top2-4', 'PLAYERS_N': '95'} log=run-20260519-151600-0010.log
- [20260519-151609] iter=11 rc=0 elapsed=5.6s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '10', 'LABEL': 'R-151609-10c-62p-top1-4', 'PLAYERS_N': '62'} log=run-20260519-151609-0011.log
- [20260519-151614] iter=12 rc=0 elapsed=3.0s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '10', 'LABEL': 'R-151614-10c-25p-top1-4', 'PLAYERS_N': '25'} log=run-20260519-151614-0012.log
- [20260519-151617] iter=13 rc=0 elapsed=2.6s params={'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '4', 'LABEL': 'R-151617-4c-27p-top2-4', 'PLAYERS_N': '27'} log=run-20260519-151617-0013.log
- [20260519-151620] iter=14 rc=0 elapsed=3.7s params={'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '12', 'LABEL': 'R-151620-12c-33p-top2-4', 'PLAYERS_N': '33'} log=run-20260519-151620-0014.log
- [20260519-151624] iter=15 rc=0 elapsed=2.7s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '6', 'LABEL': 'R-151624-6c-28p-top1-4', 'PLAYERS_N': '28'} log=run-20260519-151624-0015.log
- [20260519-151626] iter=16 rc=1 elapsed=1.9s params={'BRACKET_FORMAT': 'top2_per_group', 'CAPTAINS_N': '3', 'LABEL': 'R-151626-3c-21p-top2-auto', 'PLAYERS_N': '21'} log=run-20260519-151626-0016.log
  ```
  # 20260519-151626 · iter 16
  # params: {'CAPTAINS_N': '3', 'PLAYERS_N': '21', 'BRACKET_FORMAT': 'top2_per_group', 'LABEL': 'R-151626-3c-21p-top2-auto'}
  
  [36m▶ login admin · tester[0m
    [32m✓[0m login OK · playerId=1b70fc35-f36b-48e9-92f3-a0ebc8d64887 · cookies_secure_stripped=0
  
  === R-151626-3c-21p-top2-auto ===
    captains=3  players=21  total=24
    bracket_format=top2_per_group  bracket_size=None
  [36m▶ crear torneo · matchDate=2026-06-18[0m
    [32m✓[0m id=3389d708-12a1-469f-8da9-c257dea978d8
  [36m▶ alta e inscripción de 24 jugadores[0m
    [2m  24/24[0m
  [36m▶ promover 3 capitanes[0m
    [32m✓[0m CSV 2026-06-18.csv · 24 filas · 3 capitanes
  [36m▶ PATCH fechas → ventana de draft[0m
    [32m✓[0m status=draft
    [32m✓[0m draft activo · teamOrder n=3
  [36m▶ draft loop · 21 picks[0m
    [32m✓[0m draft auto-cerrado · pool vacía
  [36m▶ verificar setup (grupos + calendario)[0m
    [32m✓[0m status=setup
    [32m✓[0m 3 partidos generados
  [36m▶ PATCH matchDate=ayer → status active[0m
    [32m✓[0m status=active
  [36m▶ jugar fase de grupos (3 partidos)[0m
  [31m✗ POST /matches/913be625-12de-4b90-8acb-6f46b568d3b7/complete → 400: {'error': 'TOO_FEW_TEAMS', 'message': 'Faltan equipos para montar un cuadro (hay 3, hacen falta 4 mínimo).'}[0m
  ```
- [20260519-151629] iter=17 rc=0 elapsed=4.6s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'CAPTAINS_N': '12', 'LABEL': 'R-151629-12c-47p-top1-auto', 'PLAYERS_N': '47'} log=run-20260519-151629-0017.log
- [20260519-151633] iter=18 rc=0 elapsed=2.4s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '7', 'LABEL': 'R-151633-7c-19p-top1-4', 'PLAYERS_N': '19'} log=run-20260519-151633-0018.log
- [20260519-151636] iter=19 rc=0 elapsed=1.5s params={'BRACKET_FORMAT': 'top2_per_group', 'CAPTAINS_N': '4', 'LABEL': 'R-151636-4c-8p-top2-auto', 'PLAYERS_N': '8'} log=run-20260519-151636-0019.log
- [20260519-151637] iter=20 rc=0 elapsed=2.6s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'CAPTAINS_N': '6', 'LABEL': 'R-151637-6c-24p-top1-auto', 'PLAYERS_N': '24'} log=run-20260519-151637-0020.log
- [20260519-151745] iter=1 rc=0 elapsed=2.7s params={'BRACKET_FORMAT': 'top2_per_group', 'CAPTAINS_N': '9', 'LABEL': 'R-151745-9c-27p-top2-auto', 'PLAYERS_N': '27'} log=run-20260519-151745-0001.log
- [20260519-151748] iter=2 rc=0 elapsed=2.5s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'CAPTAINS_N': '8', 'LABEL': 'R-151748-8c-25p-top1-auto', 'PLAYERS_N': '25'} log=run-20260519-151748-0002.log
- [20260519-151750] iter=3 rc=0 elapsed=4.6s params={'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '8', 'CAPTAINS_N': '16', 'LABEL': 'R-151750-16c-33p-top2-8', 'PLAYERS_N': '33'} log=run-20260519-151750-0003.log
- [20260519-151755] iter=4 rc=0 elapsed=7.5s params={'BRACKET_FORMAT': 'top2_per_group', 'CAPTAINS_N': '10', 'LABEL': 'R-151755-10c-66p-top2-auto', 'PLAYERS_N': '66'} log=run-20260519-151755-0004.log
- [20260519-151803] iter=5 rc=0 elapsed=4.8s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '10', 'LABEL': 'R-151803-10c-40p-top1-4', 'PLAYERS_N': '40'} log=run-20260519-151803-0005.log
- [20260519-151807] iter=6 rc=0 elapsed=2.4s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '6', 'LABEL': 'R-151807-6c-20p-top1-4', 'PLAYERS_N': '20'} log=run-20260519-151807-0006.log
- [20260519-151810] iter=7 rc=0 elapsed=3.9s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'CAPTAINS_N': '7', 'LABEL': 'R-151810-7c-41p-top1-auto', 'PLAYERS_N': '41'} log=run-20260519-151810-0007.log
- [20260519-151814] iter=8 rc=0 elapsed=2.8s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'CAPTAINS_N': '6', 'LABEL': 'R-151814-6c-28p-top1-auto', 'PLAYERS_N': '28'} log=run-20260519-151814-0008.log
- [20260519-151817] iter=9 rc=0 elapsed=2.8s params={'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '5', 'LABEL': 'R-151817-5c-30p-top2-4', 'PLAYERS_N': '30'} log=run-20260519-151817-0009.log
- [20260519-151819] iter=10 rc=0 elapsed=4.9s params={'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '10', 'LABEL': 'R-151819-10c-52p-top2-4', 'PLAYERS_N': '52'} log=run-20260519-151819-0010.log
- [20260519-151824] iter=11 rc=0 elapsed=3.4s params={'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '6', 'LABEL': 'R-151824-6c-37p-top2-4', 'PLAYERS_N': '37'} log=run-20260519-151824-0011.log
- [20260519-151828] iter=12 rc=0 elapsed=2.6s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '7', 'LABEL': 'R-151828-7c-23p-top1-4', 'PLAYERS_N': '23'} log=run-20260519-151828-0012.log
- [20260519-151830] iter=13 rc=0 elapsed=5.3s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'CAPTAINS_N': '9', 'LABEL': 'R-151830-9c-62p-top1-auto', 'PLAYERS_N': '62'} log=run-20260519-151830-0013.log
- [20260519-151836] iter=14 rc=0 elapsed=6.0s params={'BRACKET_FORMAT': 'top2_per_group', 'CAPTAINS_N': '16', 'LABEL': 'R-151836-16c-57p-top2-auto', 'PLAYERS_N': '57'} log=run-20260519-151836-0014.log
- [20260519-151842] iter=15 rc=0 elapsed=2.7s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '7', 'LABEL': 'R-151842-7c-22p-top1-4', 'PLAYERS_N': '22'} log=run-20260519-151842-0015.log
- [20260519-151844] iter=16 rc=0 elapsed=4.5s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'CAPTAINS_N': '9', 'LABEL': 'R-151844-9c-48p-top1-auto', 'PLAYERS_N': '48'} log=run-20260519-151844-0016.log
- [20260519-151849] iter=17 rc=0 elapsed=3.6s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'CAPTAINS_N': '10', 'LABEL': 'R-151849-10c-31p-top1-auto', 'PLAYERS_N': '31'} log=run-20260519-151849-0017.log
- [20260519-151852] iter=18 rc=0 elapsed=2.2s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '7', 'LABEL': 'R-151852-7c-15p-top1-4', 'PLAYERS_N': '15'} log=run-20260519-151852-0018.log
- [20260519-151855] iter=19 rc=0 elapsed=1.7s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'CAPTAINS_N': '5', 'LABEL': 'R-151855-5c-12p-top1-auto', 'PLAYERS_N': '12'} log=run-20260519-151855-0019.log
- [20260519-151856] iter=20 rc=0 elapsed=2.1s params={'BRACKET_FORMAT': 'top2_per_group', 'CAPTAINS_N': '5', 'LABEL': 'R-151856-5c-17p-top2-auto', 'PLAYERS_N': '17'} log=run-20260519-151856-0020.log
- [20260519-151858] iter=21 rc=0 elapsed=3.2s params={'BRACKET_FORMAT': 'top2_per_group', 'CAPTAINS_N': '9', 'LABEL': 'R-151858-9c-27p-top2-auto', 'PLAYERS_N': '27'} log=run-20260519-151858-0021.log
- [20260519-151902] iter=22 rc=0 elapsed=2.7s params={'BRACKET_FORMAT': 'top2_per_group', 'CAPTAINS_N': '6', 'LABEL': 'R-151902-6c-23p-top2-auto', 'PLAYERS_N': '23'} log=run-20260519-151902-0022.log
- [20260519-151904] iter=23 rc=0 elapsed=2.6s params={'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '5', 'LABEL': 'R-151904-5c-20p-top2-4', 'PLAYERS_N': '20'} log=run-20260519-151904-0023.log
- [20260519-151907] iter=24 rc=0 elapsed=3.7s params={'BRACKET_FORMAT': 'top2_per_group', 'CAPTAINS_N': '8', 'LABEL': 'R-151907-8c-35p-top2-auto', 'PLAYERS_N': '35'} log=run-20260519-151907-0024.log
- [20260519-151911] iter=25 rc=0 elapsed=1.9s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'CAPTAINS_N': '5', 'LABEL': 'R-151911-5c-15p-top1-auto', 'PLAYERS_N': '15'} log=run-20260519-151911-0025.log
- [20260519-151913] iter=26 rc=0 elapsed=2.3s params={'BRACKET_FORMAT': 'top2_per_group', 'CAPTAINS_N': '7', 'LABEL': 'R-151913-7c-17p-top2-auto', 'PLAYERS_N': '17'} log=run-20260519-151913-0026.log
- [20260519-151915] iter=27 rc=0 elapsed=2.3s params={'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '6', 'LABEL': 'R-151915-6c-18p-top2-4', 'PLAYERS_N': '18'} log=run-20260519-151915-0027.log
- [20260519-151917] iter=28 rc=0 elapsed=8.5s params={'BRACKET_FORMAT': 'top2_per_group', 'BRACKET_SIZE': '4', 'CAPTAINS_N': '16', 'LABEL': 'R-151917-16c-93p-top2-4', 'PLAYERS_N': '93'} log=run-20260519-151917-0028.log
- [20260519-151926] iter=29 rc=0 elapsed=2.6s params={'BRACKET_FORMAT': 'top2_per_group', 'CAPTAINS_N': '5', 'LABEL': 'R-151926-5c-27p-top2-auto', 'PLAYERS_N': '27'} log=run-20260519-151926-0029.log
- [20260519-151928] iter=30 rc=0 elapsed=2.7s params={'BRACKET_FORMAT': 'top1_plus_best2_seconds', 'CAPTAINS_N': '7', 'LABEL': 'R-151928-7c-23p-top1-auto', 'PLAYERS_N': '23'} log=run-20260519-151928-0030.log
