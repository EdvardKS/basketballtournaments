import { useState } from "react";
import { api, ApiError } from "../../lib/api.js";
import type { Match, MatchStatus } from "../../lib/types.js";
import Modal from "./Modal.js";

interface Props { match: Match }

// Quick edit modal: enter the final score and finalize the match.
// Live scoring is tracked off-platform; we only need the closing number.

const STAGE_LABEL: Record<string, string> = {
  group: "Grupo", eighth: "Octavos", quarterfinal: "Cuartos", semifinal: "Semis",
  third_place: "3er puesto", final: "FINAL",
};

const STATUS_LABEL: Record<MatchStatus, string> = {
  pending: "Pendiente", in_progress: "En juego", completed: "Completado",
};
const STATUS_TONE: Record<MatchStatus, string> = {
  pending: "#a0a7b8", in_progress: "#ff6b00", completed: "#3ecf8e",
};

const ERROR_MESSAGES: Record<string, string> = {
  MATCH_NOT_FOUND:                 "Este partido ya no existe.",
  MATCH_NOT_FOUND_OR_WRONG_STATUS: "El partido no está en un estado válido para esta acción.",
  NO_SCORE:                        "Falta el marcador antes de finalizar.",
  VALIDATION:                      "El marcador no es válido (revisa los números).",
  INTERNAL:                        "Error interno del servidor. Mira los logs del backend.",
};

const formatError = (e: unknown, fallback: string): string => {
  if (e instanceof ApiError) {
    // Prefer the backend's own message (e.g. requireRole writes
    // "Tu sesión es de tipo "captain" pero esta acción exige rol admin").
    const body = e.body as { message?: string } | undefined;
    if (body?.message && body.message !== e.code) return body.message;
    const human = ERROR_MESSAGES[e.code] ?? null;
    if (human) return human;
    return `${fallback} (HTTP ${e.status} · ${e.code})`;
  }
  return fallback;
};


