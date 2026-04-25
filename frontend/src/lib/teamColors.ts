// Deterministic per-team accent color (NBA-franchise feel) derived from a stable id hash.
const PALETTE: { color: string; soft: string; name: string }[] = [
  { color: "#ff6b00", soft: "rgba(255,107,0,0.18)",  name: "orange" },
  { color: "#0066ff", soft: "rgba(0,102,255,0.18)",  name: "blue"   },
  { color: "#ff2d2d", soft: "rgba(255,45,45,0.18)",  name: "red"    },
  { color: "#3ecf8e", soft: "rgba(62,207,142,0.18)", name: "green"  },
  { color: "#f5c518", soft: "rgba(245,197,24,0.18)", name: "gold"   },
  { color: "#a855f7", soft: "rgba(168,85,247,0.18)", name: "purple" },
  { color: "#06b6d4", soft: "rgba(6,182,212,0.18)",  name: "cyan"   },
  { color: "#ec4899", soft: "rgba(236,72,153,0.18)", name: "pink"   },
];

const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const teamAccent = (id: string) => PALETTE[hashString(id) % PALETTE.length];
