// Canonical cromo export pipeline.
//
// Root-cause notes — why the previous capture “se deshacía”:
//
//  1. Old `clamp(260px, 86vw, 340px)` sizing made html2canvas snapshot the
//     current responsive pixel size (different on mobile vs desktop, vs zoom).
//     → Fixed by rendering at a canonical 680×906 logical size, scaled only
//       for preview via container queries.
//  2. No font-ready / image-decoded gate → Bebas Neue often missed the
//     capture and the PNG used the system fallback (different metrics).
//     → Fixed via `waitForFonts` + `waitForImages`.
//  3. The library itself (`html2canvas` v1.4.1) cannot reproduce
//     `filter: blur()`, `filter: drop-shadow()`, several radial gradients
//     and `box-shadow` with negative offset. The on-screen card used all of
//     these for halo, photo shadow and metallic glow → those layers
//     silently disappeared in the PNG, leaving a flat "HTML card" look.
//     → Fixed by replacing html2canvas with `html-to-image` (toBlob), which
//       inlines the live computed styles into an SVG <foreignObject> and
//       lets the browser rasterize — every CSS effect the browser can paint
//       on screen ends up in the PNG byte-for-byte.
//  4. The live node lived inside the dashboard layout, so parent transforms
//     and padding leaked into the screenshot.
//     → Fixed by cloning the node into an off-screen sandbox at the
//       canonical pixel size with no inherited transforms.
//
// Public surface stays identical: `exportCardToPng(opts) → ExportedCard`.

import { toBlob } from "html-to-image";
import { CROMO_W, CROMO_H, EXPORT_SCALE } from "./cromo-dimensions.js";

export interface ExportOptions {
  /** Pixel ratio multiplier (1 = 680×906, 2 = 1360×1812). Default 2. */
  scale?: number;
  /** Override the source node. Defaults to `#cromo-root`. */
  source?: HTMLElement | null;
  /** Optional filename hint passed back in the result. */
  fileName?: string;
}

export interface ExportedCard {
  blob: Blob;
  file: File;
  url: string;       // object URL — caller is responsible for revoking
  width: number;     // pixel width of the PNG
  height: number;
}

export class CromoExportError extends Error {
  constructor(message: string, public cause?: unknown) { super(message); }
}

const slugify = (s: string): string =>
  s.toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 60) || "jugador";

export const buildFileName = (playerName: string): string =>
  `cromo-${slugify(playerName)}.png`;

// Wait until every web font the card uses has been loaded. `document.fonts.
// ready` resolves before custom faces are actually registered in some
// Chromium builds — explicitly `load()` each face we depend on.
const waitForFonts = async (): Promise<void> => {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load('900 112px "Bebas Neue"').catch(() => undefined),
      document.fonts.load('900 46px "Bebas Neue"').catch(() => undefined),
      document.fonts.load('700 16px "Bebas Neue"').catch(() => undefined),
      document.fonts.load('800 40px "Inter"').catch(() => undefined),
    ]);
  } catch {/* best-effort */}
};

// Resolve once every <img> inside the source node has natural dimensions
// AND decoded pixel data — html-to-image otherwise rasterizes a 0×0 placeholder.
const waitForImages = async (root: HTMLElement): Promise<void> => {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(imgs.map((img) => new Promise<void>((resolve) => {
    if (img.complete && img.naturalWidth > 0) { resolve(); return; }
    img.addEventListener("load",  () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
    setTimeout(() => resolve(), 4000);
  })));
  await Promise.all(imgs.map((img) =>
    "decode" in img && typeof img.decode === "function"
      ? img.decode().catch(() => undefined)
      : Promise.resolve()));
};

// Move the cromo into a deterministic off-screen sandbox so the live page's
// CSS / transform / parent layout can't leak into the captured frame.
const mountSandbox = (sourceNode: HTMLElement) => {
  const sandbox = document.createElement("div");
  sandbox.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${CROMO_W}px`,
    `height:${CROMO_H}px`,
    "transform:translate(-200vw,-200vh)",
    "pointer-events:none",
    "z-index:-1",
    "background:transparent",
    "isolation:isolate",
  ].join(";");
  const clone = sourceNode.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.querySelectorAll<HTMLElement>("[id]").forEach((el) => el.removeAttribute("id"));
  // Lock the clone's own box to the canonical pixel size — defeats any
  // inherited transform / clamp() / responsive sizing.
  clone.style.cssText = (clone.getAttribute("style") ?? "")
    + `;width:${CROMO_W}px !important`
    + `;height:${CROMO_H}px !important`
    + ";transform:none !important"
    + ";margin:0 !important"
    + ";position:relative !important"
    + ";top:0 !important"
    + ";left:0 !important";
  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);
  return { sandbox, clone };
};

export const exportCardToPng = async (opts: ExportOptions = {}): Promise<ExportedCard> => {
  if (typeof document === "undefined") {
    throw new CromoExportError("SSR_NO_DOCUMENT");
  }
  const source = opts.source ?? document.getElementById("cromo-root");
  if (!source) throw new CromoExportError("CROMO_ROOT_NOT_FOUND");

  const { sandbox, clone } = mountSandbox(source);
  try {
    await waitForFonts();
    await waitForImages(clone);

    const pixelRatio = opts.scale ?? EXPORT_SCALE;
    // `toBlob` inlines computed styles into an SVG <foreignObject>, so any
    // CSS the browser paints on screen (blur, drop-shadow, gradients) ends
    // up in the PNG. `cacheBust` is off because all our assets live in
    // data URLs already (see backend/players.ts → avatar field).
    // `skipFonts: true` because Bebas Neue + Inter are already loaded into
    // `document.fonts` (we waited above) — html-to-image's default embedder
    // tries to fetch the Google Fonts CSS to inline @font-face and trips on
    // CORS, throwing the whole capture away. The browser uses the loaded
    // face when rasterizing the foreignObject anyway.
    const blob = await toBlob(clone, {
      width: CROMO_W,
      height: CROMO_H,
      pixelRatio,
      cacheBust: false,
      skipFonts: true,
      backgroundColor: undefined,
      style: { transform: "none", margin: "0" },
    });
    if (!blob) throw new CromoExportError("BLOB_NULL");

    const url = URL.createObjectURL(blob);
    const fileName = opts.fileName ?? "cromo.png";
    const file = new File([blob], fileName, { type: "image/png" });
    return {
      blob, file, url,
      width:  CROMO_W * pixelRatio,
      height: CROMO_H * pixelRatio,
    };
  } catch (e) {
    if (e instanceof CromoExportError) throw e;
    throw new CromoExportError("EXPORT_FAILED", e);
  } finally {
    sandbox.remove();
  }
};

// Plain download (no share intent). Used by the explicit "Descargar PNG"
// button so the UI doesn't need to re-implement the anchor dance.
export const downloadCard = async (playerName: string): Promise<ExportedCard> => {
  const fileName = buildFileName(playerName);
  const exp = await exportCardToPng({ fileName });
  const a = document.createElement("a");
  a.href = exp.url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a tick so iOS Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(exp.url), 4000);
  return exp;
};
