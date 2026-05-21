import { useState } from "react";
import { api, ApiError } from "../lib/api.js";
import type { Player } from "../lib/types.js";

const resizeImage = (file: File, maxPx = 240): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * s; canvas.height = img.height * s;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    img.src = url;
  });

const POSITIONS = [
  ["base", "Base"], ["escolta", "Escolta"], ["alero", "Alero"],
  ["ala-pivot", "Ala-Pívot"], ["pivot", "Pívot"],
] as const;

interface Props { player: Player }

export default function PlayerProfileEditor({ player }: Props) {
  const [form, setForm] = useState({
    name: player.name, email: player.email ?? "",
    age: player.age ?? "", position: player.position,
    mobile: player.mobile, username: player.username ?? "",
    avatar: player.avatar ?? "",
  });
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok"|"err"; text: string } | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    set("avatar", await resizeImage(file));
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
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "ERROR";
      setMsg({ kind: "err", text: `No se pudo guardar (${code}).` });
    } finally { setBusy(false); }
  };

  const changePwd = async () => {
    if (pwd.newPassword !== pwd.confirmPassword) {
      setMsg({ kind: "err", text: "Las contraseñas no coinciden." }); return;
    }
    setBusy(true); setMsg(null);
    try {
      await api(`/auth/password`, { method: "POST", body: JSON.stringify(pwd) });
      setMsg({ kind: "ok", text: "Contraseña cambiada." });
      setPwd({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "ERROR";
      const text = code === "INVALID_CURRENT_PASSWORD"
        ? "Contraseña actual incorrecta." : `Error (${code}).`;
      setMsg({ kind: "err", text });
    } finally { setBusy(false); }
  };

  const input = "w-full bg-court-bg border border-court-border rounded px-2 py-1 text-sm text-white";
  return (
    <div className="card space-y-3">
      <p className="label-text">Datos personales</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 text-xs">Nombre<input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="text-xs">Móvil<input className={input} value={form.mobile} onChange={(e) => set("mobile", e.target.value)} /></label>
        <label className="text-xs">Edad<input type="number" className={input} value={form.age} onChange={(e) => set("age", e.target.value as string)} /></label>
        <label className="col-span-2 text-xs">Email<input className={input} value={form.email} onChange={(e) => set("email", e.target.value)} /></label>
        <label className="text-xs">Usuario<input className={input} value={form.username} onChange={(e) => set("username", e.target.value)} /></label>
        <label className="text-xs">Posición
          <select className={input} value={form.position} onChange={(e) => set("position", e.target.value)}>
            {POSITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="col-span-2 text-xs">Avatar<input type="file" accept="image/*" className="block w-full text-xs" onChange={onAvatar} /></label>
      </div>
      <p className="text-[10px] text-court-muted">Móvil y usuario se usan para iniciar sesión — cuidado al cambiarlos.</p>
      <div className="flex gap-2">
        <button disabled={busy} onClick={save} className="btn-primary text-xs">Guardar</button>
        <button onClick={() => setShowPwd((s) => !s)} className="btn-ghost text-xs">{showPwd ? "Cerrar contraseña" : "Cambiar contraseña"}</button>
      </div>
      {showPwd && (
        <div className="space-y-2 border-t border-court-border pt-3">
          <input className={input} type="password" placeholder="Contraseña actual" value={pwd.currentPassword} onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))} />
          <input className={input} type="password" placeholder="Nueva contraseña (min 6)" value={pwd.newPassword} onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))} />
          <input className={input} type="password" placeholder="Confirmar nueva" value={pwd.confirmPassword} onChange={(e) => setPwd((p) => ({ ...p, confirmPassword: e.target.value }))} />
          <button disabled={busy} onClick={changePwd} className="btn-primary text-xs">Actualizar contraseña</button>
        </div>
      )}
      {msg && <p className={msg.kind === "ok" ? "text-xs text-court-ok" : "text-xs text-court-warn"}>{msg.text}</p>}
    </div>
  );
}
