import { useState } from "react";
import { POSITION_LABEL, overallColor } from "../lib/display.js";

export interface AvailablePlayer {
  id: string; name: string; position: string; overall: number; avatar: string | null;
}
interface Props {
  players: AvailablePlayer[];
  canPick: boolean;
  onSelect: (player: AvailablePlayer) => void;
}

const POSITIONS = ["Todos", "base", "escolta", "alero", "ala-pivot", "pivot"];

export default function DraftPlayerList({ players, canPick, onSelect }: Props) {
  const [filter, setFilter] = useState("Todos");
  const filtered = filter === "Todos" ? players : players.filter((p) => p.position === filter);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl text-white">
          Disponibles <span className="text-court-accent">({players.length})</span>
        </h3>
      </div>

      <div className="flex gap-1 flex-wrap">
        {POSITIONS.map((pos) => (
          <button key={pos} onClick={() => setFilter(pos)}
            className={`text-xs px-2 py-0.5 rounded-full transition-colors border ${
              filter === pos
                ? "bg-court-accent border-court-accent text-white"
                : "border-court-border text-court-muted hover:border-court-accent"
            }`}>
            {pos === "Todos" ? pos : (POSITION_LABEL[pos] ?? pos)}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto space-y-2 pr-1" style={{ maxHeight: "480px" }}>
        {filtered.length === 0 && (
          <p className="text-court-muted text-sm text-center py-8">Sin jugadores disponibles</p>
        )}
        {filtered.map((p) => (
          <div key={p.id} className="card flex items-center gap-3 animate-flip-card hover:border-court-accent/40 transition-all">
            {p.avatar ? (
              <img src={p.avatar} className="w-12 h-12 rounded-xl object-cover shrink-0" alt={p.name} />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-court-border flex items-center justify-center text-xl font-display text-court-muted shrink-0">
                {p.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">{p.name}</p>
              <p className="text-xs text-court-muted">{POSITION_LABEL[p.position] ?? p.position}</p>
            </div>
            <span className={`font-display text-2xl font-bold shrink-0 ${overallColor(p.overall)}`}>
              {p.overall}
            </span>
            <button
              className="btn-primary text-xs px-3 py-1.5 shrink-0"
              onClick={() => onSelect(p)}
              disabled={!canPick}
            >
              Fichar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
