import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api.js";
import type { Tournament, TournamentPhoto, Match, GroupWithMembers } from "../lib/types.js";
import NeonSelect from "../components/ui/NeonSelect.js";
import NeonInput from "../components/ui/NeonInput.js";
import NeonButton from "../components/ui/NeonButton.js";
import { useRevealStagger } from "../lib/neon.js";

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
  const [dragActive, setDragActive] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!picked) return;
    (async () => {
      try { setMatches(await api<Match[]>(`/matches/tournament/${picked}`)); } catch { setMatches([]); }
      try { setGroups(await api<GroupWithMembers[]>(`/matches/tournament/${picked}/groups`)); } catch { setGroups([]); }
      try { setPhotos(await api<TournamentPhoto[]>(`/tournaments/${picked}/photos`)); } catch { setPhotos([]); }
    })();
  }, [picked]);

  const containerRef = useRevealStagger([picked, groups.length, matches.length, photos.length]);

  const upload = async (files: File[]) => {
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
      setMsg(`${files.length} foto${files.length === 1 ? "" : "s"} subida${files.length === 1 ? "" : "s"}.`);
    } catch (err) {
      setMsg(err instanceof ApiError ? `Error: ${err.code}` : "Error al subir.");
    } finally { setBusy(false); }
  };

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    upload(Array.from(e.target.files ?? []));
    e.target.value = "";
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    upload(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/")));
  };

  const onDelete = async (id: string) => {
    if (!picked || !confirm("¿Eliminar esta foto?")) return;
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
  const isCompleted = current.status === "completed";

  return (
    <div ref={containerRef} className="space-y-6">
      <div data-reveal>
        <NeonSelect label="Edición del torneo" value={picked}
          onChange={(e) => setPicked(e.target.value)}>
          {sorted.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {t.matchDate ?? t.date} · {t.status}
            </option>
          ))}
        </NeonSelect>
      </div>

      <section data-reveal className="card">
        <p className="neon-section-overline">Edición seleccionada</p>
        <h3 className="font-hero text-2xl text-white leading-none">
          {current.name}
          {!isCompleted && (
            <span className="ml-3 inline-block align-middle px-2 py-0.5 rounded-md text-[10px] tracking-[0.3em] font-bold border border-[var(--color-neon-orange)] text-[var(--color-neon-orange)]" title="Aún quedan matches por puntuar">
              PENDIENTE DE CIERRE
            </span>
          )}
        </h3>
        <p className="text-xs text-court-muted mt-1">{current.location} · {current.matchDate ?? current.date}</p>
        {current.description && <p className="text-sm text-white mt-2">{current.description}</p>}
      </section>

      {groups.length > 0 && (
        <section data-reveal>
          <h3 className="font-hero text-xl text-white mb-3">Grupos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groups.map((g) => (
              <div key={g.group.id} data-reveal className="card">
                <p className="font-display text-lg text-white mb-2">Grupo {g.group.name}</p>
                <table className="w-full text-xs">
                  <tbody>
                    {g.members.map((m, i) => (
                      <tr key={m.id} className="border-t border-court-border">
                        <td className="py-1.5">{i + 1}. {m.teamName ?? "—"}</td>
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

      {ko.length > 0 && (
        <section data-reveal>
          <h3 className="font-hero text-xl text-white mb-3">Eliminatorias</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ko.map((m) => (
              <li key={m.id} data-reveal className="card text-xs">
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

      <section data-reveal className="card space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="neon-section-overline">Galería</p>
            <h3 className="font-hero text-xl text-white leading-none">Fotos del <span className="text-neon-orange">torneo</span></h3>
          </div>
          {!isCompleted && (
            <span className="chip bg-court-warn/15 text-court-warn border border-court-warn/30 text-[10px]">
              Disponible al finalizar
            </span>
          )}
        </div>

        {isCompleted && (
          <div className="space-y-3">
            <NeonInput label="Pie de foto (opcional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
            <div
              className={`neon-dropzone ${dragActive ? "is-active" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button" tabIndex={0}
            >
              <svg className="mx-auto w-10 h-10 text-[var(--color-neon-orange)] mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <p className="text-sm text-white">Arrastra fotos aquí o haz clic para seleccionar</p>
              <p className="text-[10px] text-court-muted mt-1">JPG / PNG / WEBP · múltiples a la vez</p>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onFiles} className="hidden" />
            </div>
            {busy && <p className="text-xs text-court-muted">Subiendo…</p>}
            {msg && <p className="text-xs text-court-muted">{msg}</p>}
          </div>
        )}

        {photos.length === 0 ? (
          <p className="text-xs text-court-muted">Sin fotos aún.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {photos.map((ph) => (
              <div key={ph.id} data-reveal className="relative group rounded-lg overflow-hidden border border-court-border">
                <img src={ph.image} alt={ph.caption ?? ""} className="w-full h-32 object-cover" />
                <button onClick={() => onDelete(ph.id)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-[var(--color-neon-red)]/85 text-white text-[10px] rounded px-2 py-0.5 transition-opacity">
                  Eliminar
                </button>
                {ph.caption && (
                  <p className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] px-2 py-1 truncate">{ph.caption}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
