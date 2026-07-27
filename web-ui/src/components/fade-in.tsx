"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: "fade" | "tilt";
}

/**
 * Entrance animation that CANNOT hide content.
 *
 * The previous version parked the element at `opacity-0` and relied on an
 * IntersectionObserver flipping it to `opacity-100`. Two things could strand it
 * invisible — the observer's first callback reporting a miss (Lenis restored a
 * stale scroll offset across routes, guaranteeing this), or the class-swap
 * transition never ticking. Either way the whole landing page rendered blank,
 * because every section on it is wrapped in this component.
 *
 * So the resting state is now *visible*. The entrance is a keyframe animation,
 * which by construction can only ever finish at the element's natural opacity.
 * If the animation never runs, the content is simply there.
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  variant = "fade",
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPlay(true);
          observer.disconnect();
        }
      },
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(play && "animate-fade-in-up", className)}
      style={play && delay ? { animationDelay: `${delay}ms` } : undefined}
      data-variant={variant}
    >
      {children}
    </div>
  );
}
