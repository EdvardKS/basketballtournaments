import { useMemo, useState } from "react";
import TeamSettings from "./TeamSettings.js";
import NeonSelect from "../components/ui/NeonSelect.js";
import { useRevealStagger } from "../lib/neon.js";
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

  const containerRef = useRevealStagger([picked]);

  if (!current) {
    return (
      <div className="card text-center py-10">
        <div className="text-5xl mb-3">🛡️</div>
        <p className="font-hero text-2xl text-white">Sin equipos todavía</p>
        <p className="text-court-muted text-sm mt-2">
          Cuando un admin te asigne como capitán, tu equipo aparecerá aquí.
        </p>
      </div>
    );
  }

  const editable = isEditable(current);
  const showSelect = teams.length > 1;

  return (
    <div ref={containerRef} className="space-y-4">
      {showSelect && (
        <div data-reveal>
          <NeonSelect label="Edición" value={current.teamId}
            onChange={(e) => setPicked(e.target.value)}>
            {teams.map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.tournamentName} · {t.matchDate ?? "sin fecha"}
              </option>
            ))}
          </NeonSelect>
        </div>
      )}

      {!editable && (
        <div data-reveal className="card border border-court-warn/30 bg-court-warn/5 flex items-start gap-3">
          <span className="text-2xl" style={{ animation: "lock-pulse 1.4s ease-in-out infinite" }}>🔒</span>
          <div>
            <p className="neon-section-overline" style={{ color: "var(--color-court-warn, #f5c518)" }}>Congelado</p>
            <p className="text-sm text-white">
              Esta configuración quedó fijada el día del torneo
              <span className="text-court-muted"> ({current.matchDate ?? "fecha no fijada"})</span>.
              Se conserva como recuerdo histórico.
            </p>
          </div>
        </div>
      )}

      {editable ? (
        <div data-reveal>
          <TeamSettings
            team={toTeam(current)}
            matchDate={current.matchDate}
            selfPlayerId={selfPlayerId}
          />
        </div>
      ) : (
        <div data-reveal className="card space-y-3">
          <div className="flex items-start gap-3">
            {current.logo ? (
              <img src={current.logo} alt="" className="w-20 h-20 rounded-xl object-cover border border-court-border" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-court-border flex items-center justify-center text-3xl text-court-muted">?</div>
            )}
            <div className="min-w-0">
              <p className="neon-section-overline">{current.tournamentName}</p>
              <p className="font-hero text-2xl text-white truncate leading-none">{current.teamName}</p>
              {current.description && <p className="text-xs text-court-muted mt-2">{current.description}</p>}
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
