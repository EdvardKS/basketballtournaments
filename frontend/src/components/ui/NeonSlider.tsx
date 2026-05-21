import { useMemo } from "react";

interface Props {
  label: string;
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}

export default function NeonSlider({
  label, value, min = 0, max = 99, disabled = false, onChange,
}: Props) {
  const pct = useMemo(() => Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)), [value, min, max]);
  return (
    <div className={`flex items-center gap-3 ${disabled ? "opacity-60" : ""}`}>
      <span className="text-[10px] uppercase tracking-[0.25em] text-court-muted w-14 shrink-0">{label}</span>
      <div className="neon-slider-track relative">
        <div className="neon-slider-fill" style={{ width: `${pct}%` }} />
        <div className="neon-slider-thumb" style={{ left: `${pct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="neon-slider-input"
          aria-label={label}
        />
      </div>
      <span className="font-display text-base text-white tabular-nums w-9 text-right">{value}</span>
    </div>
  );
}
