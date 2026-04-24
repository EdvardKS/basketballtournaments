import { useState } from "react";
import { STATUS_LABEL, STATUS_COLOR, formatDate } from "../lib/display.js";
import TournamentForm from "./TournamentForm.js";
import type { Tournament } from "../lib/types.js";

interface Props { tournaments: Tournament[] }

export default function AdminTournamentList({ tournaments: init }: Props) {
  const [list, setList] = useState<Tournament[]>(init);
  const [editing, setEditing] = useState<Tournament | null | "new">(null);

  const onSaved = (t: Tournament) => {
    setList((l) => {
      const idx = l.findIndex((x) => x.id === t.id);
      return idx >= 0 ? l.map((x, i) => i === idx ? t : x) : [t, ...l];
    });
    setEditing(null);
  };

  if (editing !== null) {
    return (
      <TournamentForm
        tournament={editing === "new" ? null : editing}
        onSaved={onSaved}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-white">Torneos</h2>
        <button className="btn-primary" onClick={() => setEditing("new")}>+ Nuevo torneo</button>
      </div>

      {list.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-court-muted">No hay torneos todavía</p>
        </div>
      )}

      <div className="space-y-3">
        {list.map((t) => (
          <div key={t.id} className="card flex items-center gap-4 hover:border-court-accent/40 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={STATUS_COLOR[t.status]}>{STATUS_LABEL[t.status]}</span>
                <h3 className="font-display text-xl text-white">{t.name}</h3>
              </div>
              <div className="flex gap-3 text-xs text-court-muted flex-wrap">
                <span>📍 {t.location}</span>
                <span>🏀 {formatDate(t.matchDate ?? t.date)}</span>
                <span>👥 Máx {t.maxTeams} equipos</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <a href={`/tournaments/${t.id}`} className="btn-ghost text-xs">Ver →</a>
              <button className="btn-ghost text-xs" onClick={() => setEditing(t)}>Editar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
