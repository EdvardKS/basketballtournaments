# SPEC-014 — API

## Endpoints nuevos

### `GET /tournaments/historical`

**Auth**: público.

**Response 200**:
```json
[
  {
    "id": "uuid",
    "name": "Liga Otoño 2026",
    "status": "active",
    "matchDate": "2026-05-15",
    "pendingClose": true,
    "...": "...resto de campos Tournament"
  }
]
```

**Filtro**: incluye un torneo sii (`status = 'completed'`) OR (`match_date::DATE < CURRENT_DATE`). `pendingClose=true` cuando `status != 'completed'`.

**Orden**: `match_date DESC NULLS LAST, created_at DESC`.

## Endpoints modificados

### `PATCH /tournaments/:id/matches/:matchId` (completar match)

Sin cambio de firma. Cambio en post-condición: el UPDATE final que marcaba `tournaments.status='completed'` al cerrar la final ahora se condiciona a "todos los matches del torneo están `completed`" — si quedan grupos pending, el status sigue `active`.

## Errores nuevos

Ninguno.

## Códigos JSON adicionales

Tournament shape ahora puede contener `pendingClose: boolean` (computed) cuando proviene de `/tournaments/historical`.
