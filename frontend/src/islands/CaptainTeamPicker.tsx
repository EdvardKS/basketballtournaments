import { useMemo, useState } from "react";
import TeamSettings from "./TeamSettings.js";
import type { Team } from "../lib/types.js";

export interface CaptainTeam {
  teamId: string; teamName: string; logo: string | null;
  description: string | null; whatsappLink: string | null;
  tournamentId: string; tournamentName: string;
  tournamentStatus: string;
  matchDate: string | null;
  createdAt: string;
}

interface Props { teams: CaptainTeam[]; selfPlayerId: string }

// Edits are open until the day before the matchDate, then frozen forever.
// "completed" tournaments are always frozen.
const isEditable = (t: CaptainTeam): boolean => {
  if (t.tournamentStatus === "completed") return false;
  if (!t.matchDate) return true;
  const md = new Date(t.matchDate + "T00:00:00Z").getTime();
  const lockAt = md - 24 * 60 * 60 * 1000;
  return Date.now() < lockAt;
};

const toTeam = (c: CaptainTeam): Team => ({
  id: c.teamId, tournamentId: c.tournamentId,
  captainId: "", name: c.teamName, nameConfirmed: true,
  logo: c.logo, description: c.description,
  whatsappLink: c.whatsappLink,
  whatsappGroupName: null, whatsappGroupLink: null,
  createdAt: c.createdAt,
});

export default function CaptainTeamPicker({ teams, selfPlayerId }: Props) {
  const [picked, setPicked] = useState<string>(teams[0]?.teamId ?? "");
  const current = useMemo(() =>
    teams.find((t) => t.teamId === picked) ?? teams[0] ?? null, [teams, picked]);

  if (!current) {
    return (
      <div className="card text-center py-8">
        <p className="text-court-muted text-sm">
          Aún no has capitaneado ningún equipo. Cuando un admin te asigne capitán,
          tu equipo aparecerá aquí.
        </p>
      </div>
    );
  }

  const editable = isEditable(current);
  const showSelect = teams.length > 1;

  return (
    <div className="space-y-3">
      {showSelect && (
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-court-muted">Edición</label>
          <select className="input-neon !py-1.5 !text-xs"
            value={current.teamId}
            onChange={(e) => setPicked(e.target.value)}>
            {teams.map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.tournamentName} · {t.matchDate ?? "sin fecha"}
              </option>
            ))}
          </select>
        </div>
      )}

      {!editable && (
        <div className="card border border-court-warn/30 bg-court-warn/5">
          <p className="text-xs text-court-warn">
            🔒 Esta configuración está congelada — fue el día del torneo
            <span className="text-white"> {current.matchDate ?? "(fecha no fijada)"}</span>.
            Los datos quedan como recuerdo.
          </p>
        </div>
      )}

      {editable ? (
        <TeamSettings
          team={toTeam(current)}
          matchDate={current.matchDate}
          selfPlayerId={selfPlayerId}
        />
      ) : (
        <div className="card space-y-2">
          <div className="flex items-start gap-3">
            {current.logo ? (
              <img src={current.logo} alt="" className="w-16 h-16 rounded-xl object-cover border border-court-border" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-court-border flex items-center justify-center text-2xl text-court-muted">?</div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-court-muted">{current.tournamentName}</p>
              <p className="font-display text-xl text-white truncate">{current.teamName}</p>
              {current.description && <p className="text-xs text-court-muted mt-1">{current.description}</p>}
            </div>
          </div>
          {current.whatsappLink && (
            <a href={current.whatsappLink} target="_blank" rel="noopener" className="btn-ghost text-xs inline-flex">
              WhatsApp del equipo
            </a>
          )}
        </div>
      )}
    </div>
  );
}
