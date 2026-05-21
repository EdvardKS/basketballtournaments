import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api.js";
import type { Team } from "../lib/types.js";
import NeonInput from "../components/ui/NeonInput.js";
import NeonSelect from "../components/ui/NeonSelect.js";
import NeonButton from "../components/ui/NeonButton.js";

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
      setTimeout(() => { window.location.reload(); }, 700);
    } catch (err) {
      setMsg(err instanceof ApiError ? err.code : "Error al traspasar");
      setTransferStage(0);
    } finally { setTransferring(false); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="card space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="neon-section-overline">Datos del equipo</p>
            <h3 className="font-hero text-2xl text-white leading-none">Mi <span className="text-neon-orange">equipo</span></h3>
          </div>
          {locked && (
            <span className="chip bg-court-warn/15 text-court-warn border border-court-warn/30 text-[10px]">
              🔒 Edición bloqueada
            </span>
          )}
        </div>

        <NeonInput label="Nombre del equipo" value={name}
          onChange={(e) => setName(e.target.value)} disabled={locked} required maxLength={60} />

        <NeonInput label="Descripción" value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="El equipo más duro de Villena…"
          disabled={locked} maxLength={500} />

        <NeonInput label="Enlace WhatsApp del equipo" value={whatsappLink}
          onChange={(e) => setWhatsappLink(e.target.value)}
          placeholder="https://wa.me/..." disabled={locked}
          hint="Comparte un enlace de invitación al grupo de tu equipo." />

        <div className="space-y-2">
          <label className="block text-[10px] uppercase tracking-[0.25em] text-court-muted font-semibold">Logo del equipo</label>
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} className="w-16 h-16 rounded-xl object-cover border-2 border-[var(--color-neon-orange)] shadow-[0_0_14px_rgba(255,107,0,0.4)]" alt="logo" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-court-border border border-court-border flex items-center justify-center text-2xl text-court-muted">🏀</div>
            )}
            <label className={`flex-1 cursor-pointer rounded-xl border border-dashed border-white/15 hover:border-[var(--color-neon-orange)]/60 hover:bg-white/5 transition-all px-4 py-3 text-xs text-court-muted text-center ${locked ? "opacity-50 cursor-not-allowed" : ""}`}>
              <input type="file" accept="image/*" onChange={handleLogo} disabled={locked} className="hidden" />
              {logo ? "Cambiar logo" : "Subir logo del equipo"}
            </label>
          </div>
        </div>

        {msg && (
          <p className={msg.startsWith("¡") || msg.startsWith("Capit") ? "text-court-ok text-xs" : "text-court-warn text-xs"}>{msg}</p>
        )}

        <NeonButton type="submit" variant="primary" size="sm" disabled={locked || loading}>
          {loading ? "Guardando…" : "Guardar cambios"}
        </NeonButton>
      </form>

      {/* Captain transfer — only useful once the captain has actually drafted
          someone. Up to (and including) match day; backend re-verifies. */}
      {roster.length > 0 && (
        <div className="card space-y-3 border border-court-warn/30">
          <div>
            <p className="neon-section-overline" style={{ color: "#f5c518" }}>Capitanía</p>
            <h4 className="font-hero text-xl text-white leading-none">Traspasar <span style={{ color: "#f5c518" }}>el rol</span></h4>
            <p className="text-xs text-court-muted mt-2">
              Una vez comenzado el draft, el admin ya no puede quitarte el rol.
              Si necesitas dejarlo, puedes pasárselo a uno de tus jugadores.
              El equipo se mantiene (nombre, logo, WhatsApp, plantilla).
            </p>
          </div>
          <NeonSelect label="Nuevo capitán" value={transferTarget}
            onChange={(e) => { setTransferTarget(e.target.value); setTransferStage(0); }}
            disabled={transferring}>
            <option value="">— Elige un jugador de tu plantilla —</option>
            {roster.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </NeonSelect>
          {transferStage === 1 && (
            <p className="text-[11px] text-court-warn">
              Confirma de nuevo: perderás el rol de capitán al instante.
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            <NeonButton type="button" onClick={transfer}
              variant={transferStage === 0 ? "blue" : "danger"} size="sm"
              disabled={!transferTarget || transferring}>
              {transferring
                ? "Traspasando…"
                : transferStage === 0
                  ? "Traspasar"
                  : "Sí, traspasar y dejar el rol"}
            </NeonButton>
            {transferStage === 1 && (
              <NeonButton type="button" variant="ghost" size="sm"
                disabled={transferring} onClick={() => setTransferStage(0)}>
                Cancelar
              </NeonButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
