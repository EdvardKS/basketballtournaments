# SPEC-014 — Especificación funcional

## Historia de usuario

> Como admin, cuando un torneo ya ha pasado su fecha de partido pero todavía
> quedan eliminatorias por puntuar, quiero seguir cerrando esos resultados;
> al mismo tiempo, ese torneo debe aparecer también en el "Historial" para
> consultarlo. Sólo cuando se han adjudicado los tres puestos (campeón,
> subcampeón y tercer puesto) el torneo se considera **cerrado** y en mi
> panel reaparece el botón "Crear nuevo torneo".

## Reglas

1. **Cierre real** — `tournaments.status` pasa a `completed` automáticamente cuando:
   - El partido de stage `final` está `completed` (winner_id ya asignado a `tournaments.winner_id` — comportamiento existente en `services/matches.ts:181`), **Y**
   - El partido de stage `third_place` está `completed` (otorga el tercer puesto vía achievements), **Y**
   - Todos los matches del torneo están `completed` (no quedan ni grupos ni cuartos pendientes).
2. **Hasta cierre real** — el admin sigue puntuando los matches que falten; el torneo permanece en `active`/`scheduled`/`setup` según corresponda.
3. **Historial** — la página de historial muestra:
   - Tournaments con `status = 'completed'` (cerrados de verdad).
   - **Y** tournaments con `match_date < CURRENT_DATE` aunque no estén `completed` todavía (días pasados). En el listado se distinguen visualmente con un badge "PENDIENTE DE CIERRE".
4. **Panel admin** — el botón "Crear nuevo torneo" aparece **siempre** que no haya ningún torneo con status ∈ {`upcoming`,`open`,`draft`,`setup`,`scheduled`,`active`}. Es decir: aparece cuando todos los torneos están en `completed`. Esto ya estaba implícito en `assertSingleLive` (`backend/src/services/tournaments.ts`), pero ahora se documenta como invariante.
5. **No retrocede** — un torneo nunca vuelve atrás de `completed`. Si el admin edita un match cerrado y el sistema recalcula, el status sigue `completed`.

## Criterios de aceptación

| # | Escenario | Resultado |
|---|-----------|-----------|
| AC1 | Torneo con `match_date = ayer`, matches del grupo aún pending | `status` sigue `active`. Admin sigue puntuando. Aparece en `/dashboard/historial` con badge "PENDIENTE DE CIERRE". Botón "Crear nuevo torneo" sigue oculto. |
| AC2 | Admin puntúa la final → winner asignado | `tournaments.status` pasa a `completed` (comportamiento existente). |
| AC3 | Final ya jugada + third_place jugado + algún match de grupo aún pending | `status` permanece `active`. La final ya marcó `winner_id` pero `assertAllMatchesCompleted` lo revierte a `active` para forzar que el admin cierre los grupos primero. |
| AC4 | Todos los matches completed (grupos + cuartos + semis + final + third_place) | `status = 'completed'` definitivamente. `/dashboard/admin` muestra "Crear nuevo torneo". |
| AC5 | Admin crea un torneo nuevo mientras hay uno `completed` y ninguno live | Permitido. `assertSingleLive` no bloquea (sólo bloquea cuando hay otro live). |
| AC6 | Tournament con `match_date < today` y `status = 'active'` | Visible en historial con badge "PENDIENTE", visible en dashboard player/captain porque el cromo aún cuenta como vigente. |
| AC7 | Admin abre `/dashboard/historial` | Lista incluye torneos cerrados + torneos con fecha pasada (mezclados, ordenados por fecha desc). |

## Out of scope

- Cerrar el torneo por fecha sin que se haya jugado la final (forzado). Si el admin quiere abandonar un torneo a medias, se hace vía endpoint admin `PATCH /tournaments/:id { status: "completed" }` manual; ese flujo ya existe.
- Notificaciones automáticas al admin cuando faltan matches por puntuar.
- Bloquear inscripciones por fecha (ya cubierto por `inscription_end` + lifecycle).
