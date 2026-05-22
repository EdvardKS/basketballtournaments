// SPEC-015 — Matchday scorer modal for admin.
//
// Combines three flows on a single match:
//   1. Admin-direct scoring (uses existing /matches/:id/score + /complete).
//   2. Final-result-direct (skip the clock, type in the closing score).
//   3. Create/copy/revoke a /score/:token URL for an external scorer.
//
// We intentionally do NOT replace QuickScoreSheet or MatchEditOverlay — they
// stay working as-is. This modal is the new entry point opened from cards
// in the matchday view and from the bracket view.
import { useCallback, useEffect, useState } from "react";
import Modal from "./Modal.js";
import { api, ApiError } from "../../lib/api.js";
import {
  createMatchScoreSession, getMatchScoreSessionStatus, revokeMatchScoreSession,
} from "../../lib/matchScore.js";
import type { Match } from "../../lib/types.js";

interface Props {
  open: boolean;
  match: Match | null;
  onClose: () => void;
  onAfterChange?: () => void;
}

type Flash = { kind: "ok" | "err"; msg: string } | null;

export default function MatchdayScoreModal({ open, match, onClose, onAfterChange }: Props) {
  const [home, setHome] = useState(0);
  const [away, setAway] = useState(0);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);
  const [linkInfo, setLinkInfo] = useState<{ url: string; token: string } | null>(null);
  const [activeSession, setActiveSession] = useState<boolean>(false);

  const matchUrl = (path: string) =>
    match ? `/matches/${match.id}${path}` : "";

  const showFlash = (kind: "ok" | "err", msg: string) => {
    setFlash({ kind, msg });
    window.setTimeout(() => setFlash(null), 2400);
  };

  // Reset/seed local state whenever the modal opens for a (possibly new) match.
  useEffect(() => {
    if (!open || !match) return;
    setHome(match.homeScore ?? 0);
    setAway(match.awayScore ?? 0);
    setLinkInfo(null);
    setFlash(null);
  }, [open, match?.id]);

  const refreshLinkStatus = useCallback(async () => {
    if (!match) return;
    try {
      const status = await getMatchScoreSessionStatus(match.id);
      setActiveSession(status.active);
    } catch {
      setActiveSession(false);
    }
  }, [match?.id]);

  useEffect(() => { if (open) void refreshLinkStatus(); }, [open, refreshLinkStatus]);

  if (!match) return null;

  const bump = (side: "home" | "away", delta: number) => {
    if (side === "home") setHome((v) => Math.max(0, v + delta));
    else                 setAway((v) => Math.max(0, v + delta));
  };

  const saveScore = async () => {
    setBusy(true);
    try {
      await api(matchUrl("/score"), {
        method: "POST",
        body: JSON.stringify({ homeScore: home, awayScore: away }),
      });
      showFlash("ok", "Marcador guardado");
      onAfterChange?.();
    } catch (e) {
      showFlash("err", e instanceof ApiError ? e.code : "Error al guardar");
    } finally { setBusy(false); }
  };

  const completeMatch = async () => {
    if (home === 0 && away === 0) {
      if (!confirm("Ambos marcadores están a 0. ¿Finalizar de todas formas?")) return;
    }
    setBusy(true);
    try {
      await api(matchUrl("/score"), {
        method: "POST",
        body: JSON.stringify({ homeScore: home, awayScore: away }),
      });
      await api(matchUrl("/complete"), { method: "POST" });
      showFlash("ok", "Partido finalizado");
      onAfterChange?.();
      window.setTimeout(() => onClose(), 600);
    } catch (e) {
      showFlash("err", e instanceof ApiError ? e.code : "Error al finalizar");
    } finally { setBusy(false); }
  };

  const startMatch = async () => {
    setBusy(true);
    try {
      await api(matchUrl("/start"), { method: "POST" });
      showFlash("ok", "Partido iniciado");
      onAfterChange?.();
    } catch (e) {
      // already in_progress → quietly continue. Anything else surfaces.
      if (e instanceof ApiError && e.code === "MATCH_NOT_FOUND_OR_WRONG_STATUS") {
        showFlash("ok", "Ya estaba en juego");
      } else {
        showFlash("err", e instanceof ApiError ? e.code : "Error al iniciar");
      }
    } finally { setBusy(false); }
  };

  const createLink = async () => {
    setBusy(true);
    try {
      const created = await createMatchScoreSession(match.id);
      setLinkInfo({ url: created.url, token: created.token });
      setActiveSession(true);
      showFlash("ok", "Enlace creado");
    } catch (e) {
      showFlash("err", e instanceof ApiError ? e.code : "Error al crear enlace");
    } finally { setBusy(false); }
  };

  const revokeLink = async () => {
    setBusy(true);
    try {
      await revokeMatchScoreSession(match.id);
      setLinkInfo(null);
      setActiveSession(false);
      showFlash("ok", "Enlace revocado");
    } catch (e) {
      showFlash("err", e instanceof ApiError ? e.code : "Error al revocar");
    } finally { setBusy(false); }
  };

  const copyLink = async () => {
    if (!linkInfo) return;
    const full = `${window.location.origin}${linkInfo.url}`;
    try {
      await navigator.clipboard.writeText(full);
      showFlash("ok", "Enlace copiado");
    } catch {
      // Clipboard API can fail in non-secure contexts — fall back to prompt.
      window.prompt("Copia el enlace:", full);
    }
  };

  const homeName = match.homeTeamName ?? "Local";
  const awayName = match.awayTeamName ?? "Visitante";
  const inProgress = match.status === "in_progress";

  return (
    <Modal open={open} title="Marcador" subtitle={`${homeName} vs ${awayName}`} onClose={onClose} size="md">
      {flash && (
        <div role="status" className="px-3 py-2 mb-4 rounded-lg text-sm border"
             style={{
               background: flash.kind === "ok" ? "rgba(62,207,142,0.10)" : "rgba(255,45,45,0.10)",
               borderColor: flash.kind === "ok" ? "rgba(62,207,142,0.4)" : "rgba(255,45,45,0.4)",
               color: flash.kind === "ok" ? "#3ecf8e" : "#ff6b6b",
             }}>{flash.msg}</div>
      )}

      <section className="space-y-4">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <Side name={homeName} score={home} side="home" disabled={busy}
                onPlus={()    => bump("home", 1)}
                onPlusTwo={() => bump("home", 2)}
                onMinus={()   => bump("home", -1)} />
          <span className="font-hero text-3xl text-white/30 text-center select-none">vs</span>
          <Side name={awayName} score={away} side="away" disabled={busy}
                onPlus={()    => bump("away", 1)}
                onPlusTwo={() => bump("away", 2)}
                onMinus={()   => bump("away", -1)} />
        </div>

        <div className="flex flex-wrap gap-2">
          {!inProgress && match.status === "pending" && (
            <button type="button" onClick={startMatch} disabled={busy}
              className="flex-1 min-w-[8rem] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-white border-2 border-[var(--color-neon-blue)]/40 hover:bg-[var(--color-neon-blue)]/10 disabled:opacity-50">
              ▶ Iniciar
            </button>
          )}
          <button type="button" onClick={saveScore} disabled={busy}
            className="flex-1 min-w-[8rem] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-white border-2 border-white/15 hover:bg-white/5 disabled:opacity-50">
            💾 Guardar
          </button>
          <button type="button" onClick={completeMatch} disabled={busy}
            className="flex-1 min-w-[8rem] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #3ecf8e 0%, #2da375 100%)",
              boxShadow: "0 0 22px rgba(62,207,142,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
            }}>
            ✓ Finalizar
          </button>
        </div>
      </section>

      <section className="mt-6 pt-5 border-t border-white/10 space-y-3">
        <h3 className="text-xs uppercase tracking-widest text-court-muted font-bold">Enlace temporal</h3>
        {linkInfo ? (
          <>
            <p className="text-sm text-white/80 break-all">
              <code>{window.location.origin}{linkInfo.url}</code>
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copyLink} disabled={busy}
                className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-white border border-white/15 hover:bg-white/5 disabled:opacity-50">
                Copiar
              </button>
              <button type="button" onClick={revokeLink} disabled={busy}
                className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-[var(--color-neon-red)] border border-[var(--color-neon-red)]/40 hover:bg-[var(--color-neon-red)]/10 disabled:opacity-50">
                Revocar
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            <button type="button" onClick={createLink} disabled={busy}
              className="px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider text-white border border-[var(--color-neon-orange)]/40 hover:bg-[var(--color-neon-orange)]/10 disabled:opacity-50">
              {activeSession ? "Regenerar enlace" : "Crear enlace"}
            </button>
            {activeSession && (
              <button type="button" onClick={revokeLink} disabled={busy}
                className="px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider text-[var(--color-neon-red)] border border-[var(--color-neon-red)]/40 hover:bg-[var(--color-neon-red)]/10 disabled:opacity-50">
                Revocar enlace activo
              </button>
            )}
            {activeSession && (
              <p className="text-[11px] text-court-muted">Ya hay un enlace activo para este partido. Regenerar lo revoca y crea uno nuevo.</p>
            )}
          </div>
        )}
      </section>
    </Modal>
  );
}

