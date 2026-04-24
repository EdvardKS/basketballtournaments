// Admin start/end draft + promote captain.
import { useState } from "react";
import type { TournamentDetail } from "../lib/types.js";

interface Props { detail: TournamentDetail; }

export default function AdminDraftControls({ detail }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const t = detail.tournament;

  const run = async (label: string, fn: () => Promise<Response>) => {
    setBusy(true); setMsg(null);
    const res = await fn();
    if (res.ok) { setMsg(`${label}: OK`); window.location.reload(); }
    else { const b = await res.json().catch(() => ({})); setMsg(`${label}: ${b.error ?? res.status}`); }
    setBusy(false);
  };

  const start = () => run("Arrancar draft", () =>
    fetch(`/api/draft/${t.id}/start`, { method: "POST", credentials: "include" }));
  const end = () => run("Cerrar draft", () =>
    fetch(`/api/draft/${t.id}/end`, { method: "POST", credentials: "include" }));
  const genGroups = () => run("Generar grupos", () =>
    fetch(`/api/matches/tournament/${t.id}/generate-groups`, { method: "POST", credentials: "include" }));

  const promote = async (playerId: string, teamName: string) => {
    setBusy(true);
    await fetch(`/api/tournaments/${t.id}/captains`, {
      method: "POST", credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerId, isCaptain: true, teamName }),
    });
    setBusy(false); window.location.reload();
  };

  const captains = detail.registrations.filter((r) => r.is_captain);
  const nonCaptains = detail.registrations.filter((r) => !r.is_captain);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {t.status === "draft" && (
          <>
            <button onClick={start} disabled={busy} className="btn-primary">Arrancar draft</button>
            <button onClick={end} disabled={busy} className="btn-ghost">Cerrar draft</button>
          </>
        )}
        {t.status === "setup" && (
          <button onClick={genGroups} disabled={busy} className="btn-primary">Generar grupos</button>
        )}
      </div>
      {msg && <p className="text-xs text-slate-400">{msg}</p>}

      <div className="card">
        <h4 className="text-xl mb-2">Capitanes actuales ({captains.length})</h4>
        <ul className="text-sm space-y-1">
          {captains.map((c) => (
            <li key={c.player_id} className="flex justify-between">
              <span>{c.name}</span>
              <span className="text-slate-500 text-xs">{c.team_name ?? "—"}</span>
            </li>
          ))}
          {captains.length === 0 && <li className="text-slate-500">Ninguno.</li>}
        </ul>
      </div>

      <div className="card">
        <h4 className="text-xl mb-2">Promover jugador a capitán</h4>
        <ul className="text-sm space-y-1 max-h-64 overflow-auto">
          {nonCaptains.map((p) => (
            <li key={p.player_id} className="flex justify-between items-center py-1">
              <span>{p.name} <span className="text-slate-500">({p.overall})</span></span>
              <button onClick={() => promote(p.player_id, `Equipo ${p.name}`)}
                disabled={busy} className="chip hover:bg-court-accent/20">Promover</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
