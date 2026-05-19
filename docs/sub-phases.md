# Sub-fases del torneo: grupos en vivo → eliminatorias → campeón

## Qué cambia

- La página pública del torneo y el panel admin **reordenan sus bloques según una sub-fase derivada de los partidos**: `pre · draft · groups · knockouts · completed`. La verdad sigue viviendo en `matches`; no hay nuevo estado de BBDD.
- Mientras quede un partido `stage='group'` con `status!='completed'` → fase **groups** (las tablas de clasificación lideran la página). Cuando todos cierran → **knockouts** (el bracket arriba, los grupos plegables debajo). Cuando se cierra la final → **completed** con `ChampionPodium` arriba (oro + plata + bronce, "POR JUGAR" si el 3er puesto sigue pendiente).
- El backend ahora también flipa automáticamente `tournament.status='completed'` y rellena `winner_id` (capitán del equipo ganador) al cerrarse el partido `stage='final'`.

## Helper único

[frontend/src/lib/tournamentPhase.ts](../frontend/src/lib/tournamentPhase.ts) exporta `derivePhase(tournament, matches)`. Lo usan tanto la página pública como el panel admin.

## Componentes nuevos

| Archivo | Responsabilidad |
|---|---|
| [components/tournament/GroupCard.astro](../frontend/src/components/tournament/GroupCard.astro) | Una card por grupo: header, tabla de clasificación, partidos del grupo. |
| [components/tournament/GroupsBlock.astro](../frontend/src/components/tournament/GroupsBlock.astro) | Orquesta N `GroupCard` en grid; soporta variante `lead`/`secondary` y `collapsed`. |
| [components/tournament/ChampionPodium.astro](../frontend/src/components/tournament/ChampionPodium.astro) | Card del campeón + podio 1/2/3 con bronce placeholder cuando falta. |
| [islands/admin/QuickScoreSheet.tsx](../frontend/src/islands/admin/QuickScoreSheet.tsx) | Marcador rápido móvil-first: +/− grandes, +2, iniciar/finalizar. |

## Componentes ampliados

- [TournamentHero.astro](../frontend/src/components/tournament/TournamentHero.astro) — props `phase` + `championTeamName`. Badge evoluciona: FASE DE GRUPOS EN VIVO (naranja) → ELIMINATORIAS EN VIVO (rojo) → CAMPEÓN · NOMBRE (oro).
- [PhaseProgressBar.astro](../frontend/src/components/landing/PhaseProgressBar.astro) — prop `phase` (sigue acepting `status` por compatibilidad).
- [MatchesList.astro](../frontend/src/components/MatchesList.astro) — prop `groupId` para filtrar a un grupo concreto.
- [AdminPanel.tsx](../frontend/src/islands/admin/AdminPanel.tsx) — `tabsForPhase`, tab `Eliminatorias` cuando aparece el bracket, tab `Resumen` con podio cuando completed, summary card con tonalidad por phase.

## Backend

- [services/matches.ts](../backend/src/services/matches.ts) `completeMatch()` extendido: cuando el partido cerrado es la final, ejecuta `UPDATE tournaments SET status='completed', winner_id=<captain del team ganador>`. La generación del bracket al cerrar el último grupo (lógica previa) se mantiene intacta.

## Despliegue

```bash
# en el VPS
cd /var/www/basketballtournaments
git pull
docker compose build backend frontend
docker compose up -d backend frontend
```

## Verificación end-to-end

### Smoke automático

```bash
# desde el host del backend (después de docker compose up)
bash docs/scripts/smoke-phase-flow.sh
```

Comprueba: helper `derivePhase` (7 casos), endpoints `/tournaments`, `/tournaments/:id`, `/matches/tournament/:id`, `/matches/tournament/:id/groups`, login admin, e inspecciona que los torneos `completed` tengan `winner_id`. El test marca como warning (no failure) los completed legacy sin winner — es esperado para datos previos al hook.

### Recorrido manual (incógnito)

1. **Fase de grupos**:
   - Tener un torneo en estado `setup`/`active` con grupos generados y al menos un partido sin puntuar.
   - `/tournaments/<id>` → hero `FASE DE GRUPOS EN VIVO` (naranja con ping). Justo debajo: `GroupsBlock` con una card por grupo (clasificación + partidos). Phase bar marca `Grupos` con glow.

2. **Marcador rápido (admin móvil)**:
   - Login admin, `/dashboard/admin` → tab **Marcador rápido**.
   - Cards de partidos pendientes con +/− grandes (12×12), botón naranja `+`, secundario `+2`. Tap **Iniciar** → status pasa a `EN JUEGO`. Suma puntos rápido. **Finalizar** → guarda+completa+recarga. La página pública refleja el cambio en vivo.

3. **Cierre del último grupo**:
   - Puntúa el último partido `stage='group'` → backend genera bracket auto.
   - `/tournaments/<id>` recargada → bracket lidera, badge `ELIMINATORIAS EN VIVO`, grupos plegables debajo.
   - `/dashboard/admin` recarga → tab **Eliminatorias** aparece como default.

4. **Cierre de la final**:
   - Puntúa cuartos → semis → 3er puesto (en cualquier orden) → final.
   - Al cerrar la final: `tournament.status='completed'` y `winner_id` rellenado. Verificación rápida:
     ```bash
     docker exec basket_db_prod psql -U basket -d basket -c \
       "SELECT id, status, winner_id FROM tournaments WHERE status='completed';"
     ```
   - `/tournaments/<id>` → `ChampionPodium` arriba (trofeo + 3 escalones). Hero badge `CAMPEÓN · <NOMBRE>` en oro.

5. **Edge: final cierra antes que el 3er puesto**:
   - Final completed antes que `third_place` → torneo ya marcado completed.
   - `ChampionPodium` muestra plata; bronce dice **POR JUGAR** en gris.
   - Al puntuar el 3er puesto y refrescar → bronce rellenado.

## Fuera de alcance

- Auto-refresh / polling en la página pública.
- Editor manual del bracket o reasignación de grupos.
- Reversión de score (admin puede via PATCH manual; la fase se recalcula sola).
