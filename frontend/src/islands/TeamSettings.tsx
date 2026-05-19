import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api.js";
import type { Team } from "../lib/types.js";

interface Props { team: Team; matchDate: string | null; selfPlayerId: string }

interface RosterPlayer { id: string; name: string }

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

export default function TeamSettings({ team, matchDate, selfPlayerId }: Props) {
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description ?? "");
  const [whatsappLink, setWhatsappLink] = useState(team.whatsappLink ?? "");
  const [logo, setLogo] = useState<string | null>(team.logo);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [transferTarget, setTransferTarget] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferStage, setTransferStage] = useState<0 | 1>(0);

  // Load roster (used for the captain-transfer dropdown). Captains can hand
  // their role to any player they've already drafted.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const detail = await api<{ players: { id: string; name: string }[] }>(`/teams/${team.id}`);
        if (cancelled) return;
        setRoster(detail.players.filter((p) => p.id !== selfPlayerId));
      } catch { /* empty */ }
    })();
    return () => { cancelled = true; };
  }, [team.id, selfPlayerId]);

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

  const transfer = async () => {
    if (!transferTarget) return;
    if (transferStage === 0) { setTransferStage(1); return; }
    setTransferring(true); setMsg(null);
    try {
      await api(`/teams/${team.id}/transfer-captain`, {
        method: "POST",
        body: JSON.stringify({ newCaptainPlayerId: transferTarget }),
      });
      setMsg("Capitanía traspasada. Cerrando sesión de capitán…");
      // Force a clean reload so server-rendered nav + dashboard pick up the
      // role change.
      setTimeout(() => { window.location.reload(); }, 700);
    } catch (err) {
      setMsg(err instanceof ApiError ? err.code : "Error al traspasar");
      setTransferStage(0);
    } finally { setTransferring(false); }
  };

  return (
    <div className="space-y-4">
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
          <p className={msg.startsWith("¡") || msg.startsWith("Capit") ? "text-court-ok text-sm" : "text-court-danger text-sm"}>{msg}</p>
        )}

        <button type="submit" className="btn-primary" disabled={locked || loading}>
          {loading ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      {/* Captain transfer — only useful once the captain has actually drafted
          someone. Up to (and including) match day; backend re-verifies. */}
      {roster.length > 0 && (
        <div className="card space-y-3 max-w-lg border-court-warn/40">
          <div>
            <h4 className="font-display text-xl text-white">Traspasar capitanía</h4>
            <p className="text-xs text-court-muted mt-1">
              Una vez comenzado el draft, el admin ya no puede quitarte el rol.
              Si necesitas dejarlo, puedes pasárselo a uno de tus jugadores.
              El equipo se mantiene (nombre, logo, WhatsApp, plantilla).
            </p>
          </div>
          <div>
            <label className="label-text">Nuevo capitán</label>
            <select
              className="input-field"
              value={transferTarget}
              onChange={(e) => { setTransferTarget(e.target.value); setTransferStage(0); }}
              disabled={transferring}
            >
              <option value="">— Elige un jugador de tu plantilla —</option>
              {roster.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {transferStage === 1 && (
            <p className="text-[11px] text-court-warn">
              Confirma de nuevo: perderás el rol de capitán al instante.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={transfer}
              disabled={!transferTarget || transferring}
              className={transferStage === 0 ? "btn-neon-blue" : "btn-danger"}
            >
              {transferring
                ? "Traspasando…"
                : transferStage === 0
                  ? "Traspasar"
                  : "Sí, traspasar y dejar el rol"}
            </button>
            {transferStage === 1 && (
              <button
                type="button"
                onClick={() => setTransferStage(0)}
                className="btn-ghost"
                disabled={transferring}
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
