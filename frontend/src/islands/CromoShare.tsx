import { useRef, useState } from "react";
import NeonButton from "../components/ui/NeonButton.js";
import { successBurst } from "../lib/neon.js";

interface Props { playerName: string; playerId: string }

const intentUrl = (kind: "wa" | "tw" | "fb", text: string, url: string): string => {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  if (kind === "wa") return `https://wa.me/?text=${t}%20${u}`;
  if (kind === "tw") return `https://twitter.com/intent/tweet?text=${t}&url=${u}`;
  return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
};

const IconShare = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
  </svg>
);

export default function CromoShare({ playerName, playerId }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const mainBtn = useRef<HTMLButtonElement>(null);

  const captureBlob = async (): Promise<Blob | null> => {
    const target = document.getElementById("cromo-root");
    if (!target) return null;
    // White flash overlay while the capture runs.
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

  const onShare = async () => {
    setBusy(true); setMsg(null);
    try {
      const blob = await captureBlob();
      if (!blob) { setMsg("No pude generar la imagen."); return; }
      const file = new File([blob], "cromo.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], text: shareText, url: shareUrl });
        successBurst(mainBtn.current);
      } else {
        const u = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = u; a.download = "cromo.png"; a.click();
        URL.revokeObjectURL(u);
        setMsg("Imagen descargada. Súbela a tu red preferida.");
        successBurst(mainBtn.current);
      }
    } catch {
      setMsg("Error al compartir.");
    } finally { setBusy(false); }
  };

  const openIntent = (kind: "wa" | "tw" | "fb") => {
    window.open(intentUrl(kind, shareText, shareUrl), "_blank", "noopener");
  };

  const openInstagram = async () => {
    await onShare();
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|android/.test(ua)) {
      window.location.href = "instagram://camera";
    } else {
      setMsg("Descarga la imagen y súbela desde Instagram.");
    }
  };

  return (
    <>
      <div ref={flashRef} aria-hidden="true"
        className="fixed inset-0 bg-white pointer-events-none transition-opacity duration-150 z-[59]"
        style={{ opacity: 0 }} />
      <div className="space-y-2">
        <NeonButton ref={mainBtn} variant="primary" disabled={busy} onClick={onShare} className="w-full">
          <IconShare /> {busy ? "Generando…" : "Compartir cromo"}
        </NeonButton>
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => openIntent("wa")} className="neon-btn neon-btn-ghost text-[10px] hover:!border-[#25D366]/70 hover:!text-[#25D366]">
            WhatsApp
          </button>
          <button onClick={() => openIntent("tw")} className="neon-btn neon-btn-ghost text-[10px] hover:!border-[#1DA1F2]/70 hover:!text-[#1DA1F2]">
            Twitter
          </button>
          <button onClick={() => openIntent("fb")} className="neon-btn neon-btn-ghost text-[10px] hover:!border-[#1877F2]/70 hover:!text-[#1877F2]">
            Facebook
          </button>
          <button onClick={openInstagram} className="neon-btn neon-btn-ghost text-[10px] hover:!border-[#E4405F]/70 hover:!text-[#E4405F]">
            Instagram
          </button>
        </div>
        {msg && <p className="text-[10px] text-court-muted">{msg}</p>}
      </div>
    </>
  );
}
