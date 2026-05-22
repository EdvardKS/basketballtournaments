// SPEC-015 — Public scorer island, hydrated at /score/:token.
// Drives the clock and provisional score against the public match-score
// endpoints. Never includes cookies, so an admin happening to be logged in
// in the same browser cannot escalate this view.
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicScoreSessionState, ScoreSide } from "../lib/types.js";
import {
  adjustPublicScore, computeElapsedSeconds, getPublicScoreState,
  pausePublicScore, startPublicScore, submitPublicScore,
} from "../lib/matchScore.js";

interface Props { token: string }

type LoadState =
  | { kind: "loading" }
  | { kind: "active";  state: PublicScoreSessionState }
  | { kind: "closed";  state: PublicScoreSessionState }
  | { kind: "missing" }
  | { kind: "error";   message: string };

const formatClock = (totalSeconds: number, duration: number): string => {
  const remaining = Math.max(0, duration - totalSeconds);
  const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
};

export default function MatchScorePage({ token }: Props) {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [now, setNow]   = useState(() => Date.now());
  const submittedOnceRef = useRef(false);

  // Tick once per second so the visual countdown moves while the clock
  // is running. We don't fetch state per tick — that comes from server
  // mutations + a soft 8s refetch.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const refetch = useCallback(async () => {
    try {
      const state = await getPublicScoreState(token);
      setLoad(state.editable
        ? { kind: "active", state }
        : { kind: "closed", state });
    } catch (e) {
      const err = e as { status?: number; code?: string };
      if (err.status === 404) setLoad({ kind: "missing" });
      else setLoad({ kind: "error", message: err.code ?? "Error" });
    }
  }, [token]);

  useEffect(() => { void refetch(); }, [refetch]);

  // Soft refresh every 8s as long as the session is active — keeps a passive
  // observer roughly in sync without busy-polling.
  useEffect(() => {
    if (load.kind !== "active") return;
    const id = window.setInterval(() => { void refetch(); }, 8000);
    return () => window.clearInterval(id);
  }, [load.kind, refetch]);

  if (load.kind === "loading") {
    return <div className="glass p-10 text-center text-court-muted">Cargando marcador…</div>;
  }
  if (load.kind === "missing") {
    return (
      <div className="glass p-10 text-center">
        <p className="text-5xl mb-3">🔒</p>
        <p className="text-white font-hero text-2xl">Enlace no válido</p>
        <p className="text-court-muted mt-2">El enlace no existe o ha sido eliminado.</p>
      </div>
    );
  }
  if (load.kind === "error") {
    return (
      <div className="glass p-10 text-center">
        <p className="text-5xl mb-3">⚠</p>
        <p className="text-white font-hero text-2xl">Algo no va bien</p>
        <p className="text-court-muted mt-2">{load.message}</p>
        <button
          type="button"
          onClick={() => { void refetch(); }}
          className="mt-4 px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10"
        >Reintentar</button>
      </div>
    );
  }

  if (load.kind === "closed") {
    const { state } = load;
    const reasonLabel = state.closedReason === "submitted"
      ? "Resultado enviado"
      : state.closedReason === "match_completed"
        ? "Partido cerrado"
        : state.closedReason === "revoked"
          ? "Enlace revocado"
          : "Enlace caducado";
    return (
      <div className="glass p-10 text-center">
        <p className="text-5xl mb-3">✓</p>
        <p className="text-white font-hero text-2xl">{reasonLabel}</p>
        <p className="text-court-muted mt-2">
          {state.match.homeTeamName ?? "Local"} <strong>{state.match.homeScore ?? state.session.homeScore}</strong>
          {" — "}
          <strong>{state.match.awayScore ?? state.session.awayScore}</strong> {state.match.awayTeamName ?? "Visitante"}
        </p>
      </div>
    );
  }

  const { state } = load;
  const isRunning = Boolean(state.session.startedAt) && !state.session.pausedAt;
  const elapsed   = computeElapsedSeconds(state.session, now);

  const runOp = async (op: () => Promise<PublicScoreSessionState>) => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await op();
      setLoad(next.editable ? { kind: "active", state: next } : { kind: "closed", state: next });
    } catch (e) {
      const err = e as { status?: number; code?: string };
      if (err.status === 404) setLoad({ kind: "missing" });
      else if (err.status === 410) await refetch();
      else setLoad({ kind: "error", message: err.code ?? "Error" });
    } finally {
      setBusy(false);
    }
  };

  const onAdjust = (side: ScoreSide, delta: -1 | 1 | 2) =>
    runOp(() => adjustPublicScore(token, { side, delta }));

  const onToggleClock = () =>
    isRunning ? runOp(() => pausePublicScore(token)) : runOp(() => startPublicScore(token));

  const onSubmit = async () => {
    if (busy || submittedOnceRef.current) return;
    const zero = state.session.homeScore === 0 && state.session.awayScore === 0;
    const msg = zero
      ? "Ambos marcadores están a 0. ¿Enviar resultado igualmente?"
      : `¿Enviar resultado ${state.session.homeScore} — ${state.session.awayScore}?`;
    if (!window.confirm(msg)) return;
    submittedOnceRef.current = true;
    setBusy(true);
    try {
      await submitPublicScore(token);
    } catch (e) {
      submittedOnceRef.current = false;
      const err = e as { status?: number; code?: string };
      if (err.status !== 410) {
        setLoad({ kind: "error", message: err.code ?? "Error al enviar" });
        setBusy(false);
        return;
      }
    }
    await refetch();
    setBusy(false);
  };

  const timeExhausted = elapsed >= state.session.durationSeconds;

  return (
    <div className="space-y-6">
      <header className="text-center">
        <p className="text-[11px] uppercase tracking-[0.4em] text-[var(--color-neon-orange)] font-bold">Marcador</p>
        <h1 className="font-hero text-3xl text-white mt-1">
          {state.match.homeTeamName ?? "Local"} <span className="text-white/30 mx-2">vs</span> {state.match.awayTeamName ?? "Visitante"}
        </h1>
      </header>

      {/* Clock */}
      <div className="glass p-6 text-center">
        <p className="text-xs uppercase tracking-widest text-court-muted">{isRunning ? "En juego" : "Pausado"}</p>
        <p
          className="font-hero text-6xl tabular-nums text-white mt-2"
          style={timeExhausted ? { color: "#ff6b6b", textShadow: "0 0 16px rgba(255,107,107,0.55)" } : undefined}
        >{formatClock(elapsed, state.session.durationSeconds)}</p>
        {timeExhausted && (
          <p className="text-xs uppercase tracking-widest text-[var(--color-neon-red)] mt-2">Tiempo agotado</p>
        )}
        <button
          type="button"
          onClick={onToggleClock}
          disabled={busy}
          className="mt-4 px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-white border-2 border-white/20 hover:bg-white/5 disabled:opacity-50"
        >
          {isRunning ? "⏸ Pausar" : "▶ Iniciar"}
        </button>
      </div>

      {/* Scoreboard */}
      <div className="glass p-4 sm:p-6">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <Side
            name={state.match.homeTeamName ?? "Local"}
            score={state.session.homeScore}
            disabled={busy}
            onMinus={()    => onAdjust("home", -1)}
            onPlus={()     => onAdjust("home", 1)}
            onPlusTwo={()  => onAdjust("home", 2)}
            side="home"
          />
          <span className="font-hero text-3xl text-white/30 text-center select-none">vs</span>
          <Side
            name={state.match.awayTeamName ?? "Visitante"}
            score={state.session.awayScore}
            disabled={busy}
            onMinus={()    => onAdjust("away", -1)}
            onPlus={()     => onAdjust("away", 1)}
            onPlusTwo={()  => onAdjust("away", 2)}
            side="away"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => { void onSubmit(); }}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-bold uppercase tracking-wider text-white transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, #3ecf8e 0%, #2da375 100%)",
          boxShadow: "0 0 22px rgba(62,207,142,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
        }}
      >
        ✓ Enviar resultado
      </button>
    </div>
  );
}

