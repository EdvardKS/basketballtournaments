import { useEffect, useState } from "react";

type Variant = "orange" | "blue" | "red" | "green";

interface ToastSpec {
  variant: Variant;
  title: string;
  message: string;
}

const VARIANTS: Record<Variant, { bg: string; ring: string; glow: string; icon: string }> = {
  orange: {
    bg: "linear-gradient(135deg, rgba(255,107,0,0.18), rgba(255,45,45,0.10))",
    ring: "rgba(255,107,0,0.5)",
    glow: "0 0 36px rgba(255,107,0,0.45)",
    icon: "M9 12l2 2 4-4",
  },
  blue: {
    bg: "linear-gradient(135deg, rgba(0,102,255,0.18), rgba(0,102,255,0.06))",
    ring: "rgba(0,102,255,0.5)",
    glow: "0 0 30px rgba(0,102,255,0.45)",
    icon: "M9 12l2 2 4-4",
  },
  red: {
    bg: "linear-gradient(135deg, rgba(255,45,45,0.20), rgba(255,45,45,0.05))",
    ring: "rgba(255,45,45,0.5)",
    glow: "0 0 30px rgba(255,45,45,0.45)",
    icon: "M12 9v4M12 17h.01M5.07 19h13.86a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.34 16a2 2 0 001.73 3z",
  },
  green: {
    bg: "linear-gradient(135deg, rgba(62,207,142,0.18), rgba(62,207,142,0.06))",
    ring: "rgba(62,207,142,0.5)",
    glow: "0 0 30px rgba(62,207,142,0.45)",
    icon: "M9 12l2 2 4-4",
  },
};

// URL-driven specs. Add more keys here as new flows need feedback.
const fromUrl = (params: URLSearchParams): ToastSpec | null => {
  const welcome = params.get("welcome");
  const joined = params.get("joined") === "1";

  if (welcome === "registered") {
    return joined
      ? { variant: "orange", title: "¡Bienvenido a la liga!", message: "Estás dentro del torneo. Suerte en el draft." }
      : { variant: "orange", title: "¡Bienvenido a la liga!", message: "Tu cuenta está activa. Ya puedes inscribirte a un torneo." };
  }
  if (welcome === "login") {
    return { variant: "blue", title: "Hola de nuevo", message: "Sesión iniciada correctamente." };
  }
  if (welcome === "logout") {
    return { variant: "blue", title: "Hasta pronto", message: "Has cerrado sesión." };
  }
  return null;
};

const stripWelcomeParams = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete("welcome");
  url.searchParams.delete("joined");
  window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
};

export default function Toast() {
  const [spec, setSpec] = useState<ToastSpec | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const found = fromUrl(new URL(window.location.href).searchParams);
    if (!found) return;
    setSpec(found);
    stripWelcomeParams();

    const dismissAt = window.setTimeout(() => setLeaving(true), 5500);
    const removeAt = window.setTimeout(() => setSpec(null), 6000);
    return () => { clearTimeout(dismissAt); clearTimeout(removeAt); };
  }, []);

  if (!spec) return null;
  const v = VARIANTS[spec.variant];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-20 right-4 sm:right-6 z-[60] max-w-sm"
      style={{
        animation: leaving
          ? "toast-out 0.4s cubic-bezier(.2,.8,.2,1) forwards"
          : "toast-in 0.45s cubic-bezier(.2,.8,.2,1) both",
      }}
    >
      <div
        className="relative flex items-start gap-3 p-4 pr-10 rounded-2xl border backdrop-blur-md"
        style={{ background: v.bg, borderColor: v.ring, boxShadow: v.glow }}
      >
        <span
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border"
          style={{ background: "rgba(0,0,0,0.35)", borderColor: v.ring, color: "#fff", boxShadow: `inset 0 0 12px ${v.ring}` }}
          aria-hidden="true"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d={v.icon} />
            {spec.variant !== "red" && <circle cx="12" cy="12" r="10" />}
          </svg>
        </span>
        <div className="min-w-0">
          <p className="font-hero text-lg leading-none text-white">{spec.title}</p>
          <p className="mt-1 text-sm text-white/85">{spec.message}</p>
        </div>
        <button
          type="button"
          onClick={() => { setLeaving(true); setTimeout(() => setSpec(null), 350); }}
          aria-label="Cerrar"
          className="absolute top-2 right-2 w-7 h-7 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes toast-in  { from { opacity: 0; transform: translateY(-12px) translateX(8px); } to { opacity: 1; transform: none; } }
        @keyframes toast-out { from { opacity: 1; } to { opacity: 0; transform: translateY(-8px); } }
      `}</style>
    </div>
  );
}
