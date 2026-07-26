"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: "fade" | "tilt";
}

export function FadeIn({
  children,
  className,
  delay = 0,
  variant = "fade",
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "-40px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (variant === "tilt") {
    return (
      <div ref={ref} className={className} style={{ perspective: "1200px" }}>
        <div
          className={cn(
            "transition-all duration-700 ease-out",
            visible ? "opacity-100" : "opacity-0",
          )}
          style={{
            transitionDelay: visible ? `${delay}ms` : "0ms",
            transform: visible
              ? "rotateX(0deg) translateY(0)"
              : "rotateX(14deg) translateY(28px)",
            transformOrigin: "bottom center",
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-500 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        className,
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
