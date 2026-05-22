// Canonical logical dimensions of the cromo card. Imported by every layer
// that needs to talk in pixels: CromoCard (CSS), cromo-export (sandbox),
// CromoShare (validation hints). 3:4 ratio.
export const CROMO_W = 680;
export const CROMO_H = 906;
export const CROMO_RATIO = `${CROMO_W} / ${CROMO_H}`;
// Pixel ratio used when capturing the PNG. 2 → 1360×1812 — sharp on retina
// devices and large enough to share on WhatsApp / IG without re-encode.
export const EXPORT_SCALE = 2;
export const EXPORT_W = CROMO_W * EXPORT_SCALE;
export const EXPORT_H = CROMO_H * EXPORT_SCALE;
