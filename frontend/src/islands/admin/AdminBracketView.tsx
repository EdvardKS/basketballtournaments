// React port of components/KnockoutBracketView.astro · used inside the admin
// Eliminatorias tab so the bracket lives in the panel itself (with the pencil
// icon to score / finalize matches in-place, no jumping to the public page).
//
// Mirror layout, classNames, and connector geometry of the Astro view; the
// CSS is loaded globally from styles/bracket.css (imported from global.css).
import { useEffect } from "react";
import type { Match } from "../../lib/types.js";
import { teamAccent } from "../../lib/teamColors.js";
import MatchEditOverlay from "./MatchEditOverlay.js";

interface PillProps {
  teamId: string | null;
  name: string | null;
  seedLabel: string | null;
  score: number | null;
  winner: boolean;
  loser: boolean;
  accent: string;
  size: "sm" | "md" | "lg";
  previewMode: boolean;
}

const SIZE_CLASSES: Record<"sm" | "md" | "lg", {
  pill: string; logo: string; name: string; score: string;
}> = {
  sm: { pill: "h-12 px-2.5 gap-2", logo: "w-8 h-8 text-xs",  name: "text-xs",          score: "text-base" },
  md: { pill: "h-14 px-3 gap-3",   logo: "w-10 h-10 text-sm", name: "text-sm",          score: "text-xl"   },
  lg: { pill: "h-16 px-4 gap-3",   logo: "w-12 h-12 text-lg", name: "text-base font-bold", score: "text-3xl" },
};

function TeamPill({
  teamId, name, seedLabel, score, winner, loser, accent, size, previewMode,
}: PillProps) {
  const sz = SIZE_CLASSES[size];
  // In preview mode (pre-matchday) we ALWAYS show the structural seed label
  // instead of the placeholder team name the backend wired in from the
  // zero-ranked pool. Outside preview we fall back to the seed label only
  // when no team is bound yet.
  const displayLabel = previewMode ? (seedLabel ?? name) : (name ?? seedLabel);
  const showAsSeed = previewMode || !name;
  const style: React.CSSProperties = {
    ["--accent" as never]: accent,
    background: winner
      ? `linear-gradient(90deg, ${accent}33, ${accent}10)`
      : loser
        ? "rgba(20,26,44,0.55)"
        : "rgba(20,26,44,0.85)",
    borderColor: winner ? `${accent}aa` : loser ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.10)",
    boxShadow: winner ? `0 0 14px ${accent}55, inset 0 1px 0 rgba(255,255,255,0.08)` : undefined,
  };
  const logoStyle: React.CSSProperties = winner
    ? { background: `${accent}40`, borderColor: accent, color: "#fff" }
    : {
        background: "rgba(255,255,255,0.06)",
        borderColor: "rgba(255,255,255,0.12)",
        color: loser ? "#777" : "#cfd2db",
        filter: loser ? "grayscale(1) opacity(0.6)" : undefined,
      };
  return (
    <div
      className={`team-pill flex items-center rounded-lg border transition-all ${sz.pill}`}
      data-team-id={teamId ?? ""}
      style={style}
    >
      {displayLabel ? (
        <>
          <div
            className={`rounded-md flex items-center justify-center font-hero leading-none border shrink-0 ${sz.logo}`}
            style={logoStyle}
            aria-hidden="true"
          >
            {showAsSeed ? "?" : displayLabel.charAt(0).toUpperCase()}
          </div>
          <span
            className={`flex-1 truncate ${sz.name} ${
              showAsSeed
                ? "italic text-white/60"
                : winner
                  ? "text-white font-bold"
                  : loser
                    ? "text-white/40 line-through"
                    : "text-white/90"
            }`}
          >{displayLabel}</span>
        </>
      ) : (
        <span className={`flex-1 italic text-court-muted/60 ${sz.name}`}>Por definir</span>
      )}
      <span
        className={`font-hero leading-none tabular-nums shrink-0 ml-2 ${sz.score} ${
          score == null
            ? "text-white/15"
            : winner ? "text-white" : loser ? "text-white/30 line-through" : "text-white/80"
        }`}
      >{score ?? "—"}</span>
    </div>
  );
}

