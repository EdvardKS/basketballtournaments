import type { DraftState } from "../lib/types.js";

interface Team {
  id: string; name: string; logo: string | null;
  players: { id: string }[];
}
interface Props {
  state: DraftState | null;
  teams: Team[];
  teamSize: number;
  myTeamId: string | null;
  currentTeamId: string | null;
  isAdmin?: boolean;
  actingAsCaptain?: boolean;
  onPickAsCurrent?: () => void;
  onStopActing?: () => void;
}

// Tiny logo bubble — coloured initial when no logo image set.
const Bubble = ({ name, logo, big = false, accent = false }: {
  name?: string; logo: string | null; big?: boolean; accent?: boolean;
}) => {
  const size = big ? "w-14 h-14 text-2xl" : "w-10 h-10 text-lg";
  if (logo) return <img src={logo} alt={name ?? ""} className={`${size} rounded-xl object-cover shrink-0`} />;
  return (
    <div className={`${size} rounded-xl flex items-center justify-center font-display font-bold text-white shrink-0 ${
      accent ? "bg-gradient-to-br from-court-accent to-fuchsia-500 shadow-[0_0_24px_rgba(255,107,26,0.55)]"
             : "bg-court-border"
    }`}>
      {(name?.charAt(0) ?? "?").toUpperCase()}
    </div>
  );
};

export default function DraftStatusBar({
  state, teams, teamSize, myTeamId, currentTeamId,
  isAdmin = false, actingAsCaptain = false,
  onPickAsCurrent, onStopActing,
}: Props) {
  // Draft finished view
  if (!state?.isActive) {
    return (
      <div className="card flex items-center gap-3 bg-court-ok/10 border-court-ok/30">
        <span className="text-2xl">🏀</span>
        <div>
          <p className="font-display text-xl text-court-ok">Draft finalizado</p>
          <p className="text-xs text-court-muted">Los grupos y el calendario ya están publicados.</p>
        </div>
      </div>
    );
  }

  const isMyTurn = !!myTeamId && currentTeamId === myTeamId;
  const totalPicks = teams.length * teamSize;
  const currentPickNumber = (state.currentRound - 1) * state.teamOrder.length + state.currentTeamIndex + 1;
  const currentTeam = teams.find((t) => t.id === currentTeamId);
  const nextIdx = state.currentTeamIndex + 1;
  const wrapsRound = nextIdx >= state.teamOrder.length;
  const nextTeamId = wrapsRound ? null : state.teamOrder[nextIdx];
  const nextTeam = nextTeamId ? teams.find((t) => t.id === nextTeamId) : null;
  const rounds = Math.max(state.currentRound, 1);
  const adminCanClick = isAdmin && !isMyTurn && !actingAsCaptain;

  // Top badge depends on mode
  const badge = actingAsCaptain ? (
    <span className="chip bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 px-3 py-1">
      🎯 MODO ADMIN · Actuando como {currentTeam?.name ?? "equipo"}
    </span>
  ) : isMyTurn ? (
    <span className="chip bg-court-accent/20 text-court-accent border border-court-accent px-3 py-1 pulse-turn">
      🔥 ¡TU TURNO!
    </span>
  ) : (
    <span className="chip bg-court-danger/20 text-court-danger border border-court-danger/40 px-3 py-1">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-court-danger animate-pulse mr-1.5 align-middle" />
      LIVE · DRAFT EN CURSO
    </span>
  );

  // Current-team block: clickable button for admin, plain div for everyone else
  const currentBlock = (
    <div className="flex items-center gap-3 min-w-0">
      <Bubble name={currentTeam?.name} logo={currentTeam?.logo ?? null} big accent />
      <div className="min-w-0">
        <p className="font-display text-3xl text-white uppercase tracking-wide truncate">
          {currentTeam?.name ?? "—"}
        </p>
        <p className="text-xs text-court-muted">
          Ronda {state.currentRound} · {currentTeam?.players.length ?? 0} / {teamSize} en plantilla
        </p>
      </div>
    </div>
  );

  return (
    <div className={`card transition-all ${
      actingAsCaptain ? "border-fuchsia-500/50 shadow-[0_0_30px_rgba(217,70,239,0.25)]"
      : isMyTurn      ? "border-court-accent"
      :                 "border-court-border"
    }`}>
      {/* Top row: badge + pick counter */}
      <div className="flex items-start justify-between gap-3 mb-4">
        {badge}
        <div className="text-right shrink-0">
          <p className="text-[10px] text-court-muted uppercase tracking-wider">Pick</p>
          <p className="font-display text-3xl text-court-accent leading-none">
            {currentPickNumber}<span className="text-court-muted text-xl">/{totalPicks}</span>
          </p>
        </div>
      </div>

      {/* Now picking + next */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-center">
        <div>
          <p className="text-[10px] text-court-accent uppercase tracking-widest mb-2 font-semibold">
            Eligiendo ahora
          </p>
          {adminCanClick ? (
            <button
              type="button"
              onClick={onPickAsCurrent}
              className="text-left w-full p-2 -m-2 rounded-xl border border-dashed border-fuchsia-500/40 hover:border-fuchsia-500 hover:bg-fuchsia-500/10 transition-colors"
              title="Click para fichar en su nombre"
            >
              {currentBlock}
              <p className="text-[10px] text-fuchsia-400 mt-2 ml-1">→ Click para actuar como capitán</p>
            </button>
          ) : currentBlock}
          {actingAsCaptain && (
            <button
              type="button"
              onClick={onStopActing}
              className="text-[10px] text-fuchsia-400 hover:text-fuchsia-200 mt-1 underline"
            >
              ✕ Salir del modo actuar como capitán
            </button>
          )}
        </div>

        <div className="hidden sm:flex flex-col items-center text-court-muted">
          <span className="text-2xl">→</span>
          <span className="text-[10px] uppercase tracking-wider">Siguiente</span>
        </div>

        <div className="sm:text-right">
          <p className="text-[10px] text-court-muted uppercase tracking-widest mb-2 font-semibold">
            A continuación
          </p>
          {nextTeam ? (
            <div className="flex sm:flex-row-reverse items-center gap-3 min-w-0">
              <Bubble name={nextTeam.name} logo={nextTeam.logo} />
              <div className="min-w-0 sm:text-right">
                <p className="font-display text-xl text-white truncate uppercase">{nextTeam.name}</p>
                <p className="text-xs text-court-muted">Pick {currentPickNumber + 1}</p>
              </div>
            </div>
          ) : (
            <div className="text-court-muted">
              <p className="font-display text-lg text-white">Ronda {state.currentRound + 1}</p>
              <p className="text-xs">Comienza tras este pick</p>
            </div>
          )}
        </div>
      </div>

      {/* Round indicator */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-court-border">
        <p className="text-[10px] text-court-muted uppercase tracking-widest font-semibold">
          Ronda en curso
        </p>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: rounds }).map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === state.currentRound - 1 ? "bg-court-accent" : "bg-court-border"
                }`}
              />
            ))}
          </div>
          <span className="font-display text-xl text-court-accent ml-1">{state.currentRound}</span>
        </div>
      </div>
    </div>
  );
}
