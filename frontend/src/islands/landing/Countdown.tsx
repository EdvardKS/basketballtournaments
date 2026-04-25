import { useEffect, useState } from "react";

interface Props {
  targetIso: string;
  label?: string;
  variant?: "orange" | "red" | "blue";
}

interface Parts { d: number; h: number; m: number; s: number; done: boolean }

const compute = (target: number): Parts => {
  const diff = target - Date.now();
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true };
  const s = Math.floor(diff / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    done: false,
  };
};

const pad = (n: number) => n.toString().padStart(2, "0");

export default function Countdown({ targetIso, label, variant = "orange" }: Props) {
  const target = new Date(targetIso).getTime();
  const [parts, setParts] = useState<Parts>(() => compute(target));

  useEffect(() => {
    const id = setInterval(() => setParts(compute(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const colorClass =
    variant === "red" ? "text-neon-red" :
    variant === "blue" ? "text-neon-blue" :
    "text-neon-orange";

  if (parts.done) {
    return (
      <div className="flex flex-col items-start gap-1">
        {label && <span className="text-[10px] uppercase tracking-[0.25em] text-court-muted">{label}</span>}
        <span className={`font-hero text-3xl ${colorClass}`}>EN MARCHA</span>
      </div>
    );
  }

  const cells: { v: string; l: string }[] = [
    { v: parts.d.toString(), l: "días" },
    { v: pad(parts.h), l: "h" },
    { v: pad(parts.m), l: "min" },
    { v: pad(parts.s), l: "seg" },
  ];

  return (
    <div className="flex flex-col items-start gap-2">
      {label && <span className="text-[10px] uppercase tracking-[0.25em] text-court-muted">{label}</span>}
      <div className="flex items-baseline gap-2 sm:gap-3" aria-live="polite">
        {cells.map((c, i) => (
          <div key={c.l} className="flex items-baseline gap-2 sm:gap-3">
            <div className="flex flex-col items-center">
              <span className={`font-hero text-3xl sm:text-5xl leading-none ${colorClass} tabular-nums`}>{c.v}</span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-court-muted mt-1">{c.l}</span>
            </div>
            {i < cells.length - 1 && <span className="font-hero text-2xl sm:text-4xl text-white/20 leading-none">:</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
