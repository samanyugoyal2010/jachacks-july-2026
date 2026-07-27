"use client";

import { useEffect, useRef } from "react";

export function BackgroundGlow() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    let raf = 0;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    function onPointerMove(e: PointerEvent) {
      target.x = e.clientX / window.innerWidth - 0.5;
      target.y = e.clientY / window.innerHeight - 0.5;
    }

    function tick() {
      current.x += (target.x - current.x) * 0.03;
      current.y += (target.y - current.y) * 0.03;
      if (gridRef.current) {
        gridRef.current.style.transform = `translate(${current.x * -30}px, ${current.y * -30}px)`;
      }
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", onPointerMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      <div
        ref={gridRef}
        className="absolute -inset-8"
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in oklch, white 22%, transparent) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 90%)",
        }}
      />
    </div>
  );
}
