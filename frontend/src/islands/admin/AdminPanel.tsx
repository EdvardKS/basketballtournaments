import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../../lib/api.js";
import type { Tournament, TeamWithPlayers, GroupWithMembers, Match, Player } from "../../lib/types.js";
import { formatDate } from "../../lib/display.js";
import { derivePhase, type TournamentPhase } from "../../lib/tournamentPhase.js";
import Modal from "./Modal.js";
import InscripcionesTab, { type Registration } from "./InscripcionesTab.js";
import QuickScoreSheet from "./QuickScoreSheet.js";
import AdminBracketView from "./AdminBracketView.js";
import TournamentForm from "../TournamentForm.js";
import DraftBoard from "../DraftBoard.js";
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

type TabKey = "inscripciones" | "draft" | "jugadores" | "grupos" | "eliminatorias"
  | "partidos" | "horarios" | "resultados" | "preview" | "resumen" | "config";

interface TabDef { key: TabKey; label: string; icon: string }

const ICONS = {
  inscripciones: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6",
  config:        "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 008.91 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 8.91a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  draft:         "M3 6h13M3 12h9M3 18h13M17 8l4 4-4 4",
  jugadores:     "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  partidos:      "M3 10h18M3 14h18M5 6h14M5 18h14",
  horarios:      "M12 8v4l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  resultados:    "M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  grupos:        "M3 3v18h18M7 14l3-3 4 4 5-5",
  eliminatorias: "M6 4v16M18 4v16M6 12h12",
  preview:       "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  resumen:       "M8 21h8M12 17v4M5 4h14v5a7 7 0 01-14 0V4z",
} as const;

const tabsForPhase = (phase: TournamentPhase): TabDef[] => {
  if (phase === "pre") return [
    { key: "inscripciones", label: "Inscripciones", icon: ICONS.inscripciones },
    { key: "config",        label: "Configuración", icon: ICONS.config },
  ];
  if (phase === "draft") return [
    { key: "draft",         label: "Draft",         icon: ICONS.draft },
    { key: "jugadores",     label: "Jugadores",     icon: ICONS.jugadores },
    { key: "config",        label: "Configuración", icon: ICONS.config },
  ];
  if (phase === "preMatchday") return [
    { key: "grupos",        label: "Grupos",        icon: ICONS.grupos },
    { key: "eliminatorias", label: "Eliminatorias", icon: ICONS.eliminatorias },
    { key: "horarios",      label: "Horarios",      icon: ICONS.horarios },
    { key: "preview",       label: "Vista previa",  icon: ICONS.preview },
    { key: "config",        label: "Configuración", icon: ICONS.config },
  ];
  if (phase === "groups") return [
    { key: "grupos",        label: "Clasificación", icon: ICONS.grupos },
    { key: "partidos",      label: "Marcador rápido", icon: ICONS.partidos },
    { key: "eliminatorias", label: "Eliminatorias", icon: ICONS.eliminatorias },
    { key: "resultados",    label: "Resultados",    icon: ICONS.resultados },
    { key: "config",        label: "Configuración", icon: ICONS.config },
  ];
  if (phase === "knockouts") return [
    { key: "eliminatorias", label: "Eliminatorias", icon: ICONS.eliminatorias },
    { key: "partidos",      label: "Marcador rápido", icon: ICONS.partidos },
    { key: "resultados",    label: "Resultados",    icon: ICONS.resultados },
    { key: "grupos",        label: "Clasificación", icon: ICONS.grupos },
    { key: "config",        label: "Configuración", icon: ICONS.config },
  ];
  // completed
  return [
    { key: "resumen",       label: "Resumen",       icon: ICONS.resumen },
    { key: "eliminatorias", label: "Eliminatorias", icon: ICONS.eliminatorias },
    { key: "grupos",        label: "Clasificación", icon: ICONS.grupos },
    { key: "config",        label: "Configuración", icon: ICONS.config },
  ];
};

// Tone for the summary card — derived from the same phase signal so the
// admin sees the same color story as the public page.
const PHASE_TONE: Record<TournamentPhase, { color: string; label: string; live: boolean }> = {
  pre:         { color: "#ff6b00", label: "Pre-torneo",        live: false },
  draft:       { color: "#ff2d2d", label: "Draft en curso",    live: true  },
  preMatchday: { color: "#3aa0ff", label: "Pre-torneo · configuración", live: false },
  groups:      { color: "#ff6b00", label: "Fase de grupos",    live: true  },
  knockouts:   { color: "#ff2d2d", label: "Eliminatorias",     live: true  },
  completed:   { color: "#f5c518", label: "Finalizado",        live: false },
};

