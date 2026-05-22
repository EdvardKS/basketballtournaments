# SPEC-013 — Themes

## Estructura `palette` (JSONB)

```ts
interface Palette {
  style: "fluor" | "pastel" | "metallic" | "mix";
  c1: string;        // background base (#hex, dark)
  c2: string;        // accent principal (frame + glow source)
  c3: string;        // background bottom (#hex, very dark)
  glow: string;      // glow color (usually = c2 con alpha)
  frame: string;     // frame border color (lighter c2)
  tier_text: string; // texto del tier badge
  label: string;     // human-readable, p.ej. "Magenta Chrome"
}
```

## Catálogo curado inicial (32 entradas)

8 fluor + 8 pastel + 8 metallic + 8 mix.

### Fluor (catalog_index 0..7)

| idx | label | c1 | c2 | c3 | glow | frame | tier_text |
|-----|-------|----|----|----|------|-------|-----------|
| 0 | Fluor Cyan      | #021820 | #00ffe5 | #000a10 | #00ffe5 | #c2fff8 | #c2fff8 |
| 1 | Fluor Magenta   | #1a0014 | #ff2bd6 | #0c0009 | #ff2bd6 | #ffd0f4 | #ffd0f4 |
| 2 | Fluor Lime      | #0c1a00 | #b6ff1f | #050c00 | #b6ff1f | #e7ffb1 | #e7ffb1 |
| 3 | Fluor Orange    | #1f0a00 | #ff7a1a | #100400 | #ff7a1a | #ffd6b0 | #ffd6b0 |
| 4 | Fluor Yellow    | #1e1900 | #ffe600 | #0f0c00 | #ffe600 | #fff7a8 | #fff7a8 |
| 5 | Fluor Red       | #200008 | #ff1f4a | #100004 | #ff1f4a | #ffc2cf | #ffc2cf |
| 6 | Fluor Violet    | #100020 | #9b3aff | #060010 | #9b3aff | #d8c0ff | #d8c0ff |
| 7 | Fluor Teal      | #001a18 | #1affc6 | #000d0c | #1affc6 | #c0ffe9 | #c0ffe9 |

### Pastel (catalog_index 8..15)

| idx | label | c1 | c2 | c3 | glow | frame | tier_text |
|-----|-------|----|----|----|------|-------|-----------|
| 8  | Pastel Rose     | #1c0e14 | #ffb3c8 | #0d050a | #ffb3c8 | #ffe1ea | #ffe1ea |
| 9  | Pastel Mint     | #0c1a14 | #b3ffd4 | #05100c | #b3ffd4 | #defff0 | #defff0 |
| 10 | Pastel Peach    | #1a1208 | #ffd2a3 | #100804 | #ffd2a3 | #fff0db | #fff0db |
| 11 | Pastel Lavender | #110a1a | #d3b3ff | #07040d | #d3b3ff | #ecdcff | #ecdcff |
| 12 | Pastel Sky      | #07111a | #a8d8ff | #03070d | #a8d8ff | #d8edff | #d8edff |
| 13 | Pastel Butter   | #1a1808 | #ffe9a3 | #0d0c04 | #ffe9a3 | #fff5cf | #fff5cf |
| 14 | Pastel Coral    | #1a0d08 | #ffaa99 | #0d0604 | #ffaa99 | #ffd9cf | #ffd9cf |
| 15 | Pastel Sage     | #0f1410 | #b8dcb1 | #060a07 | #b8dcb1 | #dceedb | #dceedb |

### Metallic (catalog_index 16..23)

| idx | label | c1 | c2 | c3 | glow | frame | tier_text |
|-----|-------|----|----|----|------|-------|-----------|
| 16 | Metallic Bronze    | #5a4a3a | #d4a05c | #1a120c | #d4a05c | #f0c987 | #f0c987 |
| 17 | Metallic Silver    | #2b3858 | #98abdd | #0b1224 | #98abdd | #c6d4ef | #c6d4ef |
| 18 | Metallic Gold      | #5e3f0a | #ffd34a | #1a1206 | #ffd34a | #ffe27a | #ffe27a |
| 19 | Metallic Emerald   | #0f4032 | #2af0b1 | #021510 | #2af0b1 | #7df3cb | #7df3cb |
| 20 | Metallic Amethyst  | #2d0e60 | #e066f0 | #07041a | #e066f0 | #f4a8f9 | #f4a8f9 |
| 21 | Metallic Copper    | #4a2a18 | #e07a3a | #1a0d06 | #e07a3a | #f4b890 | #f4b890 |
| 22 | Metallic Platinum  | #303035 | #d6d6e0 | #0e0e12 | #d6d6e0 | #f0f0f5 | #f0f0f5 |
| 23 | Metallic Gunmetal  | #1a1f2a | #6f7d96 | #0a0d12 | #6f7d96 | #aab4c5 | #aab4c5 |

