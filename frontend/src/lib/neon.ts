// GSAP helpers shared across neon UI primitives.
// Everything is lazy-imported so the main bundle stays light, and every
// animation no-ops when the user prefers reduced motion.
import { useEffect, useRef } from "react";

type Gsap = typeof import("gsap").default;

let gsapPromise: Promise<Gsap> | null = null;
export const loadGsap = (): Promise<Gsap> => {
  if (!gsapPromise) {
    gsapPromise = import("gsap").then((m) => m.default ?? m.gsap);
  }
  return gsapPromise;
};

export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined"
  && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Stagger-reveal children that carry `data-reveal` on mount. */
export const useRevealStagger = <T extends HTMLElement = HTMLDivElement>(
  deps: unknown[] = [],
) => {
  const ref = useRef<T>(null);
  useEffect(() => {
    let cancelled = false;
    if (prefersReducedMotion()) return;
    void (async () => {
      if (!ref.current) return;
      const gsap = await loadGsap();
      if (cancelled || !ref.current) return;
      const targets = ref.current.querySelectorAll<HTMLElement>("[data-reveal]");
      if (targets.length === 0) return;
      gsap.from(targets, {
        opacity: 0, y: 8,
        duration: 0.45, ease: "power3.out",
        stagger: 0.045,
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
};

/** Modal open timeline: backdrop fade + panel scale-in + content stagger. */
export const useModalEnter = (open: boolean) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    if (prefersReducedMotion()) return;
    let cancelled = false;
    void (async () => {
      const gsap = await loadGsap();
      if (cancelled) return;
      const tl = gsap.timeline();
      if (backdropRef.current) {
        tl.from(backdropRef.current, { opacity: 0, duration: 0.22, ease: "power2.out" }, 0);
      }
      if (panelRef.current) {
        tl.from(panelRef.current, {
          opacity: 0, y: 12, scale: 0.96,
          duration: 0.35, ease: "power3.out",
        }, 0.05);
        const children = panelRef.current.querySelectorAll<HTMLElement>("[data-modal-item]");
        if (children.length > 0) {
          tl.from(children, {
            opacity: 0, y: 6,
            duration: 0.3, ease: "power2.out", stagger: 0.03,
          }, 0.18);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [open]);
  return { backdropRef, panelRef };
};

/** Tween a number into an element's textContent (integer). */
export const tweenNumber = async (
  el: HTMLElement | null, from: number, to: number, duration = 0.45,
) => {
  if (!el) return;
  if (prefersReducedMotion()) {
    el.textContent = String(Math.round(to));
    return;
  }
  const gsap = await loadGsap();
  const obj = { v: from };
  gsap.to(obj, {
    v: to, duration, ease: "power2.out",
    onUpdate: () => { el.textContent = String(Math.round(obj.v)); },
  });
};

/** Flash a quick orange success pulse class onto an element. */
export const successBurst = (el: HTMLElement | null) => {
  if (!el) return;
  el.classList.remove("neon-btn-success-burst");
  // Force reflow so the animation restarts even on rapid clicks.
  void el.offsetWidth;
  el.classList.add("neon-btn-success-burst");
};

export const errorShake = (el: HTMLElement | null) => {
  if (!el) return;
  el.classList.remove("neon-btn-error-shake");
  void el.offsetWidth;
  el.classList.add("neon-btn-error-shake");
};