interface SideProps {
  name: string; score: number;
  onMinus: () => void; onPlus: () => void; onPlusTwo: () => void;
  side: "home" | "away"; disabled: boolean;
}

function Side({ name, score, onMinus, onPlus, onPlusTwo, side, disabled }: SideProps) {
  const align = side === "home" ? "items-start text-left" : "items-end text-right";
  const justify = side === "home" ? "flex-start" : "flex-end";
  return (
    <div className={`flex flex-col gap-2 ${align}`}>
      <p className="text-xs sm:text-sm font-semibold text-white truncate w-full uppercase tracking-wider">{name}</p>
      <div className="flex items-center gap-2 w-full" style={{ justifyContent: justify }}>
        <button
          type="button" onClick={onMinus} disabled={disabled || score === 0}
          aria-label={`Quitar punto a ${name}`}
          className="w-12 h-12 rounded-lg text-2xl font-bold text-white/80 border border-white/15 hover:bg-white/10 transition-all disabled:opacity-30"
        >−</button>
        <span
          className="font-hero leading-none tabular-nums text-white px-3 select-none"
          style={{ fontSize: "clamp(3rem, 12vw, 5rem)", textShadow: "0 0 16px rgba(255,107,0,0.55)" }}
        >{score}</span>
        <button
          type="button" onClick={onPlus} disabled={disabled}
          aria-label={`Sumar punto a ${name}`}
          className="w-14 h-14 rounded-xl text-3xl font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #ff6b00 0%, #ff8a1a 100%)",
            boxShadow: "0 0 18px rgba(255,107,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        >+</button>
        <button
          type="button" onClick={onPlusTwo} disabled={disabled}
          aria-label={`Sumar 2 puntos a ${name}`}
          className="w-12 h-12 rounded-lg text-sm font-bold text-[var(--color-neon-orange)] border border-[var(--color-neon-orange)]/40 hover:bg-[var(--color-neon-orange)]/10 transition-all disabled:opacity-50"
        >+2</button>
      </div>
    </div>
  );
}
