// Avatar pipeline: resize → background-remove → re-encode to PNG (alpha-preserved).
// Single source of truth so PlayerProfileEditor and RegisterForm share behavior.
// `@imgly/background-removal` is dynamic-imported only when bg removal actually
// runs, keeping it out of the initial page bundle.

export interface AvatarOptions {
  /** Max edge before bg removal — keeps the model fast. */
  maxPx?: number;
  /** Progress callback (0–1). */
  onProgress?: (pct: number) => void;
  /** Skip the bg-removal step (fallback path). */
  skipBgRemoval?: boolean;
  /** Final PNG max edge after re-encode. */
  outputMaxPx?: number;
}

/** Read a `Blob` (or `File`) as a base64 data URL. */
export const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error ?? new Error("FileReader failed"));
    r.readAsDataURL(blob);
  });

/** Resize an input image (any common format) to a max edge. Returns JPEG blob. */
const resizeToBlob = (file: File, maxPx: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("no 2d ctx")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob null")), "image/jpeg", 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
    img.src = url;
  });

/** Re-encode a (potentially alpha) blob to a PNG data URL at a given max edge. */
const pngFromBlob = (blob: Blob, maxPx: number): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("no 2d ctx")); return; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      // PNG preserves alpha — required for the bg-removed cutout.
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("png re-encode failed")); };
    img.src = url;
  });

export class AvatarBgRemovalError extends Error {
  constructor(public original: unknown) {
    super("BG_REMOVAL_FAILED");
  }
}

/**
 * Main entry. Returns a PNG data URL.
 * - When `skipBgRemoval` is false (default), runs the cutout model.
 * - When it fails, the caller can re-call with `skipBgRemoval: true` for a
 *   plain resize fallback.
 */
export const processAvatar = async (
  file: File, opts: AvatarOptions = {},
): Promise<string> => {
  const maxPx = opts.maxPx ?? 640;
  const outputMaxPx = opts.outputMaxPx ?? 360;

  const resized = await resizeToBlob(file, maxPx);
  if (opts.skipBgRemoval) {
    return await pngFromBlob(resized, outputMaxPx);
  }

  try {
    const { removeBackground } = await import("@imgly/background-removal");
    const cutout = await removeBackground(resized, {
      progress: (_key, current, total) => {
        if (!total) return;
        opts.onProgress?.(Math.min(1, current / total));
      },
      output: { format: "image/png", quality: 0.9 },
    });
    return await pngFromBlob(cutout, outputMaxPx);
  } catch (err) {
    console.warn("[avatar] background removal failed, falling back to plain resize", err);
    throw new AvatarBgRemovalError(err);
  }
};
