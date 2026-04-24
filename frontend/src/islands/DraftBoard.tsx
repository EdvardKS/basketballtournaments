// Live draft board with polling. Captains see "your turn" pulse;
// picks animate in with flip-in.
import { useEffect, useState } from "react";

interface Pick { pick_order: number; round: number; player_name: string; team_name: string; }
interface State { teamOrder: string[]; currentTeamIndex: number; currentRound: number; isActive: boolean; }
interface Team { id: string; name: string; captainId: string; }
interface Player { id: string; name: string; overall: number; position: string; }
interface Props {
  tournamentId: string;
  teams: Team[];
  availablePlayers: Player[];
  myTeamId: string | null;
  isAdmin: boolean;
}

export default function DraftBoard({ tournamentId, teams, availablePlayers, myTeamId, isAdmin }: Props) {
  const [state, setState] = useState<State | null>(null);
  const [history, setHistory] = useState<Pick[]>([]);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poll = async () => {
    try {
      const res = await fetch(`/api/draft/${tournamentId}/state`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setState(data.state); setHistory(data.history ?? []);
    } catch {}
  };

  useEffect(() => {
    poll();
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, []);

  const currentTeamId = state?.teamOrder[state.currentTeamIndex];
  const yourTurn = !!myTeamId && currentTeamId === myTeamId && state?.isActive;
  const canPick = isAdmin || yourTurn;

  const pick = async (playerId: string) => {
    if (!currentTeamId) return;
    setPicking(true); setError(null);
    const res = await fetch(`/api/draft/${tournamentId}/pick`, {
      method: "POST", credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ teamId: isAdmin ? currentTeamId : myTeamId, playerId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `Error ${res.status}`);
    } else { poll(); }
    setPicking(false);
  };

  const pickedIds = new Set(history.map((h) => (h as unknown as { player_id: string }).player_id));
  const eligible = availablePlayers.filter((p) => !pickedIds.has(p.id));
  const pickingTeam = teams.find((t) => t.id === currentTeamId);

  return (
    <div className="space-y-6">
      <header className={`card ${yourTurn ? "pulse-turn border-court-accent" : ""}`}>
        {state ? (
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-xs uppercase text-slate-500">Ronda</span>
            <span className="font-display text-3xl text-court-accent">{state.currentRound}</span>
            <span className="text-slate-500">·</span>
            <span className="text-sm">Elige: <strong>{pickingTeam?.name ?? "—"}</strong></span>
            {yourTurn && <span className="chip bg-court-accent/20 text-court-accent">Tu turno</span>}
            {!state.isActive && <span className="chip">Draft cerrado</span>}
          </div>
        ) : <span className="text-slate-500 text-sm">Cargando estado del draft…</span>}
      </header>

      {error && <p className="text-court-danger text-sm">{error}</p>}

      {canPick && state?.isActive && (
        <section>
          <h3 className="text-2xl mb-3">Jugadores disponibles</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {eligible.map((p) => (
              <button key={p.id} onClick={() => pick(p.id)} disabled={picking}
                className="card flip-in text-left hover:border-court-accent">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl text-court-accent">{p.overall}</span>
                  <span className="text-xs uppercase text-slate-500">{p.position}</span>
                </div>
                <p className="mt-1 font-semibold truncate">{p.name}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-2xl mb-3">Historial de picks</h3>
        <ol className="card text-sm space-y-1">
          {history.length === 0 && <li className="text-slate-500">Sin picks todavía.</li>}
          {history.map((h) => (
            <li key={h.pick_order} className="flex justify-between">
              <span className="text-slate-500">#{h.pick_order} · R{h.round}</span>
              <span className="flex-1 mx-3 truncate">{h.player_name}</span>
              <span className="text-court-accent">{h.team_name}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
