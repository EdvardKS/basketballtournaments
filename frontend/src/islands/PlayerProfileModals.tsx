import { useState } from "react";
import type { Player } from "../lib/types.js";
import PlayerProfileEditor from "./PlayerProfileEditor.js";
import PlayerStatsRedistributor from "./PlayerStatsRedistributor.js";

interface Props { player: Player }

type Modal = null | "profile" | "stats";

function Fullscreen({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-court-border bg-court-bg">
        <h2 className="font-display text-lg text-white">{title}</h2>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost text-xs">Cancelar</button>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-9 h-9 rounded-full border border-court-border flex items-center justify-center text-white hover:bg-court-border">✕</button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function PlayerProfileModals({ player }: Props) {
  const [open, setOpen] = useState<Modal>(null);
  const close = () => setOpen(null);
  const canEditStats = player.canEditStats;

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setOpen("profile")} className="btn-primary text-xs">Editar perfil</button>
        <button onClick={() => setOpen("stats")} disabled={!canEditStats}
          className="btn-ghost text-xs disabled:opacity-50">
          {canEditStats ? "Editar stats" : "Stats bloqueadas"}
        </button>
      </div>

      {open === "profile" && (
        <Fullscreen title="Editar perfil" onClose={close}>
          <PlayerProfileEditor player={player} />
        </Fullscreen>
      )}
      {open === "stats" && (
        <Fullscreen title="Editar stats" onClose={close}>
          <PlayerStatsRedistributor player={player} />
        </Fullscreen>
      )}
    </>
  );
}
