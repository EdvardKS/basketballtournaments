import { POSITION_LABEL, overallColor } from "../lib/display.js";

interface RosterPlayer {
  id: string; name?: string; avatar: string | null; position: string; overall: number;
}
interface Props {
  teamName: string;
  teamLogo: string | null;
  description: string | null;
  whatsappLink: string | null;
  players: RosterPlayer[];
  isMyTeam?: boolean;
}

export default function DraftTeamPanel({ teamName, teamLogo, description, whatsappLink, players, isMyTeam }: Props) {
  return (
    <div className={`card flex flex-col gap-4 ${isMyTeam ? "border-court-accent/40" : "border-court-border"}`}>
      <div className="flex items-center gap-3">
        {teamLogo ? (
          <img src={teamLogo} className="w-14 h-14 rounded-xl object-cover border border-court-border" alt={teamName} />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-court-border flex items-center justify-center text-2xl font-display text-court-muted">
            {teamName.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-display text-xl text-white truncate">{teamName}</p>
          {isMyTeam && <span className="chip bg-court-accent/20 text-court-accent text-[10px]">Mi equipo</span>}
        </div>
      </div>

      {description && <p className="text-xs text-court-muted">{description}</p>}

      {whatsappLink && (
        <a href={whatsappLink} target="_blank" rel="noopener"
           className="text-xs text-court-ok hover:underline">📱 WhatsApp del equipo</a>
      )}

      <div>
        <p className="label-text">Plantilla ({players.length})</p>
        {players.length === 0 ? (
          <p className="text-xs text-court-muted py-2">Sin jugadores todavía</p>
        ) : (
          <div className="space-y-1.5 mt-1">
            {players.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 animate-flip-card" style={{ animationDelay: `${i * 0.05}s` }}>
                {p.avatar ? (
                  <img src={p.avatar} className="w-8 h-8 rounded-lg object-cover" alt="" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-court-border flex items-center justify-center text-xs text-court-muted">
                    {p.name?.charAt(0) ?? "#"}
                  </div>
                )}
                <span className="text-sm text-white flex-1 truncate">{p.name ?? "Jugador"}</span>
                <span className="text-xs text-court-muted">{POSITION_LABEL[p.position] ?? p.position}</span>
                <span className={`font-display text-base font-bold ${overallColor(p.overall)}`}>{p.overall}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
