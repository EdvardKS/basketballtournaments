import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api.js";
import type { DraftState } from "../../lib/types.js";

interface DraftPlayer {
  id: string;
  name?: string;
  avatar: string | null;
  position: string;
  overall: number;
}
interface DraftTeam {
  id: string;
  name: string;
  logo: string | null;
  description: string | null;
  players: DraftPlayer[];
}
interface DraftPayload {
  state: DraftState;
  teams: DraftTeam[];
  currentTeamId: string | null;
  availablePlayers: DraftPlayer[];
}

interface Props {
  tournamentId: string;
  initial: DraftPayload | null;
  authenticated?: boolean;
}

const PALETTE = [
  "#ff6b00", "#0066ff", "#ff2d2d", "#3ecf8e",
  "#f5c518", "#a855f7", "#06b6d4", "#ec4899",
];
const colorFor = (id: string): string => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
};

const POSITION_LABEL: Record<string, string> = {
  base: "Base", escolta: "Escolta", alero: "Alero",
  "ala-pivot": "Ala-Pívot", pivot: "Pívot",
};

const playerLabel = (p: DraftPlayer, auth: boolean) =>
  auth && p.name ? p.name : `Jugador #${p.overall}`;

export default function DraftLiveStatus({ tournamentId, initial, authenticated = false }: Props) {
  const [data, setData] = useState<DraftPayload | null>(initial);
  const [pulse, setPulse] = useState(0);
  const lastSig = useRef<string>("");

  const load = useCallback(async () => {
    try {
      const fresh = await api<DraftPayload>(`/draft/${tournamentId}/state`);
      const sig = `${fresh.state.currentRound}-${fresh.state.currentTeamIndex}-${fresh.currentTeamId}`;
      if (sig !== lastSig.current) {
        lastSig.current = sig;
        setData(fresh);
        setPulse((n) => n + 1);
      }
    } catch { /* draft not started */ }
  }, [tournamentId]);

  useEffect(() => {
    if (initial) {
      lastSig.current = `${initial.state.currentRound}-${initial.state.currentTeamIndex}-${initial.currentTeamId}`;
    }
  }, [initial]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  if (!data) {
    return (
      <div className="glass p-6 text-center">
        <p className="text-court-muted text-sm">Esperando datos del draft…</p>
      </div>
    );
  }

  const { state, teams, currentTeamId } = data;
  const totalTeams = state.teamOrder.length;
  const pickInRound = state.currentTeamIndex + 1;
  const totalRound = totalTeams;

  const currentTeam = teams.find((t) => t.id === currentTeamId) ?? null;
  const nextIdx = (state.currentTeamIndex + 1) % totalTeams;
  const nextTeam = teams.find((t) => t.id === state.teamOrder[nextIdx]) ?? null;

  // Last picks: flatten all team rosters with team color & order; we don't have a true
  // pick log so we approximate by reading roster sizes against round.
  const allPicks: { player: DraftPlayer; team: DraftTeam }[] = [];
  for (const t of teams) {
    for (const p of t.players) allPicks.push({ player: p, team: t });
  }
  // Sort heuristically by overall desc as picks roughly follow rating early
  const lastPicks = allPicks.slice(-6).reverse();

  const currentColor = currentTeam ? colorFor(currentTeam.id) : "#ff2d2d";
  const nextColor = nextTeam ? colorFor(nextTeam.id) : "#0066ff";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Main panel */}
      <div
        key={pulse}
        className="lg:col-span-2 glass p-6 sm:p-8 relative overflow-hidden animate-slide-up"
      >
        {/* Live ribbon */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.3em] font-bold text-white border animate-glow-red"
                style={{ background: "rgba(255,45,45,0.15)", borderColor: "#ff2d2d80" }}>
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#ff2d2d] opacity-70 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-[#ff2d2d]" />
            </span>
            LIVE · DRAFT EN CURSO
          </span>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.25em] text-court-muted">Pick</p>
            <p className="font-hero text-3xl text-white leading-none tabular-nums">
              {pickInRound}<span className="text-white/30">/{totalRound}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-6 items-center">
          {/* Current team */}
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: currentColor }}>Eligiendo ahora</p>
            {currentTeam ? (
              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center font-hero text-5xl text-white border-2 leading-none shrink-0 animate-glow"
                  style={{
                    background: `linear-gradient(135deg, ${currentColor}, ${currentColor}80)`,
                    borderColor: currentColor,
                    boxShadow: `0 0 28px ${currentColor}aa, inset 0 1px 0 rgba(255,255,255,0.25)`,
                  }}
                  aria-hidden="true"
                >
                  {currentTeam.logo
                    ? <img src={currentTeam.logo} alt="" className="w-full h-full object-cover rounded-2xl" />
                    : currentTeam.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-hero text-3xl text-white leading-none truncate">{currentTeam.name}</h3>
                  <p className="text-xs text-court-muted mt-1">Ronda {state.currentRound} · {currentTeam.players.length} jugadores en plantilla</p>
                </div>
              </div>
            ) : (
              <p className="text-court-muted text-sm">Sin turno asignado.</p>
            )}
          </div>

          {/* Divider arrow */}
          <div className="hidden sm:flex flex-col items-center text-court-muted">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
            <span className="text-[9px] uppercase tracking-widest mt-1">Siguiente</span>
          </div>

          {/* Next team */}
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.3em] mb-2 text-court-muted">A continuación</p>
            {nextTeam ? (
              <div className="flex items-center gap-4 flex-row-reverse">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center font-hero text-3xl text-white border leading-none shrink-0 opacity-80"
                  style={{
                    background: `linear-gradient(135deg, ${nextColor}40, ${nextColor}20)`,
                    borderColor: `${nextColor}80`,
                    boxShadow: `0 0 14px ${nextColor}55`,
                  }}
                  aria-hidden="true"
                >
                  {nextTeam.logo
                    ? <img src={nextTeam.logo} alt="" className="w-full h-full object-cover rounded-xl" />
                    : nextTeam.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 text-right">
                  <h4 className="font-hero text-xl text-white leading-none truncate">{nextTeam.name}</h4>
                  <p className="text-xs text-court-muted mt-1">Pick {((pickInRound) % totalRound) + 1}</p>
                </div>
              </div>
            ) : (
              <p className="text-court-muted text-sm text-right">—</p>
            )}
          </div>
        </div>

        {/* Round indicator */}
        <div className="mt-7 pt-5 border-t border-white/5 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.3em] text-court-muted">Ronda en curso</p>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.max(1, state.currentRound + 1) }).slice(0, 6).map((_, i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  background: i < state.currentRound ? "#ff6b00" : "rgba(255,255,255,0.15)",
                  boxShadow: i < state.currentRound ? "0 0 8px #ff6b00aa" : "none",
                }}
              />
            ))}
            <span className="font-hero text-2xl text-white leading-none ml-2 tabular-nums">{state.currentRound}</span>
          </div>
        </div>
      </div>

      {/* Timeline of last picks */}
      <aside className="glass p-5 animate-slide-up" style={{ animationDelay: "120ms" }}>
        <header className="flex items-center justify-between mb-4">
          <h4 className="font-hero text-xl text-white leading-none">Últimas elecciones</h4>
          <span className="text-[9px] uppercase tracking-widest text-court-muted">Live</span>
        </header>

        {lastPicks.length === 0 ? (
          <p className="text-xs text-court-muted">Aún no hay picks en el draft.</p>
        ) : (
          <ol className="space-y-2.5">
            {lastPicks.map(({ player, team }, i) => {
              const c = colorFor(team.id);
              return (
                <li
                  key={`${team.id}-${player.id}`}
                  className="flex items-center gap-3 p-2 rounded-xl border transition-all hover:translate-x-0.5"
                  style={{
                    background: "rgba(0,0,0,0.25)",
                    borderColor: `${c}33`,
                    animation: `slide-in 0.4s ${i * 60}ms both`,
                  }}
                >
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center font-hero text-base text-white border shrink-0 leading-none"
                    style={{ background: `${c}30`, borderColor: `${c}99`, boxShadow: `0 0 10px ${c}55` }}
                    aria-hidden="true"
                  >{team.name.charAt(0).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-court-muted truncate">{team.name}</p>
                    <p className="text-sm text-white truncate">{playerLabel(player, authenticated)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] uppercase tracking-widest text-court-muted">{POSITION_LABEL[player.position] ?? player.position}</p>
                    <p className="font-hero text-base text-white tabular-nums leading-none">{player.overall}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </aside>
    </div>
  );
}
