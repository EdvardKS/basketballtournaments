import { motion } from "framer-motion";
import { Player } from "@/lib/store";
import { cn } from "@/lib/utils";
import placeholderAvatar from "@assets/generated_images/default_player_silhouette_avatar.png";

interface PlayerCardProps {
  player: Player;
  className?: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  showSensitive?: boolean;
}

export function PlayerCard({ player, className, size = "md", onClick, showSensitive = false }: PlayerCardProps) {
  const sizeClasses = {
    sm: "w-40 h-64 text-xs",
    md: "w-64 h-96 text-sm",
    lg: "w-80 h-[30rem] text-base",
  };

  const statSize = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  // Modern Dark Sport Style
  const darkCardGradient = "bg-linear-to-br from-slate-900 via-slate-800 to-slate-900";
  const darkCardBorder = "border-primary/50";

  return (
    <motion.div
      whileHover={{ scale: 1.05, rotateY: 5 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative group cursor-pointer perspective-1000",
        sizeClasses[size],
        className
      )}
      onClick={onClick}
    >
      {/* Card Shape */}
      <div className={cn(
        "absolute inset-0 fifa-card-clip shadow-xl backdrop-blur-md border-2",
        darkCardGradient,
        darkCardBorder
      )}>
        {/* Background Texture/Effect */}
        <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
        
        {/* Content Container */}
        <div className="relative h-full flex flex-col p-4 text-foreground">
          
          {/* Header: Rating & Position */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex flex-col items-center">
              <span className={cn("font-display font-bold text-primary", statSize[size])}>
                {player.overall}
              </span>
              <span className="font-display tracking-widest opacity-80 uppercase">
                {player.role === 'captain' ? 'CPT' : 'JUG'}
              </span>
            </div>
             <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center border border-accent/50">
                {/* Nation/Team Flag placeholder */}
                <div className="w-4 h-4 rounded-full bg-accent" />
             </div>
          </div>

          {/* Player Image */}
          <div className="flex-1 relative flex items-center justify-center -mt-4 mb-2 overflow-visible z-10">
             <img 
               src={player.avatar || placeholderAvatar} 
               alt={player.name}
               className="h-full w-auto object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] mask-image-gradient-b"
             />
          </div>

          {/* Player Name */}
          <div className="text-center mb-4 z-20">
            <h3 className="font-display text-xl uppercase tracking-wider text-white truncate px-1">
              {player.name}
            </h3>
            {showSensitive && (
               <p className="text-xs text-primary font-mono">{player.mobile}</p>
            )}
            <div className="h-0.5 w-full bg-linear-to-r from-transparent via-primary to-transparent my-1" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-display text-foreground/90 px-2">
            <div className="flex justify-between items-center">
              <span className="opacity-60">RIT</span>
              <span className="font-bold">{player.stats.pace}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-60">REG</span>
              <span className="font-bold">{player.stats.dribbling}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-60">TIR</span>
              <span className="font-bold">{player.stats.shooting}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-60">DEF</span>
              <span className="font-bold">{player.stats.defense}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-60">PAS</span>
              <span className="font-bold">{player.stats.passing}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-60">FIS</span>
              <span className="font-bold">{player.stats.physical}</span>
            </div>
          </div>
        </div>
        
        {/* Shine Effect */}
        <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none fifa-card-clip" />
      </div>
    </motion.div>
  );
}