export default function MatchEditOverlay({ match }: Props) {
  const [open, setOpen] = useState(false);
  const [home, setHome] = useState<number>(match.homeScore ?? 0);
  const [away, setAway] = useState<number>(match.awayScore ?? 0);
  const [busy, setBusy] = useState<null | "complete" | "recompute">(null);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const flash = (kind: "ok" | "err", msg: string) => {
    setFeedback({ kind, msg });
    if (kind === "ok") setTimeout(() => setFeedback(null), 2500);
  };

  const close = () => {
    setOpen(false);
    setFeedback(null);
  };

  const wasCompleted = match.status === "completed";
  const dirtyScore = home !== (match.homeScore ?? 0) || away !== (match.awayScore ?? 0);

  const completeMatch = async () => {
    if (home === 0 && away === 0 && !confirm("Ambos marcadores están a 0. ¿Finalizar igualmente?")) return;
    setBusy("complete");
    try {
      // Always persist the score first so /complete picks it up even if it
      // hasn't been saved yet — and so the admin doesn't need a separate save.
      await api(`/matches/${match.id}/score`, {
        method: "POST",
        body: JSON.stringify({ homeScore: home, awayScore: away }),
      });
      await api(`/matches/${match.id}/complete`, { method: "POST" });
      flash("ok", "Partido finalizado");
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      // Surface the real error (HTTP status + code) so 403 / 401 / VALIDATION
      // reach the admin instead of an opaque "UNKNOWN_ERROR".
      console.error("[finalize match]", e);
      flash("err", formatError(e, "Error al finalizar"));
      setBusy(null);
    }
  };

  // Editing the score of an already-completed match doesn't update standings
  // (the increment lives inside completeMatch). Offer a one-click rebuild.
  const recompute = async () => {
    setBusy("recompute");
    try {
      if (dirtyScore) {
        await api(`/matches/${match.id}/score`, {
          method: "POST",
          body: JSON.stringify({ homeScore: home, awayScore: away }),
        });
      }
      await api(`/matches/tournament/${match.tournamentId}/recompute-standings`, { method: "POST" });
      flash("ok", "Marcador y clasificación actualizados");
      setTimeout(() => window.location.reload(), 700);
    } catch (e) {
      console.error("[recompute standings]", e);
      flash("err", formatError(e, "Error al recalcular"));
      setBusy(null);
    }
  };

  const homeName = match.homeTeamName ?? "Local";
  const awayName = match.awayTeamName ?? "Visitante";
  const stageLabel = STAGE_LABEL[match.stage] ?? match.stage;

  return (
    <>
      {/* Invisible click target covering the whole card */}
      <button
        type="button"
        onClick={() => { setOpen(true); setHome(match.homeScore ?? 0); setAway(match.awayScore ?? 0); setFeedback(null); }}
        aria-label={`Editar partido ${homeName} vs ${awayName}`}
        className="absolute inset-0 z-10 rounded-xl cursor-pointer transition-all hover:bg-white/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-neon-orange)]"
      />

      {/* Tiny pencil hint, top-right of the card */}
      <span
        aria-hidden="true"
        className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-md flex items-center justify-center text-white/40 bg-black/30 border border-white/10 pointer-events-none"
        title="Click para editar (admin)"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </span>

      <Modal open={open} title={`${homeName} vs ${awayName}`} subtitle={stageLabel} onClose={close} size="sm">
        {/* Status chip — read-only badge of the current state */}
        <div className="mb-5 flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.25em] text-court-muted font-bold">Estado</span>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold border"
            style={{
              color: "#fff",
              background: `${STATUS_TONE[match.status]}26`,
              borderColor: `${STATUS_TONE[match.status]}80`,
              boxShadow: `0 0 12px ${STATUS_TONE[match.status]}55`,
            }}
          >
            {STATUS_LABEL[match.status]}
          </span>
        </div>

        {/* Score editor */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-5">
          <ScoreInput name={homeName} value={home} onChange={setHome} disabled={busy !== null} align="end" />
          <span className="font-hero text-3xl text-white/30 leading-none">vs</span>
          <ScoreInput name={awayName} value={away} onChange={setAway} disabled={busy !== null} align="start" />
        </div>

        {/* Drift warning when score edited on a completed match */}
        {wasCompleted && dirtyScore && (
          <div role="alert" className="mb-4 px-3 py-2 rounded-lg text-xs border border-court-warn/40 bg-court-warn/10 text-court-warn">
            Estás editando un partido cerrado. Usa <strong>Guardar y recalcular</strong> para que las tablas se actualicen sin doble-conteo.
          </div>
        )}

        {feedback && (
          <div role="status" className="mb-4 px-3 py-2 rounded-lg text-sm border"
               style={{
                 background: feedback.kind === "ok" ? "rgba(62,207,142,0.10)" : "rgba(255,45,45,0.10)",
                 borderColor: feedback.kind === "ok" ? "rgba(62,207,142,0.4)" : "rgba(255,45,45,0.4)",
                 color: feedback.kind === "ok" ? "#3ecf8e" : "#ff6b6b",
               }}>
            {feedback.msg}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-end">
          <button type="button" onClick={close} disabled={busy !== null}
                  className="px-4 py-2.5 rounded-md text-xs font-semibold uppercase tracking-wider text-court-muted hover:text-white border border-white/10 hover:border-white/20 transition-all disabled:opacity-50">
            Cancelar
          </button>

          {wasCompleted ? (
            <button type="button" onClick={recompute} disabled={busy !== null || !dirtyScore}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider text-white transition-all hover:scale-[1.03] disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#0066ff,#3a8eff)", boxShadow: "0 0 18px rgba(0,102,255,0.55), inset 0 1px 0 rgba(255,255,255,0.25)" }}>
              💾 Guardar y recalcular
            </button>
          ) : (
            <button type="button" onClick={completeMatch} disabled={busy !== null}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider text-white transition-all hover:scale-[1.03] disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#3ecf8e,#2da375)", boxShadow: "0 0 18px rgba(62,207,142,0.55), inset 0 1px 0 rgba(255,255,255,0.25)" }}>
              ✓ Finalizar
            </button>
          )}
        </div>
      </Modal>
    </>
  );
}

interface SInputProps {
  name: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  align?: "start" | "end";
}

function ScoreInput({ name, value, onChange, disabled, align = "end" }: SInputProps) {
  const cls = align === "end" ? "items-end text-right" : "items-start text-left";
  const inc = (d: number) => onChange(Math.max(0, value + d));
  return (
    <div className={`flex flex-col gap-2 ${cls}`}>
      <p className="text-xs font-semibold text-white truncate w-full uppercase tracking-wider">{name}</p>
      <div className="flex items-center gap-1.5" style={{ flexDirection: align === "end" ? "row-reverse" : "row" }}>
        <button type="button" onClick={() => inc(-1)} disabled={disabled || value === 0}
                aria-label={`Quitar punto ${name}`}
                className="w-9 h-9 rounded-lg text-base font-bold text-white/70 border border-white/10 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30">−</button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value || "0", 10)))}
          disabled={disabled}
          className="font-hero leading-none tabular-nums text-white text-center bg-transparent border-0 focus:outline-none focus:ring-0 w-20"
          style={{ fontSize: "clamp(2rem, 7vw, 3rem)", textShadow: "0 0 14px rgba(255,107,0,0.45)" }}
        />
        <button type="button" onClick={() => inc(+1)} disabled={disabled}
                aria-label={`Sumar punto ${name}`}
                className="w-11 h-11 rounded-xl text-xl font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#ff6b00,#ff8a1a)", boxShadow: "0 0 14px rgba(255,107,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25)" }}>+</button>
      </div>
    </div>
  );
}
