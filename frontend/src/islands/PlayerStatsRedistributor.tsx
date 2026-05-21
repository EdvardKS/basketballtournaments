import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../lib/api.js";
import type { Player } from "../lib/types.js";
import NeonSlider from "../components/ui/NeonSlider.js";
import NeonButton from "../components/ui/NeonButton.js";
import { useRevealStagger, tweenNumber, successBurst, errorShake } from "../lib/neon.js";

const KEYS = [
  ["pace",      "Ritmo"],
  ["shooting",  "Tiro"],
  ["passing",   "Pase"],
  ["dribbling", "Bote"],
  ["defense",   "Defensa"],
  ["physical",  "Físico"],
] as const;

const POOL = 240;
const DEFAULTS = { pace: 40, shooting: 40, passing: 40, dribbling: 40, defense: 40, physical: 40 };

type Stats = Record<typeof KEYS[number][0], number>;
interface Props { player: Player; onDone?: () => void }

const poolColor = (used: number) => {
  if (used > POOL) return "#ff2d2d";
  if (used > POOL * 0.92) return "#ff6b00";
  if (used > POOL * 0.7) return "#f5c518";
  return "#16d39b";
};

export default function PlayerStatsRedistributor({ player, onDone }: Props) {
  const initial: Stats = {
    pace: player.pace, shooting: player.shooting, passing: player.passing,
    dribbling: player.dribbling, defense: player.defense, physical: player.physical,
  };
  const [s, setS] = useState<Stats>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const saveBtn = useRef<HTMLButtonElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const prevUsed = useRef<number>(KEYS.reduce((a, [k]) => a + initial[k], 0));

  const used = useMemo(() => KEYS.reduce((a, [k]) => a + s[k], 0), [s]);
  const remaining = POOL - used;
  const locked = !player.canEditStats;
  const fillPct = Math.min(100, (used / POOL) * 100);

  // Tween the counter text when the running total changes.
  useEffect(() => {
    void tweenNumber(counterRef.current, prevUsed.current, used, 0.3);
    prevUsed.current = used;
  }, [used]);

  const containerRef = useRevealStagger();

  const onChange = (key: keyof Stats, raw: number) => {
    if (locked) return;
    const v = Math.max(0, Math.min(99, Math.round(raw)));
    setS((prev) => {
      const otherTotal = KEYS.reduce((a, [k]) => k === key ? a : a + prev[k], 0);
      return { ...prev, [key]: Math.min(v, POOL - otherTotal) };
    });
  };

  const reset = () => setS(DEFAULTS);

  const save = async () => {
    if (used > POOL) { setErr(`Suma ${used} supera ${POOL}.`); errorShake(saveBtn.current); return; }
    setBusy(true); setErr(null);
    try {
      await api<Player>(`/players/${player.id}/stats`, {
        method: "PATCH", body: JSON.stringify(s),
      });
      successBurst(saveBtn.current);
      setTimeout(() => { onDone?.(); window.location.reload(); }, 600);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "ERROR";
      setErr(code === "STATS_LOCKED" ? "Stats bloqueados por admin." : `Error (${code}).`);
      errorShake(saveBtn.current);
    } finally { setBusy(false); }
  };

  return (
    <div ref={containerRef} className="space-y-5">
      <section data-reveal className="card space-y-4">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="neon-section-overline">Repartir stats</p>
            <h3 className="font-hero text-xl text-white leading-none">Pool de <span className="text-neon-orange">240 puntos</span></h3>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.25em] text-court-muted">Usados</p>
            <p className="font-display text-2xl text-white tabular-nums leading-none">
              <span ref={counterRef}>{used}</span>
              <span className="text-court-muted text-base mx-1">/</span>
              <span className="text-court-muted text-base">{POOL}</span>
            </p>
          </div>
        </div>

        {/* Pool meter */}
        <div className="h-2.5 rounded-full bg-white/5 overflow-hidden border border-court-border">
          <div className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${fillPct}%`,
              background: `linear-gradient(90deg, #16d39b 0%, #f5c518 60%, #ff6b00 90%, ${poolColor(used)} 100%)`,
              boxShadow: `0 0 12px ${poolColor(used)}`,
            }} />
        </div>

        {locked && (
          <p className="text-xs text-court-warn flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-court-warn" style={{ animation: "lock-pulse 1.4s ease-in-out infinite" }} />
            El admin ha bloqueado tu edición de stats.
          </p>
        )}

        <div className="space-y-3" data-reveal>
          {KEYS.map(([k, label]) => (
            <NeonSlider key={k} label={label} value={s[k]} disabled={locked || busy}
              onChange={(v) => onChange(k, v)} />
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <NeonButton variant="ghost" size="sm" disabled={locked || busy} onClick={reset}>
            Restablecer (40 c/u)
          </NeonButton>
          <NeonButton ref={saveBtn} variant="primary" size="sm" disabled={locked || busy} onClick={save}>
            {busy ? "Guardando…" : "Guardar stats"}
          </NeonButton>
        </div>

        {err && <p data-reveal className="text-xs text-court-warn">{err}</p>}
      </section>
    </div>
  );
}
