# Flujos de negocio

## 1. Inscripción a un torneo `open`

1. Admin crea el torneo con `POST /tournaments` en estado `open`.
2. Jugadores logueados ven el torneo en el home y pulsan *Inscribirse*.
3. El backend inserta en `tournament_registrations`.
4. Si el jugador ya estaba inscrito, 409. Si el torneo no está `open`, 400.

## 2. Promoción a capitán

Antes del draft, el admin marca capitanes:

```
POST /tournaments/:id/captains { playerId, isCaptain, teamName }
```

Cada capitán crea implícitamente un `teams` con él como único miembro
inicial. Un torneo necesita **≥ 2 capitanes** para arrancar el draft.

## 3. Draft

```
┌──── admin ─POST /draft/start───▶┐
│                                 │
│  1. status tournament = draft   │
│  2. order equipos = shuffle     │
│  3. pick vuelta por vuelta      │
│                                 │
└──── admin ─POST /draft/end─────▶│  status → setup
```

- Sólo el equipo en turno puede hacer pick (o un admin).
- No se puede draftear a otro capitán ni a un jugador ya drafteado.
- Tras cada pick avanza `currentTeamIndex`; al dar la vuelta,
  `currentRound += 1`.
- Si ya no quedan jugadores drafteables, el draft se cierra automático
  y el torneo pasa a `setup`.

## 4. Configuración de equipo (estado `setup`)

Cada capitán confirma:

- Nombre del equipo (`nameConfirmed = true`).
- Nombre + link del grupo de WhatsApp.

Cuando **todos** los equipos tienen nombre confirmado y WhatsApp,
el admin puede pasar el torneo a `scheduled`.

## 5. Intercambios

Abiertos mientras el torneo no haya empezado (hoy < fecha torneo).

```
POST /trades  { targetPlayerId, offeredPlayerIds[1..3] }
```

Reglas:

- El capitán origen no puede incluirse en `offeredPlayerIds`.
- El jugador objetivo no puede ser capitán.
- Máximo 2 ofertas vivas simultáneas sobre el mismo `targetPlayerId`.
- El capitán destino (o un admin) llama `resolve` con `accept|reject`.

Al aceptar, se mueve 1 ofrecido al equipo destino y el objetivo al
equipo origen. El resto de ofertas pendientes del mismo objetivo
quedan `cancelled`.

## 6. Fase de grupos

Cuando el admin genera los grupos (automático en `scheduled`):

- Se reparten equipos en grupos de 3–4.
- Se crea `matches` para todos contra todos dentro del grupo.
- Victoria = 2 pts, empate = 1 pt, derrota = 0.

`group_members` se recalcula cada vez que un partido pasa a
`completed`.

## 7. Eliminatorias

Tras cerrar todos los grupos, los 2 primeros de cada grupo avanzan a
cruces `quarterfinal → semifinal → final` (con `third_place` opcional).

## 8. Cierre

El admin llama `PATCH /tournaments/:id { status: completed, winnerId }`.
El backend toma snapshots de stats de todos los jugadores
(`player_skill_snapshots`) para preservar la evolución histórica.
