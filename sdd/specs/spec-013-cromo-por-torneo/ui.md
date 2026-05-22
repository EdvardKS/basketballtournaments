# SPEC-013 — UI

## Componentes

### `CromoCard.astro` — refactor

Refactor: deja de calcular tier por antigüedad del registro y recibe todos los datos visuales como props.

```ts
interface Props {
  cromo: Cromo;     // ver shape en cromo.md
  active?: boolean; // si true, añade data-active="true" para el share
}
```

Cambios concretos:
- Header del cromo nuevo (encima del corner top-left actual):
  - `<div class="cromo-header">` con `<div class="cromo-tname">{tournamentName}</div>` y `<div class="cromo-tyear">{tournamentYear}</div>`.
- Paleta aplicada como CSS custom properties **inline** (no más clases `frame-v1..v5plus`):
  ```html
  <div id="cromo-root"
       class="cromo"
       data-active={active ? "true" : "false"}
       style="--cromo-c1: ...; --cromo-c2: ...; ...">
  ```
- Tier badge (`V1/V2/...`) lee `cromo.versionLabel` en lugar de `theme.tierLabel`.

### `CromoCarousel.tsx` — nuevo (React island)

```ts
interface Props {
  cromos: Cromo[];
}
```

Responsabilidades:
- Render `cromos.length` instancias de `CromoCard` lado a lado dentro de un track horizontal.
- Estado `activeIndex` (default 0 = más reciente).
- Botones ← →, controles teclado (←/→), swipe táctil.
- Animación GSAP: `gsap.to(track, { x: -activeIndex * slideWidth, duration: 0.45, ease: "power2.out" })`.
- Dots indicadores con color del `theme.frame` de cada cromo.
- Aria: `role="region"`, `aria-roledescription="carousel"`, botones con `aria-label`.

### `CromoEmptyState.astro` — nuevo

CTA cuando `cromos.length === 0`:
- Si hay un torneo `open` o `upcoming`: "Inscríbete al torneo <name>" → link a la página del torneo.
- Si no hay torneo abierto: "Aún no hay torneo abierto. Te avisaremos pronto."
- Fondo con un cromo "fantasma" (silueta gris) para mostrar lo que falta.

### `CromoShare.tsx` — actualizado

Cambios:
- Recibe ahora `playerId` (ya) y opcionalmente lee del DOM el nodo con `[data-active="true"]` antes de exportar.
- En `handleShare` y `handleDownload`, pasa `source: document.querySelector('.cromo[data-active="true"]')` a `exportCardToPng`.

## Página dashboard

`frontend/src/pages/dashboard/player.astro` y `captain.astro`:

```astro
---
const cromos = await api<{ cromos: Cromo[] }>(`/players/${player.id}/cromos`, {}, cookie);
---
{cromos.cromos.length === 0 ? (
  <CromoEmptyState />
) : (
  <>
    <CromoCarousel cromos={cromos.cromos} client:visible />
    <CromoShare playerName={player.name} playerId={player.id} client:visible />
  </>
)}
```

## Animaciones (GSAP)

GSAP ya está en `frontend/package.json` (`gsap@^3.13.0`).

Reglas:
- Slide carousel: `gsap.to(trackEl, { x: -idx * w, duration: 0.45, ease: "power2.out" })`.
- Fade del cromo activo al cambiar: `gsap.fromTo(activeCard, { opacity: 0.65, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.35 })`.
- Burst de éxito al compartir/descargar (ya existe `successBurst` en `frontend/src/lib/neon.js`).

## Accesibilidad

- Carousel anuncia el slide actual con `aria-live="polite"`.
- Indicadores con `role="tablist"` + `role="tab"` + `aria-selected`.
- Foco visible en botones ← →.

## Responsive

- Móvil: track con scroll-snap nativo + flechas más grandes.
- Desktop: animación GSAP + flechas medianas.
- `CromoCard` interno: ya escala vía `--cromo-scale` (SPEC-012).

## Export concurrency

Si el usuario pulsa "compartir" mientras GSAP está animando, `exportCardToPng` debe:
1. Llamar `gsap.killTweensOf(track)`.
2. Snap del track a la posición final (`gsap.set(track, { x: -idx * w })`).
3. Esperar `requestAnimationFrame` para asegurar repaint.
4. Ejecutar la captura.

Esto se implementa dentro del propio `exportCardToPng` mediante una pequeña espera o, más simple, en `CromoShare.tsx` antes de llamarlo.
