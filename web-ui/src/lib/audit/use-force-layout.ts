"use client";

import { useEffect, useRef, useState } from "react";
import type { ThoughtLink, ThoughtNode } from "./obsidian";

export interface SimNode extends ThoughtNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const REPEL_STAGE = 34000;
const REPEL_LEAF = 280;
const LINK_DIST_STAGE = 165;
const LINK_DIST_LEAF = 58;
const LINK_STRENGTH = 0.045;
const CENTER_STRENGTH = 0.0016;
const DAMPING = 0.82;
const ALPHA_DECAY = 0.986;

export function useForceLayout(
  nodes: ThoughtNode[],
  links: ThoughtLink[],
  width: number,
  height: number,
) {
  const simRef = useRef(new Map<string, SimNode>());
  const alphaRef = useRef(1);
  const draggingRef = useRef<string | null>(null);
  const [, forceRender] = useState(0);

  // Sync incoming logical nodes into the persistent simulation map.
  useEffect(() => {
    const sim = simRef.current;
    const incomingIds = new Set(nodes.map((n) => n.id));
    for (const id of Array.from(sim.keys())) {
      if (!incomingIds.has(id)) sim.delete(id);
    }

    let grew = false;
    // Seed new nodes on a wide ring instead of all at the centre. Spawning them
    // on top of each other is what made the graph "cave in" — the physics then
    // had to un-collapse a pile, and often didn't before alpha ran out.
    const total = Math.max(nodes.length, 1);
    const ringR = Math.max(150, Math.min(width, height) * 0.36);
    nodes.forEach((n, i) => {
      const existing = sim.get(n.id);
      if (existing) {
        existing.label = n.label;
        existing.status = n.status;
        existing.flagged = n.flagged;
        return;
      }
      grew = true;
      const parent = n.stageId !== n.id ? sim.get(n.stageId) : undefined;
      if (parent) {
        // satellites sit near their stage
        const a = (i / total) * Math.PI * 2;
        sim.set(n.id, { ...n, x: parent.x + Math.cos(a) * 40, y: parent.y + Math.sin(a) * 40, vx: 0, vy: 0 });
      } else {
        // stage nodes: evenly spaced around a ring, deterministic
        const a = (i / total) * Math.PI * 2 - Math.PI / 2;
        sim.set(n.id, {
          ...n,
          x: width / 2 + Math.cos(a) * ringR,
          y: height / 2 + Math.sin(a) * ringR * 0.72,
          vx: 0,
          vy: 0,
        });
      }
    });
    if (grew) alphaRef.current = Math.max(alphaRef.current, 0.9);
  }, [nodes, width, height]);

  useEffect(() => {
    let raf = 0;

    function tick() {
      const sim = simRef.current;
      const alpha = alphaRef.current;

      if (alpha > 0.001) {
        const arr = Array.from(sim.values());

        for (let i = 0; i < arr.length; i++) {
          const a = arr[i];
          for (let j = i + 1; j < arr.length; j++) {
            const b = arr[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            let distSq = dx * dx + dy * dy;
            const MIN_SEP = a.kind === "stage" && b.kind === "stage" ? 118 : 24;
            if (distSq < MIN_SEP * MIN_SEP) distSq = MIN_SEP * MIN_SEP * 0.42;
            const dist = Math.sqrt(distSq);
            const strength =
              (a.kind === "stage" && b.kind === "stage"
                ? REPEL_STAGE
                : REPEL_LEAF) * alpha;
            const force = strength / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.vx -= fx;
            a.vy -= fy;
            b.vx += fx;
            b.vy += fy;
          }
        }

        for (const link of links) {
          const a = sim.get(link.source);
          const b = sim.get(link.target);
          if (!a || !b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const target =
            a.kind === "stage" && b.kind === "stage"
              ? LINK_DIST_STAGE
              : LINK_DIST_LEAF;
          const diff = ((dist - target) / dist) * LINK_STRENGTH * alpha;
          const fx = dx * diff;
          const fy = dy * diff;
          if (draggingRef.current !== link.source) {
            a.vx += fx;
            a.vy += fy;
          }
          if (draggingRef.current !== link.target) {
            b.vx -= fx;
            b.vy -= fy;
          }
        }

        for (const n of arr) {
          if (draggingRef.current === n.id) continue;
          n.vx += (width / 2 - n.x) * CENTER_STRENGTH * alpha;
          n.vy += (height / 2 - n.y) * CENTER_STRENGTH * alpha;
          n.vx *= DAMPING;
          n.vy *= DAMPING;
          n.x += n.vx;
          n.y += n.vy;
        }

        alphaRef.current *= ALPHA_DECAY;
        forceRender((t) => t + 1);
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [links, width, height]);

  function startDrag(id: string) {
    draggingRef.current = id;
    alphaRef.current = Math.max(alphaRef.current, 0.3);
  }

  function drag(id: string, x: number, y: number) {
    const n = simRef.current.get(id);
    if (!n) return;
    n.x = x;
    n.y = y;
    n.vx = 0;
    n.vy = 0;
    forceRender((t) => t + 1);
  }

  function endDrag() {
    draggingRef.current = null;
  }

  return {
    simNodes: Array.from(simRef.current.values()),
    startDrag,
    drag,
    endDrag,
  };
}
