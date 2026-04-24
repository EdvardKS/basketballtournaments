import { useState } from "react";
import { api, ApiError } from "../lib/api.js";
import type { Match } from "../lib/types.js";

interface Props { matches: Match[] }

export default function AdminScoreUpdater({ matches }: Props) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeMatches = matches.filter((m) => m.status !== "completed");
  const selected = activeMatches.find((m) => m.id === selectedId);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setLoading(true); setMsg(null);
    try {
      await api(`/matches/${selectedId}/score`, {
        method: "POST",
        body: JSON.stringify({ homeScore: Number(home), awayScore: Number(away) }),
      });
      setMsg("Marcador actualizado");
    } catch (e) { setMsg(e instanceof ApiError ? e.code : "Error"); }
    finally { setLoading(false); }
  };

  const complete = async () => {
    if (!selectedId || !confirm("¿Dar partido por finalizado?")) return;
    setLoading(true);
    try {
      await api(`/matches/${selectedId}/complete`, { method: "POST" });
      setMsg("Partido finalizado"); window.location.reload();
    } catch (e) { setMsg(e instanceof ApiError ? e.code : "Error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="card space-y-4 max-w-md">
      <h3 className="font-display text-xl text-white">Actualizar marcador</h3>

      <div>
        <label className="label-text">Partido</label>
        <select className="input-field" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">— Seleccionar —</option>
          {activeMatches.map((m) => (
            <option key={m.id} value={m.id}>
              {m.homeTeamName ?? "Local"} vs {m.awayTeamName ?? "Visitante"}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <form onSubmit={save} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="label-text">{selected.homeTeamName ?? "Local"}</label>
              <input className="input-field text-center text-2xl font-display" type="number" min="0"
                value={home} onChange={(e) => setHome(e.target.value)} required />
            </div>
            <span className="font-display text-2xl text-court-muted mt-4">:</span>
            <div className="flex-1">
              <label className="label-text">{selected.awayTeamName ?? "Visitante"}</label>
              <input className="input-field text-center text-2xl font-display" type="number" min="0"
                value={away} onChange={(e) => setAway(e.target.value)} required />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={loading}>Guardar marcador</button>
            <button type="button" className="btn-ok" onClick={complete} disabled={loading}>✓ Finalizar</button>
          </div>
        </form>
      )}

      {msg && <p className="text-xs text-court-muted">{msg}</p>}
    </div>
  );
}
