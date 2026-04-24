import { useState } from "react";
import { api, ApiError } from "../lib/api.js";

interface Props { tournamentId: string; draftActive: boolean }

export default function AdminDraftControls({ tournamentId, draftActive }: Props) {
  const [active, setActive] = useState(draftActive);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const act = async (endpoint: string, label: string) => {
    if (!confirm(`¿${label}?`)) return;
    setLoading(true); setMsg(null);
    try {
      await api(`/draft/${tournamentId}/${endpoint}`, { method: "POST" });
      setMsg(`${label} completado`);
      if (endpoint === "start") setActive(true);
      if (endpoint === "end") { setActive(false); window.location.reload(); }
    } catch (e) {
      setMsg(e instanceof ApiError ? e.code : "Error");
    } finally { setLoading(false); }
  };

  return (
    <div className="card space-y-3 max-w-sm">
      <h3 className="font-display text-xl text-white">Control del draft</h3>

      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${active ? "bg-court-ok animate-pulse" : "bg-court-muted"}`} />
        <span className="text-sm text-court-muted">{active ? "Draft en curso" : "Draft inactivo"}</span>
      </div>

      <div className="flex gap-2">
        {!active ? (
          <button className="btn-primary" onClick={() => act("start", "Iniciar draft")} disabled={loading}>
            ▶ Iniciar draft
          </button>
        ) : (
          <button className="btn-danger" onClick={() => act("end", "Finalizar draft")} disabled={loading}>
            ⏹ Finalizar draft
          </button>
        )}
      </div>

      {msg && <p className="text-xs text-court-muted">{msg}</p>}

      <div className="pt-2 border-t border-court-border space-y-2">
        <p className="text-xs text-court-muted font-semibold uppercase tracking-wider">Horarios</p>
        <button className="btn-ghost text-xs"
          onClick={() => api(`/matches/tournament/${tournamentId}/schedule`, { method: "POST" }).then(() => setMsg("Horario generado")).catch((e: ApiError) => setMsg(e.code))}>
          Generar horario automático
        </button>
        <button className="btn-ok text-xs"
          onClick={() => api(`/matches/tournament/${tournamentId}/confirm-schedule`, { method: "POST" }).then(() => { setMsg("Horarios confirmados y publicados"); window.location.reload(); }).catch((e: ApiError) => setMsg(e.code))}>
          ✓ Publicar horas
        </button>
      </div>
    </div>
  );
}
