// Thin UI layer on top of `lib/cromo-share.ts`. Buttons trigger a single
// orchestrator that always exports a canonical 1360×1812 PNG, then either
// uses Web Share API (mobile, with files), or downloads + deep-links to
// the chosen network.
import { useRef, useState, type ComponentType } from "react";
import { successBurst } from "../lib/neon.js";
import { shareCard, type ShareNetwork, type ShareResult } from "../lib/cromo-share.js";
import { downloadCard, CromoExportError } from "../lib/cromo-export.js";

interface Props { playerName: string; playerId: string }

const NETWORK_LABEL: Record<ShareNetwork, string> = {
  wa: "WhatsApp", tw: "Twitter / X", fb: "Facebook", ig: "Instagram",
};
const NETWORK_ACCENT: Record<ShareNetwork, string> = {
  wa: "#25D366", tw: "#1DA1F2", fb: "#1877F2", ig: "#E4405F",
};

const IconWA = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.5 3.5A11 11 0 003.6 17l-1.6 5.5 5.6-1.5A11 11 0 1020.5 3.5zM12 20.5a8.5 8.5 0 01-4.3-1.2l-.3-.2-3.3.9.9-3.2-.2-.3A8.5 8.5 0 1112 20.5zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.7.8-.8 1-.2.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.6-1.5-1.8-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.4.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.7-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.7 1.1 2.9c.2.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2 0-.1-.2-.2-.5-.3z" />
  </svg>
);
const IconTW = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const IconFB = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.51 1.5-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.77l-.44 2.9h-2.33V22c4.78-.79 8.43-4.94 8.43-9.94z" />
  </svg>
);
const IconIG = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);
const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);

const ICON: Record<ShareNetwork, ComponentType> = {
  wa: IconWA, tw: IconTW, fb: IconFB, ig: IconIG,
};

const outcomeHint = (r: ShareResult, net: ShareNetwork): string => {
  if (r.outcome === "web-share") return `Compartido en ${NETWORK_LABEL[net]}.`;
  if (r.outcome === "cancelled") return "Compartir cancelado.";
  if (r.outcome === "download-only") return `Cromo descargado (${r.fileName}). Súbelo desde la app de Instagram.`;
  // deep-link
  return `Cromo descargado (${r.fileName}). Adjúntalo en ${NETWORK_LABEL[net]}.`;
};

const errorHint = (e: unknown): string => {
  if (e instanceof CromoExportError) {
    if (e.message === "CROMO_ROOT_NOT_FOUND") return "Cromo no encontrado en pantalla.";
    if (e.message === "BLOB_NULL") return "El navegador no devolvió la imagen. Reintenta.";
    return "No se pudo generar la imagen. Reintenta.";
  }
  return "Error al compartir.";
};

export default function CromoShare({ playerName, playerId }: Props) {
  const [busy, setBusy] = useState<ShareNetwork | "dl" | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const btnRefs = useRef<Record<ShareNetwork | "dl", HTMLButtonElement | null>>({
    wa: null, tw: null, fb: null, ig: null, dl: null,
  });

  const playerUrl = typeof window !== "undefined"
    ? `${window.location.origin}/jugador/${playerId}` : "";

  // SPEC-013: prefer the carousel's active slide. Fall back to the first
  // #cromo-root for backwards compatibility (e.g. tests without carousel).
  const findActiveSource = (): HTMLElement | null => {
    if (typeof document === "undefined") return null;
    const active = document.querySelector<HTMLElement>('.cromo[data-active="true"]');
    if (active) return active;
    return document.getElementById("cromo-root");
  };

  const handleShare = async (network: ShareNetwork) => {
    setBusy(network); setHint(null);
    try {
      const source = findActiveSource();
      const res = await shareCard({ playerName, playerUrl, network, source });
      setHint(outcomeHint(res, network));
      successBurst(btnRefs.current[network]);
    } catch (err) {
      console.error("[cromo-share]", err);
      setHint(errorHint(err));
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    setBusy("dl"); setHint(null);
    try {
      const source = findActiveSource();
      const exp = await downloadCard(playerName, source);
      setHint(`Cromo descargado (${exp.width}×${exp.height} px).`);
      successBurst(btnRefs.current.dl);
    } catch (err) {
      console.error("[cromo-download]", err);
      setHint(errorHint(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(["wa", "tw", "fb", "ig"] as ShareNetwork[]).map((net) => {
          const Icon = ICON[net];
          const accent = NETWORK_ACCENT[net];
          const isBusy = busy === net;
          return (
            <button key={net}
              ref={(el) => { btnRefs.current[net] = el; }}
              onClick={() => handleShare(net)}
              disabled={busy !== null}
              aria-label={`Compartir en ${NETWORK_LABEL[net]}`}
              className="neon-btn neon-btn-ghost text-[11px] py-3"
              style={{
                borderColor: `${accent}40`,
                background: `linear-gradient(180deg, ${accent}18 0%, rgba(255,255,255,0.02) 100%)`,
                color: accent,
              }}>
              <Icon />
              <span className="font-semibold tracking-widest">
                {isBusy ? "…" : NETWORK_LABEL[net]}
              </span>
            </button>
          );
        })}
      </div>

      <button ref={(el) => { btnRefs.current.dl = el; }}
        onClick={handleDownload}
        disabled={busy !== null}
        className="neon-btn neon-btn-ghost w-full text-[11px]">
        <IconDownload />
        <span className="font-semibold tracking-widest">
          {busy === "dl" ? "Generando…" : "Descargar PNG en alta resolución"}
        </span>
      </button>

      <p className="text-[10px] text-court-muted text-center" aria-live="polite">
        {hint ?? "Cada cromo se exporta a 1360×1812 px. La imagen es idéntica a la que ves."}
      </p>
    </div>
  );
}
