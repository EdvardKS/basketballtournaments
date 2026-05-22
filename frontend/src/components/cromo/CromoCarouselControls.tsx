// SPEC-013: client-side controls for CromoCarousel.astro.
//
// The Astro wrapper SSR-renders all the slides; this island then takes
// over the track (selected by `[data-cromo-track]`) and slides it with
// GSAP. It also keeps `data-active="true"` in sync on the active slide's
// `#cromo-root` so CromoShare can capture the right node.
//
// Why a React island vs. inline script: state (activeIndex), buttons,
// keyboard nav and `aria-live` updates are easier and safer with React.
// The animation engine is GSAP (already in deps).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";

interface Dot {
  index: number;
  themeFrame: string;
  themeGlow: string;
  label: string;
}

interface Props {
  dots: Dot[];
}

const ArrowLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
const ArrowRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export default function CromoCarouselControls({ dots }: Props) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLElement | null>(null);
  const total = dots.length;

  // Locate the track lazily — Astro's hydration sometimes mounts the
  // island before the surrounding markup is fully attached.
  const ensureTrack = useCallback(() => {
    if (trackRef.current) return trackRef.current;
    const el = document.querySelector<HTMLElement>("[data-cromo-track]");
    trackRef.current = el;
    return el;
  }, []);

  const setActiveData = useCallback((idx: number) => {
    document.querySelectorAll<HTMLElement>(".cromo-slide #cromo-root").forEach((el) => {
      const slide = el.closest<HTMLElement>(".cromo-slide");
      const i = slide ? Number(slide.dataset.slideIndex) : -1;
      el.dataset.active = i === idx ? "true" : "false";
    });
  }, []);

  const slideTo = useCallback((idx: number, animate = true) => {
    const clamped = Math.max(0, Math.min(total - 1, idx));
    const track = ensureTrack();
    if (!track) return;
    const slide = track.querySelector<HTMLElement>(`.cromo-slide[data-slide-index="${clamped}"]`);
    const w = slide?.getBoundingClientRect().width ?? track.getBoundingClientRect().width;
    gsap.killTweensOf(track);
    if (animate) {
      gsap.to(track, { x: -clamped * w, duration: 0.45, ease: "power2.out" });
    } else {
      gsap.set(track, { x: -clamped * w });
    }
    setActive(clamped);
    setActiveData(clamped);
  }, [ensureTrack, setActiveData, total]);

  // Initial sync after mount.
  useEffect(() => {
    slideTo(0, false);
    setActiveData(0);
    const onResize = () => slideTo(active, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard nav.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  slideTo(active - 1);
      if (e.key === "ArrowRight") slideTo(active + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, slideTo]);

  // Touch swipe (basic — works on top of the slide; mobile-friendly).
  const touch = useRef<{ x: number; t: number } | null>(null);
  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      touch.current = { x: e.touches[0].clientX, t: Date.now() };
    };
    const onEnd = (e: TouchEvent) => {
      if (!touch.current) return;
      const dx = e.changedTouches[0].clientX - touch.current.x;
      const dt = Date.now() - touch.current.t;
      touch.current = null;
      if (Math.abs(dx) < 30 || dt > 800) return;
      slideTo(dx < 0 ? active + 1 : active - 1);
    };
    const track = ensureTrack();
    if (!track) return;
    track.addEventListener("touchstart", onStart, { passive: true });
    track.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      track.removeEventListener("touchstart", onStart);
      track.removeEventListener("touchend", onEnd);
    };
  }, [active, ensureTrack, slideTo]);

  const activeLabel = useMemo(() => dots[active]?.label ?? "", [active, dots]);

  // Single cromo: keep data-active=true on slide 0, render nothing else.
  useEffect(() => {
    if (total <= 1) setActiveData(0);
  }, [setActiveData, total]);

  if (total <= 1) return null;

  return (
    <div className="cromo-carousel-controls">
      <p className="sr-only" aria-live="polite">{activeLabel}</p>
      <button
        type="button"
        className="cromo-nav cromo-nav-prev"
        aria-label="Cromo anterior"
        disabled={active === 0}
        onClick={() => slideTo(active - 1)}
      ><ArrowLeft /></button>
      <button
        type="button"
        className="cromo-nav cromo-nav-next"
        aria-label="Cromo siguiente"
        disabled={active === total - 1}
        onClick={() => slideTo(active + 1)}
      ><ArrowRight /></button>
      <div className="cromo-dots" role="tablist" aria-label="Cromos del jugador">
        {dots.map((d) => (
          <button
            key={d.index}
            role="tab"
            aria-selected={d.index === active}
            aria-label={d.label}
            className={`cromo-dot${d.index === active ? " is-active" : ""}`}
            style={{
              background: d.index === active ? d.themeFrame : "rgba(255,255,255,0.25)",
              boxShadow: d.index === active ? `0 0 12px ${d.themeGlow}` : "none",
            }}
            onClick={() => slideTo(d.index)}
          />
        ))}
      </div>
      <style>{`
        .cromo-carousel-controls {
          position: relative;
          width: 100%;
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .cromo-nav {
          position: absolute;
          top: -350px;
          width: 38px; height: 38px;
          border-radius: 999px;
          display: inline-flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.55);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.18);
          backdrop-filter: blur(6px);
          cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease;
          z-index: 20;
        }
        .cromo-nav:hover:not(:disabled) { transform: scale(1.08); background: rgba(0,0,0,0.7); }
        .cromo-nav:disabled { opacity: 0.4; cursor: not-allowed; }
        .cromo-nav-prev { left: 4px; }
        .cromo-nav-next { right: 4px; }
        .cromo-dots { display: inline-flex; gap: 8px; }
        .cromo-dot {
          width: 9px; height: 9px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .cromo-dot:hover { transform: scale(1.25); }
        .cromo-dot.is-active { transform: scale(1.35); }
        .sr-only {
          position: absolute; width: 1px; height: 1px;
          padding: 0; margin: -1px; overflow: hidden;
          clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
        }
      `}</style>
    </div>
  );
}
