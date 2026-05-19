// Serves photo files from frontend/photos/ (NOT in /public so the
// underlying server can't bypass us). Every request goes through this
// endpoint, which means we get a real UA check before handing the bytes
// to the client. Compliant crawlers also see X-Robots-Tag.

import type { APIRoute } from "astro";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, sep } from "node:path";

const PHOTOS_ROOT = process.env.PHOTOS_DIR
  ?? join(process.cwd(), "photos");

const BOT_UA_FRAGMENTS = [
  "bot", "crawler", "spider", "scrape", "headless",
  "gptbot", "ccbot", "anthropic", "claude-web", "claudebot",
  "perplexity", "bytespider", "google-extended", "facebookexternalhit",
  "applebot", "amazonbot", "semrushbot", "ahrefsbot", "mj12bot",
  "duckduckbot", "yandex", "baiduspider", "sogou", "exabot", "ia_archiver",
];

const isBotUA = (ua: string): boolean => {
  const lc = ua.toLowerCase();
  return BOT_UA_FRAGMENTS.some((frag) => lc.includes(frag));
};

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

const forbidden = (msg = "Forbidden") =>
  new Response(msg, {
    status: 403,
    headers: {
      "X-Robots-Tag": "noindex, nofollow, noimageindex, noarchive",
      "Cache-Control": "no-store",
    },
  });

export const GET: APIRoute = async ({ params, request }) => {
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || isBotUA(ua)) return forbidden();

  const raw = params.path ?? "";
  if (!raw) return new Response("Not found", { status: 404 });

  // Strict allow-list. Photos are named "I (n).PNG" / "II (n).PNG" /
  // "III (n).PNG" — anything else is rejected. This is the primary
  // traversal guard; the join+startsWith check below is defense in depth.
  const safeName = decodeURIComponent(raw);
  if (!/^(I|II|III) \(\d+\)\.PNG$/i.test(safeName)) {
    return forbidden("Bad path");
  }

  const fullPath = normalize(join(PHOTOS_ROOT, safeName));
  if (!fullPath.startsWith(PHOTOS_ROOT + sep) && fullPath !== PHOTOS_ROOT) {
    return forbidden("Bad path");
  }

  try {
    const s = await stat(fullPath);
    if (!s.isFile()) return new Response("Not found", { status: 404 });
    const ext = safeName.split(".").pop()?.toLowerCase() ?? "";
    const buf = await readFile(fullPath);
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Content-Length": String(s.size),
        "X-Robots-Tag": "noindex, nofollow, noimageindex, noarchive",
        // Allow browser caching but keep CDNs honest — these are private.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
};
