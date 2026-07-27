"use client";

import { useEffect, useRef } from "react";

interface MagneticProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  radius?: number;
}

export function Magnetic({
  children,
  className,
  strength = 0.18,
  radius = 24,
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    let raf = 0;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    function onPointerMove(e: PointerEvent) {
      if (!node) return;
      // Measure against the element's untranslated box so the field doesn't
      // drift along with the element while it's being pulled.
      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2 - current.x;
      const cy = rect.top + rect.height / 2 - current.y;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      // Distance from the cursor to the nearest edge of the element, so
      // `radius` reads as "how close to the button before it reacts".
      const edgeX = Math.max(0, Math.abs(dx) - rect.width / 2);
      const edgeY = Math.max(0, Math.abs(dy) - rect.height / 2);
      const edgeDist = Math.hypot(edgeX, edgeY);

      if (edgeDist < radius) {
        // Ease the pull off toward the boundary so it never snaps on.
        const falloff = 1 - edgeDist / radius;
        target.x = dx * strength * falloff;
        target.y = dy * strength * falloff;
      } else {
        target.x = 0;
        target.y = 0;
      }
    }

    function tick() {
      current.x += (target.x - current.x) * 0.2;
      current.y += (target.y - current.y) * 0.2;
      if (node) {
        node.style.transform = `translate(${current.x}px, ${current.y}px)`;
      }
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", onPointerMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(raf);
    };
  }, [strength, radius]);

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
