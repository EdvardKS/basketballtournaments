// Canonical cromo export pipeline.
//
// Root-cause notes — why the previous capture “se deshacía”:
//
// 1. The card was sized with `clamp(260px, 86vw, 340px)`, so html2canvas was
//    snapshotting whatever pixel size the responsive viewport produced at the
//    moment of capture (mobile → ~280px, desktop with zoom → wrong px). The
//    output therefore depended on the device.
// 2. There was no font-ready / image-decoded gate, so Bebas Neue often hadn't
//    loaded when we shot the canvas and the captured frame used the system
//    fallback (different metrics → name + stats jumped).
// 3. `backdrop-filter` and `mix-blend-mode` were used; html2canvas can't
//    render either — visual elements silently disappeared in the PNG.
// 4. We were capturing the live, scaled, padded node, so any layout from the
//    surrounding dashboard leaked into the screenshot.
//
// Fix: render the cromo at a fixed logical size (680×906) — the screen
// preview keeps the same node and scales it via container queries, so the
// pixel box of the inner card is always 680×906. For export we still detach
// the node into a deterministic off-screen mount with explicit dimensions,
// wait for fonts + image decode, then html2canvas it at scale 2 → 1360×1812.

import { CROMO_W, CROMO_H } from "./cromo-dimensions.js";

export interface ExportOptions {
  /** Scale multiplier (1 = 680×906, 2 = 1360×1812). Default 2. */
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

// Wait until every web font this card uses has been loaded. We can't just
// poll `document.fonts.ready` once because Chrome resolves that promise
// before custom faces in shadow-DOM-less Astro pages finish — explicitly
// `load()` each face we depend on.
const waitForFonts = async (): Promise<void> => {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await document.fonts.ready;
    // Force-load the two display weights the cromo cares about. If the face
    // is missing the call rejects silently — we don't want to abort the
    // export because of that.
    await Promise.all([
      document.fonts.load('900 96px "Bebas Neue"').catch(() => undefined),
      document.fonts.load('700 36px "Bebas Neue"').catch(() => undefined),
    ]);
  } catch {/* best-effort */}
};

// Resolve once every <img> inside the source node has natural dimensions.
const waitForImages = async (root: HTMLElement): Promise<void> => {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(imgs.map((img) => new Promise<void>((resolve) => {
    if (img.complete && img.naturalWidth > 0) { resolve(); return; }
    img.addEventListener("load",  () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
    // 4s safety net.
    setTimeout(() => resolve(), 4000);
  })));
  // For decoded pixel data — modern browsers expose img.decode().
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
    "transform:translate(-200vw,-200vh)", // off-screen but rendered
    "pointer-events:none",
    "z-index:-1",
    "background:transparent",
    "isolation:isolate",
  ].join(";");
  const clone = sourceNode.cloneNode(true) as HTMLElement;
  // Strip the IDs from the clone so we don't pollute the document.
  clone.removeAttribute("id");
  clone.querySelectorAll<HTMLElement>("[id]").forEach((el) => el.removeAttribute("id"));
  // Lock the clone's own box to the canonical pixel size — defeats any
  // inherited transform / clamp() / responsive sizing.
  clone.style.cssText = (clone.getAttribute("style") ?? "")
    + `;width:${CROMO_W}px !important`
    + `;height:${CROMO_H}px !important`
    + ";transform:none !important"
    + ";margin:0 !important";
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

    const { default: html2canvas } = await import("html2canvas");
    const scale = opts.scale ?? 2;
    const canvas = await html2canvas(clone, {
      backgroundColor: null,
      scale,
      width: CROMO_W,
      height: CROMO_H,
      windowWidth: CROMO_W,
      windowHeight: CROMO_H,
      useCORS: true,
      allowTaint: false,
      logging: false,
    });

    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/png", 1.0));
    if (!blob) throw new CromoExportError("BLOB_NULL");

    const url = URL.createObjectURL(blob);
    const fileName = opts.fileName ?? "cromo.png";
    const file = new File([blob], fileName, { type: "image/png" });
    return { blob, file, url, width: canvas.width, height: canvas.height };
  } catch (e) {
    if (e instanceof CromoExportError) throw e;
    throw new CromoExportError("EXPORT_FAILED", e);
  } finally {
    sandbox.remove();
  }
};
