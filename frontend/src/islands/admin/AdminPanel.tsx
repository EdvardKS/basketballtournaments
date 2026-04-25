import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";
import type { Tournament, TeamWithPlayers, Match, Player, TournamentStatus } from "../../lib/types.js";
import { computeEffectiveStatus, formatDate } from "../../lib/display.js";
import Modal from "./Modal.js";
import InscripcionesTab, { type Registration } from "./InscripcionesTab.js";
import TournamentForm from "../TournamentForm.js";
import DraftBoard from "../DraftBoard.js";
import AdminScoreUpdater from "../AdminScoreUpdater.js";
import AdminScheduleConfirm from "../AdminScheduleConfirm.js";
import AdminPlayerManager from "../AdminPlayerManager.js";

interface Props {
  tournaments: Tournament[];
  initialActiveId: string | null;
  allPlayers: Player[];
}

interface TournamentDetail {
  tournament: Tournament;
  registrations: Registration[];
  teams: TeamWithPlayers[];
}

type TabKey = "inscripciones" | "draft" | "jugadores" | "grupos" | "partidos" | "resultados" | "config";

interface TabDef { key: TabKey; label: string; icon: string }

const tabsForStatus = (s: TournamentStatus): TabDef[] => {
  if (s === "open" || s === "upcoming") return [
    { key: "inscripciones", label: "Inscripciones", icon: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6" },
    { key: "config",        label: "Configuración", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 008.91 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 8.91a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" },
  ];
  if (s === "draft") return [
    { key: "draft",        label: "Draft",         icon: "M3 6h13M3 12h9M3 18h13M17 8l4 4-4 4" },
    { key: "jugadores",    label: "Jugadores",     icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
    { key: "config",       label: "Configuración", icon: "M12 15a3 3 0 100-6 3 3 0 000 6z" },
  ];
  if (s === "setup" || s === "scheduled") return [
    { key: "grupos",       label: "Grupos",        icon: "M4 6h6v6H4zM14 6h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" },
    { key: "partidos",     label: "Partidos",      icon: "M3 10h18M3 14h18M5 6h14M5 18h14" },
    { key: "config",       label: "Configuración", icon: "M12 15a3 3 0 100-6 3 3 0 000 6z" },
  ];
  if (s === "active") return [
    { key: "partidos",     label: "Partidos",      icon: "M3 10h18M3 14h18" },
    { key: "resultados",   label: "Resultados",    icon: "M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { key: "grupos",       label: "Clasificación", icon: "M3 3v18h18M7 14l3-3 4 4 5-5" },
    { key: "config",       label: "Configuración", icon: "M12 15a3 3 0 100-6 3 3 0 000 6z" },
  ];
  // completed
  return [
    { key: "resultados",   label: "Resultados",    icon: "M9 12l2 2 4-4" },
    { key: "grupos",       label: "Clasificación", icon: "M3 3v18h18" },
    { key: "config",       label: "Configuración", icon: "M12 15a3 3 0 100-6 3 3 0 000 6z" },
  ];
};

const STATUS_TONE: Record<TournamentStatus, { color: string; label: string; live: boolean }> = {
  upcoming:  { color: "#0066ff", label: "Próximamente",        live: false },
  open:      { color: "#ff6b00", label: "Inscripciones abiertas", live: true },
  draft:     { color: "#ff2d2d", label: "Draft en curso",      live: true },
  setup:     { color: "#0066ff", label: "Preparando torneo",   live: false },
  scheduled: { color: "#0066ff", label: "Programado",          live: false },
  active:    { color: "#ff2d2d", label: "Día de torneo",       live: true },
  completed: { color: "#a0a7b8", label: "Finalizado",          live: false },
};

export default function AdminPanel({ tournaments: initialTournaments, initialActiveId, allPlayers }: Props) {
  const [tournaments, setTournaments] = useState<Tournament[]>(initialTournaments);
  const [selectedId, setSelectedId] = useState<string | null>(initialActiveId);
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const selected = tournaments.find((t) => t.id === selectedId) ?? null;
  const effective: TournamentStatus = selected ? computeEffectiveStatus(selected) : "open";
  const tabs = useMemo(() => tabsForStatus(effective), [effective]);
  const [activeTab, setActiveTab] = useState<TabKey>(tabs[0]?.key ?? "config");

  // Reset tab when tournament/state changes
  useEffect(() => {
    setActiveTab(tabs[0]?.key ?? "config");
  }, [selectedId, effective]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDetail = useCallback(async () => {
    if (!selectedId) { setDetail(null); setMatches([]); return; }
    setLoadingDetail(true);
    try {
      const d = await api<TournamentDetail>(`/tournaments/${selectedId}`);
      setDetail(d);
    } catch { setDetail(null); }
    try {
      const m = await api<Match[]>(`/matches/tournament/${selectedId}`);
      setMatches(m);
    } catch { setMatches([]); }
    setLoadingDetail(false);
  }, [selectedId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const captainIds = useMemo(() => {
    const s = new Set<string>();
    if (detail) for (const t of detail.teams) if (t.captainId) s.add(t.captainId);
    return s;
  }, [detail]);

  const tone = STATUS_TONE[effective];

  const onTournamentSaved = (t: Tournament) => {
    setTournaments((list) => {
      const idx = list.findIndex((x) => x.id === t.id);
      return idx >= 0 ? list.map((x, i) => i === idx ? t : x) : [t, ...list];
    });
    setSelectedId(t.id);
    setEditOpen(false);
    setCreateOpen(false);
    loadDetail();
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-[var(--color-neon-orange)] font-bold mb-1">Panel de administración</p>
          <h1 className="font-hero text-4xl sm:text-5xl text-white leading-none">CONTROL DE <span className="text-neon-orange">TORNEO</span></h1>
        </div>
        <div className="flex items-center gap-2">
          {tournaments.length > 1 && (
            <select
              className="input-neon py-2 text-sm max-w-[14rem]"
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value || null)}
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <button type="button" onClick={() => setCreateOpen(true)} className="btn-neon-blue !py-2 !px-4 !text-xs">+ Nuevo torneo</button>
        </div>
      </header>

      {/* Summary card — always visible */}
      {selected ? (
        <section
          className="relative overflow-hidden rounded-2xl border p-6"
          style={{
            background: `linear-gradient(135deg, ${tone.color}1A 0%, rgba(20,26,44,0.85) 60%)`,
            borderColor: `${tone.color}40`,
          }}
        >
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: tone.color }} aria-hidden="true" />

          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0 flex-1">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.25em] font-bold text-white border ${tone.live ? "animate-glow" : ""}`}
                style={{ background: `${tone.color}1A`, borderColor: `${tone.color}80`, boxShadow: `0 0 20px ${tone.color}66` }}
              >
                {tone.live && (
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping" style={{ background: tone.color }} />
                    <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: tone.color }} />
                  </span>
                )}
                {tone.label}
              </span>
              <h2 className="font-hero text-3xl sm:text-4xl text-white leading-none mt-3">{selected.name}</h2>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-court-muted">
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  {formatDate(selected.matchDate ?? selected.date)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  {selected.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" /></svg>
                  {detail?.teams.length ?? 0} / {selected.maxTeams} equipos
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" /></svg>
                  {detail?.registrations.length ?? 0} inscritos
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="btn-neon-blue !py-2 !px-5 !text-xs shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Editar torneo
            </button>
          </div>
        </section>
      ) : (
        <section className="glass p-10 text-center">
          <p className="text-5xl mb-3">🏀</p>
          <p className="font-hero text-2xl text-white">No hay torneos creados</p>
          <p className="text-court-muted text-sm mt-2">Crea el primero para empezar a gestionar inscripciones, draft y partidos.</p>
          <button type="button" onClick={() => setCreateOpen(true)} className="btn-neon mt-6">+ Crear torneo</button>
        </section>
      )}

      {/* Tabs */}
      {selected && (
        <>
          <nav className="flex gap-1 overflow-x-auto pb-1 border-b border-white/5" role="tablist">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative inline-flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-[0.18em] font-bold transition-all whitespace-nowrap border-b-2 ${
                    isActive
                      ? "text-white border-[var(--color-neon-orange)]"
                      : "text-court-muted border-transparent hover:text-white"
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={tab.icon} />
                  </svg>
                  {tab.label}
                  {isActive && (
                    <span
                      className="absolute -bottom-[2px] left-0 right-0 h-[2px]"
                      style={{ background: "linear-gradient(90deg, transparent, #ff6b00, transparent)", boxShadow: "0 0 8px rgba(255,107,0,0.7)" }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Tab content */}
          <section role="tabpanel" key={activeTab} className="animate-slide-up">
            {loadingDetail && !detail ? (
              <div className="glass p-10 text-center text-court-muted text-sm">Cargando datos del torneo…</div>
            ) : (
              <TabContent
                key={`${selected.id}-${activeTab}`}
                tab={activeTab}
                tournament={selected}
                detail={detail}
                matches={matches}
                allPlayers={allPlayers}
                captainIds={captainIds}
                onChange={loadDetail}
                onSelfEdit={() => setEditOpen(true)}
              />
            )}
          </section>
        </>
      )}

      {/* Edit modal */}
      <Modal open={editOpen} title="Editar torneo" subtitle={selected?.name} onClose={() => setEditOpen(false)} size="lg">
        {selected && (
          <TournamentForm
            tournament={selected}
            onSaved={onTournamentSaved}
            onCancel={() => setEditOpen(false)}
          />
        )}
      </Modal>

      {/* Create modal */}
      <Modal open={createOpen} title="Nuevo torneo" subtitle="Configura las fechas y el formato" onClose={() => setCreateOpen(false)} size="lg">
        <TournamentForm
          tournament={null}
          onSaved={onTournamentSaved}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>
    </div>
  );
}

function TabContent({
  tab, tournament, detail, matches, allPlayers, captainIds, onChange, onSelfEdit,
}: {
  tab: TabKey;
  tournament: Tournament;
  detail: TournamentDetail | null;
  matches: Match[];
  allPlayers: Player[];
  captainIds: Set<string>;
  onChange: () => void;
  onSelfEdit: () => void;
}) {
  if (tab === "inscripciones") {
    return (
      <InscripcionesTab
        tournamentId={tournament.id}
        registrations={detail?.registrations ?? []}
        captainIds={captainIds}
        onChange={onChange}
      />
    );
  }

  if (tab === "draft") {
    return (
      <div className="glass p-4 sm:p-6">
        <DraftBoard tournamentId={tournament.id} myTeamId={null} teamSize={tournament.teamSize} isAdmin />
      </div>
    );
  }

  if (tab === "jugadores") {
    const regIds = new Set((detail?.registrations ?? []).map((r) => r.player_id));
    const roster = allPlayers
      .filter((p) => regIds.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, mobile: p.mobile, email: p.email, role: p.role }));
    const allShape = allPlayers.map((p) => ({ id: p.id, name: p.name, mobile: p.mobile, email: p.email, role: p.role }));
    return (
      <div className="glass p-4 sm:p-6">
        <AdminPlayerManager tournamentId={tournament.id} players={roster} allPlayers={allShape} teams={[]} />
      </div>
    );
  }

  if (tab === "grupos") {
    if ((detail?.teams.length ?? 0) === 0) {
      return (
        <div className="glass p-10 text-center">
          <p className="text-5xl mb-3">📊</p>
          <p className="text-white font-hero text-2xl">Aún no hay equipos</p>
          <p className="text-court-muted text-sm mt-2">Los grupos se podrán organizar al cerrar el draft.</p>
        </div>
      );
    }
    return (
      <div className="glass p-6">
        <p className="text-court-muted text-sm">
          Los grupos se forman automáticamente al cerrar el draft. Para verlos en directo, abre la
          {" "}<a href={`/tournaments/${tournament.id}`} className="text-[var(--color-neon-orange)] hover:underline">página pública del torneo</a>.
        </p>
      </div>
    );
  }

  if (tab === "partidos") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass p-4 sm:p-6">
          <h3 className="font-hero text-xl text-white mb-4">Horario de partidos</h3>
          <AdminScheduleConfirm tournamentId={tournament.id} matches={matches} />
        </div>
        <div className="glass p-4 sm:p-6">
          <h3 className="font-hero text-xl text-white mb-4">Marcador en vivo</h3>
          <AdminScoreUpdater matches={matches} />
        </div>
      </div>
    );
  }

  if (tab === "resultados") {
    const completed = matches.filter((m) => m.status === "completed");
    if (completed.length === 0) {
      return (
        <div className="glass p-10 text-center">
          <p className="text-5xl mb-3">🏁</p>
          <p className="text-white font-hero text-2xl">Sin resultados todavía</p>
          <p className="text-court-muted text-sm mt-2">Aparecerán aquí cuando vayas finalizando partidos.</p>
        </div>
      );
    }
    return (
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {completed.map((m) => (
          <li key={m.id} className="glass p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-court-muted">{m.stage}</p>
              <p className="text-white font-semibold truncate">{m.homeTeamName ?? "?"} vs {m.awayTeamName ?? "?"}</p>
            </div>
            <p className="font-hero text-2xl text-white tabular-nums shrink-0">
              {m.homeScore}<span className="text-white/30 mx-1">-</span>{m.awayScore}
            </p>
          </li>
        ))}
      </ul>
    );
  }

  // config
  return (
    <div className="glass p-6">
      <p className="text-court-muted text-sm mb-4">
        Edita el nombre, fechas, ubicación, formato y reglas del torneo.
      </p>
      <button type="button" onClick={onSelfEdit} className="btn-neon">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Abrir editor de torneo
      </button>
    </div>
  );
}
