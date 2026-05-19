// Past-edition photo galleries. Photos live in /public/img/fotos/ as
// "I (n).PNG", "II (n).PNG", "III (n).PNG" — Instagram screenshots from
// the live editions. Captions and engagement numbers are filled in
// per-photo when known; otherwise we fall back to neutral defaults.

export interface GalleryPhoto {
  src: string;        // URL-encoded path under /img/fotos/
  alt: string;        // short label, screen-reader friendly
  caption: string;    // post body shown under the image
  author: string;     // poster handle
  likes: number;
  comments: { author: string; text: string }[];
}

export interface GalleryEdition {
  id: "I" | "II" | "III";
  number: number;
  label: string;      // e.g. "I Edición"
  year: number;
  photos: GalleryPhoto[];
}

// Photos live in /public/img/photos/ so the Astro/Node static handler
// serves them directly. Bot compliance relies on robots.txt + the noindex
// meta tags in Main.astro (no per-file UA gate at this path).
const encode = (raw: string) => `/img/photos/${raw.replace(/ /g, "%20")}`;

// Deterministic pseudo-random so server-rendered values match.
const seeded = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
};

const SAMPLE_AUTHORS = [
  "@villenabasket", "@vbl_oficial", "@equipo_halcones", "@dragones3x3",
  "@captain_lucas", "@mario_r", "@diaz_baller", "@court_villena",
];
const SAMPLE_COMMENTS = [
  "¡Brutal partido! 🔥",
  "Esos triples no se ven todos los días",
  "Nos vemos la próxima edición",
  "Que nivel chicos 👏",
  "Vaya tapón en el último cuarto",
  "Foto histórica",
  "Gracias por el torneo, una pasada",
  "El MVP merecidísimo",
  "Repetimos el año que viene fijo",
  "🏀💪",
];

const buildPhoto = (file: string, edition: "I" | "II" | "III", idx: number, seedBase: number): GalleryPhoto => {
  const rng = seeded(seedBase + idx);
  const likes = 40 + Math.floor(rng() * 220);
  const commentCount = 2 + Math.floor(rng() * 3);
  const comments = Array.from({ length: commentCount }, (_, i) => ({
    author: SAMPLE_AUTHORS[Math.floor(rng() * SAMPLE_AUTHORS.length)],
    text: SAMPLE_COMMENTS[Math.floor(rng() * SAMPLE_COMMENTS.length)],
  }));
  return {
    src: encode(file),
    alt: `${edition} Edición — foto ${idx + 1}`,
    caption: `Resumen de la ${edition} edición · #VillenaBasket #3x3`,
    author: SAMPLE_AUTHORS[idx % SAMPLE_AUTHORS.length],
    likes,
    comments,
  };
};

const range = (edition: "I" | "II" | "III", count: number, seedBase: number): GalleryPhoto[] =>
  Array.from({ length: count }, (_, i) =>
    buildPhoto(`${edition} (${i + 1}).PNG`, edition, i, seedBase));

export const EDITIONS: GalleryEdition[] = [
  {
    id: "I",
    number: 1,
    label: "I Edición",
    year: 2023,
    photos: range("I", 5, 101),
  },
  {
    id: "II",
    number: 2,
    label: "II Edición",
    year: 2024,
    photos: range("II", 16, 202),
  },
  {
    id: "III",
    number: 3,
    label: "III Edición",
    year: 2025,
    photos: range("III", 10, 303),
  },
];

// Flat list of "featured" photos used by the home-page InstagramPhone
// rotator: take a couple from each edition so all editions get airtime.
export const FEATURED_PHOTOS: GalleryPhoto[] = [
  ...EDITIONS[2].photos.slice(0, 3),
  ...EDITIONS[1].photos.slice(0, 3),
  ...EDITIONS[0].photos.slice(0, 2),
];
