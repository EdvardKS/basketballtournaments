import { useMemo, useState } from "react";
import { api, ApiError } from "../lib/api.js";
import type { Player } from "../lib/types.js";

const KEYS = [
  ["pace", "Ritmo"], ["shooting", "Tiro"], ["passing", "Pase"],
  ["dribbling", "Bote"], ["defense", "Defensa"], ["physical", "Físico"],
] as const;

const POOL = 240;
const DEFAULTS = { pace: 40, shooting: 40, passing: 40, dribbling: 40, defense: 40, physical: 40 };

type Stats = Record<typeof KEYS[number][0], number>;
interface Props { player: Player }

export default function PlayerStatsRedistributor({ player }: Props) {
  const initial: Stats = {
    pace: player.pace, shooting: player.shooting, passing: player.passing,
    dribbling: player.dribbling, defense: player.defense, physical: player.physical,
  };
  const [s, setS] = useState<Stats>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const used = useMemo(() => KEYS.reduce((a, [k]) => a + s[k], 0), [s]);
  const remaining = POOL - used;
  const locked = !player.canEditStats;

  const onChange = (key: keyof Stats, raw: number) => {
    if (locked) return;
    const v = Math.max(0, Math.min(99, Math.round(raw)));
    setS((prev) => {
      const otherTotal = KEYS.reduce((a, [k]) => k === key ? a : a + prev[k], 0);
      const capped = Math.min(v, POOL - otherTotal);
      return { ...prev, [key]: capped };
    });
  };

  const reset = () => setS(DEFAULTS);

  const save = async () => {
    if (used > POOL) { setErr(`Suma ${used} supera ${POOL}.`); return; }
    setBusy(true); setErr(null);
    try {
      await api<Player>(`/players/${player.id}/stats`, {
        method: "PATCH", body: JSON.stringify(s),
      });
      window.location.reload();
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "ERROR";
      setErr(code === "STATS_LOCKED" ? "Stats bloqueados por admin." : `Error (${code}).`);
    } finally { setBusy(false); }
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <p className="label-text">Repartir stats</p>
        <span className={`text-xs font-mono ${remaining < 0 ? "text-court-warn" : "text-court-muted"}`}>
          {used} / {POOL}
        </span>
      </div>
      {locked && <p className="text-xs text-court-warn">⚠️ El admin ha bloqueado tu edición de stats.</p>}
      <div className="space-y-2">
        {KEYS.map(([k, label]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="text-xs text-court-muted w-16">{label}</span>
            <input type="range" min={0} max={99} value={s[k]}
              disabled={locked || busy}
              onChange={(e) => onChange(k, Number(e.target.value))}
              className="flex-1 accent-[var(--color-neon-orange)]" />
            <input type="number" min={0} max={99} value={s[k]}
              disabled={locked || busy}
              onChange={(e) => onChange(k, Number(e.target.value))}
              className="w-12 bg-court-bg border border-court-border rounded px-1 py-0.5 text-xs text-white text-right" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button disabled={locked || busy} onClick={reset} className="btn-ghost text-xs">Restablecer (40)</button>
        <button disabled={locked || busy} onClick={save} className="btn-primary text-xs">Guardar</button>
      </div>
      {err && <p className="text-xs text-court-warn">{err}</p>}
    </div>
  );
}
