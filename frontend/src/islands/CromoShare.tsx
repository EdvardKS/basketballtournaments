import { useRef, useState, type ComponentType } from "react";
import { successBurst } from "../lib/neon.js";

interface Props { playerName: string; playerId: string }

type Network = "wa" | "tw" | "fb" | "ig";

const NETWORK_LABEL: Record<Network, string> = {
  wa: "WhatsApp", tw: "Twitter / X", fb: "Facebook", ig: "Instagram",
};

const NETWORK_ACCENT: Record<Network, string> = {
  wa: "#25D366", tw: "#1DA1F2", fb: "#1877F2", ig: "#E4405F",
};

const isMobile = () =>
  typeof navigator !== "undefined"
  && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

const isAndroid = () =>
  typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

// Deep link → app on mobile, web fallback elsewhere. Returns the URL we'll set
// `window.location.href` to (universal links handle app vs web automatically
// on modern OSes; legacy `*://` schemes are kept as last-resort fallbacks).
const buildDeepLink = (net: Network, text: string, url: string): string => {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  switch (net) {
    case "wa": return `https://wa.me/?text=${t}%20${u}`;
    case "tw": return `https://twitter.com/intent/tweet?text=${t}&url=${u}`;
    case "fb": return `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`;
    case "ig": return isAndroid() ? "intent://camera/#Intent;package=com.instagram.android;scheme=instagram;end" : "instagram://camera";
  }
};

const downloadBlob = (blob: Blob, name: string) => {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u; a.download = name; a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a tick so iOS Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(u), 4000);
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

const ICON: Record<Network, ComponentType> = { wa: IconWA, tw: IconTW, fb: IconFB, ig: IconIG };

export default function CromoShare({ playerName, playerId }: Props) {
  const [busy, setBusy] = useState<Network | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<Network, HTMLButtonElement | null>>({ wa: null, tw: null, fb: null, ig: null });

  const captureBlob = async (): Promise<Blob | null> => {
    const target = document.getElementById("cromo-root");
    if (!target) return null;
    if (flashRef.current) {
      flashRef.current.style.opacity = "0.25";
      setTimeout(() => { if (flashRef.current) flashRef.current.style.opacity = "0"; }, 90);
    }
    const mod = await import("html2canvas");
    const canvas = await mod.default(target, { backgroundColor: null, scale: 2 });
    return await new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
  };

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/jugador/${playerId}` : "";
  const shareText = `Mi cromo de ${playerName} 🏀`;

  const shareTo = async (net: Network) => {
    setBusy(net); setHint(null);
    try {
      const blob = await captureBlob();
      if (!blob) { setHint("No pude generar la imagen."); return; }

      const file = new File([blob], "cromo.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };

      // 1) Try Web Share API with the file attached. On mobile the system
      //    sheet pops up; the user taps the target app and the PNG is
      //    attached directly. This is the best path when available.
      if (isMobile() && nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], text: shareText, url: shareUrl,
            title: `Cromo de ${playerName}` });
          successBurst(btnRefs.current[net]);
          return;
        } catch (e) {
          // User cancelled the sheet or share failed — fall through to
          // download + deep-link so they still have a path.
          if ((e as Error)?.name !== "AbortError") {
            console.warn("[share] webShare failed, falling back", e);
          } else {
            return; // user cancelled, no further action
          }
        }
      }

      // 2) Download the PNG to disk so the user can attach it manually.
      downloadBlob(blob, "cromo.png");

      // 3) Deep-link to the target app / web sharer.
      const url = buildDeepLink(net, shareText, shareUrl);
      // For Instagram on desktop there's no useful web sharer.
      if (net === "ig" && !isMobile()) {
        setHint("Imagen descargada. Súbela desde la app de Instagram.");
        successBurst(btnRefs.current[net]);
        return;
      }
      window.open(url, "_blank", "noopener");
      successBurst(btnRefs.current[net]);
      if (isMobile()) {
        setHint(`Cromo descargado. Adjuntalo en ${NETWORK_LABEL[net]}.`);
      } else {
        setHint(`Cromo descargado. Adjuntalo en la ventana de ${NETWORK_LABEL[net]}.`);
      }
    } catch (err) {
      console.error("[share] failed", err);
      setHint("Error al compartir.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div ref={flashRef} aria-hidden="true"
        className="fixed inset-0 bg-white pointer-events-none transition-opacity duration-150 z-[59]"
        style={{ opacity: 0 }} />

      <div className="space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(["wa", "tw", "fb", "ig"] as Network[]).map((net) => {
            const Icon = ICON[net];
            const accent = NETWORK_ACCENT[net];
            const isBusy = busy === net;
            return (
              <button key={net} ref={(el) => { btnRefs.current[net] = el; }}
                onClick={() => shareTo(net)}
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
        <p className="text-[10px] text-court-muted text-center">
          {hint ?? "Cada botón abre la app y descarga el cromo para adjuntarlo."}
        </p>
      </div>
    </>
  );
}
