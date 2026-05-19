import { useEffect, useState } from "react";

export interface PhonePhoto {
  src: string;
  alt: string;
  caption: string;
  author: string;
  likes: number;
  comments: { author: string; text: string }[];
}

interface Props {
  photos: PhonePhoto[];
  intervalMs?: number;
}

const fmtLikes = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

export default function InstagramPhone({ photos, intervalMs = 5000 }: Props) {
  const [idx, setIdx] = useState(0);
  const [liked, setLiked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % photos.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [photos.length, intervalMs]);

  if (photos.length === 0) return null;
  const p = photos[idx];
  const isLiked = !!liked[idx];

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Phone frame */}
      <div
        className="relative rounded-[2.5rem] p-2 shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
        style={{
          background: "linear-gradient(160deg, #1a1d2b 0%, #0b0f1a 100%)",
          width: "min(340px, 92vw)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Notch */}
        <div className="absolute left-1/2 -translate-x-1/2 top-2 z-10 h-5 w-24 rounded-b-2xl bg-black/90" />

        <div
          className="relative overflow-hidden rounded-[2rem] bg-[#0b0f1a]"
          style={{ aspectRatio: "9 / 19.5" }}
        >
          {/* IG header */}
          <div className="absolute top-0 left-0 right-0 z-20 px-3 py-2 flex items-center gap-2 bg-black/40 backdrop-blur-sm border-b border-white/5">
            <div
              className="w-8 h-8 rounded-full p-[2px]"
              style={{
                background:
                  "conic-gradient(from 180deg, #ff6b00, #ff2d2d, #d946ef, #ff6b00)",
              }}
            >
              <div className="w-full h-full rounded-full bg-court-bg flex items-center justify-center font-display text-white text-xs">
                V
              </div>
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-white text-xs font-semibold truncate">
                {p.author}
              </span>
              <span className="text-[10px] text-white/60 truncate">
                Villena · {p.alt}
              </span>
            </div>
            <span className="ml-auto text-white text-lg leading-none">⋯</span>
          </div>

          {/* Image with crossfade */}
          <div className="absolute inset-0">
            {photos.map((ph, i) => (
              <img
                key={ph.src}
                src={ph.src}
                alt={ph.alt}
                loading={i === 0 ? "eager" : "lazy"}
                draggable={false}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                  i === idx ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
            {/* Top fade so header stays legible */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
            {/* Bottom fade so action bar stays legible */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />
          </div>

          {/* Footer actions + caption + comments */}
          <div className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-3 pt-2 text-white">
            <div className="flex items-center gap-4 mb-2">
              <button
                type="button"
                aria-label="Like"
                onClick={() => setLiked((m) => ({ ...m, [idx]: !m[idx] }))}
                className="text-2xl leading-none transition-transform active:scale-90"
                style={{ color: isLiked ? "#ff2d2d" : "white" }}
              >
                {isLiked ? "♥" : "♡"}
              </button>
              <span className="text-2xl leading-none">💬</span>
              <span className="text-2xl leading-none">↗</span>
              <span className="ml-auto text-2xl leading-none">🔖</span>
            </div>
            <p className="text-xs font-semibold mb-1">
              {fmtLikes(p.likes + (isLiked ? 1 : 0))} Me gusta
            </p>
            <p className="text-xs mb-1 line-clamp-2">
              <span className="font-semibold">{p.author}</span>{" "}
              <span className="text-white/90">{p.caption}</span>
            </p>
            <div className="space-y-0.5">
              {p.comments.slice(0, 2).map((c, i) => (
                <p key={i} className="text-[11px] leading-snug truncate">
                  <span className="font-semibold">{c.author}</span>{" "}
                  <span className="text-white/80">{c.text}</span>
                </p>
              ))}
            </div>
            <p className="text-[10px] text-white/40 mt-1.5">
              Ver los {p.comments.length} comentarios
            </p>
          </div>
        </div>
      </div>

      {/* Pagination dots */}
      <div className="flex gap-1.5">
        {photos.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ir a foto ${i + 1}`}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === idx
                ? "w-6 bg-court-accent"
                : "w-1.5 bg-white/30 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
