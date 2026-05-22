# Cromo — Constitución del servicio

**Versión**: `1.0.0` — 2026-05-22
**Owner**: producto
**Estado**: vigente

## Misión

Generar, renderizar, exportar y compartir el coleccionable visual de VBL: el **cromo**. El cromo es propiedad de un torneo, no del jugador.

## Invariantes

1. **Pertenencia al torneo** — un cromo existe sii existe un `tournament_registrations(player_id, tournament_id)` con `registered_at` anterior al cierre de inscripciones del torneo.
2. **Tamaño canónico** — todo cromo se renderiza a 680×906 px lógicos. Export PNG a 1360×1812 px (scale 2). El preview escala visualmente, nunca al revés.
3. **Pixel parity** — el PNG exportado es pixel-identical al preview en pantalla. Se permite `filter: blur`, `drop-shadow`, `radial-gradient`, `mask-image` porque `html-to-image` (foreignObject) los reproduce fielmente.
4. **Theme por torneo** — cada torneo tiene una y sólo una paleta, persistida en `tournament_themes` y vinculada vía `tournaments.theme_id`. Dos torneos no comparten paleta (UNIQUE constraint sobre `catalog_index`).
5. **Stats congeladas en torneos cerrados** — si `tournament.status == 'completed'`, las stats del cromo provienen de `player_skill_snapshots` indexado por `(tournament_id, player_id)`. En estados anteriores, las stats vienen de la fila viva en `players`.
6. **Versión = ordinal cronológico del jugador** — el primer torneo en el que un jugador se inscribió es `v1`, el segundo `v2`, etc. La versión no es la antigüedad genérica del registro del jugador.
7. **Header del cromo** — siempre muestra `tournament.name` y `tournament.year` (derivado de `tournament.date` `YYYY-MM-DD`, fallback `created_at`).
8. **Share opera sobre el cromo activo** — cuando el jugador navega por su carousel, el botón compartir/descargar exporta el cromo visible en ese momento, no un cromo "por defecto".

## Dependencias

- `tournaments`, `tournament_registrations`, `players`, `player_skill_snapshots`, `tournament_themes`.
- Frontend: `html-to-image`, `gsap` (animación carousel).
- Fuentes web: Bebas Neue (display), Inter (body), Teko (headlines).

## No-objetivos

- Cromo físico imprimible.
- NFT / blockchain.
- Animaciones en runtime durante export (rompen pixel parity).
- Edición manual de stats por jugador.
- Carrousel automático — el cromo cambia por intervención explícita (← →).

## API pública (resumen)

Detalle en `sdd/specs/spec-013-cromo-por-torneo/api.md`. Endpoints principales:

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/players/:id/cromos` | propietario o admin | lista todos los cromos de un jugador *(SPEC-013)* |
| GET | `/tournaments/:id/theme` | público | theme del torneo (autogenera si no existe) *(SPEC-013)* |
| POST | `/admin/tournament-themes/seed` | admin | reseed del catálogo *(SPEC-013)* |

## Estructura de un cromo (response)

```ts
interface Cromo {
  tournamentId: string;
  tournamentName: string;
  tournamentYear: number;
  status: "upcoming" | "open" | "draft" | "setup" | "scheduled" | "active" | "completed";
  theme: {
    style: "fluor" | "pastel" | "metallic" | "mix";
    c1: string;   // background base
    c2: string;   // accent
    c3: string;   // background bottom
    glow: string;
    frame: string;
    tier_text: string;
    label: string;
  };
  player: {
    id: string; name: string; position: string; avatar: string | null;
    overall: number; pace: number; shooting: number; passing: number;
    dribbling: number; defense: number; physical: number;
  };
  versionLabel: string;     // "v1" | "v2" | ... ordinal cronológico
  frozen: boolean;          // true si las stats vienen del snapshot
}
```

## Historial

```
1.0.0 — 2026-05-22 — Constitución inicial. Introduce theme persistido, snapshot freezing, share-of-active, carousel.
```
