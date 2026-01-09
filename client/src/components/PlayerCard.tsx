import { motion } from "framer-motion";
import { Player } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Crown, Star } from "lucide-react";
import placeholderAvatar from "@assets/generated_images/default_player_silhouette_avatar.png";

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

export function PlayerCard({ player, className, size = "md", onClick, showSensitive = false }: PlayerCardProps) {
  const sizeClasses = {
    sm: "w-44 h-72",
    md: "w-56 h-[22rem]",
    lg: "w-72 h-[28rem]",
  };

  const overallGradient = getOverallColor(player.overall);
  const overallLabel = getOverallLabel(player.overall);

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative group cursor-pointer",
        sizeClasses[size],
        className
      )}
      onClick={onClick}
      data-testid={`card-player-${player.id}`}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black shadow-2xl border border-white/10 overflow-hidden">
        
        <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", overallGradient)} />
        
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />
        
        <div className="relative h-full flex flex-col p-4">
          
          <div className="flex justify-between items-start mb-2">
            <div className="flex flex-col items-center">
              <div className={cn("text-4xl font-black bg-gradient-to-br bg-clip-text text-transparent drop-shadow-lg", overallGradient)}>
                {player.overall}
              </div>
              <span className={cn("text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r", overallGradient)}>
                {overallLabel}
              </span>
            </div>
            
            <div className="flex flex-col items-center gap-1">
              {player.role === 'captain' && (
                <div className="bg-amber-500/20 p-1.5 rounded-full border border-amber-500/50">
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
              )}
              <div className="text-xs font-bold text-white/60 uppercase tracking-wider">
                {player.role === 'captain' ? 'CPT' : 'JUG'}
              </div>
            </div>
          </div>

          <div className="flex-1 relative flex items-center justify-center -mt-2 mb-3">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10" />
            <div className="relative w-28 h-28 rounded-lg overflow-hidden border-2 border-white/20 shadow-xl">
              <img 
                src={player.avatar || placeholderAvatar} 
                alt={player.name}
                className="w-full h-full object-cover"
              />
            </div>
            {player.overall >= 85 && (
              <div className="absolute -top-1 -right-1 z-20">
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
              </div>
            )}
          </div>

          <div className="text-center mb-3 z-20">
            <h3 className="font-bold text-lg text-white truncate px-1 leading-tight">
              {player.name}
            </h3>
            {showSensitive && player.mobile && (
              <p className="text-xs text-primary/80 font-mono mt-0.5">{player.mobile}</p>
            )}
            <div className="h-px w-3/4 mx-auto bg-gradient-to-r from-transparent via-white/30 to-transparent mt-2" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <StatItem label="RIT" value={player.pace} />
            <StatItem label="TIR" value={player.shooting} />
            <StatItem label="PAS" value={player.passing} />
            <StatItem label="REG" value={player.dribbling} />
            <StatItem label="DEF" value={player.defense} />
            <StatItem label="FIS" value={player.physical} />
          </div>
        </div>
        
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
