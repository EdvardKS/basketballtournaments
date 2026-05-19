import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "../lib/api.js";
import type { DraftState } from "../lib/types.js";
import DraftStatusBar from "./DraftStatusBar.js";
import DraftPlayerList, { type AvailablePlayer } from "./DraftPlayerList.js";
import DraftTeamPanel from "./DraftTeamPanel.js";
import DraftPickModal from "./DraftPickModal.js";

interface DraftTeam {
  id: string; name: string; logo: string | null; description: string | null;
  whatsappLink?: string | null;
  players: AvailablePlayer[];
}
interface Props {
  tournamentId: string;
  myTeamId: string | null;
  isAdmin?: boolean;
}

export default function DraftBoard({ tournamentId, myTeamId, isAdmin }: Props) {
  const [state, setState] = useState<DraftState | null>(null);
  const [available, setAvailable] = useState<AvailablePlayer[]>([]);
  const [teams, setTeams] = useState<DraftTeam[]>([]);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<AvailablePlayer | null>(null);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Admin-only: when true, the admin is "acting as" the captain whose turn it
  // is. Toggled on by clicking the team name in DraftStatusBar; reset after
  // every successful pick so the admin must opt in for each one.
  const [actingAsCaptain, setActingAsCaptain] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ state: DraftState; availablePlayers: AvailablePlayer[]; teams: DraftTeam[]; currentTeamId: string | null }>(
        `/draft/${tournamentId}/state`,
      );
      setState(data.state);
      setAvailable(data.availablePlayers);
      setTeams(data.teams);
      setCurrentTeamId(data.currentTeamId);
    } catch { /* draft not started */ }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!state?.isActive) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [state?.isActive, load]);

  const pick = async () => {
    if (!selectedPlayer) return;
    // Pick goes to whichever team's turn it is. The backend already validates
    // that for non-admins teamId must match currentTeamId; admins bypass it.
    const teamId = currentTeamId;
    if (!teamId) return;
    setPicking(true); setError(null);
    try {
      await api(`/draft/${tournamentId}/pick`, {
        method: "POST",
        body: JSON.stringify({ teamId, playerId: selectedPlayer.id }),
      });
      setSelectedPlayer(null);
      setActingAsCaptain(false);  // require explicit re-opt-in for next pick
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "Error al fichar");
    } finally { setPicking(false); }
  };

  const myTeam = teams.find((t) => t.id === myTeamId) ?? null;
  const isMyTurn = !!myTeamId && currentTeamId === myTeamId;
  const canPick = state?.isActive === true && (
    isMyTurn ||
    (isAdmin === true && actingAsCaptain && currentTeamId !== null)
  );
  // totalPicks = picks already made + still available. Each team's player
  // list already includes the captain, so subtract teams.length to count
  // only drafted players (the captains were inserted on captain assignment).
  const pickedSoFar = teams.reduce((acc, t) => acc + t.players.length, 0) - teams.length;
  const totalPicks = Math.max(0, pickedSoFar) + available.length;

  return (
    <div className="space-y-4">
      {error && <div className="chip bg-court-danger/20 text-court-danger w-full justify-center py-2 rounded-lg">{error}</div>}

      <DraftStatusBar
        state={state}
        teams={teams}
        totalPicks={totalPicks}
        myTeamId={myTeamId}
        currentTeamId={currentTeamId}
        isAdmin={isAdmin}
        actingAsCaptain={actingAsCaptain}
        onPickAsCurrent={() => setActingAsCaptain(true)}
        onStopActing={() => setActingAsCaptain(false)}
      />

      {state?.isActive && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DraftPlayerList players={available} canPick={canPick} onSelect={setSelectedPlayer} />
          <div className="space-y-3">
            {myTeam && (
              <DraftTeamPanel
                teamName={myTeam.name} teamLogo={myTeam.logo}
                description={myTeam.description ?? null} whatsappLink={myTeam.whatsappLink ?? null}
                players={myTeam.players} isMyTeam
              />
            )}
            {isAdmin && teams.filter((t) => t.id !== myTeam?.id).map((t) => (
              <DraftTeamPanel key={t.id} teamName={t.name} teamLogo={t.logo}
                description={t.description ?? null} whatsappLink={t.whatsappLink ?? null}
                players={t.players} />
            ))}
          </div>
        </div>
      )}

      {!state?.isActive && teams.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {teams.map((t) => (
            <DraftTeamPanel key={t.id} teamName={t.name} teamLogo={t.logo}
              description={t.description ?? null} whatsappLink={t.whatsappLink ?? null}
              players={t.players} isMyTeam={t.id === myTeamId} />
          ))}
        </div>
      )}

      <DraftPickModal player={selectedPlayer} onConfirm={pick} onCancel={() => setSelectedPlayer(null)} loading={picking} />
    </div>
  );
}