export default function AdminPanel({ tournaments: initialTournaments, initialActiveId, allPlayers }: Props) {
  const [tournaments, setTournaments] = useState<Tournament[]>(initialTournaments);
  const [selectedId, setSelectedId] = useState<string | null>(initialActiveId);
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const selected = tournaments.find((t) => t.id === selectedId) ?? null;
  // Derive the visible sub-phase from data — single source of truth for tabs.
  const phase: TournamentPhase = selected ? derivePhase(selected, matches) : "pre";
  const tabs = useMemo(() => tabsForPhase(phase), [phase]);
  const [activeTab, setActiveTab] = useState<TabKey>(tabs[0]?.key ?? "config");
  // Admin can add/edit/promote players up to (and including) match day. After
  // matches begin, registrations freeze.
  const canManageRegistrations = phase === "pre" || phase === "draft";

  // Reset tab when tournament or sub-phase changes (so opening a tournament
  // mid-knockout lands on Eliminatorias, not the previously-selected tab).
  useEffect(() => {
    setActiveTab(tabs[0]?.key ?? "config");
  }, [selectedId, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDetail = useCallback(async () => {
    if (!selectedId) { setDetail(null); setMatches([]); setGroups([]); return; }
    setLoadingDetail(true);
    try {
      const d = await api<TournamentDetail>(`/tournaments/${selectedId}`);
      setDetail(d);
    } catch { setDetail(null); }
    try {
      const m = await api<Match[]>(`/matches/tournament/${selectedId}`);
      setMatches(m);
    } catch { setMatches([]); }
    try {
      const g = await api<GroupWithMembers[]>(`/matches/tournament/${selectedId}/groups`);
      setGroups(g);
    } catch { setGroups([]); }
    setLoadingDetail(false);
  }, [selectedId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const captainIds = useMemo(() => {
    const s = new Set<string>();
    if (detail) for (const t of detail.teams) if (t.captainId) s.add(t.captainId);
    return s;
  }, [detail]);

  const tone = PHASE_TONE[phase];

  const onTournamentSaved = (t: Tournament) => {
    setTournaments((list) => {
      const idx = list.findIndex((x) => x.id === t.id);
      return idx >= 0 ? list.map((x, i) => i === idx ? t : x) : [t, ...list];
    });
    setSelectedId(t.id);
    setCreateOpen(false);
    loadDetail();
  };

  const goToConfigTab = () => setActiveTab("config");

  const onTournamentDeleted = (deletedId: string) => {
    setTournaments((list) => list.filter((t) => t.id !== deletedId));
    setSelectedId((prev) => {
      if (prev !== deletedId) return prev;
      const next = tournaments.find((t) => t.id !== deletedId);
      return next ? next.id : null;
    });
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
          {/* "Nuevo torneo" is only available when no tournament exists yet.
              The backend's ONE_ACTIVE_ONLY rule prevents a second live torneo
              anyway, so the button is hidden once one is selected. */}
          {tournaments.length === 0 && (
            <button type="button" onClick={() => setCreateOpen(true)} className="btn-neon-blue !py-2 !px-4 !text-xs">+ Nuevo torneo</button>
          )}
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
              onClick={goToConfigTab}
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
                phase={phase}
                tournament={selected}
                detail={detail}
                matches={matches}
                groups={groups}
                allPlayers={allPlayers}
                captainIds={captainIds}
                canManageRegistrations={canManageRegistrations}
                onChange={loadDetail}
                onTournamentSaved={onTournamentSaved}
                onTournamentDeleted={onTournamentDeleted}
              />
            )}
          </section>
        </>
      )}

      {/* Create modal — still useful when there is NO tournament yet so the
          empty-state CTA opens it. Once one exists, edits happen inline in
          the Config tab. */}
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
  tab, phase, tournament, detail, matches, groups, allPlayers, captainIds, canManageRegistrations,
  onChange, onTournamentSaved, onTournamentDeleted,
}: {
  tab: TabKey;
  phase: TournamentPhase;
  tournament: Tournament;
  detail: TournamentDetail | null;
  matches: Match[];
  groups: GroupWithMembers[];
  allPlayers: Player[];
  captainIds: Set<string>;
  canManageRegistrations: boolean;
  onChange: () => void;
  onTournamentSaved: (t: Tournament) => void;
  onTournamentDeleted: (id: string) => void;
}) {
  if (tab === "inscripciones") {
    return (
      <InscripcionesTab
        tournamentId={tournament.id}
        registrations={detail?.registrations ?? []}
        captainIds={captainIds}
        teams={detail?.teams ?? []}
        allPlayers={allPlayers}
        canManage={canManageRegistrations}
        onChange={onChange}
      />
    );
  }

  if (tab === "draft") {
    return (
      <div className="glass p-4 sm:p-6">
        <DraftBoard tournamentId={tournament.id} myTeamId={null} isAdmin />
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
    if (groups.length === 0) {
      return (
        <div className="glass p-10 text-center">
          <p className="text-5xl mb-3">📊</p>
          <p className="text-white font-hero text-2xl">Aún no hay grupos</p>
          <p className="text-court-muted text-sm mt-2">Los grupos se generan automáticamente al cerrar el draft.</p>
        </div>
      );
    }
    if (phase === "preMatchday") {
      return (
        <GroupEditor
          tournamentId={tournament.id}
          teams={detail?.teams ?? []}
          groups={groups}
          allPlayers={allPlayers}
          locked={!!tournament.bracketLockedAt}
          onChange={onChange}
        />
      );
    }
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {groups.map((g) => (
          <GroupSummaryCard key={g.group.id} group={g} matches={matches} />
        ))}
      </div>
    );
  }

  if (tab === "eliminatorias") {
    return (
      <AdminBracketEditor
        tournament={tournament}
        matches={matches}
        groups={groups}
        onChange={onChange}
      />
    );
  }

  if (tab === "horarios") {
    return (
      <div className="glass p-4 sm:p-6">
        <h3 className="font-hero text-xl text-white mb-4">Horario de partidos</h3>
        <p className="text-court-muted text-sm mb-4">
          Define la hora de cada partido. Los jugadores la verán publicada en
          la página del torneo en cuanto la guardes.
        </p>
        <AdminScheduleConfirm tournamentId={tournament.id} matches={matches} />
      </div>
    );
  }

  if (tab === "preview") {
    return (
      <PreviewTab tournament={tournament} matches={matches} groups={groups} onChange={onChange} />
    );
  }

  if (tab === "partidos") {
    // Mobile-first quick scoring. Schedule editing pushed to a secondary card on desktop.
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-5">
        <div className="glass p-4 sm:p-6">
          <QuickScoreSheet matches={matches} tournamentId={tournament.id} />
        </div>
        <div className="glass p-4 sm:p-6 self-start">
          <h3 className="font-hero text-xl text-white mb-4">Horario de partidos</h3>
          <AdminScheduleConfirm tournamentId={tournament.id} matches={matches} />
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

  if (tab === "resumen") {
    const finalMatch = matches.find((m) => m.stage === "final") ?? null;
    const thirdMatch = matches.find((m) => m.stage === "third_place") ?? null;
    const champion = finalMatch?.winnerId
      ? detail?.teams.find((t) => t.id === finalMatch.winnerId) ?? null
      : null;
    return (
      <div className="space-y-5">
        <div className="glass p-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.4em] text-court-gold font-bold mb-2">Campeón</p>
          <h3 className="font-hero text-4xl text-white leading-none" style={{ textShadow: "0 0 22px rgba(245,197,24,0.55)" }}>
            {champion?.name ?? "—"}
          </h3>
          {finalMatch && finalMatch.homeScore != null && finalMatch.awayScore != null && (
            <p className="mt-2 text-court-muted text-sm">
              Final: <span className="font-hero text-xl text-white tabular-nums mx-1">{finalMatch.homeScore} — {finalMatch.awayScore}</span>
            </p>
          )}
          {thirdMatch?.status === "completed" && thirdMatch.homeScore != null && thirdMatch.awayScore != null && (
            <p className="text-court-muted text-xs">
              3er puesto: <span className="font-hero text-base text-white tabular-nums mx-1">{thirdMatch.homeScore} — {thirdMatch.awayScore}</span>
            </p>
          )}
        </div>
        <a href={`/tournaments/${tournament.id}`} className="btn-neon-blue inline-flex">
          Ver página pública del torneo →
        </a>
      </div>
    );
  }

  // config: full editor lives inline here — no modal.
  return (
    <div className="space-y-6">
      <div className="glass p-4 sm:p-6">
        <p className="text-court-muted text-sm mb-4">
          Edita nombre, fechas, ubicación, formato y reglas. Los cambios
          se guardan al pulsar “Guardar”.
        </p>
        <TournamentForm
          tournament={tournament}
          onSaved={onTournamentSaved}
          onCancel={onChange}
        />
      </div>
      <DangerZone tournament={tournament} onDeleted={onTournamentDeleted} />
    </div>
  );
}

// --- Danger zone: soft-delete the tournament with double confirmation ------
// Step 1: user clicks "Eliminar torneo" → confirmation modal opens.
// Step 2: user types the exact tournament name AND ticks the box → can submit.
// Backend re-validates both, so a missed click cannot wipe a torneo.
// Registered players remain in the DB; only the tournament row is hidden.
function DangerZone({
  tournament, onDeleted,
}: {
  tournament: Tournament;
  onDeleted: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setTyped("");
    setAcknowledged(false);
    setError(null);
  };

  const canSubmit = typed === tournament.name && acknowledged && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true); setError(null);
    try {
      await api(`/tournaments/${tournament.id}`, {
        method: "DELETE",
        body: JSON.stringify({ confirm: "DELETE", name: tournament.name }),
      });
      onDeleted(tournament.id);
      setOpen(false);
    } catch (e) {
      const msg = e instanceof ApiError
        ? (e.code === "NAME_MISMATCH"
            ? "El nombre introducido no coincide con el del torneo."
            : e.code === "CONFIRMATION_REQUIRED"
            ? "Falta la confirmación exigida por el servidor."
            : e.code)
        : "Error al eliminar el torneo";
      setError(msg);
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="glass p-4 sm:p-6 border border-court-danger/30">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-court-danger font-bold mb-1">
              Zona de peligro
            </p>
            <p className="text-white text-sm">
              Eliminar el torneo lo oculta de la app de forma permanente.
              Los jugadores inscritos <span className="text-white font-semibold">se mantienen</span>;
              sólo desaparece el torneo del listado y de las páginas públicas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-ghost !py-2 !px-4 !text-xs text-court-danger border border-court-danger/40 hover:bg-court-danger/10 shrink-0"
          >
            Eliminar torneo
          </button>
        </div>
      </div>

      <Modal
        open={open}
        title="¿Eliminar este torneo?"
        subtitle="Doble confirmación requerida"
        onClose={close}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-court-muted text-sm">
            Esta acción oculta el torneo <span className="text-white font-semibold">{tournament.name}</span> de
            la app. Los jugadores inscritos seguirán existiendo. Para confirmar,
            escribe exactamente el nombre del torneo y marca la casilla.
          </p>
          <div>
            <label className="label-text">Escribe el nombre del torneo</label>
            <input
              className="input-field"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={tournament.name}
              autoFocus
            />
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="accent-court-danger mt-0.5"
            />
            <span className="text-sm text-court-muted">
              Entiendo que el torneo dejará de aparecer en la app.
            </span>
          </label>
          {error && <p className="text-court-danger text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="btn-ghost flex-1 justify-center"
              onClick={close}
              disabled={busy}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="btn-primary flex-1 justify-center !bg-court-danger hover:!bg-court-danger disabled:opacity-50"
            >
              {busy ? "Eliminando…" : "Eliminar definitivamente"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// --- Admin bracket editor -------------------------------------------------
// Renders the Champions-League style bracket inline in the Eliminatorias tab
// via AdminBracketView (React port of components/KnockoutBracketView.astro).
// Every match card carries MatchEditOverlay so the admin scores + finalises
// in-place without leaving the panel.

// Window in which the admin can still tweak format/size. Opens when the
// draft closes (status='setup') and closes the day BEFORE the match day.
function bracketDecisionWindow(tournament: Tournament): "early" | "open" | "locked" {
  if (!tournament.matchDate) return "open";
  const md = new Date(tournament.matchDate + "T00:00:00Z").getTime();
  const lockAt = md - 24 * 60 * 60 * 1000;
  if (Date.now() >= lockAt) return "locked";
  // We're inside the window once the draft has ended (groups + KO matches
  // generated). The page-level status check below handles the "not yet"
  // case (the AdminBracketEditor is only mounted in the Eliminatorias tab,
  // which is itself only visible from the knockouts phase onwards).
  return "open";
}

// Enumerate every (qualifiersPerGroup, wildcards) plan whose total qualifier
// count lands on a power-of-two bracket size (2, 4, 8, 16). Works for any
// group layout — single group with 2+ teams gets a direct final, dozens of
// uneven groups still produce all the wildcards-fill combos that are
// mathematically achievable. Each option carries a human label and a score
// the recommender uses to pick a sensible default.
interface BracketOption {
  qualifiersPerGroup: number;
  wildcards: number;
  size: number;
  label: string;
  detail: string;
  score: number;     // higher = better fit; recommender picks the top one
}

const stageLabel = (size: number): string => {
  if (size === 2)  return "Final directa";
  if (size === 4)  return "Semifinales";
  if (size === 8)  return "Cuartos";
  if (size === 16) return "Octavos";
  return `Cuadro de ${size}`;
};

const enumerateBracketOptions = (
  groups: GroupWithMembers[],
): BracketOption[] => {
  const G = groups.length;
  if (G === 0) return [];
  const sizes = groups.map((g) => g.members.length);
  const N = sizes.reduce((a, b) => a + b, 0);
  const minPerGroup = Math.min(...sizes);
  const candidateSizes = [2, 4, 8, 16].filter((s) => s <= N);

  const out: BracketOption[] = [];
  const seen = new Set<string>();

  for (const K of candidateSizes) {
    // Iterate every qualifiersPerGroup from 0 to the smallest group size.
    // Each combination is unique because wildcards = K - perGroup * G is
    // determined.
    for (let perGroup = 0; perGroup <= minPerGroup; perGroup++) {
      const wildcards = K - perGroup * G;
      if (wildcards < 0) break;             // perGroup too high for this K
      // Wildcards must come from teams not already qualified in their group.
      const remainingPool = sizes
        .map((tCount) => Math.max(0, tCount - perGroup))
        .reduce((a, b) => a + b, 0);
      if (wildcards > remainingPool) continue;
      // Skip degenerate plan: 0 from group + 0 wildcards = empty bracket.
      if (perGroup === 0 && wildcards === 0) continue;
      // Single-group must use perGroup > 0 (no wildcards exist).
      if (G === 1 && wildcards > 0 && perGroup > 0) continue;

      // Human label.
      let label: string;
      let detail: string;
      if (G === 1) {
        label = `${stageLabel(K)} · top ${perGroup} del ${groups[0].group.name}`;
        detail = `${perGroup} clasificados`;
      } else if (wildcards === 0) {
        label = `${stageLabel(K)} · top ${perGroup} de cada grupo`;
        detail = `${perGroup * G} clasificados`;
      } else if (perGroup === 0) {
        label = `${stageLabel(K)} · ${wildcards} mejores globales`;
        detail = `${wildcards} wildcards`;
      } else {
        label = `${stageLabel(K)} · top ${perGroup} de cada grupo + ${wildcards} mejor${wildcards === 1 ? "" : "es"} wildcard${wildcards === 1 ? "" : "s"}`;
        detail = `${perGroup * G} directos + ${wildcards} wildcards`;
      }

      const key = `${perGroup}|${wildcards}|${K}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Recommendation score: prefer bigger brackets, prefer plans that
      // are "fair" (more direct qualifiers per group, fewer wildcards),
      // penalise plans where we wouldn't fill the bracket with at least one
      // team from every group.
      const evenBonus = wildcards === 0 ? 50 : 0;
      const wildcardPenalty = wildcards * 3;
      const score = K * 10 + perGroup * 5 + evenBonus - wildcardPenalty;

      out.push({ qualifiersPerGroup: perGroup, wildcards, size: K, label, detail, score });
    }
  }

  // Sort: bracket size desc, then perGroup desc, then fewer wildcards.
  out.sort((a, b) =>
    b.size - a.size
    || b.qualifiersPerGroup - a.qualifiersPerGroup
    || a.wildcards - b.wildcards);
  return out;
};

const recommendOption = (opts: BracketOption[]): BracketOption | null => {
  if (opts.length === 0) return null;
  return [...opts].sort((a, b) => b.score - a.score)[0];
};

const optionKey = (o: { qualifiersPerGroup: number; wildcards: number; size: number }) =>
  `${o.qualifiersPerGroup}::${o.wildcards}::${o.size}`;

function BracketConfigPicker({
  tournament, groups, onApplied,
}: {
  tournament: Tournament;
  groups: GroupWithMembers[];
  onApplied: () => void;
}) {
  const options = useMemo(() => enumerateBracketOptions(groups), [groups]);
  const recommended = useMemo(() => recommendOption(options), [options]);

  // Pre-select the current saved plan if it's still feasible; otherwise the
  // recommended one so the picker can never submit an invalid combo.
  const currentKey = tournament.bracketQualifiersPerGroup != null
      && tournament.bracketWildcards != null
      && tournament.bracketSize != null
    ? optionKey({
        qualifiersPerGroup: tournament.bracketQualifiersPerGroup,
        wildcards: tournament.bracketWildcards,
        size: tournament.bracketSize,
      })
    : "";
  const initialKey = options.find((o) => optionKey(o) === currentKey)
    ? currentKey
    : recommended ? optionKey(recommended) : "";

  const [picked, setPicked] = useState<string>(initialKey);
  const [saving, setSaving] = useState<"idle" | "syncing" | "ok" | "err">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { setPicked(initialKey); }, [initialKey]);

  const window = bracketDecisionWindow(tournament);
  const locked = !!tournament.bracketLockedAt;
  const editable = window !== "locked" && !locked;
  const selected = options.find((o) => optionKey(o) === picked) ?? null;

  // Auto-save whenever the picked option changes and differs from what the
  // tournament already has persisted. PATCH + regenerate-bracket happen
  // back-to-back so the bracket re-renders in real time without a button.
  const persistKey = currentKey;
  const persist = useCallback(async (opt: BracketOption) => {
    setSaving("syncing"); setErrorMsg(null);
    try {
      await api(`/tournaments/${tournament.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          bracketQualifiersPerGroup: opt.qualifiersPerGroup,
          bracketWildcards: opt.wildcards,
          bracketSize: opt.size,
          bracketFormat: opt.wildcards > 0 && opt.qualifiersPerGroup > 0
            ? "top1_plus_best2_seconds"
            : "top2_per_group",
        }),
      });
      try {
        await api(`/matches/tournament/${tournament.id}/regenerate-bracket`, { method: "POST" });
      } catch (e) {
        // Soft-fail when there's no group standings yet or KO matches already
        // have scores; the PATCH itself still wrote the plan.
        if (e instanceof Error && !/MATCH_HAS_SCORE|already started/i.test(e.message)) {
          throw e;
        }
      }
      setSaving("ok");
      onApplied();
    } catch (e) {
      setSaving("err");
      setErrorMsg(e instanceof Error ? e.message : "Error al guardar la configuración");
    }
  }, [tournament.id, onApplied]);

  useEffect(() => {
    if (!selected) return;
    if (picked === persistKey) return;
    if (!editable) return;
    const handle = setTimeout(() => { void persist(selected); }, 300);
    return () => clearTimeout(handle);
  }, [picked, persistKey, selected, persist, editable]);

  return (
    <div className="glass p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-court-muted font-bold mb-1">
            Configurar eliminatorias
          </p>
          <p className="text-white text-sm">
            El algoritmo calcula todas las eliminatorias que caben con
            <span className="text-white font-semibold"> {groups.length} grupos</span> y
            <span className="text-white font-semibold"> {groups.reduce((n, g) => n + g.members.length, 0)} equipos</span>.
            {options.length > 0 && <> · <span className="text-court-muted">{options.length} opciones posibles</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {recommended && (
            <button
              type="button"
              onClick={() => setPicked(optionKey(recommended))}
              disabled={!editable}
              title={`Recomendado: ${recommended.label}`}
              className="btn-ghost !py-1.5 !px-3 !text-xs border border-[var(--color-neon-orange)]/40 text-[var(--color-neon-orange)] hover:bg-[var(--color-neon-orange)]/10"
            >
              ★ Usar recomendado
            </button>
          )}
          {window === "locked" && (
            <span className="chip bg-court-warn/15 text-court-warn border border-court-warn/30">
              🔒 cerrado · víspera del torneo
            </span>
          )}
          {locked && (
            <span className="chip" style={{ background: "rgba(245,197,24,0.15)", color: "#f5c518", border: "1px solid rgba(245,197,24,0.4)" }}>
              🔒 configuración fijada · desfíjala en Vista previa
            </span>
          )}
        </div>
      </div>

      {options.length === 0 ? (
        <p className="text-court-danger text-sm">
          La configuración actual de grupos no permite montar eliminatorias
          (mínimo 2 equipos en total). Añade equipos o reasigna grupos.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {options.map((o) => {
            const k = optionKey(o);
            const active = picked === k;
            const isRecommended = recommended && optionKey(recommended) === k;
            return (
              <li key={k}>
                <label
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                    active
                      ? "border-[var(--color-neon-orange)] bg-[var(--color-neon-orange)]/5"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    name="bracket-option"
                    value={k}
                    checked={active}
                    onChange={() => setPicked(k)}
                    disabled={!editable}
                    className="accent-[var(--color-neon-orange)] shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white text-sm font-semibold">{o.label}</p>
                      {isRecommended && (
                        <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded text-[var(--color-neon-orange)] border border-[var(--color-neon-orange)]/40 bg-[var(--color-neon-orange)]/10">
                          ★ Recomendado
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-court-muted">
                      {o.detail} · cuadro de {o.size}
                    </p>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {errorMsg && (
        <p className="text-court-danger text-sm">{errorMsg}</p>
      )}
      <div className="flex items-center justify-end">
        <SaveBadge state={saving} />
      </div>
    </div>
  );
}

function AdminBracketEditor({
  tournament, matches, groups, onChange,
}: {
  tournament: Tournament;
  matches: Match[];
  groups: GroupWithMembers[];
  onChange: () => void;
}) {
  const ko = matches.filter((m) => m.stage !== "group");
  const formatLabel = tournament.bracketFormat === "top1_plus_best2_seconds"
    ? "1º de cada grupo + 2 mejores segundos"
    : "Top 2 de cada grupo";

  return (
    <div className="space-y-6">
      <BracketConfigPicker
        tournament={tournament}
        groups={groups}
        onApplied={onChange}
      />

      {ko.length === 0 ? (
        <div className="glass p-10 text-center">
          <p className="text-5xl mb-3">🥊</p>
          <p className="text-white font-hero text-2xl">Bracket no generado todavía</p>
          <p className="text-court-muted text-sm mt-2">
            Se crea automáticamente al cerrar el último partido de la fase de grupos
            con el formato + tamaño elegidos arriba.
          </p>
        </div>
      ) : (
        <>
          <header className="glass p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-court-muted font-bold mb-1">Eliminatorias</p>
              <p className="text-white text-sm">
                {ko.length} partidos · formato: <span className="text-white font-semibold">{formatLabel}</span>
                {tournament.bracketSize
                  ? <> · cuadro fijado a <span className="text-white font-semibold">{tournament.bracketSize}</span></>
                  : <> · cuadro auto</>}
              </p>
              <p className="text-[11px] text-court-muted mt-1">
                Pulsa el icono ✎ de cada partido para meter el marcador. El ganador propaga al siguiente cruce.
              </p>
            </div>
          </header>

          <div className="glass p-2 sm:p-4">
            <AdminBracketView matches={ko} isAdmin />
          </div>

          <div className="glass p-4 sm:p-6">
            <h3 className="font-hero text-xl text-white mb-3">Marcador rápido (eliminatorias)</h3>
            <QuickScoreSheet matches={ko} tournamentId={tournament.id} />
          </div>
        </>
      )}
    </div>
  );
}

// --- Lightweight inline summaries used only in the admin tabs --------------

function GroupSummaryCard({ group: g, matches }: { group: GroupWithMembers; matches: Match[] }) {
  const groupMatches = matches.filter((m) => m.stage === "group" && m.groupId === g.group.id);
  const played = groupMatches.filter((m) => m.status === "completed").length;
  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-hero text-2xl text-white leading-none">Grupo {g.group.name}</h4>
        <span className="text-xs text-court-muted tabular-nums">{played}/{groupMatches.length} partidos</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-court-muted text-[10px] uppercase tracking-wider border-b border-white/10">
              <th className="pb-2 pr-2">#</th>
              <th className="pb-2 pr-2">Equipo</th>
              <th className="pb-2 pr-2 text-center">PJ</th>
              <th className="pb-2 pr-2 text-center">G</th>
              <th className="pb-2 pr-2 text-center">P</th>
              <th className="pb-2 pr-2 text-center" title="Puntos a favor">PF</th>
              <th className="pb-2 pr-2 text-center" title="Puntos en contra">PC</th>
              <th className="pb-2 pr-2 text-center" title="Diferencia">DIF</th>
              <th className="pb-2 text-center font-bold text-white">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {g.members.map((m, i) => {
              const diff = m.pointsFor - m.pointsAgainst;
              return (
              <tr key={m.id} className={i === 0 && m.gamesPlayed > 0 ? "bg-court-gold/5" : ""}>
                <td className="py-1.5 pr-2 font-hero text-base tabular-nums text-white/70">{i + 1}</td>
                <td className="py-1.5 pr-2 text-white truncate">{m.teamName ?? "—"}</td>
                <td className="py-1.5 pr-2 text-center text-court-muted tabular-nums">{m.gamesPlayed}</td>
                <td className="py-1.5 pr-2 text-center text-court-ok tabular-nums">{m.gamesWon}</td>
                <td className="py-1.5 pr-2 text-center text-court-danger tabular-nums">{m.gamesLost}</td>
                <td className="py-1.5 pr-2 text-center text-court-muted tabular-nums">{m.pointsFor}</td>
                <td className="py-1.5 pr-2 text-center text-court-muted tabular-nums">{m.pointsAgainst}</td>
                <td className={`py-1.5 pr-2 text-center tabular-nums font-semibold ${
                  diff > 0 ? "text-court-ok" : diff < 0 ? "text-court-danger" : "text-court-muted"
                }`}>{diff > 0 ? "+" : ""}{diff}</td>
                <td className="py-1.5 text-center font-hero text-lg text-[var(--color-neon-orange)] tabular-nums">{m.points}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Group editor (pre-matchday only) -------------------------------------
// Lets the admin redraw the group split while no match has been touched yet.
// Teams are drag-and-drop between group cards; layout changes auto-save via
// PUT /matches/tournament/:id/groups (full wipe + rebuild). Cosmetic changes
// (name / color / logo) save via PATCH so fixtures aren't rebuilt every keystroke.

const GROUP_PALETTE = [
  "#3aa0ff", "#ff6b00", "#3ecf8e", "#f5c518",
  "#ff2d2d", "#9b5de5", "#00bbf9", "#fb5607",
];

const groupTone = (g: { color?: string | null }, idx: number): string =>
  g.color || GROUP_PALETTE[idx % GROUP_PALETTE.length];

interface EditableGroup {
  id: string | null;   // null while not yet persisted
  name: string;
  color: string;
  teamIds: string[];
}

const seedInitialGroups = (
  groups: GroupWithMembers[], teams: TeamWithPlayers[],
): EditableGroup[] => {
  if (groups.length === 0) {
    return [{
      id: null, name: "Grupo A", color: GROUP_PALETTE[0],
      teamIds: teams.map((t) => t.id),
    }];
  }
  return groups.map((g, idx) => ({
    id: g.group.id,
    name: g.group.name,
    color: g.group.color || GROUP_PALETTE[idx % GROUP_PALETTE.length],
    teamIds: g.members.map((m) => m.teamId),
  }));
};

// Deterministic accent color per team — keeps the card identifiable even
// when the team has no custom logo. We hash the id so the color is stable
// across reloads and never drifts as teams are added or removed.
const TEAM_PALETTE = [
  "#3aa0ff", "#ff6b00", "#3ecf8e", "#f5c518",
  "#ff2d2d", "#9b5de5", "#00bbf9", "#fb5607",
  "#ff3a8c", "#06d6a0", "#118ab2", "#ef476f",
];
const teamAccent = (teamId: string): string => {
  let h = 0;
  for (let i = 0; i < teamId.length; i++) h = (h * 31 + teamId.charCodeAt(i)) >>> 0;
  return TEAM_PALETTE[h % TEAM_PALETTE.length];
};

function GroupEditor({
  tournamentId, teams, groups, allPlayers, locked, onChange,
}: {
  tournamentId: string;
  teams: TeamWithPlayers[];
  groups: GroupWithMembers[];
  allPlayers: Player[];
  locked: boolean;
  onChange: () => void;
}) {
  const playerById = useMemo(() =>
    new Map(allPlayers.map((p) => [p.id, p])), [allPlayers]);
  const [editGroups, setEditGroups] = useState<EditableGroup[]>(
    () => seedInitialGroups(groups, teams));
  const [saving, setSaving] = useState<"idle" | "syncing" | "ok" | "err">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const teamById = useMemo(() =>
    new Map(teams.map((t) => [t.id, t])), [teams]);

  // Re-seed if parent props change (e.g. after a successful PUT reload).
  // We compare by signature so user typing into a name input doesn't get
  // clobbered when matches reload mid-edit.
  const propsSignature = useMemo(
    () => groups.map((g) =>
      `${g.group.id}:${g.group.name}:${g.group.color ?? ""}:${g.group.logo ?? ""}:${g.members.map((m) => m.teamId).join(",")}`,
    ).join("|"),
    [groups]);
  const [lastSeenSig, setLastSeenSig] = useState(propsSignature);
  useEffect(() => {
    if (propsSignature !== lastSeenSig) {
      setEditGroups(seedInitialGroups(groups, teams));
      setLastSeenSig(propsSignature);
    }
  }, [propsSignature, groups, teams, lastSeenSig]);

  // Persist team-layout changes (drag & drop, add/remove group). Backend
  // wipes + rebuilds fixtures every call, so we debounce to coalesce a
  // burst of drag moves.
  const persistLayout = useCallback(async (snapshot: EditableGroup[]) => {
    setSaving("syncing"); setErrorMsg(null);
    try {
      const payload = snapshot.map((g) => ({
        name: g.name,
        teamIds: g.teamIds,
        color: g.color || null,
      }));
      await api(`/matches/tournament/${tournamentId}/groups`, {
        method: "PUT", body: JSON.stringify({ groups: payload }),
      });
      setSaving("ok");
      onChange();
    } catch (e) {
      setSaving("err");
      setErrorMsg(e instanceof ApiError ? e.code : "Error al guardar los grupos");
    }
  }, [tournamentId, onChange]);

  const persistMeta = useCallback(async (
    groupId: string, patch: { name?: string; color?: string },
  ) => {
    setSaving("syncing"); setErrorMsg(null);
    try {
      await api(`/matches/tournament/${tournamentId}/groups/${groupId}`, {
        method: "PATCH", body: JSON.stringify(patch),
      });
      setSaving("ok");
    } catch (e) {
      setSaving("err");
      setErrorMsg(e instanceof ApiError ? e.code : "Error al guardar el grupo");
    }
  }, [tournamentId]);

  // Drag & drop handlers. dataTransfer carries the team id.
  const onDragStart = (e: React.DragEvent, teamId: string) => {
    if (locked) { e.preventDefault(); return; }
    e.dataTransfer.setData("text/plain", teamId);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: React.DragEvent, gi: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOver !== gi) setDragOver(gi);
  };
  const onDragLeave = () => setDragOver(null);
  const onDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    setDragOver(null);
    if (locked) return;
    const teamId = e.dataTransfer.getData("text/plain");
    if (!teamId) return;
    setEditGroups((prev) => {
      const next = prev.map((g) => ({ ...g, teamIds: g.teamIds.filter((id) => id !== teamId) }));
      // Bail if the team was already in target group (no-op move).
      if (prev[targetIdx]?.teamIds.includes(teamId)) return prev;
      next[targetIdx] = { ...next[targetIdx], teamIds: [...next[targetIdx].teamIds, teamId] };
      // Fire-and-forget persist after state commit.
      void persistLayout(next);
      return next;
    });
  };

  const addGroup = () => {
    setEditGroups((prev) => {
      const idx = prev.length;
      const letter = String.fromCharCode("A".charCodeAt(0) + idx);
      const next = [...prev, {
        id: null, name: `Grupo ${letter}`,
        color: GROUP_PALETTE[idx % GROUP_PALETTE.length],
        teamIds: [],
      }];
      // We need at least one team in every group, so don't persist until
      // a team is dropped in.
      return next;
    });
  };

  const removeGroup = (idx: number) => {
    if (editGroups.length <= 1) return;
    if (!confirm(`¿Quitar "${editGroups[idx].name}"? Los equipos volverán al grupo anterior.`)) return;
    setEditGroups((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // Reassign orphan teams to the closest neighbour group.
      const orphans = prev[idx]?.teamIds ?? [];
      const target = Math.max(0, idx - 1);
      if (next[target]) {
        next[target] = { ...next[target], teamIds: [...next[target].teamIds, ...orphans] };
      }
      void persistLayout(next);
      return next;
    });
  };

  const setLocalField = (idx: number, patch: Partial<EditableGroup>) =>
    setEditGroups((prev) => prev.map((g, i) => i === idx ? { ...g, ...patch } : g));

  // Track in-flight name/color timers per group to debounce typing.
  const debounceRef = useMemo(
    () => ({ current: new Map<string, ReturnType<typeof setTimeout>>() }),
    [],
  );
  const scheduleMeta = (groupId: string | null, patch: { name?: string; color?: string }) => {
    if (!groupId) return;
    const prev = debounceRef.current.get(groupId);
    if (prev) clearTimeout(prev);
    const handle = setTimeout(() => {
      void persistMeta(groupId, patch);
      debounceRef.current.delete(groupId);
    }, 600);
    debounceRef.current.set(groupId, handle);
  };

  const totalAssigned = editGroups.reduce((n, g) => n + g.teamIds.length, 0);
  const unassigned = teams.filter((t) => !editGroups.some((g) => g.teamIds.includes(t.id)));

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-white/10 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3"
              style={{ background: "linear-gradient(135deg, rgba(58,160,255,0.10) 0%, rgba(20,26,44,0.85) 60%)" }}>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#3aa0ff] font-bold mb-1">
            Configuración de grupos
          </p>
          <h3 className="font-hero text-2xl text-white leading-none">Arrastra equipos entre grupos</h3>
          <p className="text-court-muted text-xs mt-1.5">
            Pincha y arrastra cualquier equipo al grupo destino. Los cambios se guardan solos.
            {" "}<span className="text-white/70">{totalAssigned}/{teams.length} equipos asignados</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SaveBadge state={saving} />
          <button type="button" onClick={addGroup} disabled={locked} className="btn-ghost !py-1.5 !px-3 !text-xs disabled:opacity-40">
            + Añadir grupo
          </button>
        </div>
      </header>

      {locked && (
        <div className="rounded-lg border px-3 py-2 text-sm flex items-center gap-2"
             style={{ background: "rgba(245,197,24,0.08)", borderColor: "rgba(245,197,24,0.45)", color: "#f5c518" }}>
          🔒 Configuración fijada · desfíjala desde la pestaña Vista previa para volver a editar grupos.
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg border border-court-danger/40 bg-court-danger/10 px-3 py-2 text-court-danger text-sm">
          {errorMsg}
        </div>
      )}

      {unassigned.length > 0 && (
        <div className="rounded-2xl border border-white/10 p-4 space-y-2"
             style={{ background: "rgba(255,107,0,0.08)", borderColor: "rgba(255,107,0,0.35)" }}>
          <p className="text-[11px] uppercase tracking-widest text-[var(--color-neon-orange)] font-bold">
            Equipos sin asignar · arrástralos a un grupo
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((t) => (
              <TeamChip key={t.id} team={t} onDragStart={onDragStart} ghost />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {editGroups.map((g, gi) => {
          const isOver = dragOver === gi;
          const teamCount = g.teamIds.length;
          const matchCount = teamCount < 2 ? 0 : (teamCount * (teamCount - 1)) / 2;
          return (
            <div
              key={g.id ?? `tmp-${gi}`}
              onDragOver={(e) => onDragOver(e, gi)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, gi)}
              className="relative rounded-2xl border overflow-hidden transition-all"
              style={{
                background: `linear-gradient(180deg, ${g.color}1A 0%, rgba(12,17,32,0.95) 60%)`,
                borderColor: isOver ? g.color : "rgba(255,255,255,0.08)",
                boxShadow: isOver ? `0 0 0 2px ${g.color}, 0 0 24px ${g.color}55` : undefined,
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: g.color }} aria-hidden="true" />
              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
                    style={{ background: g.color }}
                  >
                    <span className="font-hero text-xl text-white">{g.name.charAt(g.name.length - 1).toUpperCase()}</span>
                  </div>
                  <input
                    className="bg-transparent text-white font-hero text-xl flex-1 min-w-0 outline-none focus:bg-white/5 rounded px-2 py-1 disabled:opacity-70"
                    value={g.name}
                    disabled={locked}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLocalField(gi, { name: v });
                      scheduleMeta(g.id, { name: v });
                    }}
                  />
                  {editGroups.length > 1 && !locked && (
                    <button
                      type="button"
                      onClick={() => removeGroup(gi)}
                      title="Quitar grupo"
                      className="text-court-danger text-xs px-2 py-1 rounded hover:bg-court-danger/10"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="color"
                      value={g.color}
                      disabled={locked}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLocalField(gi, { color: v });
                        scheduleMeta(g.id, { color: v });
                      }}
                      className="w-6 h-6 rounded cursor-pointer border border-white/10 bg-transparent disabled:opacity-50"
                    />
                    <span className="text-court-muted">Color del grupo</span>
                  </label>
                </div>

                <p className="text-[11px] text-court-muted">
                  {teamCount} equipos · {matchCount} partidos round-robin
                </p>

                <ul className="space-y-1.5 min-h-[3.5rem]">
                  {teamCount === 0 && (
                    <li className="text-xs text-court-muted italic border border-dashed border-white/10 rounded-lg px-3 py-3 text-center">
                      Suelta aquí un equipo
                    </li>
                  )}
                  {g.teamIds.map((tid) => {
                    const t = teamById.get(tid);
                    if (!t) return null;
                    const accent = teamAccent(t.id);
                    const captain = t.captainId ? playerById.get(t.captainId) : null;
                    const roster = t.players?.length ?? 0;
                    return (
                      <li
                        key={tid}
                        draggable
                        onDragStart={(e) => onDragStart(e, tid)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-move hover:bg-white/10 transition-colors"
                        style={{ background: "rgba(255,255,255,0.04)", borderLeft: `3px solid ${accent}` }}
                      >
                        <span className="text-white/30 text-xs">⋮⋮</span>
                        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/10 flex items-center justify-center"
                             style={{ background: t.logo ? "transparent" : accent }}>
                          {t.logo
                            ? <img src={t.logo} alt="" className="w-full h-full object-cover" />
                            : <span className="font-hero text-sm text-white">{t.name.charAt(0).toUpperCase()}</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white truncate font-semibold">{t.name}</p>
                          <p className="text-[10px] text-court-muted truncate">
                            {captain ? <>👑 {captain.name}</> : "sin capitán"}
                            <span className="mx-1">·</span>
                            {roster} jugador{roster === 1 ? "" : "es"}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamChip({
  team, onDragStart, ghost,
}: {
  team: TeamWithPlayers;
  onDragStart: (e: React.DragEvent, teamId: string) => void;
  ghost?: boolean;
}) {
  const accent = teamAccent(team.id);
  const roster = team.players?.length ?? 0;
  return (
    <span
      draggable
      onDragStart={(e) => onDragStart(e, team.id)}
      className={`inline-flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-move text-xs ${
        ghost ? "border border-dashed" : "border"
      } border-white/15 bg-white/5 text-white hover:bg-white/10`}
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <span className="text-white/30">⋮⋮</span>
      <span className="w-5 h-5 rounded overflow-hidden flex items-center justify-center"
            style={{ background: team.logo ? "transparent" : accent }}>
        {team.logo
          ? <img src={team.logo} alt="" className="w-full h-full object-cover" />
          : <span className="font-hero text-[10px] text-white">{team.name.charAt(0).toUpperCase()}</span>}
      </span>
      <span className="truncate max-w-[10rem]">{team.name}</span>
      <span className="text-court-muted">· {roster} jug.</span>
    </span>
  );
}

function SaveBadge({ state }: { state: "idle" | "syncing" | "ok" | "err" }) {
  if (state === "idle") return null;
  const map = {
    syncing: { dot: "#3aa0ff", text: "Guardando…" },
    ok:      { dot: "#3ecf8e", text: "Guardado" },
    err:     { dot: "#ff2d2d", text: "Error" },
  } as const;
  const m = map[state];
  return (
    <span className="inline-flex items-center gap-2 text-[11px] text-court-muted">
      <span className="relative inline-flex w-2 h-2">
        {state === "syncing" && (
          <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: m.dot }} />
        )}
        <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: m.dot }} />
      </span>
      {m.text}
    </span>
  );
}

// --- Preview tab (pre-matchday) -------------------------------------------
// Read-only side-by-side: groups (no standings yet, just team list) + the
// bracket layout the backend has already scaffolded for the chosen format.

function PreviewTab({
  tournament, matches, groups, onChange,
}: {
  tournament: Tournament;
  matches: Match[];
  groups: GroupWithMembers[];
  onChange: () => void;
}) {
  const ko = matches.filter((m) => m.stage !== "group");
  const groupMatches = matches.filter((m) => m.stage === "group");
  const formatLabel = tournament.bracketFormat === "top1_plus_best2_seconds"
    ? "1º de cada grupo + 2 mejores 2dos"
    : "Top 2 de cada grupo";
  const locked = !!tournament.bracketLockedAt;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleLock = async () => {
    if (locked) {
      const ok = confirm("¿Desfijar la configuración? Volverás a poder editar grupos y eliminatorias.");
      if (!ok) return;
    }
    setBusy(true); setErr(null);
    try {
      await api(`/tournaments/${tournament.id}/${locked ? "unlock" : "lock"}-bracket`, {
        method: "POST",
      });
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo actualizar el estado");
    } finally { setBusy(false); }
  };

  return (
    <div className="relative space-y-6 pb-32">
      {/* Hero header */}
      <header
        className="relative overflow-hidden rounded-2xl border border-white/10 p-5 sm:p-6"
        style={{ background: locked
          ? "linear-gradient(135deg, rgba(245,197,24,0.12) 0%, rgba(20,26,44,0.92) 60%)"
          : "linear-gradient(135deg, rgba(58,160,255,0.10) 0%, rgba(20,26,44,0.92) 60%)" }}
      >
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-25 blur-3xl pointer-events-none" style={{ background: "#3aa0ff" }} aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#3aa0ff] font-bold mb-1">
              Vista previa · tal y como lo verán
            </p>
            <h3 className="font-hero text-3xl text-white leading-none">
              {tournament.name}
            </h3>
            <p className="text-court-muted text-xs mt-2">
              {groups.length} grupos · {groupMatches.length} partidos de fase · {ko.length} eliminatorias ·
              formato <span className="text-white">{formatLabel}</span>
              {tournament.bracketSize ? <> · cuadro de <span className="text-white">{tournament.bracketSize}</span></> : null}
            </p>
          </div>
        </div>
      </header>

      {/* Groups */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-hero text-2xl text-white">Fase de grupos</h3>
          <span className="text-[10px] uppercase tracking-widest text-court-muted">
            {groups.length} grupos
          </span>
        </div>
        {groups.length === 0 ? (
          <p className="text-sm text-court-muted glass p-4">
            Configura los grupos en la pestaña Grupos para verlos aquí.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groups.map((g, idx) => {
              const color = groupTone(g.group, idx);
              return (
                <article
                  key={g.group.id}
                  className="relative overflow-hidden rounded-2xl border border-white/10"
                  style={{ background: `linear-gradient(180deg, ${color}1A 0%, rgba(12,17,32,0.95) 70%)` }}
                >
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: color }} aria-hidden="true" />
                  <header className="flex items-center gap-3 px-4 pt-4">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0 flex items-center justify-center"
                         style={{ background: color }}>
                      {g.group.logo
                        ? <img src={g.group.logo} alt="" className="w-full h-full object-cover" />
                        : <span className="font-hero text-lg text-white">{g.group.name.slice(-1).toUpperCase()}</span>}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-hero text-lg text-white truncate">{g.group.name}</h4>
                      <p className="text-[10px] uppercase tracking-widest text-court-muted">
                        {g.members.length} equipos
                      </p>
                    </div>
                  </header>
                  <ol className="px-2 pb-3 pt-2 space-y-0.5">
                    {g.members.map((m, i) => (
                      <li key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded">
                        <span className="w-5 text-center font-hero text-sm tabular-nums"
                              style={{ color: i < 2 ? color : "rgba(255,255,255,0.4)" }}>{i + 1}</span>
                        {m.teamLogo
                          ? <img src={m.teamLogo} alt="" className="w-5 h-5 rounded object-cover border border-white/10" />
                          : <span className="w-5 h-5 rounded text-[10px] font-hero text-white/80 flex items-center justify-center bg-white/5">
                              {(m.teamName ?? "?").charAt(0).toUpperCase()}
                            </span>}
                        <span className="text-sm text-white truncate flex-1">{m.teamName ?? "—"}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Knockouts */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-hero text-2xl text-white">Eliminatorias</h3>
          <span className="text-[10px] uppercase tracking-widest text-court-muted">
            {ko.length} partidos
          </span>
        </div>
        {ko.length === 0 ? (
          <p className="text-sm text-court-muted glass p-4">
            Configura el formato en la pestaña Eliminatorias para ver el cuadro aquí.
          </p>
        ) : (
          <div className="glass p-2 sm:p-4 overflow-x-auto">
            <AdminBracketView matches={ko} isAdmin={false} previewMode />
          </div>
        )}
      </section>

      {/* Schedule strip */}
      {groupMatches.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="font-hero text-2xl text-white">Calendario</h3>
            <span className="text-[10px] uppercase tracking-widest text-court-muted">
              {groupMatches.filter((m) => m.scheduledAt).length}/{groupMatches.length} con hora
            </span>
          </div>
          <ul className="glass p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            {groupMatches.slice(0, 8).map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm gap-2">
                <span className="text-white truncate">
                  {m.homeTeamName ?? "?"} <span className="text-white/30">vs</span> {m.awayTeamName ?? "?"}
                </span>
                <span className="text-court-muted text-xs tabular-nums shrink-0">
                  {m.scheduledAt
                    ? new Date(m.scheduledAt).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                    : "sin hora"}
                </span>
              </li>
            ))}
            {groupMatches.length > 8 && (
              <li className="text-[11px] text-court-muted italic md:col-span-2">
                +{groupMatches.length - 8} partidos más (configura horarios en la pestaña Horarios).
              </li>
            )}
          </ul>
        </section>
      )}

      {/* Floating "Fijar" button — absolute, bottom centered, neon glow +
          particles. Becomes "Desfijar" once the bracket is locked. */}
      <div className="sticky bottom-6 z-30 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <FijarButton
            locked={locked}
            busy={busy}
            error={err}
            onClick={toggleLock}
          />
        </div>
      </div>
    </div>
  );
}

// Hold-to-confirm button inspired by https://motion.dev/examples/react-hold-to-confirm
// The admin must press AND HOLD for HOLD_MS to trigger the action. Releasing
// before the timer completes rewinds the progress ring back to 0. Once
// completed, the button morphs into a "Configuración fijada" state and the
// hold gesture is no longer needed to unlock (a normal click + confirm dialog
// is enough so the admin cannot accidentally desfijar by tapping).
const HOLD_MS = 1400;

function FijarButton({
  locked, busy, error, onClick,
}: {
  locked: boolean;
  busy: boolean;
  error: string | null;
  onClick: () => void;
}) {
  const goldA = "#f5c518";
  const goldB = "#ff8a1a";
  const lockedA = "#3ecf8e";
  const lockedB = "#118ab2";
  const A = locked ? lockedA : goldA;
  const B = locked ? lockedB : goldB;

  const [progress, setProgress] = useState(0); // 0..1
  const [holding, setHolding] = useState(false);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const cancelRef = useRef(false);

  const stopRaf = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const tick = (now: number) => {
    if (cancelRef.current) return;
    if (startRef.current == null) startRef.current = now;
    const elapsed = now - startRef.current;
    const p = Math.min(1, elapsed / HOLD_MS);
    setProgress(p);
    if (p >= 1) {
      stopRaf();
      setHolding(false);
      onClick();
      // Fade the ring back after the action fires.
      setTimeout(() => setProgress(0), 420);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const beginHold = () => {
    if (busy) return;
    if (locked) { onClick(); return; }
    cancelRef.current = false;
    startRef.current = null;
    setHolding(true);
    rafRef.current = requestAnimationFrame(tick);
  };

  const endHold = () => {
    if (!holding) return;
    cancelRef.current = true;
    stopRaf();
    setHolding(false);
    // Rewind the ring smoothly.
    const startedAt = performance.now();
    const startProgress = progress;
    const rewind = (now: number) => {
      const t = Math.min(1, (now - startedAt) / 260);
      const next = startProgress * (1 - t);
      setProgress(next);
      if (t < 1) rafRef.current = requestAnimationFrame(rewind);
      else { rafRef.current = null; setProgress(0); }
    };
    rafRef.current = requestAnimationFrame(rewind);
  };

  // Cancel any in-flight raf on unmount.
  useEffect(() => () => { stopRaf(); }, []);

  const ringR = 34;
  const ringC = 2 * Math.PI * ringR;
  const ringDashoffset = ringC * (1 - progress);

  const label = busy
    ? "Guardando…"
    : locked
      ? "Configuración fijada · click para desfijar"
      : holding
        ? "Mantén pulsado…"
        : "Mantén pulsado para fijar";

  return (
    <div className="relative select-none" style={{ width: "fit-content" }}>
      {/* Aura halo */}
      <span
        aria-hidden="true"
        className="absolute -inset-8 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(60% 60% at 50% 50%, ${A}66, transparent 70%)`,
          filter: "blur(16px)",
          animation: "fijar-aura 3.6s ease-in-out infinite",
        }}
      />
      {/* Light particles — appear stronger while holding */}
      <span aria-hidden="true" className="absolute inset-0 pointer-events-none">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <span
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              top: "50%",
              left: "50%",
              background: i % 2 === 0 ? A : B,
              boxShadow: `0 0 10px ${A}`,
              opacity: holding ? 1 : 0.7,
              animation: `fijar-particle ${holding ? "1.6s" : "4s"} ${(i * 0.18).toFixed(2)}s linear infinite`,
              transform: `rotate(${i * 45}deg) translateX(0)`,
            }}
          />
        ))}
      </span>

      <button
        type="button"
        disabled={busy}
        onPointerDown={beginHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) beginHold(); }}
        onKeyUp={(e) => { if (e.key === "Enter" || e.key === " ") endHold(); }}
        aria-label={label}
        className="relative inline-flex items-center gap-3 px-8 py-3.5 rounded-full font-hero text-base tracking-[0.25em] uppercase text-[#0c1120] border-2 transition-transform active:scale-[0.98] disabled:opacity-70"
        style={{
          background: `linear-gradient(135deg, ${A}, ${B})`,
          borderColor: `${A}cc`,
          boxShadow: holding
            ? `0 0 42px ${A}cc, 0 0 120px ${A}77, inset 0 1px 0 rgba(255,255,255,0.7)`
            : `0 0 28px ${A}aa, 0 0 80px ${A}55, inset 0 1px 0 rgba(255,255,255,0.6)`,
          animation: holding ? "none" : "fijar-pulse 2.4s ease-in-out infinite",
          textShadow: "0 1px 0 rgba(255,255,255,0.4)",
          transform: holding ? `scale(${1 + progress * 0.04})` : undefined,
        }}
      >
        {/* Progress ring overlay */}
        <svg
          aria-hidden="true"
          className="absolute -inset-1.5 w-[calc(100%+0.75rem)] h-[calc(100%+0.75rem)] pointer-events-none"
          viewBox="0 0 100 80"
          preserveAspectRatio="none"
          style={{ overflow: "visible" }}
        >
          <rect
            x="2" y="2" width="96" height="76" rx="38" ry="38"
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="2"
            strokeLinecap="round"
            pathLength={ringC}
            strokeDasharray={ringC}
            strokeDashoffset={ringDashoffset}
            style={{
              filter: `drop-shadow(0 0 6px ${A})`,
              transition: holding ? "none" : "stroke-dashoffset 260ms ease-out",
            }}
          />
        </svg>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {locked
            ? <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>
            : <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0" /></>}
        </svg>
        <span className="relative z-[1]">{label}</span>
      </button>

      {error && (
        <p className="absolute -bottom-7 left-0 right-0 text-center text-court-danger text-xs">
          {error}
        </p>
      )}
      <style>{`
        @keyframes fijar-pulse {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-2px); }
        }
        @keyframes fijar-aura {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.14); }
        }
        @keyframes fijar-particle {
          0%   { transform: rotate(0deg)   translateX(0)    scale(0.6); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: rotate(360deg) translateX(90px) scale(1);   opacity: 0; }
        }
      `}</style>
    </div>
  );
}
