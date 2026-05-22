# Share — Constitución del servicio

**Versión**: `1.0.0` — 2026-05-22
**Owner**: producto
**Estado**: vigente

## Misión

Permitir al jugador compartir/descargar su cromo en cualquier red social o canal, garantizando que el archivo final coincide pixel a pixel con el cromo que se ve en pantalla.

## Invariantes

1. **Mismo PNG en todos los paths** — Web Share API, descarga directa y deep links comparten el mismo blob (`exportCardToPng()` único). No hay "captura del DOM visible".
2. **File real** — cuando el navegador soporta `navigator.canShare({ files })`, se comparte el `File` PNG con el nombre `cromo-<slug>.png`.
3. **Fallback explícito** — si el navegador no soporta Web Share con files: descargar PNG + abrir deep link de la red elegida en nueva pestaña.
4. **Pixel parity** — el blob generado tiene exactamente 1360×1812 px (canónico × scale 2).
5. **Share-of-active** — cuando el usuario navega por su carousel, el botón compartir exporta el cromo visible en ese momento.

## Dependencias

- `lib/cromo-export.ts` (motor de captura via `html-to-image`).
- `lib/cromo-share.ts` (orquestación red social).
- `lib/cromos.ts` (fetch de la lista de cromos del jugador).

## No-objetivos

- Render server-side (puppeteer) — el cromo se genera en cliente.
- Watermark anti-robo — fuera de scope.
- Animación de un cromo (GIF/MP4) — fuera de scope.

## API pública

No expone endpoints HTTP propios. Es una librería cliente.

## Historial

```
1.0.0 — 2026-05-22 — Constitución inicial. Incluye share-of-active del carousel (SPEC-013).
```
