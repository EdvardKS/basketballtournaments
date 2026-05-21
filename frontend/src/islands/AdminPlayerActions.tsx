import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api.js";
import type { Player, Achievement } from "../lib/types.js";
import { kindLabel } from "../lib/cromo.js";
import NeonModal from "../components/ui/NeonModal.js";
import NeonInput from "../components/ui/NeonInput.js";
import NeonSelect from "../components/ui/NeonSelect.js";
import NeonSlider from "../components/ui/NeonSlider.js";
import NeonButton from "../components/ui/NeonButton.js";
import { loadGsap, prefersReducedMotion } from "../lib/neon.js";

interface Tournament { id: string; name: string }
interface Props {
  player: Player;
  onClose: () => void;
  onChanged: () => void;
}

type Tab = "profile" | "stats" | "sanction" | "awards";

const TAB_LABELS: Record<Tab, string> = {
  profile: "Perfil", stats: "Stats", sanction: "Sanción", awards: "Premios",
};

const STAT_LABELS = [
  ["pace", "Ritmo"], ["shooting", "Tiro"], ["passing", "Pase"],
  ["dribbling", "Bote"], ["defense", "Defensa"], ["physical", "Físico"],
] as const;

export default function AdminPlayerActions({ player: p, onClose, onChanged }: Props) {
  const isAdmin = p.role === "admin";
  const tabs: Tab[] = isAdmin ? ["profile", "awards"] : ["profile", "stats", "sanction", "awards"];
  const [tab, setTab] = useState<Tab>("profile");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok"|"err"; text: string } | null>(null);

  const [stats, setStats] = useState({
    pace: p.pace, shooting: p.shooting, passing: p.passing,
    dribbling: p.dribbling, defense: p.defense, physical: p.physical,
  });
  const [profile, setProfile] = useState({
    name: p.name, mobile: p.mobile, email: p.email ?? "",
    age: (p.age ?? "") as number | "",
    position: p.position, role: p.role,
    username: p.username ?? "",
  });
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [award, setAward] = useState({ kind: "mvp" as "mvp"|"custom", tournamentId: "", label: "", note: "" });

  const tabBarRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try { setTournaments(await api<Tournament[]>("/tournaments")); } catch { /* */ }
      try { setAchievements(await api<Achievement[]>(`/players/${p.id}/achievements`)); } catch { /* */ }
    })();
  }, [p.id]);

  // Slide tab indicator on tab change. Use a GSAP timeline so left + width
  // tween together for that satisfying NBA-segment-bar feel.
  useEffect(() => {
    if (!tabBarRef.current || !indicatorRef.current) return;
    const active = tabBarRef.current.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
    if (!active) return;
    const barRect = tabBarRef.current.getBoundingClientRect();
    const r = active.getBoundingClientRect();
    const left = r.left - barRect.left;
    const width = r.width;
    if (prefersReducedMotion()) {
      indicatorRef.current.style.left = `${left}px`;
      indicatorRef.current.style.width = `${width}px`;
      return;
    }
    let cancelled = false;
    void (async () => {
      const gsap = await loadGsap();
      if (cancelled || !indicatorRef.current) return;
      gsap.to(indicatorRef.current, {
        left, width,
        duration: 0.36,
        ease: "expo.out",
      });
    })();
    return () => { cancelled = true; };
  }, [tab]);

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

  return (
    <NeonModal open title={p.name} subtitle={`${p.role.toUpperCase()} · OVR ${p.role === "admin" ? "—" : p.overall}`} onClose={onClose}>
      <div className="space-y-5">
        <nav ref={tabBarRef} className="neon-tab-bar relative flex gap-1 border-b border-court-border" role="tablist">
          {tabs.map((k) => (
            <button key={k} data-tab={k} type="button" role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`relative px-4 py-2.5 text-xs uppercase tracking-[0.2em] font-bold transition-colors ${
                tab === k ? "text-white" : "text-court-muted hover:text-white"
              }`}>
              {TAB_LABELS[k]}
            </button>
          ))}
          <div ref={indicatorRef} className="neon-tab-indicator" style={{ left: 0, width: 0 }} />
        </nav>

        {tab === "profile" && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NeonInput label="Nombre" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <NeonInput label="Móvil" value={profile.mobile} onChange={(e) => setProfile({ ...profile, mobile: e.target.value })} />
            <NeonInput label="Email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            <NeonInput label="Usuario" value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} />
            <NeonInput label="Edad" type="number" value={profile.age === "" ? "" : String(profile.age)}
              onChange={(e) => setProfile({ ...profile, age: e.target.value === "" ? "" : Number(e.target.value) })} />
            <NeonInput label="Posición" value={profile.position} onChange={(e) => setProfile({ ...profile, position: e.target.value })} />
            <NeonSelect label="Rol" value={profile.role}
              onChange={(e) => setProfile({ ...profile, role: e.target.value as Player["role"] })}>
              <option value="player">Jugador</option>
              <option value="captain">Capitán</option>
              <option value="admin">Admin</option>
            </NeonSelect>
            <div className="sm:col-span-2">
              <NeonButton variant="primary" size="sm" disabled={busy} onClick={saveProfile}>Guardar perfil</NeonButton>
            </div>
          </section>
        )}

        {tab === "stats" && (
          <section className="space-y-3">
            {STAT_LABELS.map(([k, label]) => (
              <NeonSlider key={k} label={label} min={1} max={99} value={stats[k]}
                onChange={(v) => setStats({ ...stats, [k]: v })} />
            ))}
            <div className="flex gap-2 pt-2">
              <NeonButton variant="ghost" size="sm" onClick={() => setStats({ pace: 40, shooting: 40, passing: 40, dribbling: 40, defense: 40, physical: 40 })}>
                Restablecer (40)
              </NeonButton>
              <NeonButton variant="primary" size="sm" disabled={busy} onClick={saveStats}>Guardar stats</NeonButton>
            </div>
          </section>
        )}

        {tab === "sanction" && (
          <section className="space-y-3">
            <p className="text-sm text-court-muted">
              Estado actual: <span className={p.canEditStats ? "text-court-ok" : "text-court-warn"}>{p.canEditStats ? "Puede editar stats" : "Bloqueado"}</span>
            </p>
            <div className="flex gap-2">
              <NeonButton variant="danger" size="sm" disabled={busy} onClick={() => toggleSanction(false)}>Bloquear stats</NeonButton>
              <NeonButton variant="primary" size="sm" disabled={busy} onClick={() => toggleSanction(true)}>Desbloquear</NeonButton>
            </div>
          </section>
        )}

        {tab === "awards" && (
          <section className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NeonSelect label="Tipo" value={award.kind}
                onChange={(e) => setAward({ ...award, kind: e.target.value as "mvp" | "custom" })}>
                <option value="mvp">MVP</option>
                <option value="custom">Custom</option>
              </NeonSelect>
              <NeonSelect label="Torneo" value={award.tournamentId}
                onChange={(e) => setAward({ ...award, tournamentId: e.target.value })}>
                <option value="">— Selecciona torneo —</option>
                {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </NeonSelect>
              {award.kind === "custom" && (
                <div className="sm:col-span-2">
                  <NeonInput label="Etiqueta" value={award.label}
                    onChange={(e) => setAward({ ...award, label: e.target.value })}
                    placeholder="Mejor defensor, MVP del partido…" />
                </div>
              )}
              <div className="sm:col-span-2">
                <NeonInput label="Nota (opcional)" value={award.note}
                  onChange={(e) => setAward({ ...award, note: e.target.value })} />
              </div>
            </div>
            <NeonButton variant="primary" size="sm" disabled={busy} onClick={grant}>Otorgar premio</NeonButton>

            <ul className="space-y-1">
              {achievements.filter((a) => a.id).map((a) => {
                const l = kindLabel[a.kind] ?? { emoji: "🏅", text: a.kind };
                return (
                  <li key={a.id} className="neon-row flex items-center gap-3 text-xs border border-court-border rounded-lg pl-4 pr-2 py-2">
                    <span className="text-lg">{l.emoji}</span>
                    <span className="flex-1">{a.kind === "custom" ? a.label : l.text} · {a.tournamentName} ({a.year})</span>
                    <NeonButton variant="danger" size="sm" onClick={() => revoke(a.id!)}>Revocar</NeonButton>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {msg && <p className={msg.kind === "ok" ? "text-xs text-court-ok" : "text-xs text-court-warn"}>{msg.text}</p>}
      </div>
    </NeonModal>
  );
}
