import { useState } from "react";
import type { Player } from "../lib/types.js";
import NeonModal from "../components/ui/NeonModal.js";
import NeonButton from "../components/ui/NeonButton.js";
import PlayerProfileEditor from "./PlayerProfileEditor.js";
import PlayerStatsRedistributor from "./PlayerStatsRedistributor.js";

interface Props { player: Player }

type Modal = null | "profile" | "stats";

const IconPencil = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconGear = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008.91 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 8.91a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

export default function PlayerProfileModals({ player }: Props) {
  const [open, setOpen] = useState<Modal>(null);
  const close = () => setOpen(null);
  const canEditStats = player.canEditStats;

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <NeonButton variant="primary" size="sm" onClick={() => setOpen("profile")}>
          <IconPencil /> Editar perfil
        </NeonButton>
        <NeonButton variant={canEditStats ? "blue" : "ghost"} size="sm"
          disabled={!canEditStats}
          onClick={() => setOpen("stats")}>
          <IconGear /> {canEditStats ? "Editar stats" : "Stats bloqueadas"}
        </NeonButton>
      </div>

      <NeonModal open={open === "profile"} title="Editar perfil"
        subtitle="Datos personales y contraseña" onClose={close}>
        <PlayerProfileEditor player={player} onDone={close} />
      </NeonModal>
      <NeonModal open={open === "stats"} title="Editar estadísticas"
        subtitle="Total disponible: 240 puntos · máximo 99 por habilidad" onClose={close}>
        <PlayerStatsRedistributor player={player} onDone={close} />
      </NeonModal>
    </>
  );
}
