import { useState } from "react";
import { api, ApiError } from "../lib/api.js";
import type { Match, MatchStage } from "../lib/types.js";

// Inline editor for the match schedule. Lists every group + KO match so the
// admin can set / nudge a start time before matchday — even KO slots where
// the teams aren't bound yet (we show the seed label "1º Grupo A", "Ganador
// SF 1", etc.).
interface Props { tournamentId: string; matches: Match[]; matchDate: string | null }

const STAGE_ORDER: Record<MatchStage, number> = {
  group: 0, eighth: 1, quarterfinal: 2, semifinal: 3, final: 4, third_place: 5,
};
const STAGE_LABEL: Record<MatchStage, string> = {
  group: "Grupos",
  eighth: "Octavos",
  quarterfinal: "Cuartos",
  semifinal: "Semifinales",
  final: "Final",
  third_place: "3er puesto",
};

const sideLabel = (
  teamName: string | undefined | null, seed: string | null | undefined,
): string => teamName ?? seed ?? "Por definir";

export default function AdminScheduleConfirm({ matches, matchDate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sort by stage then by current scheduledAt so the admin sees a tidy
  // chronological list per round.
  const sorted = [...matches].sort((a, b) => {
    const s = (STAGE_ORDER[a.stage] ?? 99) - (STAGE_ORDER[b.stage] ?? 99);
    if (s !== 0) return s;
    const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
    const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (ta !== tb) return ta - tb;
    return (a.roundNumber ?? 0) - (b.roundNumber ?? 0);
  });

  // Group rows by stage for the section headers.
  const byStage = new Map<MatchStage, Match[]>();
  for (const m of sorted) {
    const arr = byStage.get(m.stage) ?? [];
    arr.push(m);
    byStage.set(m.stage, arr);
  }

  const saveTime = async (matchId: string) => {
    if (!editTime) return;
    if (!matchDate) { setMsg("Falta el día del torneo (Configuración)"); return; }
    setLoading(true); setMsg(null);
    try {
      // Input is HH:MM only; the date comes from the tournament's matchDate
      // so the admin never has to retype something the system already knows.
      const iso = new Date(`${matchDate}T${editTime}:00`).toISOString();
      await api(`/matches/${matchId}/time`, {
        method: "PATCH",
        body: JSON.stringify({ scheduledAt: iso }),
      });
      setEditingId(null);
      setMsg("Hora actualizada");
    } catch (e) {
      setMsg(e instanceof ApiError ? e.code : "Error al guardar");
    } finally { setLoading(false); }
  };

  if (matches.length === 0) {
    return (
      <p className="text-court-muted text-sm">
        El horario aparecerá cuando se generen los partidos.
      </p>
    );
  }

  const total = matches.length;
  const withTime = matches.filter((m) => m.scheduledAt).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest text-court-muted">
          {withTime}/{total} con hora asignada
        </p>
        {msg && <span className="text-xs text-court-muted">{msg}</span>}
      </div>

      {Array.from(byStage.entries()).map(([stage, rows]) => (
        <section key={stage} className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-neon-orange)] font-bold">
            {STAGE_LABEL[stage]} · {rows.length}
          </p>
          <ul className="space-y-2">
            {rows.map((m) => {
              const editing = editingId === m.id;
              const home = sideLabel(m.homeTeamName, m.homeSeedLabel);
              const away = sideLabel(m.awayTeamName, m.awaySeedLabel);
              const isSeedHome = !m.homeTeamName && !!m.homeSeedLabel;
              const isSeedAway = !m.awayTeamName && !!m.awaySeedLabel;
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center gap-2 p-2 rounded-lg border"
                  style={{ background: "rgba(20,26,44,0.6)", borderColor: "rgba(255,255,255,0.08)" }}
                >
                  <div className="min-w-0 flex-1 text-sm flex items-center gap-1.5 flex-wrap">
                    <span className={`truncate ${isSeedHome ? "italic text-white/55" : "text-white"}`}>{home}</span>
                    <span className="text-white/30">vs</span>
                    <span className={`truncate ${isSeedAway ? "italic text-white/55" : "text-white"}`}>{away}</span>
                  </div>
                  {editing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        step={60}
                        className="input-field !py-1 !px-2 text-xs w-24"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn-primary !py-1 !px-2 !text-xs"
                        onClick={() => saveTime(m.id)}
                        disabled={loading}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className="btn-ghost !py-1 !px-2 !text-xs"
                        onClick={() => setEditingId(null)}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(m.id);
                        const seed = m.scheduledAt
                          ? new Date(m.scheduledAt).toLocaleTimeString("es-ES",
                              { hour: "2-digit", minute: "2-digit", hour12: false })
                          : "09:00";
                        setEditTime(seed);
                      }}
                      className="text-xs px-2 py-1 rounded hover:bg-white/5 text-court-accent shrink-0 tabular-nums"
                    >
                      {m.scheduledAt
                        ? new Date(m.scheduledAt).toLocaleTimeString("es-ES",
                            { hour: "2-digit", minute: "2-digit" })
                        : "+ asignar hora"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
