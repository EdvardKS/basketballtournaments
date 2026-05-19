import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../lib/api.js";
import type { Player } from "../../lib/types.js";

export interface Registration {
  player_id: string;
  name: string;
  mobile: string;
  registered_at?: string | null;
  is_captain?: boolean;
}

interface Props {
  tournamentId: string;
  registrations: Registration[];
  captainIds: Set<string>;
  canManage: boolean;        // admin can alta/edit/promote while open
  onChange: () => void;       // reload parent detail
}

type Feedback = { kind: "ok" | "err"; msg: string };

const STAT_KEYS = ["pace", "shooting", "passing", "dribbling", "defense", "physical"] as const;
type StatKey = typeof STAT_KEYS[number];
const STAT_LABEL: Record<StatKey, string> = {
  pace: "Ritmo", shooting: "Tiro", passing: "Pase",
  dribbling: "Bote", defense: "Defensa", physical: "Físico",
};

const POSITIONS = ["base", "escolta", "alero", "ala-pivot", "pivot"] as const;

// Default temp password for admin-created accounts. Matches the seed
// convention so the new player can log in by their mobile + this password
// and rotate it later from their own panel.
const DEFAULT_PASSWORD = "123123123";

export default function InscripcionesTab({
  tournamentId, registrations, captainIds, canManage, onChange,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAlta, setShowAlta] = useState(false);

  const flash = (kind: Feedback["kind"], msg: string) => {
    setFeedback({ kind, msg });
    setTimeout(() => setFeedback(null), 2800);
  };

  const ordered = useMemo(() => {
    const list = [...registrations];
    list.sort((a, b) => {
      const ta = a.registered_at ? new Date(a.registered_at).getTime() : 0;
      const tb = b.registered_at ? new Date(b.registered_at).getTime() : 0;
      return tb - ta;
    });
    if (!filter.trim()) return list;
    const q = filter.trim().toLowerCase();
    return list.filter((r) =>
      r.name.toLowerCase().includes(q) || r.mobile.includes(q));
  }, [registrations, filter]);

  const remove = async (r: Registration) => {
    if (!confirm(`¿Eliminar a ${r.name} de este torneo?`)) return;
    setBusyId(r.player_id);
    try {
      await api(`/tournaments/${tournamentId}/players/${r.player_id}`, { method: "DELETE" });
      flash("ok", `${r.name} eliminado`);
      setEditingId(null);
      onChange();
    } catch (e) {
      flash("err", e instanceof ApiError ? e.code : "Error al eliminar");
    } finally { setBusyId(null); }
  };

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
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-court-muted">
            {registrations.length} inscritos · {captainIds.size} capitanes
          </span>
          {canManage && (
            <button
              type="button"
              onClick={() => { setShowAlta((v) => !v); setEditingId(null); }}
              className="btn-neon-blue !py-1.5 !px-3 !text-xs"
            >
              {showAlta ? "Cerrar alta" : "+ Alta de jugador"}
            </button>
          )}
        </div>
      </div>

      {!canManage && (
        <p className="text-[11px] text-court-muted">
          Las inscripciones están cerradas: el torneo ya está en fase de juego.
        </p>
      )}

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

      {showAlta && canManage && (
        <NewPlayerForm
          tournamentId={tournamentId}
          onCreated={(name) => {
            setShowAlta(false);
            flash("ok", `${name} dado de alta e inscrito`);
            onChange();
          }}
          onError={(msg) => flash("err", msg)}
        />
      )}

      {registrations.length === 0 && !showAlta && (
        <div className="glass p-10 text-center">
          <p className="text-5xl mb-3">📝</p>
          <p className="text-white font-hero text-2xl">Sin inscripciones todavía</p>
          <p className="text-court-muted text-sm mt-2">
            Las inscripciones aparecerán aquí en cuanto los jugadores se registren al torneo.
          </p>
        </div>
      )}

      {registrations.length > 0 && (
        <ol
          className="divide-y divide-white/5 rounded-xl overflow-hidden border border-white/5"
          style={{ background: "rgba(20,26,44,0.6)" }}
        >
          {ordered.map((r, i) => {
            const isCaptain = captainIds.has(r.player_id);
            const busy = busyId === r.player_id;
            const isEditing = editingId === r.player_id;
            return (
              <li key={r.player_id} className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => canManage && setEditingId(isEditing ? null : r.player_id)}
                  className={`w-full flex flex-wrap items-center gap-3 ${canManage ? "cursor-pointer" : "cursor-default"} text-left`}
                  disabled={!canManage}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-hero text-sm text-white shrink-0"
                    style={{ background: isCaptain ? "linear-gradient(135deg, #f5c518, #ff8a1a)" : "rgba(255,255,255,0.08)" }}
                    aria-hidden="true"
                  >
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white truncate">{r.name}</p>
                      {isCaptain && (
                        <span
                          className="chip uppercase tracking-widest text-[9px]"
                          style={{ background: "rgba(245,197,24,0.15)", color: "#f5c518", border: "1px solid rgba(245,197,24,0.4)" }}
                        >
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
                  {canManage && (
                    <span className="text-xs text-court-muted shrink-0">
                      {isEditing ? "▲ Cerrar" : "▼ Editar"}
                    </span>
                  )}
                </button>

                {isEditing && canManage && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <PlayerEditor
                      playerId={r.player_id}
                      tournamentId={tournamentId}
                      isCaptain={isCaptain}
                      busy={busy}
                      onBusyChange={(b) => setBusyId(b ? r.player_id : null)}
                      onSaved={(msg) => { flash("ok", msg); setEditingId(null); onChange(); }}
                      onError={(msg) => flash("err", msg)}
                      onRemove={() => remove(r)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alta de jugador: admin creates a new account on someone's behalf and
// auto-registers them to the current tournament.

function NewPlayerForm({
  tournamentId, onCreated, onError,
}: {
  tournamentId: string;
  onCreated: (name: string) => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    name: "", mobile: "", email: "", age: "",
    position: "base", makeCaptain: false, teamName: "",
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.mobile.trim()) {
      onError("Nombre y móvil son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const created = await api<Player>("/players", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          email: form.email.trim() || null,
          age: form.age ? Number(form.age) : null,
          position: form.position,
          password: DEFAULT_PASSWORD,
          gdprAccepted: true,
          isPublic: true,
        }),
      });
      await api(`/tournaments/${tournamentId}/add-player`, {
        method: "POST",
        body: JSON.stringify({ playerId: created.id }),
      });
      if (form.makeCaptain) {
        await api(`/tournaments/${tournamentId}/captains`, {
          method: "POST",
          body: JSON.stringify({
            playerId: created.id,
            isCaptain: true,
            teamName: form.teamName.trim() || `Equipo ${created.name.split(" ")[0]}`,
          }),
        });
      }
      onCreated(created.name);
    } catch (e) {
      onError(e instanceof ApiError ? e.code : "Error al dar de alta");
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="glass p-4 sm:p-5 space-y-3">
      <h4 className="font-hero text-xl text-white">Alta de jugador</h4>
      <p className="text-[11px] text-court-muted">
        Crea la cuenta y le da de alta en el torneo. Contraseña inicial:
        <code className="ml-1 px-1.5 py-0.5 rounded bg-white/5 text-white">{DEFAULT_PASSWORD}</code>
        — el jugador puede cambiarla más tarde.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="label-text">Nombre *</span>
          <input className="input-field" value={form.name}
            onChange={(e) => set("name", e.target.value)} required />
        </label>
        <label className="block">
          <span className="label-text">Móvil *</span>
          <input className="input-field" value={form.mobile}
            onChange={(e) => set("mobile", e.target.value)} required />
        </label>
        <label className="block">
          <span className="label-text">Email</span>
          <input type="email" className="input-field" value={form.email}
            onChange={(e) => set("email", e.target.value)} />
        </label>
        <label className="block">
          <span className="label-text">Edad</span>
          <input type="number" min={10} max={80} className="input-field" value={form.age}
            onChange={(e) => set("age", e.target.value)} />
        </label>
        <label className="block">
          <span className="label-text">Posición</span>
          <select className="input-field" value={form.position}
            onChange={(e) => set("position", e.target.value)}>
            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-sm text-white/80">
        <input type="checkbox" checked={form.makeCaptain}
          onChange={(e) => set("makeCaptain", e.target.checked)}
          className="accent-court-accent" />
        Marcar como capitán al darle de alta
      </label>
      {form.makeCaptain && (
        <label className="block">
          <span className="label-text">Nombre del equipo</span>
          <input className="input-field" value={form.teamName}
            onChange={(e) => set("teamName", e.target.value)}
            placeholder="Se autogenera si lo dejas vacío" />
        </label>
      )}
      <div className="flex gap-3 pt-1">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Creando…" : "Crear jugador"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Inline editor for an existing registration: loads the full Player, lets
// the admin edit profile + skills + captain state, and fires the right
// API calls (PATCH /players/:id + POST /tournaments/:id/captains).

function PlayerEditor({
  playerId, tournamentId, isCaptain, busy, onBusyChange, onSaved, onError, onRemove,
}: {
  playerId: string;
  tournamentId: string;
  isCaptain: boolean;
  busy: boolean;
  onBusyChange: (b: boolean) => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
  onRemove: () => void;
}) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [form, setForm] = useState<{
    name: string; mobile: string; email: string; age: string; position: string;
    pace: number; shooting: number; passing: number; dribbling: number; defense: number; physical: number;
    captain: boolean; teamName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const p = await api<Player>(`/players/${playerId}`);
        if (cancelled) return;
        setPlayer(p);
        setForm({
          name: p.name,
          mobile: p.mobile,
          email: p.email ?? "",
          age: p.age == null ? "" : String(p.age),
          position: p.position,
          pace: p.pace, shooting: p.shooting, passing: p.passing,
          dribbling: p.dribbling, defense: p.defense, physical: p.physical,
          captain: isCaptain,
          teamName: "",
        });
      } catch (e) {
        if (!cancelled) onError(e instanceof ApiError ? e.code : "Error al cargar jugador");
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [playerId, isCaptain, onError]);

  if (loading || !form || !player) {
    return <p className="text-sm text-court-muted">Cargando ficha…</p>;
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async () => {
    onBusyChange(true);
    try {
      await api(`/players/${playerId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          email: form.email.trim() || null,
          age: form.age ? Number(form.age) : null,
          position: form.position,
          pace: form.pace, shooting: form.shooting, passing: form.passing,
          dribbling: form.dribbling, defense: form.defense, physical: form.physical,
        }),
      });
      if (form.captain !== isCaptain) {
        await api(`/tournaments/${tournamentId}/captains`, {
          method: "POST",
          body: JSON.stringify({
            playerId,
            isCaptain: form.captain,
            teamName: form.captain
              ? (form.teamName.trim() || `Equipo ${form.name.split(" ")[0]}`)
              : undefined,
          }),
        });
      }
      onSaved(`${form.name} actualizado`);
    } catch (e) {
      onError(e instanceof ApiError ? e.code : "Error al guardar");
    } finally { onBusyChange(false); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="label-text">Nombre</span>
          <input className="input-field" value={form.name}
            onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className="block">
          <span className="label-text">Móvil</span>
          <input className="input-field" value={form.mobile}
            onChange={(e) => set("mobile", e.target.value)} />
        </label>
        <label className="block">
          <span className="label-text">Email</span>
          <input type="email" className="input-field" value={form.email}
            onChange={(e) => set("email", e.target.value)} />
        </label>
        <label className="block">
          <span className="label-text">Edad</span>
          <input type="number" min={10} max={80} className="input-field" value={form.age}
            onChange={(e) => set("age", e.target.value)} />
        </label>
        <label className="block sm:col-span-2">
          <span className="label-text">Posición</span>
          <select className="input-field" value={form.position}
            onChange={(e) => set("position", e.target.value)}>
            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>

      <div>
        <p className="label-text mb-2">Estadísticas (1–99)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {STAT_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-3">
              <span className="text-xs text-court-muted w-16 shrink-0">{STAT_LABEL[k]}</span>
              <input
                type="range" min={1} max={99}
                value={form[k]}
                onChange={(e) => set(k, Number(e.target.value))}
                className="flex-1 accent-court-accent"
              />
              <span className="text-xs font-bold text-white w-6 text-right tabular-nums">{form[k]}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer text-sm text-white/80">
        <input type="checkbox" checked={form.captain}
          onChange={(e) => set("captain", e.target.checked)}
          className="accent-court-accent" />
        Capitán de este torneo
      </label>
      {form.captain && !isCaptain && (
        <label className="block">
          <span className="label-text">Nombre del equipo</span>
          <input className="input-field" value={form.teamName}
            onChange={(e) => set("teamName", e.target.value)}
            placeholder="Se autogenera si lo dejas vacío" />
        </label>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
        <button type="button" onClick={save} disabled={busy} className="btn-primary">
          {busy ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          type="button" onClick={onRemove} disabled={busy}
          className="px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider text-[var(--color-neon-red)] border border-[var(--color-neon-red)]/30 hover:bg-[var(--color-neon-red)]/10 transition-all"
        >
          Eliminar del torneo
        </button>
      </div>
    </div>
  );
}
