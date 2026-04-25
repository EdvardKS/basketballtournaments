import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api.js";
import type { Match } from "../../lib/types.js";

interface Props {
  matches: Match[];
  hoursConfirmed?: boolean;
  tournamentId?: string;     // when present, exposes the "Recalcular" action
}

interface LiveMatch {
  match: Match;
  home: number;
  away: number;
  dirty: boolean;
}

const STAGE_LABEL: Record<string, string> = {
  group: "Grupo",
  quarterfinal: "Cuartos",
  semifinal: "Semis",
  third_place: "3er puesto",
  final: "FINAL",
};

const STAGE_ORDER = ["group", "quarterfinal", "semifinal", "third_place", "final"] as const;

const formatTime = (iso?: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
};

export default function QuickScoreSheet({ matches, tournamentId }: Props) {
  // Local optimistic state per match (so taps feel instant).
  const [live, setLive] = useState<Record<string, LiveMatch>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  // Hydrate from props whenever the parent re-fetches matches.
  useEffect(() => {
    setLive((prev) => {
      const next: Record<string, LiveMatch> = {};
      for (const m of matches) {
        const existing = prev[m.id];
        next[m.id] = {
          match: m,
          home: existing?.dirty ? existing.home : (m.homeScore ?? 0),
          away: existing?.dirty ? existing.away : (m.awayScore ?? 0),
          dirty: existing?.dirty ?? false,
        };
      }
      return next;
    });
  }, [matches]);

  const flash = (kind: "ok" | "err", msg: string) => {
    setFeedback({ kind, msg });
    setTimeout(() => setFeedback(null), 2400);
  };

  // Filter to non-completed matches (the ones admin needs to act on).
  const open = matches.filter((m) => m.status !== "completed");

  // Sort: in_progress first, then by stage order, then by scheduled time.
  const ordered = [...open].sort((a, b) => {
    if (a.status !== b.status) return a.status === "in_progress" ? -1 : 1;
    const sa = STAGE_ORDER.indexOf(a.stage as typeof STAGE_ORDER[number]);
    const sb = STAGE_ORDER.indexOf(b.stage as typeof STAGE_ORDER[number]);
    if (sa !== sb) return sa - sb;
    const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity;
    const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity;
    return ta - tb;
  });

  const bump = (id: string, side: "home" | "away", delta: number) => {
    setLive((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      const nextVal = Math.max(0, (side === "home" ? cur.home : cur.away) + delta);
      return {
        ...prev,
        [id]: { ...cur, [side]: nextVal, dirty: true } as LiveMatch,
      };
    });
  };

  const saveScore = async (id: string) => {
    const cur = live[id];
    if (!cur) return;
    setBusyId(id);
    try {
      await api(`/matches/${id}/score`, {
        method: "POST",
        body: JSON.stringify({ homeScore: cur.home, awayScore: cur.away }),
      });
      setLive((prev) => ({ ...prev, [id]: { ...cur, dirty: false } }));
      flash("ok", "Marcador guardado");
    } catch (e) {
      flash("err", e instanceof ApiError ? e.code : "Error al guardar");
    } finally { setBusyId(null); }
  };

  const completeMatch = async (id: string) => {
    const cur = live[id];
    if (!cur) return;
    if (cur.home === 0 && cur.away === 0) {
      if (!confirm("Ambos marcadores están a 0. ¿Finalizar de todas formas?")) return;
    }
    setBusyId(id);
    try {
      // Save scores first if dirty, then complete.
      if (cur.dirty) {
        await api(`/matches/${id}/score`, {
          method: "POST",
          body: JSON.stringify({ homeScore: cur.home, awayScore: cur.away }),
        });
      }
      await api(`/matches/${id}/complete`, { method: "POST" });
      flash("ok", "Partido finalizado");
      // Page reload so groups standings + bracket auto-generation surface.
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      flash("err", e instanceof ApiError ? e.code : "Error al finalizar");
      setBusyId(null);
    }
  };

  // Diagnostic: matches with a saved score that aren't completed (= points
  // not yet credited to standings). Loud in the UI so the admin acts.
  const limbo = matches.filter((m) => (m.homeScore != null || m.awayScore != null) && m.status !== "completed");

  const recompute = async () => {
    if (!tournamentId) return;
    if (!confirm("Esto resetea las tablas y vuelve a contar todos los partidos completados. ¿Continuar?")) return;
    setBusyId("__recompute__");
    try {
      const res = await api<{ replayed: number }>(`/matches/tournament/${tournamentId}/recompute-standings`, { method: "POST" });
      flash("ok", `Clasificación recalculada (${res.replayed} partidos)`);
      setTimeout(() => window.location.reload(), 700);
    } catch (e) {
      flash("err", e instanceof ApiError ? e.code : "Error al recalcular");
      setBusyId(null);
    }
  };

  if (ordered.length === 0) {
    return (
      <div className="space-y-4">
        <div className="glass p-10 text-center">
          <p className="text-5xl mb-3">🏁</p>
          <p className="text-white font-hero text-2xl">Todos los partidos cerrados</p>
          <p className="text-court-muted text-sm mt-2">No queda nada por puntuar.</p>
        </div>
        {tournamentId && (
          <button
            type="button"
            onClick={recompute}
            disabled={busyId === "__recompute__"}
            className="text-xs uppercase tracking-widest text-court-muted hover:text-white transition-colors"
          >
            ↻ Recalcular clasificación
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] uppercase tracking-[0.4em] text-[var(--color-neon-orange)] font-bold">Marcador rápido</p>
        <div className="flex items-center gap-3">
          <p className="text-xs text-court-muted">{ordered.length} pendientes</p>
          {tournamentId && (
            <button
              type="button"
              onClick={recompute}
              disabled={busyId === "__recompute__"}
              className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-neon-blue)] border border-[var(--color-neon-blue)]/40 px-2 py-1 rounded-md hover:bg-[var(--color-neon-blue)]/10 transition-all disabled:opacity-50"
              title="Resetea las tablas y vuelve a contar todos los partidos completados"
            >
              ↻ Recalcular clasificación
            </button>
          )}
        </div>
      </header>

      {limbo.length > 0 && (
        <div role="alert" className="px-3 py-2 rounded-lg text-sm border border-court-warn/40 bg-court-warn/10 text-court-warn">
          <strong>{limbo.length}</strong> {limbo.length === 1 ? "partido tiene" : "partidos tienen"} marcador guardado pero
          {" "}<strong>sin finalizar</strong> — esos puntos no cuentan en la clasificación. Pulsa <strong>Finalizar</strong> en cada uno para registrarlos.
        </div>
      )}

      {feedback && (
        <div role="status" className="px-3 py-2 rounded-lg text-sm border"
             style={{
               background: feedback.kind === "ok" ? "rgba(62,207,142,0.10)" : "rgba(255,45,45,0.10)",
               borderColor: feedback.kind === "ok" ? "rgba(62,207,142,0.4)" : "rgba(255,45,45,0.4)",
               color: feedback.kind === "ok" ? "#3ecf8e" : "#ff6b6b",
             }}>
          {feedback.msg}
        </div>
      )}

      <ul className="space-y-3">
        {ordered.map((m) => {
          const ls = live[m.id];
          if (!ls) return null;
          const inProgress = ls.match.status === "in_progress";
          const busy = busyId === m.id;
          const time = formatTime(m.scheduledAt);
          const stageLabel = STAGE_LABEL[m.stage] ?? m.stage;
          return (
            <li
              key={m.id}
              className="glass p-3 sm:p-4 transition-all"
              style={inProgress ? { borderColor: "rgba(255,45,45,0.5)", boxShadow: "0 0 22px rgba(255,45,45,0.3)" } : undefined}
            >
              {/* Header row: stage + time + status */}
              <div className="flex items-center justify-between gap-2 mb-3 text-[10px] uppercase tracking-widest font-bold">
                <span className="text-court-muted">{stageLabel}{time && <> · <span className="text-white/70">{time}</span></>}</span>
                {inProgress ? (
                  <span className="inline-flex items-center gap-1.5 text-[var(--color-neon-red)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-neon-red)] animate-pulse" />
                    En juego
                  </span>
                ) : (
                  <span className="text-court-muted/70">Pendiente</span>
                )}
              </div>

              {/* Score row — optimized for one-handed thumb taps */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                {/* Home */}
                <ScoreSide
                  name={m.homeTeamName ?? "Local"}
                  score={ls.home}
                  onPlus={() => bump(m.id, "home", +1)}
                  onMinus={() => bump(m.id, "home", -1)}
                  onPlusTwo={() => bump(m.id, "home", +2)}
                  side="home"
                  disabled={busy}
                />

                <span className="font-hero text-3xl text-white/30 text-center select-none">vs</span>

                {/* Away */}
                <ScoreSide
                  name={m.awayTeamName ?? "Visitante"}
                  score={ls.away}
                  onPlus={() => bump(m.id, "away", +1)}
                  onMinus={() => bump(m.id, "away", -1)}
                  onPlusTwo={() => bump(m.id, "away", +2)}
                  side="away"
                  disabled={busy}
                />
              </div>

              {/* Action row — score live se lleva por separado, aquí solo Guardar / Finalizar */}
              <div className="mt-4 flex flex-wrap gap-2">
                {ls.dirty && (
                  <button
                    type="button"
                    onClick={() => saveScore(m.id)}
                    disabled={busy}
                    className="flex-1 min-w-[8rem] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-white border-2 border-white/15 hover:bg-white/5 transition-all disabled:opacity-50"
                  >
                    💾 Guardar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => completeMatch(m.id)}
                  disabled={busy}
                  className="flex-1 min-w-[8rem] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #3ecf8e 0%, #2da375 100%)",
                    boxShadow: "0 0 22px rgba(62,207,142,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
                  }}
                >
                  ✓ Finalizar
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface SideProps {
  name: string;
  score: number;
  onPlus: () => void;
  onMinus: () => void;
  onPlusTwo: () => void;
  side: "home" | "away";
  disabled: boolean;
}

function ScoreSide({ name, score, onPlus, onMinus, onPlusTwo, side, disabled }: SideProps) {
  const align = side === "home" ? "items-start text-left" : "items-end text-right";
  return (
    <div className={`flex flex-col gap-2 ${align}`}>
      <p className="text-xs sm:text-sm font-semibold text-white truncate w-full uppercase tracking-wider">{name}</p>
      <div className="flex items-center gap-2 w-full" style={{ justifyContent: side === "home" ? "flex-start" : "flex-end" }}>
        <button
          type="button"
          onClick={onMinus}
          disabled={disabled || score === 0}
          aria-label={`Quitar punto a ${name}`}
          className="w-10 h-10 rounded-lg text-lg font-bold text-white/70 border border-white/10 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >−</button>
        <span
          className="font-hero leading-none tabular-nums text-white px-3 select-none"
          style={{ fontSize: "clamp(2.5rem, 8vw, 4rem)", textShadow: "0 0 14px rgba(255,107,0,0.45)" }}
        >{score}</span>
        <button
          type="button"
          onClick={onPlus}
          disabled={disabled}
          aria-label={`Sumar punto a ${name}`}
          className="w-12 h-12 rounded-xl text-2xl font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #ff6b00 0%, #ff8a1a 100%)",
            boxShadow: "0 0 18px rgba(255,107,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        >+</button>
        <button
          type="button"
          onClick={onPlusTwo}
          disabled={disabled}
          aria-label={`Sumar 2 puntos a ${name}`}
          className="w-10 h-10 rounded-lg text-xs font-bold text-[var(--color-neon-orange)] border border-[var(--color-neon-orange)]/40 hover:bg-[var(--color-neon-orange)]/10 transition-all disabled:opacity-50"
        >+2</button>
      </div>
    </div>
  );
}
