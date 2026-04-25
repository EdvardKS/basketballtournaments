import { useMemo, useState } from "react";
import { api, ApiError } from "../../lib/api.js";

export interface Registration {
  player_id: string;
  name: string;
  mobile: string;
  // Optional — backend may not return it; we degrade gracefully
  registered_at?: string | null;
  is_captain?: boolean;
}

interface Props {
  tournamentId: string;
  registrations: Registration[];
  captainIds: Set<string>;
  onChange: () => void; // re-load parent
}

export default function InscripcionesTab({ tournamentId, registrations, captainIds, onChange }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const ordered = useMemo(() => {
    const list = [...registrations];
    list.sort((a, b) => {
      const ta = a.registered_at ? new Date(a.registered_at).getTime() : 0;
      const tb = b.registered_at ? new Date(b.registered_at).getTime() : 0;
      return tb - ta;
    });
    if (!filter.trim()) return list;
    const q = filter.trim().toLowerCase();
    return list.filter((r) => r.name.toLowerCase().includes(q) || r.mobile.includes(q));
  }, [registrations, filter]);

  const flash = (kind: "ok" | "err", msg: string) => {
    setFeedback({ kind, msg });
    setTimeout(() => setFeedback(null), 2800);
  };

  const remove = async (r: Registration) => {
    if (!confirm(`¿Eliminar a ${r.name} de este torneo?`)) return;
    setBusyId(r.player_id);
    try {
      await api(`/tournaments/${tournamentId}/players/${r.player_id}`, { method: "DELETE" });
      flash("ok", `${r.name} eliminado`);
      onChange();
    } catch (e) {
      flash("err", e instanceof ApiError ? e.code : "Error al eliminar");
    } finally { setBusyId(null); }
  };

  const promoteToCaptain = async (r: Registration) => {
    const teamName = window.prompt(`Nombre del equipo de ${r.name}:`, `Equipo ${r.name.split(" ")[0]}`);
    if (!teamName) return;
    setBusyId(r.player_id);
    try {
      await api(`/tournaments/${tournamentId}/captains`, {
        method: "POST",
        body: JSON.stringify({ playerId: r.player_id, isCaptain: true, teamName }),
      });
      flash("ok", `${r.name} promovido a capitán`);
      onChange();
    } catch (e) {
      flash("err", e instanceof ApiError ? e.code : "Error al promover");
    } finally { setBusyId(null); }
  };

  const demoteCaptain = async (r: Registration) => {
    if (!confirm(`¿Quitar el rol de capitán a ${r.name}?`)) return;
    setBusyId(r.player_id);
    try {
      await api(`/tournaments/${tournamentId}/captains`, {
        method: "POST",
        body: JSON.stringify({ playerId: r.player_id, isCaptain: false }),
      });
      flash("ok", `${r.name} ya no es capitán`);
      onChange();
    } catch (e) {
      flash("err", e instanceof ApiError ? e.code : "Error");
    } finally { setBusyId(null); }
  };

  if (registrations.length === 0) {
    return (
      <div className="glass p-10 text-center">
        <p className="text-5xl mb-3">📝</p>
        <p className="text-white font-hero text-2xl">Sin inscripciones todavía</p>
        <p className="text-court-muted text-sm mt-2">Las inscripciones aparecerán aquí en cuanto los jugadores se registren al torneo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <input
          type="search"
          placeholder="Buscar por nombre o móvil…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input-neon max-w-xs flex-1"
        />
        <div className="text-xs uppercase tracking-widest text-court-muted">
          {registrations.length} inscritos · {captainIds.size} capitanes
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="px-3 py-2 rounded-lg text-sm border"
          style={{
            background: feedback.kind === "ok" ? "rgba(62,207,142,0.10)" : "rgba(255,45,45,0.10)",
            borderColor: feedback.kind === "ok" ? "rgba(62,207,142,0.4)" : "rgba(255,45,45,0.4)",
            color: feedback.kind === "ok" ? "#3ecf8e" : "#ff6b6b",
          }}
        >
          {feedback.msg}
        </div>
      )}

      <ol className="divide-y divide-white/5 rounded-xl overflow-hidden border border-white/5"
          style={{ background: "rgba(20,26,44,0.6)" }}>
        {ordered.map((r, i) => {
          const isCaptain = captainIds.has(r.player_id);
          const busy = busyId === r.player_id;
          return (
            <li
              key={r.player_id}
              className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-hero text-sm text-white shrink-0"
                   style={{ background: isCaptain ? "linear-gradient(135deg, #f5c518, #ff8a1a)" : "rgba(255,255,255,0.08)" }}
                   aria-hidden="true">
                {r.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-white truncate">{r.name}</p>
                  {isCaptain && (
                    <span className="chip uppercase tracking-widest text-[9px]"
                          style={{ background: "rgba(245,197,24,0.15)", color: "#f5c518", border: "1px solid rgba(245,197,24,0.4)" }}>
                      Capitán
                    </span>
                  )}
                </div>
                <p className="text-xs text-court-muted">
                  📞 {r.mobile}
                  {r.registered_at && (
                    <> · <span className="text-white/40">{new Date(r.registered_at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span></>
                  )}
                  {!r.registered_at && (
                    <> · <span className="text-white/40">#{ordered.length - i}</span></>
                  )}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {isCaptain ? (
                  <button
                    type="button"
                    onClick={() => demoteCaptain(r)}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-all disabled:opacity-50"
                  >
                    Quitar capitán
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => promoteToCaptain(r)}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider text-court-gold border border-court-gold/40 hover:bg-court-gold/10 hover:shadow-[0_0_14px_rgba(245,197,24,0.5)] transition-all disabled:opacity-50"
                  >
                    ⭐ Capitán
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(r)}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider text-[var(--color-neon-red)] border border-[var(--color-neon-red)]/30 hover:bg-[var(--color-neon-red)]/10 transition-all disabled:opacity-50"
                  aria-label={`Eliminar ${r.name}`}
                >
                  Eliminar
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
