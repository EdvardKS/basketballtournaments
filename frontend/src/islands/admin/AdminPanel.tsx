import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";
import type { Tournament, TeamWithPlayers, GroupWithMembers, Match, Player } from "../../lib/types.js";
import { formatDate } from "../../lib/display.js";
import { derivePhase, type TournamentPhase } from "../../lib/tournamentPhase.js";
import Modal from "./Modal.js";
import InscripcionesTab, { type Registration } from "./InscripcionesTab.js";
import QuickScoreSheet from "./QuickScoreSheet.js";
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

type TabKey = "inscripciones" | "draft" | "jugadores" | "grupos" | "eliminatorias" | "partidos" | "resultados" | "resumen" | "config";

interface TabDef { key: TabKey; label: string; icon: string }

const ICONS = {
  inscripciones: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6",
  config:        "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 008.91 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 8.91a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  draft:         "M3 6h13M3 12h9M3 18h13M17 8l4 4-4 4",
  jugadores:     "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  partidos:      "M3 10h18M3 14h18M5 6h14M5 18h14",
  resultados:    "M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  grupos:        "M3 3v18h18M7 14l3-3 4 4 5-5",
  eliminatorias: "M6 4v16M18 4v16M6 12h12",
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
  if (phase === "groups") return [
    { key: "grupos",        label: "Clasificación", icon: ICONS.grupos },
    { key: "partidos",      label: "Marcador rápido", icon: ICONS.partidos },
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
  pre:        { color: "#ff6b00", label: "Pre-torneo",        live: false },
  draft:      { color: "#ff2d2d", label: "Draft en curso",    live: true  },
  groups:     { color: "#ff6b00", label: "Fase de grupos",    live: true  },
  knockouts:  { color: "#ff2d2d", label: "Eliminatorias",     live: true  },
  completed:  { color: "#f5c518", label: "Finalizado",        live: false },
};

export default function AdminPanel({ tournaments: initialTournaments, initialActiveId, allPlayers }: Props) {
  const [tournaments, setTournaments] = useState<Tournament[]>(initialTournaments);
  const [selectedId, setSelectedId] = useState<string | null>(initialActiveId);
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const selected = tournaments.find((t) => t.id === selectedId) ?? null;
  // Derive the visible sub-phase from data — single source of truth for tabs.
  const phase: TournamentPhase = selected ? derivePhase(selected, matches) : "pre";
  const tabs = useMemo(() => tabsForPhase(phase), [phase]);
  const [activeTab, setActiveTab] = useState<TabKey>(tabs[0]?.key ?? "config");

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
                groups={groups}
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
  tab, tournament, detail, matches, groups, allPlayers, captainIds, onChange, onSelfEdit,
}: {
  tab: TabKey;
  tournament: Tournament;
  detail: TournamentDetail | null;
  matches: Match[];
  groups: GroupWithMembers[];
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
    if (groups.length === 0) {
      return (
        <div className="glass p-10 text-center">
          <p className="text-5xl mb-3">📊</p>
          <p className="text-white font-hero text-2xl">Aún no hay grupos</p>
          <p className="text-court-muted text-sm mt-2">Los grupos se generan automáticamente al cerrar el draft.</p>
        </div>
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
    const ko = matches.filter((m) => m.stage !== "group");
    if (ko.length === 0) {
      return (
        <div className="glass p-10 text-center">
          <p className="text-5xl mb-3">🥊</p>
          <p className="text-white font-hero text-2xl">Bracket no generado todavía</p>
          <p className="text-court-muted text-sm mt-2">Se crea automáticamente al cerrar el último partido de grupos.</p>
        </div>
      );
    }
    // Admin doesn't get the visual bracket here — that's the public tournament
    // page (KnockoutBracketView, server-rendered). We give the admin the
    // full-width scoring sheet for KO matches plus a prominent link to the
    // bracket so the visual lives in one place only.
    return (
      <div className="space-y-5">
        <div className="glass p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-court-muted font-bold mb-1">Bracket visual</p>
            <p className="text-white text-sm">
              {ko.length} partidos de eliminatorias. Edítalos directamente desde el bracket público.
            </p>
          </div>
          <a
            href={`/tournaments/${tournament.id}`}
            target="_blank" rel="noopener"
            className="btn-neon-blue !py-2 !px-4 !text-xs"
          >
            Ver bracket completo
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 3h7v7M21 3l-9 9M5 5h6M5 19V8" />
            </svg>
          </a>
        </div>
        <div className="glass p-4 sm:p-6">
          <h3 className="font-hero text-xl text-white mb-4">Marcador rápido (eliminatorias)</h3>
          <QuickScoreSheet matches={ko} tournamentId={tournament.id} />
        </div>
      </div>
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
              <th className="pb-2 text-center font-bold text-white">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {g.members.map((m, i) => (
              <tr key={m.id} className={i === 0 && m.gamesPlayed > 0 ? "bg-court-gold/5" : ""}>
                <td className="py-1.5 pr-2 font-hero text-base tabular-nums text-white/70">{i + 1}</td>
                <td className="py-1.5 pr-2 text-white truncate">{m.teamName ?? "—"}</td>
                <td className="py-1.5 pr-2 text-center text-court-muted tabular-nums">{m.gamesPlayed}</td>
                <td className="py-1.5 pr-2 text-center text-court-ok tabular-nums">{m.gamesWon}</td>
                <td className="py-1.5 pr-2 text-center text-court-danger tabular-nums">{m.gamesLost}</td>
                <td className="py-1.5 text-center font-hero text-lg text-[var(--color-neon-orange)] tabular-nums">{m.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

