# SPEC-013 — API

## Endpoints nuevos

### `GET /players/:id/cromos`

**Auth**: jugador propietario o admin (rol del cookie session).

**Path params**:
- `id` — UUID del jugador.

**Response 200**:
```json
{
  "cromos": [
    {
      "tournamentId": "uuid",
      "tournamentName": "VBL 2026 Primavera",
      "tournamentYear": 2026,
      "status": "open",
      "theme": {
        "style": "mix",
        "c1": "#0a0a18",
        "c2": "#ff2bd6",
        "c3": "#06070d",
        "glow": "#ff2bd6",
        "frame": "#ffeaff",
        "tier_text": "#ffeaff",
        "label": "Magenta Chrome"
      },
      "player": {
        "id": "uuid",
        "name": "Adrián Gómez",
        "position": "alero",
        "avatar": "data:image/png;base64,...",
        "overall": 40,
        "pace": 43,
        "shooting": 15,
        "passing": 22,
        "dribbling": 14,
        "defense": 75,
        "physical": 71
      },
      "versionLabel": "v3",
      "frozen": false
    }
  ]
}
```

**Orden**: descendente por `tournament.date` (más reciente primero).

**Errores**:
- `403 FORBIDDEN` — el cookie session no es ni el dueño ni admin.
- `404 PLAYER_NOT_FOUND` — id no existe.

### `GET /tournaments/:id/theme`

**Auth**: público.

**Path params**:
- `id` — UUID del torneo.

**Response 200**:
```json
{
  "id": "uuid",
  "catalog_index": 7,
  "palette": { /* mismo formato que en /cromos */ },
  "created_at": "2026-05-22T10:30:00Z"
}
```

**Comportamiento**:
- Si `tournaments.theme_id IS NULL`, el endpoint **crea** un theme reservando el `catalog_index` libre más bajo y lo vincula. Operación idempotente: si dos requests llegan simultáneamente, sólo uno gana (race resuelta vía `INSERT ... ON CONFLICT (catalog_index) DO NOTHING` + retry).

**Errores**:
- `404 TOURNAMENT_NOT_FOUND`.
- `409 THEME_CATALOG_EXHAUSTED` — todos los `catalog_index` del catálogo están ocupados. Admin debe llamar a `POST /admin/tournament-themes/seed` para añadir más.

### `POST /admin/tournament-themes/seed`

**Auth**: admin.

**Body** (opcional):
```json
{
  "extraPalettes": [ { "style": "mix", "c1": "...", ... } ]
}
```

Si no se aporta body, el endpoint sólo se asegura de que el catálogo base (`themes.md`) esté completo (idempotente: inserta sólo los `catalog_index` faltantes).

**Response 200**:
```json
{ "inserted": 32, "total": 32 }
```

**Errores**:
- `403 FORBIDDEN` — no admin.
- `400 INVALID_PALETTE` — alguna paleta del body falta campos.

## Endpoints que se modifican

- `GET /tournaments/:id` — incluir `theme` inline en la respuesta (opcional para clientes que ya lo necesitan).
- `GET /tournaments/:id/registrations` — ya devuelve player info, no cambia.

## Endpoints que NO se tocan

- `POST /tournaments/:id/register` — el snapshot al draft cierre ya está en su sitio.
- Endpoints de match/draft/auth.

## Códigos de error nuevos

| Code | HTTP | Significado |
|------|------|-------------|
| `THEME_CATALOG_EXHAUSTED` | 409 | Catálogo curado lleno |
| `INVALID_PALETTE` | 400 | Body de seed inválido |
