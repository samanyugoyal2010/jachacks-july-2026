"use client";

import { useEffect, useRef, useState } from "react";
import { IconRefresh } from "~/components/icons";
import type { ThoughtGraph } from "~/lib/audit/obsidian";
import { useForceLayout } from "~/lib/audit/use-force-layout";
import { cn } from "~/lib/utils";

const statusColor: Record<string, string> = {
  pending: "var(--color-muted-foreground)",
  active: "var(--color-secondary)",
  complete: "var(--color-success)",
  approved: "var(--color-success)",
  veto: "var(--color-destructive)",
};

const MIN_ZOOM = 0.85;
const MAX_ZOOM = 2.5;
const FIT_MAX = 1.45; // fit may enlarge, never shrink past MIN_ZOOM

function radiusFor(kind: string, flagged: boolean | undefined) {
  if (kind === "stage") return 26;
  if (kind === "evidence") return flagged ? 7 : 5;
  return 6;
}

interface Camera {
  x: number;
  y: number;
  scale: number;
}

interface ObsidianGraphProps {
  graph: ThoughtGraph;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
}

export function ObsidianGraph({
  graph,
  selectedNodeId,
  onSelectNode,
}: ObsidianGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 900, height: 560 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });

  const panRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    camX: number;
    camY: number;
  } | null>(null);

  // Once the user pans or zooms, stop auto-fitting so we don't fight them.
  const userMovedRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { simNodes, startDrag, drag, endDrag } = useForceLayout(
    graph.nodes,
    graph.links,
    size.width,
    size.height,
  );

  const nodeById = new Map(simNodes.map((n) => [n.id, n]));
  const hovered = hoveredId ? nodeById.get(hoveredId) : null;

  function toWorldPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - camera.x) / camera.scale,
      y: (clientY - rect.top - camera.y) / camera.scale,
    };
  }

  function handleBackgroundPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    svgRef.current?.setPointerCapture(e.pointerId);
    panRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      camX: camera.x,
      camY: camera.y,
    };
  }

  function handleBackgroundPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const pan = panRef.current;
    if (!pan?.active) return;
    userMovedRef.current = true;
    setCamera((prev) => ({
      ...prev,
      x: pan.camX + (e.clientX - pan.startX),
      y: pan.camY + (e.clientY - pan.startY),
    }));
  }

  function endPan() {
    if (panRef.current) panRef.current.active = false;
  }

  function zoomAt(clientX: number, clientY: number, factor: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    userMovedRef.current = true;
    setCamera((prev) => {
      const nextScale = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, prev.scale * factor),
      );
      const worldX = (sx - prev.x) / prev.scale;
      const worldY = (sy - prev.y) / prev.scale;
      return {
        scale: nextScale,
        x: sx - worldX * nextScale,
        y: sy - worldY * nextScale,
      };
    });
  }

  // Frame every node (plus its label) inside the container.
  function computeFit(): Camera | null {
    if (!simNodes.length || !size.width || !size.height) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of simNodes) {
      const r = radiusFor(n.kind, n.flagged);
      const padTop = n.kind === "stage" ? r + 8 : r;
      const padBottom = n.kind === "stage" ? r + 30 : r; // room for the label
      minX = Math.min(minX, n.x - r - (n.kind === "stage" ? 74 : 0));
      maxX = Math.max(maxX, n.x + r + (n.kind === "stage" ? 74 : 0));
      minY = Math.min(minY, n.y - padTop);
      maxY = Math.max(maxY, n.y + padBottom);
    }
    const margin = 34;
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    const scale = Math.min(
      MAX_ZOOM,
      Math.max(
        MIN_ZOOM,
        Math.min(
          (size.width - margin * 2) / w,
          (size.height - margin * 2) / h,
          FIT_MAX,
        ),
      ),
    );
    return {
      scale,
      x: size.width / 2 - ((minX + maxX) / 2) * scale,
      y: size.height / 2 - ((minY + maxY) / 2) * scale,
    };
  }

  // Keep the graph framed while the simulation settles (and on resize),
  // but bail out once it converges so we don't loop on our own state.
  useEffect(() => {
    if (userMovedRef.current) return;
    const fit = computeFit();
    if (!fit) return;
    setCamera((prev) => {
      const settled =
        Math.abs(prev.x - fit.x) < 0.5 &&
        Math.abs(prev.y - fit.y) < 0.5 &&
        Math.abs(prev.scale - fit.scale) < 0.005;
      return settled ? prev : fit;
    });
  });

  function resetCamera() {
    userMovedRef.current = false;
    setCamera(computeFit() ?? { x: 0, y: 0, scale: 1 });
  }

  const hoveredScreenX = hovered ? camera.x + hovered.x * camera.scale : 0;
  const hoveredScreenY = hovered ? camera.y + hovered.y * camera.scale : 0;

  return (
    <div
      ref={containerRef}
      className="relative h-[480px] w-full overflow-hidden rounded-xl border border-border/60 bg-card/70 shadow-lg shadow-black/5 backdrop-blur-xl backdrop-saturate-150 sm:h-[560px]"
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${size.width} ${size.height}`}
        className="cursor-grab touch-none select-none active:cursor-grabbing"
        role="img"
        aria-label="Model thought-process graph — drag to pan, scroll to zoom"
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={handleBackgroundPointerMove}
        onPointerUp={endPan}
        onPointerLeave={endPan}
        onWheel={(e) => {
          e.preventDefault();
          zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.08 : 0.92);
        }}
      >
        <title>Model thought-process graph</title>
        <g
          transform={`translate(${camera.x} ${camera.y}) scale(${camera.scale})`}
        >
          <g opacity={0.35}>
            {graph.links.map((link) => {
              const a = nodeById.get(link.source);
              const b = nodeById.get(link.target);
              if (!a || !b) return null;
              return (
                <line
                  key={`${link.source}-${link.target}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--color-border)"
                  strokeWidth={
                    a.kind === "stage" && b.kind === "stage" ? 1.5 : 1
                  }
                />
              );
            })}
          </g>

          {simNodes.map((n) => {
            const color = n.flagged
              ? "var(--color-destructive)"
              : statusColor[n.status];
            const r = radiusFor(n.kind, n.flagged);
            const selected = n.id === selectedNodeId;
            const dimmed = n.kind !== "stage" && n.status === "pending";
            return (
              // biome-ignore lint/a11y/useSemanticElements: SVG <g> can't be a native <button>; this is a canvas-like node graph.
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                onPointerEnter={() => setHoveredId(n.id)}
                onPointerLeave={() =>
                  setHoveredId((cur) => (cur === n.id ? null : cur))
                }
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  startDrag(n.id);
                }}
                onPointerMove={(e) => {
                  if (e.buttons !== 1) return;
                  const p = toWorldPoint(e.clientX, e.clientY);
                  drag(n.id, p.x, p.y);
                }}
                onPointerUp={endDrag}
                onClick={() => n.kind === "stage" && onSelectNode(n.id)}
                role="button"
                tabIndex={0}
                aria-label={n.label}
                className={cn(
                  "transition-opacity duration-200 ease-out",
                  n.kind === "stage" ? "cursor-pointer" : "cursor-default",
                  dimmed && "opacity-40",
                )}
              >
                {n.kind === "stage" && (
                  <circle
                    r={r + 6}
                    fill="none"
                    stroke={color}
                    strokeWidth={selected ? 2 : 0}
                    opacity={0.5}
                  />
                )}
                <circle
                  r={r}
                  fill={color}
                  style={{
                    filter: `drop-shadow(0 0 ${n.kind === "stage" ? 6 : 3}px ${color})`,
                  }}
                  opacity={n.kind === "stage" ? 1 : 0.85}
                />
                {n.kind === "stage" && (
                  <text
                    y={r + 21}
                    textAnchor="middle"
                    className="font-display pointer-events-none fill-foreground text-[15px] font-bold"
                    style={{ paintOrder: "stroke", stroke: "var(--color-background)", strokeWidth: 4 }}
                  >
                    {n.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {hovered && hovered.kind !== "stage" && (
        <div
          className="animate-fade-in-up pointer-events-none absolute z-10 max-w-64 rounded-lg border border-border/60 bg-popover/95 px-3 py-2 text-xs text-popover-foreground shadow-lg backdrop-blur-xl"
          style={{
            left: Math.min(hoveredScreenX + 16, size.width - 260),
            top: Math.max(hoveredScreenY - 12, 8),
          }}
        >
          {hovered.label}
        </div>
      )}

      <button
        type="button"
        onClick={resetCamera}
        className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-md border border-border/60 bg-background/70 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur transition-colors hover:text-foreground active:scale-95"
      >
        <IconRefresh className="size-3" />
        Reset view
      </button>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-background/70 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur">
        Drag canvas to pan · scroll to zoom · drag a node to move it
      </div>
    </div>
  );
}
