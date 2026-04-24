import { useState } from "react";
import { api, ApiError } from "../lib/api.js";
import type { Team } from "../lib/types.js";

interface Props { team: Team; matchDate: string | null }

const resizeLogo = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(200 / img.width, 200 / img.height, 1);
      const c = document.createElement("canvas");
      c.width = img.width * s; c.height = img.height * s;
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.src = url;
  });

export default function TeamSettings({ team, matchDate }: Props) {
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description ?? "");
  const [whatsappLink, setWhatsappLink] = useState(team.whatsappLink ?? "");
  const [logo, setLogo] = useState<string | null>(team.logo);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const locked = matchDate
    ? new Date().getTime() > new Date(matchDate).getTime() - 24 * 60 * 60 * 1000
    : false;

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setLogo(await resizeLogo(file));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null); setLoading(true);
    try {
      await api(`/teams/${team.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description: description || null, whatsappLink: whatsappLink || null, logo }),
      });
      setMsg("¡Guardado!");
    } catch (err) {
      setMsg(err instanceof ApiError ? err.code : "Error al guardar");
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={save} className="card space-y-4 max-w-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl text-white">Mi equipo</h3>
        {locked && <span className="chip bg-court-warn/20 text-court-warn">🔒 Edición bloqueada</span>}
      </div>

      <div>
        <label className="label-text">Nombre del equipo</label>
        <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} disabled={locked} required />
      </div>

      <div>
        <label className="label-text">Descripción</label>
        <input className="input-field" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="El equipo más duro de Villena…" disabled={locked} maxLength={500} />
      </div>

      <div>
        <label className="label-text">Enlace WhatsApp del equipo</label>
        <input className="input-field" value={whatsappLink} onChange={(e) => setWhatsappLink(e.target.value)} placeholder="https://wa.me/..." disabled={locked} />
      </div>

      <div>
        <label className="label-text">Logo del equipo</label>
        {logo && <img src={logo} className="w-16 h-16 rounded-xl object-cover mb-2 border border-court-border" alt="logo" />}
        <input type="file" accept="image/*" onChange={handleLogo} disabled={locked} className="input-field text-court-muted py-1.5 cursor-pointer" />
      </div>

      {msg && (
        <p className={msg === "¡Guardado!" ? "text-court-ok text-sm" : "text-court-danger text-sm"}>{msg}</p>
      )}

      <button type="submit" className="btn-primary" disabled={locked || loading}>
        {loading ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
