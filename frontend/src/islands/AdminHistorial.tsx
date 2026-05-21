import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api.js";
import type { Tournament, TournamentPhoto, Match, GroupWithMembers } from "../lib/types.js";

const resizeImage = (file: File, maxPx = 1600): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const c = document.createElement("canvas");
      c.width = img.width * s; c.height = img.height * s;
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.src = url;
  });

interface Props { tournaments: Tournament[] }

export default function AdminHistorial({ tournaments }: Props) {
  const sorted = [...tournaments].sort((a, b) =>
    (b.matchDate ?? b.date).localeCompare(a.matchDate ?? a.date));
  const [picked, setPicked] = useState<string>(sorted[0]?.id ?? "");
  const current = sorted.find((t) => t.id === picked) ?? null;

  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [photos, setPhotos] = useState<TournamentPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!picked) return;
    (async () => {
      try { setMatches(await api<Match[]>(`/matches/tournament/${picked}`)); } catch { setMatches([]); }
      try { setGroups(await api<GroupWithMembers[]>(`/matches/tournament/${picked}/groups`)); } catch { setGroups([]); }
      try { setPhotos(await api<TournamentPhoto[]>(`/tournaments/${picked}/photos`)); } catch { setPhotos([]); }
    })();
  }, [picked]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0 || !picked) return;
    setBusy(true); setMsg(null);
    try {
      for (const f of files) {
        const image = await resizeImage(f);
        await api<TournamentPhoto>(`/tournaments/${picked}/photos`, {
          method: "POST", body: JSON.stringify({ image, caption: caption || null }),
        });
      }
      setPhotos(await api<TournamentPhoto[]>(`/tournaments/${picked}/photos`));
      setCaption("");
      setMsg(`${files.length} foto(s) subida(s).`);
    } catch (err) {
      setMsg(err instanceof ApiError ? `Error: ${err.code}` : "Error al subir.");
    } finally { setBusy(false); e.target.value = ""; }
  };

  const onDelete = async (id: string) => {
    if (!picked) return;
    if (!confirm("¿Eliminar esta foto?")) return;
    try {
      await api(`/tournaments/${picked}/photos/${id}`, { method: "DELETE" });
      setPhotos(photos.filter((p) => p.id !== id));
    } catch (err) {
      setMsg(err instanceof ApiError ? `Error: ${err.code}` : "Error al eliminar.");
    }
  };

  if (!current) {
    return <p className="text-court-muted text-sm">Aún no hay torneos creados.</p>;
  }

  const ko = matches.filter((m) => m.stage !== "group");
  const hasGroups = groups.length > 0;
  const hasKO = ko.length > 0;
  const isCompleted = current.status === "completed";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-court-muted">Edición</label>
        <select className="input-neon !py-1.5 !text-sm" value={picked}
          onChange={(e) => setPicked(e.target.value)}>
          {sorted.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {t.matchDate ?? t.date} · {t.status}
            </option>
          ))}
        </select>
      </div>

      <section className="card space-y-2">
        <p className="label-text">{current.name}</p>
        <p className="text-xs text-court-muted">{current.location} · {current.matchDate ?? current.date}</p>
        {current.description && <p className="text-sm text-white">{current.description}</p>}
      </section>

      {hasGroups && (
        <section>
          <h3 className="font-display text-xl text-white mb-2">Grupos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groups.map((g) => (
              <div key={g.group.id} className="card">
                <p className="font-display text-lg text-white mb-2">Grupo {g.group.name}</p>
                <table className="w-full text-xs">
                  <tbody>
                    {g.members.map((m, i) => (
                      <tr key={m.id} className="border-t border-court-border">
                        <td className="py-1">{i + 1}. {m.teamName ?? "—"}</td>
                        <td className="text-right text-court-muted">{m.gamesWon}-{m.gamesLost} · {m.points} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>
      )}

      {hasKO && (
        <section>
          <h3 className="font-display text-xl text-white mb-2">Eliminatorias</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ko.map((m) => (
              <li key={m.id} className="card text-xs">
                <p className="text-court-muted uppercase tracking-widest text-[10px]">{m.stage}</p>
                <p className="text-white">{m.homeTeamName ?? m.homeSeedLabel ?? "?"} vs {m.awayTeamName ?? m.awaySeedLabel ?? "?"}</p>
                {m.homeScore != null && m.awayScore != null && (
                  <p className="font-display text-lg text-white mt-1">{m.homeScore} — {m.awayScore}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <p className="label-text">Galería</p>
          {!isCompleted && (
            <span className="text-[10px] text-court-warn">Aún en curso — fotos disponibles al finalizar</span>
          )}
        </div>

        {isCompleted && (
          <div className="space-y-2">
            <input type="text" placeholder="Pie de foto (opcional)" value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-court-bg border border-court-border rounded px-2 py-1 text-sm" />
            <label className="btn-primary text-xs inline-flex cursor-pointer">
              {busy ? "Subiendo…" : "Subir fotos"}
              <input type="file" accept="image/*" multiple disabled={busy}
                onChange={onUpload} className="hidden" />
            </label>
            {msg && <p className="text-xs text-court-muted">{msg}</p>}
          </div>
        )}

        {photos.length === 0 ? (
          <p className="text-xs text-court-muted">Sin fotos aún.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {photos.map((ph) => (
              <div key={ph.id} className="relative group rounded-lg overflow-hidden border border-court-border">
                <img src={ph.image} alt={ph.caption ?? ""} className="w-full h-32 object-cover" />
                <button onClick={() => onDelete(ph.id)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-court-warn/80 text-white text-[10px] rounded px-2 py-0.5">
                  Eliminar
                </button>
                {ph.caption && (
                  <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate">{ph.caption}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
