import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { POSITION_LABEL } from "../lib/display.js";

interface PickPlayer {
  id: string; name: string; position: string; overall: number; avatar: string | null;
}
interface Props {
  player: PickPlayer | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export default function DraftPickModal({ player, onConfirm, onCancel, loading }: Props) {
  // Portal target — only available in the browser. Server-side render returns null.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Lock body scroll while the modal is open
  useEffect(() => {
    if (!player) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [player, onCancel]);

  if (!player || !mounted) return null;

  // Portal escapes any ancestor with `transform`, `filter` or `backdrop-filter`,
  // which would otherwise become the containing block for `position: fixed`
  // (centering the modal inside the card instead of the viewport).
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="card max-w-sm w-full space-y-4 animate-slide-in border-court-accent"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-2xl text-white">Confirmar selección</h3>

        <div className="flex items-center gap-4 p-3 bg-court-accent/10 rounded-xl border border-court-accent/30">
          {player.avatar ? (
            <img src={player.avatar} className="w-16 h-16 rounded-xl object-cover border border-court-accent/50" alt={player.name} />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-court-border flex items-center justify-center text-3xl font-display text-court-muted">
              {player.name.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-semibold text-white text-lg">{player.name}</p>
            <p className="text-sm text-court-muted">{POSITION_LABEL[player.position] ?? player.position}</p>
            <p className="font-display text-2xl text-court-accent">{player.overall}</p>
          </div>
        </div>

        <p className="text-sm text-court-muted text-center">
          ¿Añadir a <strong className="text-white">{player.name}</strong> a tu equipo?<br />
          Esta acción no se puede deshacer.
        </p>

        <div className="flex gap-3">
          <button className="btn-ghost flex-1 justify-center" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button className="btn-primary flex-1 justify-center" onClick={onConfirm} disabled={loading}>
            {loading ? "Seleccionando…" : "✓ Confirmar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
