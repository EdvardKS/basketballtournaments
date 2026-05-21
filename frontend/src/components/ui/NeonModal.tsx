import { useEffect, type ReactNode } from "react";
import { useModalEnter } from "../../lib/neon.js";
import NeonButton from "./NeonButton.js";

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Extra controls on the right of the header — usually a save button. */
  rightSlot?: ReactNode;
  /** Hide the Cancelar button (useful for confirmation dialogs). */
  hideCancel?: boolean;
}

export default function NeonModal({
  open, title, subtitle, onClose, children, rightSlot, hideCancel,
}: Props) {
  const { backdropRef, panelRef } = useModalEnter(open);

  // Lock body scroll while open + close on Esc.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={title}>
      <div ref={backdropRef} className="neon-modal-backdrop" onClick={onClose} />
      <div ref={panelRef} className="neon-modal-panel">
        <header className="neon-modal-header px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0" data-modal-item>
            <p className="neon-section-overline">Editor</p>
            <h2 className="font-hero text-xl sm:text-2xl text-white leading-none">{title}</h2>
            {subtitle && <p className="text-xs text-court-muted mt-1 truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0" data-modal-item>
            {rightSlot}
            {!hideCancel && (
              <NeonButton variant="ghost" size="sm" onClick={onClose}>Cancelar</NeonButton>
            )}
            <button
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="w-9 h-9 rounded-full border border-court-border flex items-center justify-center text-white hover:bg-white/10 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6" data-modal-item>
          <div className="max-w-3xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
