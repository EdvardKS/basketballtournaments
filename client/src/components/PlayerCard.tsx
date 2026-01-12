import { useState } from "react";
import { motion } from "framer-motion";
import { Player } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Crown, Star, User, Shield, ShieldCheck } from "lucide-react";

interface PlayerCardProps {
  player: Player;
  className?: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  showSensitive?: boolean;
}

function getOverallColor(overall: number) {
  if (overall >= 85) return "from-yellow-400 via-amber-500 to-yellow-600";
  if (overall >= 75) return "from-purple-400 via-purple-500 to-purple-600";
  if (overall >= 65) return "from-blue-400 via-blue-500 to-blue-600";
  return "from-green-400 via-green-500 to-green-600";
}

function getOverallLabel(overall: number) {
  if (overall >= 85) return "ELITE";
  if (overall >= 75) return "PRO";
  if (overall >= 65) return "SEMI";
  return "AMATEUR";
}

function getStatColor(value: number) {
  if (value >= 90) return "text-yellow-400";
  if (value >= 80) return "text-green-400";
  if (value >= 70) return "text-blue-400";
  if (value >= 60) return "text-white";
  return "text-gray-400";
}

export function PlayerCard({
  player,
  className,
  size = "md",
  onClick,
  showSensitive = false,
}: PlayerCardProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: "w-44 h-72",
    md: "w-56 h-[22rem]",
    lg: "w-72 h-[28rem]",
  };

  const overallGradient = getOverallColor(player.overall);
  const overallLabel = getOverallLabel(player.overall);

  const isCaptain = player.role === "captain";
  const roleLabel = isCaptain ? "CPT" : "JUG";

  const showAvatar = !!player.avatar && !imgError;

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={cn("relative group cursor-pointer", sizeClasses[size], className)}
      onClick={onClick}
      data-testid={`card-player-${player.id}`}
    >
      {/* Marco + Fondo */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black">
        {/* Línea superior tipo carta */}
        <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", overallGradient)} />

        {/* Shine (brillo al hover) */}
        <div className="pointer-events-none absolute -inset-y-8 -left-1/2 w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[220%] transition-all duration-700" />

        {/* Contenido */}
        <div className="relative h-full flex flex-col">
          {/* TOP: Foto cuadrada ocupando todo el top */}
          <div className="relative w-full aspect-square overflow-hidden rounded-t-2xl">
            {showAvatar ? (
              <img
                src={player.avatar}
                alt={player.name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-800">
                <div className="scale-125">
                  <RoleIcon role={player.role} />
                </div>
              </div>
            )}

            {/* Degradado inferior para legibilidad (estilo UT) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

            {/* HUD encima de la foto: Overall + Label */}
            <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-1">
              <div className={cn("text-4xl font-black bg-gradient-to-br bg-clip-text text-transparent drop-shadow-lg", overallGradient)}>
                {player.overall}
              </div>
              <span className={cn("text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r text-black/90 shadow", overallGradient)}>
                {overallLabel}
              </span>
            </div>

            {/* Rol arriba derecha */}
            <div className="absolute top-3 right-3 z-20 flex flex-col items-center gap-1">
              {isCaptain && (
                <div className="bg-amber-500/20 p-1.5 rounded-full border border-amber-500/50 backdrop-blur">
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
              )}
              <div className="text-xs font-bold text-white/70 uppercase tracking-wider">
                {roleLabel}
              </div>
            </div>

            {/* Estrella elite */}
            {player.overall >= 85 && (
              <div className="absolute bottom-3 right-3 z-20">
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
              </div>
            )}

            {/* Nombre dentro del top (como UT) */}
            <div className="absolute bottom-3 left-3 right-3 z-20">
              <h3 className="font-extrabold text-base text-white truncate leading-tight drop-shadow">
                {player.name}
              </h3>
              {showSensitive && player.mobile && (
                <p className="text-xs text-primary/80 font-mono mt-0.5">{player.mobile}</p>
              )}
            </div>
          </div>

          {/* BODY: Stats */}
          <div className="flex-1 flex flex-col p-4">
            <div className="h-px w-3/4 mx-auto bg-gradient-to-r from-transparent via-white/20 to-transparent mb-3" />

            <div className="grid grid-cols-3 gap-2 text-center">
              <StatItem label="RIT" value={player.pace} />
              <StatItem label="TIR" value={player.shooting} />
              <StatItem label="PAS" value={player.passing} />
              <StatItem label="REG" value={player.dribbling} />
              <StatItem label="DEF" value={player.defense} />
              <StatItem label="FIS" value={player.physical} />
            </div>
          </div>
        </div>

        {/* Brillo suave al hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />
      </div>
    </motion.div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className={cn("text-lg font-bold", getStatColor(value))}>
        {value}
      </span>
      <span className="text-[10px] text-white/50 font-medium tracking-wider">
        {label}
      </span>
    </div>
  );
}

function RoleIcon({ role }: { role: string }) {
  if (role === "admin") return <ShieldCheck className="w-16 h-16 text-red-400" />;
  if (role === "captain") return <Shield className="w-16 h-16 text-amber-400" />;
  return <User className="w-16 h-16 text-slate-300" />;
}
