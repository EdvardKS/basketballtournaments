// Display helpers: formatting, privacy masking, status labels/colors.
import type { TournamentStatus } from "./types.js";

export const displayName = (fullName: string, authenticated: boolean): string =>
  authenticated ? fullName : fullName.split(" ")[0][0] + "***";

export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
};

export const formatTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "Por confirmar";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
};

export const STATUS_LABEL: Record<TournamentStatus, string> = {
  upcoming:  "Próximamente",
  open:      "Inscripciones abiertas",
  draft:     "Draft en curso",
  setup:     "Preparando torneo",
  scheduled: "Programado",
  active:    "Torneo en juego",
  completed: "Finalizado",
};

export const STATUS_COLOR: Record<TournamentStatus, string> = {
  upcoming:  "chip bg-court-muted/20 text-court-muted",
  open:      "chip bg-court-ok/20 text-court-ok",
  draft:     "chip bg-court-warn/20 text-court-warn",
  setup:     "chip bg-blue-400/20 text-blue-400",
  scheduled: "chip bg-blue-500/20 text-blue-300",
  active:    "chip bg-court-accent/20 text-court-accent",
  completed: "chip bg-court-muted/10 text-court-muted",
};

export const POSITION_LABEL: Record<string, string> = {
  base: "Base", escolta: "Escolta", alero: "Alero",
  "ala-pivot": "Ala-Pívot", pivot: "Pívot",
};

export const overallColor = (overall: number): string => {
  if (overall >= 80) return "text-court-gold";
  if (overall >= 70) return "text-court-ok";
  if (overall >= 60) return "text-court-warn";
  return "text-court-muted";
};

export const computeEffectiveStatus = (t: {
  status: TournamentStatus;
  inscriptionStart: string | null; inscriptionEnd: string | null;
  draftStart: string | null; draftEnd: string | null; matchDate: string | null;
}): TournamentStatus => {
  if (t.status === "completed") return "completed";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = (s: string | null) => s ? new Date(s) : null;
  const [is, ie, ds, de, md] = [d(t.inscriptionStart), d(t.inscriptionEnd), d(t.draftStart), d(t.draftEnd), d(t.matchDate)];
  if (md && today >= md) return t.status === "completed" ? "completed" : "active";
  if (ds && de && today >= ds && today <= de) return "draft";
  if (is && ie && today >= is && today <= ie) return "open";
  if (is && today < is) return "upcoming";
  return t.status;
};
