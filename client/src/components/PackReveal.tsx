import { useState } from "react";
import { motion } from "framer-motion";
import { Player } from "@/lib/api";
import { PlayerCard } from "@/components/PlayerCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PackRevealProps {
  player: Player;
  teamName?: string;
  onClose: () => void;
}

function getTier(overall: number) {
  if (overall >= 85) return "elite";
  if (overall >= 75) return "pro";
  if (overall >= 65) return "semi";
  return "rookie";
}

function getTierLabel(tier: string) {
  if (tier === "elite") return "Galaxy";
  if (tier === "pro") return "Chrome";
  if (tier === "semi") return "Neon";
  return "Rookie";
}

export function PackReveal({ player, teamName, onClose }: PackRevealProps) {
  const [opened, setOpened] = useState(false);
  const tier = getTier(player.overall);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center space-y-2">
          <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Sobre recibido</p>
          <h2 className="text-3xl font-display">Nuevo jugador</h2>
          {teamName && (
            <p className="text-xs text-muted-foreground">Para {teamName}</p>
          )}
        </div>

        <div className="relative flex flex-col items-center gap-4">
          <motion.button
            type="button"
            onClick={() => setOpened(true)}
            className={cn(
              "pack-shell",
              `pack-tier-${tier}`,
              opened ? "pack-open pointer-events-none" : "cursor-pointer"
            )}
            initial={{ y: 0, rotate: -1 }}
            animate={{ y: opened ? 20 : 0, rotate: opened ? 4 : -1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="pack-foil" />
            <div className="pack-holo" />
            <div className="pack-highlight" />
            <div className="pack-grid" />
            <div className="pack-noise" />
            <div className="pack-seal pack-seal-top" />
            <div className="pack-seal pack-seal-bottom" />

            <div className="pack-content">
              <div className="pack-brand">Draft League</div>
              <div className="pack-title">Hoops Collection</div>
              <div className="pack-subtitle">{getTierLabel(tier)} Edition</div>
              <div className="pack-year">2024-25</div>
              <div className="pack-badge">8 Cards</div>
              <div className="pack-stamp">Collector Series</div>
            </div>

            <span className={cn("pack-open-cta", opened && "opacity-0")}>CLICK PARA ABRIR</span>
          </motion.button>

          <motion.div
            className={cn("pack-burst", `pack-tier-${tier}`)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: opened ? 1 : 0, scale: opened ? 1 : 0.8 }}
            transition={{ duration: 0.5 }}
          />

          <motion.div
            className="pack-reveal-card"
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: opened ? -140 : 40, opacity: opened ? 1 : 0, scale: opened ? 1 : 0.95 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <PlayerCard player={player} size="md" />
          </motion.div>

          {opened && (
            <Button
              onClick={onClose}
              className="font-display bg-primary text-black hover:bg-white"
            >
              CONTINUAR
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
