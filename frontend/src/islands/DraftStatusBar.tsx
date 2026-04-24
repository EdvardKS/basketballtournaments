import type { DraftState } from "../lib/types.js";

interface Props {
  state: DraftState | null;
  myTeamId: string | null;
  currentTeamId: string | null;
  currentTeamName?: string;
}

export default function DraftStatusBar({ state, myTeamId, currentTeamId, currentTeamName }: Props) {
  if (!state?.isActive) {
    return (
      <div className="card flex items-center gap-3 bg-court-ok/10 border-court-ok/30">
        <span className="text-2xl">🏀</span>
        <div>
          <p className="font-display text-xl text-court-ok">Draft finalizado</p>
          <p className="text-xs text-court-muted">Los grupos se publicarán en breve</p>
        </div>
      </div>
    );
  }

  const isMyTurn = myTeamId && currentTeamId === myTeamId;

  return (
    <div className={`card flex items-center gap-4 ${isMyTurn ? "border-court-accent pulse-turn" : "border-court-border"}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${isMyTurn ? "bg-court-accent/20" : "bg-court-border/50"}`}>
        {isMyTurn ? "🔥" : "⏳"}
      </div>

      <div className="flex-1 min-w-0">
        {isMyTurn ? (
          <>
            <p className="font-display text-2xl text-court-accent uppercase tracking-wide">¡Tu turno!</p>
            <p className="text-xs text-court-muted">Ronda {state.currentRound} · Selecciona un jugador</p>
          </>
        ) : (
          <>
            <p className="font-display text-xl text-white">Esperando…</p>
            <p className="text-xs text-court-muted">
              Eligiendo: <span className="text-white font-semibold">{currentTeamName ?? "otro equipo"}</span> · Ronda {state.currentRound}
            </p>
          </>
        )}
      </div>

      <div className="text-right shrink-0">
        <p className="font-display text-3xl text-court-accent">{state.currentTeamIndex + 1}</p>
        <p className="text-xs text-court-muted">de {state.teamOrder.length}</p>
      </div>
    </div>
  );
}
