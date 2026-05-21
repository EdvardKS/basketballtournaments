import { useRef, useState } from "react";
import { api, ApiError } from "../lib/api.js";
import type { Player } from "../lib/types.js";
import NeonInput from "../components/ui/NeonInput.js";
import NeonSelect from "../components/ui/NeonSelect.js";
import NeonButton from "../components/ui/NeonButton.js";
import { useRevealStagger, successBurst, errorShake } from "../lib/neon.js";
import { processAvatar, AvatarBgRemovalError } from "../lib/avatar.js";

const POSITIONS = [
  ["base", "Base"], ["escolta", "Escolta"], ["alero", "Alero"],
  ["ala-pivot", "Ala-Pívot"], ["pivot", "Pívot"],
] as const;

interface Props { player: Player; onDone?: () => void }

export default function PlayerProfileEditor({ player, onDone }: Props) {
  const [form, setForm] = useState({
    name: player.name, email: player.email ?? "",
    age: player.age ?? "" as number | "",
    position: player.position,
    mobile: player.mobile, username: player.username ?? "",
    avatar: player.avatar ?? "",
  });
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok"|"err"; text: string } | null>(null);
  const [avatarProgress, setAvatarProgress] = useState<number | null>(null);
  const [avatarHint, setAvatarHint] = useState<string | null>(null);
  const saveBtn = useRef<HTMLButtonElement>(null);
  const pwdBtn = useRef<HTMLButtonElement>(null);

  const containerRef = useRevealStagger();

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarProgress(0); setAvatarHint(null);
    try {
      const url = await processAvatar(file, {
        onProgress: (pct) => setAvatarProgress(pct),
      });
      set("avatar", url);
    } catch (err) {
      if (err instanceof AvatarBgRemovalError) {
        // Plain resize fallback so the user keeps their photo.
        const url = await processAvatar(file, { skipBgRemoval: true });
        set("avatar", url);
        setAvatarHint("No se pudo recortar el fondo — foto guardada sin recorte.");
      } else {
        setAvatarHint("No se pudo procesar la imagen.");
      }
    } finally {
      setAvatarProgress(null);
      e.target.value = "";
    }
  };

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      await api<Player>(`/players/${player.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name, email: form.email || null,
          age: form.age === "" ? null : Number(form.age),
          position: form.position, mobile: form.mobile,
          username: form.username || null,
          avatar: form.avatar || null,
        }),
      });
      setMsg({ kind: "ok", text: "Perfil actualizado." });
      successBurst(saveBtn.current);
      setTimeout(() => { onDone?.(); window.location.reload(); }, 600);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "ERROR";
      setMsg({ kind: "err", text: `No se pudo guardar (${code}).` });
      errorShake(saveBtn.current);
    } finally { setBusy(false); }
  };

  const changePwd = async () => {
    if (pwd.newPassword !== pwd.confirmPassword) {
      setMsg({ kind: "err", text: "Las contraseñas no coinciden." });
      errorShake(pwdBtn.current);
      return;
    }
    setBusy(true); setMsg(null);
    try {
      await api(`/auth/password`, { method: "POST", body: JSON.stringify(pwd) });
      setMsg({ kind: "ok", text: "Contraseña actualizada." });
      successBurst(pwdBtn.current);
      setPwd({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "ERROR";
      const text = code === "INVALID_CURRENT_PASSWORD"
        ? "Contraseña actual incorrecta." : `Error (${code}).`;
      setMsg({ kind: "err", text });
      errorShake(pwdBtn.current);
    } finally { setBusy(false); }
  };

  return (
    <div ref={containerRef} className="space-y-6">
      {/* --- Avatar --- */}
      <section data-reveal className="card flex items-center gap-4">
        <div className="relative">
          {form.avatar ? (
            <img src={form.avatar} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-[var(--color-neon-orange)] shadow-[0_0_18px_rgba(255,107,0,0.45)]" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-court-border border-2 border-court-border flex items-center justify-center text-3xl text-court-muted">
              {player.name.charAt(0).toUpperCase()}
            </div>
          )}
          <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--color-neon-orange)] flex items-center justify-center cursor-pointer shadow-[0_0_12px_rgba(255,107,0,0.6)]" title="Cambiar foto">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3 3.5-4.5L19 18H5l3.5-4.5z" /></svg>
            <input type="file" accept="image/*" onChange={onAvatar} className="hidden" />
          </label>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.25em] text-court-muted">Avatar del cromo</p>
          <p className="text-white text-sm">Pulsa el icono para subir o reemplazar tu foto.</p>
          <p className="text-[10px] text-court-muted mt-1">El fondo se recorta automáticamente.</p>
          {avatarProgress != null && (
            <div className="mt-2">
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${Math.max(4, Math.round(avatarProgress * 100))}%`,
                    background: "linear-gradient(90deg, #ff6b00, #ff2d2d)",
                    boxShadow: "0 0 8px rgba(255,107,0,0.55)",
                  }} />
              </div>
              <p className="text-[10px] text-court-muted mt-1">
                Procesando imagen… {Math.round(avatarProgress * 100)}%
              </p>
            </div>
          )}
          {avatarHint && <p className="text-[10px] text-court-warn mt-1">{avatarHint}</p>}
        </div>
      </section>

      {/* --- Personal data --- */}
      <section data-reveal className="card space-y-4">
        <div>
          <p className="neon-section-overline">Datos personales</p>
          <h3 className="font-hero text-xl text-white leading-none">Tu <span className="text-neon-orange">perfil</span></h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><NeonInput label="Nombre completo" value={form.name} onChange={(e) => set("name", e.target.value)} required /></div>
          <NeonInput label="Móvil" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} hint="Se usa para iniciar sesión." />
          <NeonInput label="Edad" type="number" min={10} max={80}
            value={form.age === "" ? "" : String(form.age)}
            onChange={(e) => set("age", e.target.value === "" ? "" : Number(e.target.value))} />
          <div className="sm:col-span-2"><NeonInput label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
          <NeonInput label="Usuario" value={form.username} onChange={(e) => set("username", e.target.value)} hint="Alternativa para el login." />
          <NeonSelect label="Posición" value={form.position} onChange={(e) => set("position", e.target.value)}>
            {POSITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </NeonSelect>
        </div>
        <div className="flex gap-2 flex-wrap">
          <NeonButton ref={saveBtn} variant="primary" size="sm" disabled={busy} onClick={save}>
            {busy ? "Guardando…" : "Guardar cambios"}
          </NeonButton>
          <NeonButton variant="ghost" size="sm" onClick={() => setShowPwd((s) => !s)}>
            {showPwd ? "Cerrar contraseña" : "Cambiar contraseña"}
          </NeonButton>
        </div>
      </section>

      {/* --- Password --- */}
      {showPwd && (
        <section data-reveal className="card space-y-3">
          <div>
            <p className="neon-section-overline">Seguridad</p>
            <h3 className="font-hero text-xl text-white leading-none">Cambiar <span className="text-neon-orange">contraseña</span></h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <NeonInput label="Actual" type="password" value={pwd.currentPassword}
              onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))} />
            <NeonInput label="Nueva" type="password" value={pwd.newPassword} minLength={6}
              onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))} />
            <NeonInput label="Confirmar" type="password" value={pwd.confirmPassword} minLength={6}
              onChange={(e) => setPwd((p) => ({ ...p, confirmPassword: e.target.value }))} />
          </div>
          <NeonButton ref={pwdBtn} variant="primary" size="sm" disabled={busy} onClick={changePwd}>
            {busy ? "Actualizando…" : "Actualizar contraseña"}
          </NeonButton>
        </section>
      )}

      {msg && (
        <p className={`text-xs ${msg.kind === "ok" ? "text-court-ok" : "text-court-warn"}`} data-reveal>
          {msg.text}
        </p>
      )}
    </div>
  );
}
