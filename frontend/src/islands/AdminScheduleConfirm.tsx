import { useState } from "react";
import { api, ApiError } from "../lib/api.js";
import type { Match } from "../lib/types.js";

// Inline editor for the auto-generated match schedule. Times are computed and
// published automatically when the draft closes (lifecycle.ts → endDraft).
// Admins still need a way to nudge a single match's start time, which is what
// this island does. No "publish" button — that step is gone.
interface Props { tournamentId: string; matches: Match[] }

export default function AdminScheduleConfirm({ matches }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const groupMatches = matches.filter((m) => m.stage === "group" && m.scheduledAt);

  const saveTime = async (matchId: string) => {
    setLoading(true);
    try {
      await api(`/matches/${matchId}/time`, { method: "PATCH", body: JSON.stringify({ scheduledAt: editTime }) });
      setEditingId(null); setMsg("Hora actualizada");
    } catch (e) { setMsg(e instanceof ApiError ? e.code : "Error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="card space-y-4 max-w-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl text-white">Horario de partidos</h3>
        <span className="chip bg-court-ok/20 text-court-ok">✓ Publicado automáticamente</span>
      </div>

      {groupMatches.length === 0 && (
        <p className="text-court-muted text-sm">El horario aparecerá cuando el draft termine.</p>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {groupMatches.map((m) => (
          <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-court-dark border border-court-border">
            <span className="text-xs text-white flex-1 truncate">{m.homeTeamName ?? "?"} vs {m.awayTeamName ?? "?"}</span>
            {editingId === m.id ? (
              <div className="flex gap-1">
                <input type="datetime-local" className="input-field text-xs py-0.5 px-2 w-36"
                  value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                <button className="btn-ok text-xs px-2" onClick={() => saveTime(m.id)} disabled={loading}>✓</button>
                <button className="btn-ghost text-xs px-2" onClick={() => setEditingId(null)}>✕</button>
              </div>
            ) : (
              <button className="text-xs text-court-accent hover:underline shrink-0"
                onClick={() => { setEditingId(m.id); setEditTime(m.scheduledAt?.slice(0,16) ?? ""); }}>
                {m.scheduledAt ? new Date(m.scheduledAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "—"}
              </button>
            )}
          </div>
        ))}
      </div>

      {msg && <p className="text-xs text-court-muted">{msg}</p>}
    </div>
  );
}
