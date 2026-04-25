import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  label: string;
  suffix?: string;
  color?: "orange" | "blue" | "red" | "gold";
  durationMs?: number;
}

const COLORS: Record<NonNullable<Props["color"]>, string> = {
  orange: "text-neon-orange",
  blue:   "text-neon-blue",
  red:    "text-neon-red",
  gold:   "text-court-gold",
};

export default function CountUpStat({
  value, label, suffix = "", color = "orange", durationMs = 1400,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            const startTs = performance.now();
            const tick = (now: number) => {
              const t = Math.min(1, (now - startTs) / durationMs);
              const eased = 1 - Math.pow(1 - t, 3);
              setN(Math.round(value * eased));
              if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, durationMs]);

  return (
    <div ref={ref} className="text-center">
      <p className={`font-hero leading-none tabular-nums ${COLORS[color]}`} style={{ fontSize: "clamp(3rem, 8vw, 6rem)" }}>
        {n}{suffix}
      </p>
      <p className="mt-2 text-xs sm:text-sm uppercase tracking-[0.3em] text-court-muted">{label}</p>
    </div>
  );
}
