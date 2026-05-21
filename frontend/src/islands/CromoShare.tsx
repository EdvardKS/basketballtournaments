import { useState } from "react";

interface Props { playerName: string; playerId: string }

const intentUrl = (kind: "wa" | "tw" | "fb", text: string, url: string): string => {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  if (kind === "wa") return `https://wa.me/?text=${t}%20${u}`;
  if (kind === "tw") return `https://twitter.com/intent/tweet?text=${t}&url=${u}`;
  return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
};

export default function CromoShare({ playerName, playerId }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const captureBlob = async (): Promise<Blob | null> => {
    const target = document.getElementById("cromo-root");
    if (!target) return null;
    // Dynamic import keeps html2canvas out of the initial bundle.
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
      } else {
        const u = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = u; a.download = "cromo.png"; a.click();
        URL.revokeObjectURL(u);
        setMsg("Imagen descargada. Súbela a tu red preferida.");
      }
    } catch (e) {
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
    <div className="space-y-2">
      <button disabled={busy} onClick={onShare} className="btn-primary text-xs w-full">
        {busy ? "Generando…" : "Compartir cromo"}
      </button>
      <div className="grid grid-cols-4 gap-2">
        <button onClick={() => openIntent("wa")} className="btn-ghost text-[10px]">WhatsApp</button>
        <button onClick={() => openIntent("tw")} className="btn-ghost text-[10px]">Twitter</button>
        <button onClick={() => openIntent("fb")} className="btn-ghost text-[10px]">Facebook</button>
        <button onClick={openInstagram} className="btn-ghost text-[10px]">Instagram</button>
      </div>
      {msg && <p className="text-[10px] text-court-muted">{msg}</p>}
    </div>
  );
}
