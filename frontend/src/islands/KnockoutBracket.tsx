import { useState, useEffect } from "react";
import { api } from "../lib/api.js";
import type { Match } from "../lib/types.js";

interface Props { tournamentId: string; initialMatches: Match[]; hoursConfirmed: boolean }

const MatchBox = ({ match: m, hoursConfirmed }: { match: Match; hoursConfirmed: boolean }) => (
  <div className={`card text-sm transition-all ${m.status === "in_progress" ? "border-court-accent" : "border-court-border"}`}>
    {m.status === "in_progress" && (
      <div className="flex items-center gap-1 mb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-court-accent animate-pulse" />
        <span className="text-[10px] text-court-accent font-semibold uppercase">Live</span>
      </div>
    )}
    <div className="flex items-center justify-between gap-2">
      <span className="text-white flex-1 truncate text-xs">{m.homeTeamName ?? "TBD"}</span>
      <span className={`font-display text-lg font-bold ${m.winnerId === m.homeTeamId ? "text-court-ok" : "text-court-muted"}`}>
        {m.homeScore ?? "—"}
      </span>
    </div>
    <div className="flex items-center justify-between gap-2">
      <span className="text-white flex-1 truncate text-xs">{m.awayTeamName ?? "TBD"}</span>
      <span className={`font-display text-lg font-bold ${m.winnerId === m.awayTeamId ? "text-court-ok" : "text-court-muted"}`}>
        {m.awayScore ?? "—"}
      </span>
    </div>
    {hoursConfirmed && m.scheduledAt && (
      <p className="text-[10px] text-court-muted mt-1">
        {new Date(m.scheduledAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
      </p>
    )}
  </div>
);

const STAGES = ["eighth", "quarterfinal", "semifinal", "third_place", "final"] as const;
const STAGE_LABEL: Record<string, string> = {
  eighth: "Octavos", quarterfinal: "Cuartos", semifinal: "Semis", third_place: "3er/4to", final: "Final",
};

export default function KnockoutBracket({ tournamentId, initialMatches, hoursConfirmed }: Props) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const all = await api<Match[]>(`/matches/tournament/${tournamentId}`);
        setMatches(all.filter((m) => m.stage !== "group"));
      } catch { /* silent */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [tournamentId]);

  const byStage = (stage: string) => matches.filter((m) => m.stage === stage);
  const hasAny = STAGES.some((s) => byStage(s).length > 0);

  if (!hasAny) {
    return (
      <div className="card text-center py-8">
        <p className="text-court-muted text-sm">Las eliminatorias aparecerán al finalizar la fase de grupos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {STAGES.filter((s) => byStage(s).length > 0).map((stage) => (
        <div key={stage}>
          <h3 className={`font-display text-xl mb-3 ${stage === "final" ? "text-court-gold" : "text-white"}`}>
            {stage === "final" && "🏆 "}{STAGE_LABEL[stage]}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {byStage(stage).map((m) => (
              <MatchBox key={m.id} match={m} hoursConfirmed={hoursConfirmed} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
