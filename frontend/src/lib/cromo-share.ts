// Share orchestration — sits on top of exportCardToPng.
//
// Each platform path:
//   1. We always produce the canonical PNG with `exportCardToPng()`.
//   2. If Web Share API + `canShare({ files })` is available, we share the
//      file directly so apps that support image attachments (WhatsApp, X
//      Stories…) get the image inline.
//   3. Otherwise we trigger a real download AND open the platform's deep
//      link / web intent so the user can attach the saved PNG manually.
//
// `exportCardToPng` and `shareCard` are intentionally separated so other
// callers (a future “download cromo” button, a server-side mirror, the
// admin export route…) can reuse the export step without the share UX.

import { exportCardToPng, buildFileName, type ExportedCard } from "./cromo-export.js";

export type ShareNetwork = "wa" | "tw" | "fb" | "ig";

export interface ShareInput {
  playerName: string;
  playerUrl: string;        // canonical public URL we want to advertise
  network: ShareNetwork;
}

export interface ShareResult {
  /** Which path actually delivered the cromo. */
  outcome: "web-share" | "deep-link" | "download-only" | "cancelled";
  fileName: string;
  exportPx: { w: number; h: number };
}

const isMobile = (): boolean =>
  typeof navigator !== "undefined"
  && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

const isAndroid = (): boolean =>
  typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

const buildDeepLink = (net: ShareNetwork, text: string, url: string): string => {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  switch (net) {
    case "wa": return `https://wa.me/?text=${t}%20${u}`;
    case "tw": return `https://twitter.com/intent/tweet?text=${t}&url=${u}`;
    case "fb": return `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`;
    case "ig": return isAndroid()
      ? "intent://camera/#Intent;package=com.instagram.android;scheme=instagram;end"
      : "instagram://camera";
  }
};

const downloadFile = (exp: ExportedCard) => {
  const a = document.createElement("a");
  a.href = exp.url;
  a.download = exp.file.name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a tick so iOS Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(exp.url), 4000);
};

export const shareCard = async ({
  playerName, playerUrl, network,
}: ShareInput): Promise<ShareResult> => {
  const fileName = buildFileName(playerName);
  const exp = await exportCardToPng({ fileName });
  const exportPx = { w: exp.width, h: exp.height };
  const text = `Mi cromo de ${playerName} 🏀`;

  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };

  // Path A — Web Share API with files (preferred on mobile).
  if (isMobile() && nav.canShare && nav.canShare({ files: [exp.file] })) {
    try {
      await nav.share({
        files: [exp.file],
        title: `Cromo de ${playerName}`,
        text, url: playerUrl,
      });
      URL.revokeObjectURL(exp.url);
      return { outcome: "web-share", fileName, exportPx };
    } catch (e) {
      if ((e as Error)?.name === "AbortError") {
        URL.revokeObjectURL(exp.url);
        return { outcome: "cancelled", fileName, exportPx };
      }
      // Real failure — fall through to download + deep-link path.
    }
  }

  // Path B — download the file so the user has it in their gallery /
  // downloads, then deep-link to the target app or open its web intent.
  downloadFile(exp);

  // Instagram on desktop has no useful web sharer; bail out gracefully.
  if (network === "ig" && !isMobile()) {
    return { outcome: "download-only", fileName, exportPx };
  }

  const deepLink = buildDeepLink(network, text, playerUrl);
  window.open(deepLink, "_blank", "noopener");
  return { outcome: "deep-link", fileName, exportPx };
};
