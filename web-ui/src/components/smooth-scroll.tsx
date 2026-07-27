"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Lenis lives in the root layout, so it survives route changes. Without a resync
 * it keeps the scroll offset from the previous (much taller) page and writes it
 * back on the next frame, undoing Next's scroll-to-top — which lands you partway
 * down a short page and breaks reveal-on-scroll. Reset it on every navigation.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const lenis = new Lenis({
      duration: 0.9,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1,
    });
    lenisRef.current = lenis;

    let raf = 0;
    function tick(time: number) {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Snap to the top of every new route, and keep Lenis's internal offset in sync.
  useEffect(() => {
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
      lenis.resize();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
