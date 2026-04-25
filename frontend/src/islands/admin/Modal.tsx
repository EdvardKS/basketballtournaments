import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
};

export default function Modal({ open, title, subtitle, onClose, children, size = "md" }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  // Portal to body so the modal isn't trapped by an ancestor's `transform`,
  // `filter` or `backdrop-filter`, which would re-anchor `position: fixed`
  // to that ancestor and offset the centering.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start sm:items-center justify-center p-4 sm:p-8 overflow-y-auto"
         style={{ animation: "modal-bg 0.2s ease both" }}>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative w-full ${SIZE[size]} max-h-[calc(100vh-4rem)] overflow-y-auto rounded-2xl border border-white/10`}
        style={{
          // Solid panel — no transparency. Subtle dark gradient + neon edge glow.
          background: "linear-gradient(180deg, #14192a 0%, #0c1120 100%)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,107,0,0.08), 0 0 28px rgba(255,107,0,0.18)",
          animation: "modal-pop 0.32s cubic-bezier(.2,.8,.2,1) both",
        }}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-white/10"
                style={{ background: "#0c1120" }}>
          <div className="min-w-0">
            <h2 id="modal-title" className="font-hero text-2xl sm:text-3xl text-white leading-none">{title}</h2>
            {subtitle && <p className="text-court-muted text-sm mt-1.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>
        <div className="p-5 sm:p-6">{children}</div>
      </div>

      <style>{`
        @keyframes modal-bg  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modal-pop { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>,
    document.body,
  );
}