### Mix (catalog_index 24..31)

Mezclas dos-color o tri-color. Cada uno combina un fluor con un metallic o pastel.

| idx | label | c1 | c2 | c3 | glow | frame | tier_text |
|-----|-------|----|----|----|------|-------|-----------|
| 24 | Mix Cyan+Bronze    | #1c1408 | #00ffe5 | #1a120c | #00ffe5 | #f0c987 | #f0c987 |
| 25 | Mix Magenta+Gold   | #1c0a14 | #ff2bd6 | #1a1206 | #ff2bd6 | #ffe27a | #ffe27a |
| 26 | Mix Lime+Silver    | #0c1408 | #b6ff1f | #0b1224 | #b6ff1f | #c6d4ef | #c6d4ef |
| 27 | Mix Orange+Amethyst| #1c0a08 | #ff7a1a | #07041a | #ff7a1a | #f4a8f9 | #f4a8f9 |
| 28 | Mix Pastel Rose+Gold | #1c0a14 | #ffb3c8 | #1a1206 | #ffb3c8 | #ffe27a | #ffe27a |
| 29 | Mix Pastel Mint+Bronze | #0c1408 | #b3ffd4 | #1a120c | #b3ffd4 | #f0c987 | #f0c987 |
| 30 | Mix Fluor Violet+Platinum | #100020 | #9b3aff | #0e0e12 | #9b3aff | #f0f0f5 | #f0f0f5 |
| 31 | Mix Fluor Teal+Copper | #001a18 | #1affc6 | #1a0d06 | #1affc6 | #f4b890 | #f4b890 |

## Algoritmo de asignación

1. Admin crea un torneo. `theme_id` queda NULL.
2. La primera vez que cualquier endpoint pide `tournament.theme` (sea `/cromos`, `/tournaments/:id/theme`, etc.), el servidor:
   - `SELECT MIN(catalog_index)` libre (no asignado a ningún torneo) — implementado como diff entre `tournament_themes` y `tournaments.theme_id`.
   - Si todos están ocupados → `409 THEME_CATALOG_EXHAUSTED`.
   - `INSERT INTO tournament_themes (catalog_index, palette) VALUES (...)` si ese índice no existe aún en la tabla; `ON CONFLICT (catalog_index) DO NOTHING` para tolerar race.
   - `UPDATE tournaments SET theme_id = ? WHERE id = ? AND theme_id IS NULL`. Si `RETURNING` devuelve 0 filas, otro request ya asignó uno → leer el theme actual y devolverlo.

3. Catalogo seeding inicial: la migración SQL inserta las 32 entradas al levantar la DB.

## Por qué no usar hash determinístico del tournament_id

Sería más simple, pero:
- No garantiza no-repetición real (hash → módulo N puede colisionar).
- Hace imposible que un admin reordene/elija la paleta.
- Hace imposible auditar qué torneo tuvo qué paleta.

La persistencia explícita resuelve todo eso.

## Cómo ampliar el catálogo

`POST /admin/tournament-themes/seed` con body opcional:

```json
{
  "extraPalettes": [
    { "style": "fluor", "c1": "...", "c2": "...", "c3": "...", "glow": "...", "frame": "...", "tier_text": "...", "label": "..." }
  ]
}
```

El endpoint asigna `catalog_index = MAX(existing) + 1, +2, ...`.

## Notas estéticas

- Para mantener la "FUT feel", `c2` siempre es el accent dominante. `frame` es una versión más clara/saturada de `c2`. `glow` es `c2` con alpha 60-80%.
- `c1` y `c3` son tonos muy oscuros para garantizar contraste con la foto del jugador y el texto blanco.
- El catálogo evita combinaciones de bajo contraste (p. ej. `c2` claro sobre `c1` claro).
