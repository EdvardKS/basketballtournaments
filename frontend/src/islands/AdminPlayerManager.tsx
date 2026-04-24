import { useState } from "react";
import { api, ApiError } from "../lib/api.js";

interface Player { id: string; name: string; mobile: string; email: string | null; role: string }
interface Team { id: string; name: string }
interface Props { tournamentId: string; players: Player[]; allPlayers: Player[]; teams: Team[] }

export default function AdminPlayerManager({ tournamentId, players, allPlayers, teams }: Props) {
  const [roster, setRoster] = useState<Player[]>(players);
  const [addId, setAddId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const registeredIds = new Set(roster.map((p) => p.id));
  const notRegistered = allPlayers.filter((p) => !registeredIds.has(p.id) && p.role !== "admin");

  const addPlayer = async () => {
    if (!addId) return;
    setLoading(true); setMsg(null);
    try {
      await api(`/tournaments/${tournamentId}/add-player`, { method: "POST", body: JSON.stringify({ playerId: addId }) });
      const p = allPlayers.find((p) => p.id === addId)!;
      setRoster((r) => [...r, p]); setAddId("");
      setMsg("Jugador añadido");
    } catch (e) { setMsg(e instanceof ApiError ? e.code : "Error"); }
    finally { setLoading(false); }
  };

  const removePlayer = async (playerId: string) => {
    if (!confirm("¿Eliminar este jugador del torneo?")) return;
    setLoading(true);
    try {
      await api(`/tournaments/${tournamentId}/players/${playerId}`, { method: "DELETE" });
      setRoster((r) => r.filter((p) => p.id !== playerId));
      setSelectedPlayer(null);
    } catch (e) { setMsg(e instanceof ApiError ? e.code : "Error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="card space-y-4 max-w-lg">
      <h3 className="font-display text-xl text-white">Gestión de jugadores</h3>

      <div className="flex gap-2">
        <select className="input-field flex-1" value={addId} onChange={(e) => setAddId(e.target.value)}>
          <option value="">— Añadir jugador al torneo —</option>
          {notRegistered.map((p) => (
            <option key={p.id} value={p.id}>{p.name} · {p.mobile}</option>
          ))}
        </select>
        <button className="btn-primary shrink-0" onClick={addPlayer} disabled={!addId || loading}>+</button>
      </div>

      {msg && <p className="text-xs text-court-muted">{msg}</p>}

      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {roster.map((p) => (
          <div key={p.id}>
            <button
              className="w-full flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-court-border/50 transition-colors text-left"
              onClick={() => setSelectedPlayer(selectedPlayer?.id === p.id ? null : p)}
            >
              <span className="text-sm text-white">{p.name}</span>
              <span className="chip bg-court-border text-court-muted text-[10px]">{p.role}</span>
            </button>
            {selectedPlayer?.id === p.id && (
              <div className="px-2 py-2 bg-court-dark rounded-lg space-y-1 animate-slide-in">
                {p.mobile && <a href={`tel:${p.mobile}`} className="block text-xs text-court-accent hover:underline">📞 {p.mobile}</a>}
                {p.email && <a href={`mailto:${p.email}`} className="block text-xs text-court-muted hover:text-white hover:underline">{p.email}</a>}
                <a href={`https://wa.me/${p.mobile?.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="block text-xs text-court-ok hover:underline">💬 WhatsApp</a>
                <button className="btn-danger text-xs mt-1" onClick={() => removePlayer(p.id)} disabled={loading}>Eliminar del torneo</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