interface SideProps {
  name: string; score: number;
  onPlus: () => void; onPlusTwo: () => void; onMinus: () => void;
  side: "home" | "away"; disabled: boolean;
}

function Side({ name, score, onPlus, onPlusTwo, onMinus, side, disabled }: SideProps) {
  const align = side === "home" ? "items-start text-left" : "items-end text-right";
  const justify = side === "home" ? "flex-start" : "flex-end";
  return (
    <div className={`flex flex-col gap-2 ${align}`}>
      <p className="text-xs sm:text-sm font-semibold text-white truncate w-full uppercase tracking-wider">{name}</p>
      <div className="flex items-center gap-2 w-full" style={{ justifyContent: justify }}>
        <button type="button" onClick={onMinus} disabled={disabled || score === 0}
          aria-label={`Quitar punto a ${name}`}
          className="w-10 h-10 rounded-lg text-lg font-bold text-white/70 border border-white/10 hover:bg-white/10 disabled:opacity-30">−</button>
        <span className="font-hero leading-none tabular-nums text-white px-3 select-none"
          style={{ fontSize: "clamp(2.5rem, 8vw, 4rem)", textShadow: "0 0 14px rgba(255,107,0,0.45)" }}>{score}</span>
        <button type="button" onClick={onPlus} disabled={disabled}
          aria-label={`Sumar punto a ${name}`}
          className="w-12 h-12 rounded-xl text-2xl font-bold text-white disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #ff6b00 0%, #ff8a1a 100%)",
            boxShadow: "0 0 18px rgba(255,107,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}>+</button>
        <button type="button" onClick={onPlusTwo} disabled={disabled}
          aria-label={`Sumar 2 puntos a ${name}`}
          className="w-10 h-10 rounded-lg text-xs font-bold text-[var(--color-neon-orange)] border border-[var(--color-neon-orange)]/40 hover:bg-[var(--color-neon-orange)]/10 disabled:opacity-50">+2</button>
      </div>
    </div>
  );
}