function BracketMatch({
  match, size = "md", isAdmin, previewMode = false,
}: { match: Match | null; size?: "sm" | "md" | "lg"; isAdmin: boolean; previewMode?: boolean }) {
  if (!match) {
    const sz = SIZE_CLASSES[size];
    return (
      <div className={`rounded-xl border border-dashed border-white/5 bg-white/[0.01] ${sz.pill}`} />
    );
  }
  const isCompleted = match.status === "completed";
  const homeWin = isCompleted && match.winnerId === match.homeTeamId;
  const awayWin = isCompleted && match.winnerId === match.awayTeamId;
  const homeLost = isCompleted && !homeWin;
  const awayLost = isCompleted && !awayWin;
  const homeAccent = match.homeTeamId ? teamAccent(match.homeTeamId).color : "#a0a7b8";
  const awayAccent = match.awayTeamId ? teamAccent(match.awayTeamId).color : "#a0a7b8";
  return (
    <div className="bracket-match relative flex flex-col gap-1.5">
      {isAdmin && (
        <div className="absolute top-1 right-1 z-10">
          <MatchEditOverlay match={match} />
        </div>
      )}
      <TeamPill
        teamId={match.homeTeamId} name={match.homeTeamName ?? null}
        seedLabel={match.homeSeedLabel ?? null} score={match.homeScore}
        winner={homeWin} loser={homeLost} accent={homeAccent} size={size}
        previewMode={previewMode}
      />
      <TeamPill
        teamId={match.awayTeamId} name={match.awayTeamName ?? null}
        seedLabel={match.awaySeedLabel ?? null} score={match.awayScore}
        winner={awayWin} loser={awayLost} accent={awayAccent} size={size}
        previewMode={previewMode}
      />
    </div>
  );
}

function findByRound(list: Match[], round: number): Match | null {
  return list.find((m) => m.roundNumber === round) ?? null;
}

interface Props { matches: Match[]; isAdmin?: boolean; previewMode?: boolean }

