import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TourStep = {
  id: string;
  selector: string;
  title: string;
  body: string;
  durationMs?: number;
};

interface GuidedTourProps {
  steps: TourStep[];
  storageKey: string;
  enabled?: boolean;
}

export function GuidedTour({ steps, storageKey, enabled = true }: GuidedTourProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const finishTour = useCallback(() => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, "1");
      } catch {}
    }
    setActiveIndex(null);
    setTargetElement(null);
    setTargetRect(null);
  }, [storageKey]);

  const advanceTo = useCallback((startIndex: number) => {
    if (!enabled || steps.length === 0) {
      finishTour();
      return;
    }

    for (let i = startIndex; i < steps.length; i += 1) {
      const element = document.querySelector(steps[i].selector) as HTMLElement | null;
      if (element) {
        setActiveIndex(i);
        setTargetElement(element);
        return;
      }
    }

    finishTour();
  }, [enabled, finishTour, steps]);

  useEffect(() => {
    if (!enabled || !storageKey || steps.length === 0) return;
    const seen = localStorage.getItem(storageKey);
    if (seen === "1") return;
    advanceTo(0);
  }, [advanceTo, enabled, steps.length, storageKey]);

  useEffect(() => {
    if (activeIndex === null) return;
    const step = steps[activeIndex];
    const duration = step?.durationMs ?? 5500;
    const timer = window.setTimeout(() => advanceTo(activeIndex + 1), duration);
    return () => window.clearTimeout(timer);
  }, [activeIndex, advanceTo, steps]);

  useEffect(() => {
    if (!targetElement) return;
    const updateRect = () => setTargetRect(targetElement.getBoundingClientRect());
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [targetElement]);

  const tooltipPosition = useMemo(() => {
    if (!targetRect) return null;
    const width = 280;
    const height = 140;
    const padding = 12;

    let left = Math.min(Math.max(targetRect.left, padding), window.innerWidth - width - padding);
    let top = targetRect.bottom + padding;
    if (top + height > window.innerHeight) {
      top = targetRect.top - height - padding;
    }
    if (top < padding) top = padding;

    return { left, top, width };
  }, [targetRect]);

  if (activeIndex === null || !targetRect || !tooltipPosition) return null;

  const step = steps[activeIndex];

  return createPortal(
    <div className="fixed inset-0 z-[60] pointer-events-none">
      <div
        className="absolute rounded-xl border border-primary/60 shadow-[0_0_0_9999px_rgba(2,6,23,0.7)]"
        style={{
          top: targetRect.top - 6,
          left: targetRect.left - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
        }}
      />
      <div
        className="absolute pointer-events-auto rounded-xl border border-primary/40 bg-card/95 p-4 text-sm text-foreground shadow-xl"
        style={{ top: tooltipPosition.top, left: tooltipPosition.left, width: tooltipPosition.width }}
      >
        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-primary">
          {step.title}
        </div>
        <p className="text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Paso {activeIndex + 1} / {steps.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={(event) => {
                event.preventDefault();
                finishTour();
              }}
            >
              Cerrar
            </Button>
            <Button
              size="sm"
              className={cn("h-7 px-3 text-xs")}
              onClick={(event) => {
                event.preventDefault();
                advanceTo(activeIndex + 1);
              }}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
