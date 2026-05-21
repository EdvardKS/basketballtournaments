import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api.js";
import type { Player, Achievement } from "../lib/types.js";
import { kindLabel } from "../lib/cromo.js";

interface Tournament { id: string; name: string }
interface Props {
  player: Player;
  onClose: () => void;
  onChanged: () => void;
}

const STAT_LABELS = [
  ["pace", "Ritmo"], ["shooting", "Tiro"], ["passing", "Pase"],
  ["dribbling", "Bote"], ["defense", "Defensa"], ["physical", "Físico"],
] as const;

export default function AdminPlayerActions({ player: p, onClose, onChanged }: Props) {
  const isAdmin = p.role === "admin";
  const [tab, setTab] = useState<"profile" | "stats" | "sanction" | "awards">("profile");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok"|"err"; text: string } | null>(null);
  const [stats, setStats] = useState({
    pace: p.pace, shooting: p.shooting, passing: p.passing,
    dribbling: p.dribbling, defense: p.defense, physical: p.physical,
  });
  const [profile, setProfile] = useState({
    name: p.name, mobile: p.mobile, email: p.email ?? "",
    age: p.age ?? "", position: p.position, role: p.role,
    username: p.username ?? "",
  });
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [award, setAward] = useState({ kind: "mvp" as "mvp" | "custom", tournamentId: "", label: "", note: "" });

  useEffect(() => {
    (async () => {
      try { setTournaments(await api<Tournament[]>("/tournaments")); } catch { /* */ }
      try { setAchievements(await api<Achievement[]>(`/players/${p.id}/achievements`)); } catch { /* */ }
    })();
  }, [p.id]);

  const wrap = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ kind: "ok", text: ok }); onChanged(); }
    catch (e) {
      const code = e instanceof ApiError ? e.code : "ERROR";
      setMsg({ kind: "err", text: `Error: ${code}` });
    } finally { setBusy(false); }
  };

  const saveProfile = () => wrap(async () => {
    await api(`/players/${p.id}`, { method: "PATCH",
      body: JSON.stringify({ ...profile, age: profile.age === "" ? null : Number(profile.age) }) });
  }, "Perfil actualizado.");

  const saveStats = () => wrap(async () => {
    await api(`/players/${p.id}`, { method: "PATCH", body: JSON.stringify(stats) });
  }, "Stats actualizadas.");

  const toggleSanction = (next: boolean) => wrap(async () => {
    await api(`/players/${p.id}/sanction`, { method: "PATCH",
      body: JSON.stringify({ canEditStats: next }) });
  }, next ? "Edición desbloqueada." : "Edición bloqueada.");

  const grant = () => wrap(async () => {
    if (!award.tournamentId) throw new ApiError(400, "TOURNAMENT_REQUIRED");
    await api(`/players/${p.id}/achievements`, { method: "POST",
      body: JSON.stringify({ kind: award.kind, tournamentId: award.tournamentId,
        label: award.kind === "custom" ? award.label : null,
        note: award.note || null }) });
    setAchievements(await api<Achievement[]>(`/players/${p.id}/achievements`));
    setAward({ kind: "mvp", tournamentId: "", label: "", note: "" });
  }, "Premio otorgado.");

  const revoke = (aid: string) => wrap(async () => {
    await api(`/players/${p.id}/achievements/${aid}`, { method: "DELETE" });
    setAchievements(await api<Achievement[]>(`/players/${p.id}/achievements`));
  }, "Premio revocado.");

  const input = "w-full bg-court-bg border border-court-border rounded px-2 py-1 text-sm";
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-white">{p.name}</h3>
          <button onClick={onClose} className="btn-ghost text-xs">Cerrar</button>
        </div>
        <nav className="flex gap-1 border-b border-court-border text-xs">
          {(isAdmin
            ? (["profile","awards"] as const)
            : (["profile","stats","sanction","awards"] as const)
          ).map((k) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-3 py-2 ${tab === k ? "text-white border-b-2 border-[var(--color-neon-orange)]" : "text-court-muted"}`}>
              {{profile:"Perfil",stats:"Stats",sanction:"Sanción",awards:"Premios"}[k]}
            </button>
          ))}
        </nav>

        {tab === "profile" && (
          <div className="grid grid-cols-2 gap-2">
            <input className={input} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Nombre" />
            <input className={input} value={profile.mobile} onChange={(e) => setProfile({ ...profile, mobile: e.target.value })} placeholder="Móvil" />
            <input className={input} value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="Email" />
            <input className={input} value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} placeholder="Usuario" />
            <input className={input} type="number" value={profile.age} onChange={(e) => setProfile({ ...profile, age: e.target.value as string })} placeholder="Edad" />
            <input className={input} value={profile.position} onChange={(e) => setProfile({ ...profile, position: e.target.value })} placeholder="Posición" />
            <select className={`${input} col-span-2`} value={profile.role}
              onChange={(e) => setProfile({ ...profile, role: e.target.value as Player["role"] })}>
              <option value="player">player</option><option value="captain">captain</option><option value="admin">admin</option>
            </select>
            <button onClick={saveProfile} disabled={busy} className="btn-primary text-xs col-span-2">Guardar perfil</button>
          </div>
        )}

        {tab === "stats" && (
          <div className="space-y-2">
            {STAT_LABELS.map(([k, label]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-xs text-court-muted w-16">{label}</span>
                <input type="range" min={1} max={99} value={stats[k]} onChange={(e) => setStats({ ...stats, [k]: Number(e.target.value) })} className="flex-1" />
                <span className="text-xs font-bold w-8 text-right">{stats[k]}</span>
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={() => setStats({ pace: 40, shooting: 40, passing: 40, dribbling: 40, defense: 40, physical: 40 })} className="btn-ghost text-xs">Restablecer 40</button>
              <button onClick={saveStats} disabled={busy} className="btn-primary text-xs">Guardar stats</button>
            </div>
          </div>
        )}

        {tab === "sanction" && (
          <div className="space-y-3">
            <p className="text-sm text-court-muted">Estado actual: <span className={p.canEditStats ? "text-court-ok" : "text-court-warn"}>{p.canEditStats ? "Puede editar stats" : "Bloqueado"}</span></p>
            <div className="flex gap-2">
              <button disabled={busy} onClick={() => toggleSanction(false)} className="btn-ghost text-xs">Bloquear stats</button>
              <button disabled={busy} onClick={() => toggleSanction(true)} className="btn-primary text-xs">Desbloquear</button>
            </div>
          </div>
        )}

        {tab === "awards" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select className={input} value={award.kind}
                onChange={(e) => setAward({ ...award, kind: e.target.value as "mvp" | "custom" })}>
                <option value="mvp">MVP</option>
                <option value="custom">Custom</option>
              </select>
              <select className={input} value={award.tournamentId}
                onChange={(e) => setAward({ ...award, tournamentId: e.target.value })}>
                <option value="">— Torneo —</option>
                {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {award.kind === "custom" && (
                <input className={`${input} col-span-2`} value={award.label}
                  onChange={(e) => setAward({ ...award, label: e.target.value })}
                  placeholder="Etiqueta (ej. Mejor defensor)" />
              )}
              <input className={`${input} col-span-2`} value={award.note}
                onChange={(e) => setAward({ ...award, note: e.target.value })}
                placeholder="Nota (opcional)" />
            </div>
            <button onClick={grant} disabled={busy} className="btn-primary text-xs">Otorgar</button>
            <ul className="space-y-1 mt-2">
              {achievements.filter((a) => a.id).map((a) => {
                const l = kindLabel[a.kind] ?? { emoji: "🏅", text: a.kind };
                return (
                  <li key={a.id ?? `${a.kind}-${a.tournamentId}`} className="flex items-center gap-2 text-xs">
                    <span>{l.emoji}</span>
                    <span className="flex-1">{a.kind === "custom" ? a.label : l.text} · {a.tournamentName} ({a.year})</span>
                    {a.id && <button onClick={() => revoke(a.id!)} className="chip text-[10px]">Revocar</button>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {msg && <p className={msg.kind === "ok" ? "text-xs text-court-ok" : "text-xs text-court-warn"}>{msg.text}</p>}
      </div>
    </div>
  );
}