export default function AdminBracketView({ matches, isAdmin = true, previewMode = false }: Props) {
  const eighths    = matches.filter((m) => m.stage === "eighth");
  const quarters   = matches.filter((m) => m.stage === "quarterfinal");
  const semis      = matches.filter((m) => m.stage === "semifinal");
  const finals     = matches.filter((m) => m.stage === "final");
  const thirds     = matches.filter((m) => m.stage === "third_place");

  const qf1 = findByRound(quarters, 1);
  const qf2 = findByRound(quarters, 2);
  const qf3 = findByRound(quarters, 3);
  const qf4 = findByRound(quarters, 4);
  const sf1 = findByRound(semis, 1);
  const sf2 = findByRound(semis, 2);
  const finalMatch = findByRound(finals, 1);
  const thirdMatch = findByRound(thirds, 1);

  const eighthsSorted = [...eighths].sort(
    (a, b) => (a.roundNumber ?? 0) - (b.roundNumber ?? 0),
  );

  const hasKo = eighths.length + quarters.length + semis.length + finals.length + thirds.length > 0;
  const hasQuarters = quarters.length > 0;

  // Path-highlight: hovering a team pill lights up every pill with the same
  // data-team-id (the team's whole bracket trail).
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-bracket-root='admin']");
    if (!root) return;
    const pills = root.querySelectorAll<HTMLElement>(".team-pill[data-team-id]");
    const handlers: Array<() => void> = [];
    pills.forEach((pill) => {
      const id = pill.dataset.teamId;
      if (!id) return;
      const on = () => {
        root.querySelectorAll<HTMLElement>(`.team-pill[data-team-id="${CSS.escape(id)}"]`)
          .forEach((p) => p.classList.add("path-active"));
      };
      const off = () => {
        root.querySelectorAll<HTMLElement>(`.team-pill.path-active[data-team-id="${CSS.escape(id)}"]`)
          .forEach((p) => p.classList.remove("path-active"));
      };
      pill.addEventListener("mouseenter", on);
      pill.addEventListener("mouseleave", off);
      handlers.push(() => {
        pill.removeEventListener("mouseenter", on);
        pill.removeEventListener("mouseleave", off);
      });
    });
    return () => handlers.forEach((fn) => fn());
  }, [matches.length]);

  if (!hasKo) {
    return (
      <div className="rounded-xl border border-white/5 bg-court-card/40 p-8 text-center">
        <p className="text-court-muted text-sm">
          Las eliminatorias se generarán al cerrar el último partido de la fase de grupos
        </p>
      </div>
    );
  }

  const gridStyle: React.CSSProperties = hasQuarters
    ? {
        gridTemplateColumns: "minmax(200px,1fr) 3rem minmax(200px,1.05fr) 3rem minmax(280px,1.5fr) 3rem minmax(200px,1.05fr) 3rem minmax(200px,1fr)",
        minWidth: "1100px",
      }
    : {
        gridTemplateColumns: "minmax(240px,1fr) 3rem minmax(280px,1.4fr) 3rem minmax(240px,1fr)",
        minWidth: "760px",
      };

  return (
    <div className="bracket-root" data-bracket-root="admin">
      {eighthsSorted.length > 0 && (
        <section className="mb-8">
          <header className="mb-3">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--color-neon-orange)] font-bold mb-1">Octavos de final</p>
            <p className="text-sm text-court-muted">Ronda previa al cuadro principal · ganadores avanzan a cuartos.</p>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {eighthsSorted.map((m) => (
              <BracketMatch key={m.id} match={m} size="sm" isAdmin={isAdmin} previewMode={previewMode} />
            ))}
          </div>
        </section>
      )}

      <div className="overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
        <div className="bracket-grid mx-auto" style={gridStyle}>
          {/* LEFT HALF */}
          {hasQuarters && (
            <>
              <div className="bracket-pair">
                <div className="bracket-cell">
                  <BracketMatch match={qf1} size="sm" isAdmin={isAdmin} previewMode={previewMode} />
                </div>
                <div className="bracket-cell">
                  <BracketMatch match={qf2} size="sm" isAdmin={isAdmin} previewMode={previewMode} />
                </div>
              </div>
              <div className="bracket-spacer bracket-spacer--pair-left" />
            </>
          )}
          <div className="bracket-single">
            <div className="bracket-cell">
              <BracketMatch match={sf1} size="md" isAdmin={isAdmin} previewMode={previewMode} />
            </div>
          </div>
          <div className="bracket-spacer bracket-spacer--single-left" />

          {/* CENTER · trophy + final + 3rd */}
          <div className="bracket-center">
            <div className="text-center mb-4">
              <svg
                className="mx-auto w-20 h-20 text-court-gold"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true"
                style={{ filter: "drop-shadow(0 0 22px rgba(245,197,24,0.85)) drop-shadow(0 0 4px rgba(245,197,24,1))" }}
              >
                <path d="M8 21h8M12 17v4M5 4h14v5a7 7 0 01-14 0V4z" />
                <path d="M5 4H2v3a4 4 0 003 4M19 4h3v3a4 4 0 01-3 4" />
              </svg>
              <p className="font-hero text-court-gold tracking-[0.45em] text-lg mt-2">FINAL</p>
            </div>
            <div
              className="rounded-2xl border-2 border-court-gold/50 p-3 mb-6"
              style={{
                background: "linear-gradient(135deg, rgba(245,197,24,0.14), rgba(20,26,44,0.7))",
                boxShadow: "0 0 40px rgba(245,197,24,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <BracketMatch match={finalMatch} size="lg" isAdmin={isAdmin} previewMode={previewMode} />
            </div>
            <p className="font-hero text-court-muted tracking-[0.35em] text-[10px] text-center mb-2">3ER PUESTO</p>
            <div
              className="rounded-xl border border-white/10 p-2"
              style={{ background: "rgba(20,26,44,0.6)" }}
            >
              <BracketMatch match={thirdMatch} size="sm" isAdmin={isAdmin} previewMode={previewMode} />
            </div>
          </div>

          {/* RIGHT HALF */}
          <div className="bracket-spacer bracket-spacer--single-right" />
          <div className="bracket-single">
            <div className="bracket-cell">
              <BracketMatch match={sf2} size="md" isAdmin={isAdmin} previewMode={previewMode} />
            </div>
          </div>
          {hasQuarters && (
            <>
              <div className="bracket-spacer bracket-spacer--pair-right" />
              <div className="bracket-pair">
                <div className="bracket-cell">
                  <BracketMatch match={qf3} size="sm" isAdmin={isAdmin} previewMode={previewMode} />
                </div>
                <div className="bracket-cell">
                  <BracketMatch match={qf4} size="sm" isAdmin={isAdmin} previewMode={previewMode} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
