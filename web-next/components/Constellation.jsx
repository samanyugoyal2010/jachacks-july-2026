"use client";
import { useEffect, useRef } from "react";
import { nodeColor } from "../lib/theme";

// Self-contained force-directed "knowledge constellation" on a canvas.
// No external graph lib — glowing nodes sized by connection count, faint light
// trails for edges, a red pulsing trail for a veto.
export default function Constellation({ nodes, edges, onPick, highlight }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const sim = useRef({ pos: new Map(), W: 800, H: 600, t: 0 });
  const live = useRef({ nodes, edges, highlight, onPick });
  live.current = { nodes, edges, highlight: highlight || new Set(), onPick };

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      sim.current.W = r.width; sim.current.H = r.height;
      canvas.width = r.width * dpr; canvas.height = r.height * dpr;
      canvas.style.width = r.width + "px"; canvas.style.height = r.height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(wrap);

    const hit = (mx, my) => {
      const { nodes: ns } = live.current;
      for (let i = ns.length - 1; i >= 0; i--) {
        const p = sim.current.pos.get(ns[i].id); if (!p) continue;
        const r = 4 + Math.sqrt((p.deg || 0) + 1) * 3;
        if ((mx - p.x) ** 2 + (my - p.y) ** 2 < (r + 6) ** 2) return ns[i].id;
      }
      return null;
    };
    const onClick = (e) => {
      const r = canvas.getBoundingClientRect();
      const id = hit(e.clientX - r.left, e.clientY - r.top);
      if (id && live.current.onPick) live.current.onPick(id);
    };
    canvas.addEventListener("click", onClick);

    const step = () => {
      const { nodes: ns, edges: es, highlight: hl } = live.current;
      const { W, H } = sim.current;
      const P = sim.current.pos;
      sim.current.t += 1;

      // degree
      const deg = {};
      es.forEach((e) => { deg[e.src] = (deg[e.src] || 0) + 1; deg[e.dst] = (deg[e.dst] || 0) + 1; });
      // ensure every node has a position
      const ids = new Set(ns.map((n) => n.id));
      ns.forEach((n, i) => {
        if (!P.has(n.id)) {
          const a = i * 2.399, rr = 150 + (i % 5) * 40;
          P.set(n.id, { x: W / 2 + Math.cos(a) * rr, y: H / 2 + Math.sin(a) * rr, vx: 0, vy: 0 });
        }
        P.get(n.id).deg = deg[n.id] || 0;
      });
      for (const k of [...P.keys()]) if (!ids.has(k)) P.delete(k);

      // forces
      const arr = ns.map((n) => P.get(n.id));
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          let dx = arr[i].x - arr[j].x, dy = arr[i].y - arr[j].y;
          let d2 = dx * dx + dy * dy || 0.01;
          const f = 9000 / d2;
          const d = Math.sqrt(d2);
          const ux = dx / d, uy = dy / d;
          arr[i].vx += ux * f; arr[i].vy += uy * f;
          arr[j].vx -= ux * f; arr[j].vy -= uy * f;
        }
      }
      es.forEach((e) => {
        const a = P.get(e.src), b = P.get(e.dst); if (!a || !b) return;
        let dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (d - 130) * 0.02;
        const ux = dx / d, uy = dy / d;
        a.vx += ux * f; a.vy += uy * f; b.vx -= ux * f; b.vy -= uy * f;
      });
      arr.forEach((p) => {
        p.vx += (W / 2 - p.x) * 0.006; p.vy += (H / 2 - p.y) * 0.006;
        p.vx *= 0.85; p.vy *= 0.85;
        p.x += p.vx; p.y += p.vy;
      });

      // ---- draw ----
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      es.forEach((e) => {
        const a = P.get(e.src), b = P.get(e.dst); if (!a || !b) return;
        const veto = e.rel === "vetoes";
        const restricted = e.rel === "restricted_from";
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        if (veto) {
          ctx.strokeStyle = "rgba(255,92,108,0.85)"; ctx.lineWidth = 2.2;
          ctx.setLineDash([5, 4]); ctx.lineDashOffset = -sim.current.t * 0.5;
        } else if (restricted) {
          ctx.strokeStyle = "rgba(255,92,108,0.28)"; ctx.lineWidth = 0.8; ctx.setLineDash([2, 4]);
        } else if (e.rel === "cites") {
          ctx.strokeStyle = "rgba(45,212,191,0.28)"; ctx.lineWidth = 0.7; ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = "rgba(130,150,190,0.16)"; ctx.lineWidth = 0.8; ctx.setLineDash([]);
        }
        ctx.stroke(); ctx.setLineDash([]);
      });
      ns.forEach((n) => {
        const p = P.get(n.id); if (!p) return;
        const c = nodeColor(n);
        const r = 4 + Math.sqrt((p.deg || 0) + 1) * 3;
        const on = hl.has(n.id);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * (on ? 5.5 : 3.6));
        g.addColorStop(0, c + "dd"); g.addColorStop(0.4, c + "33"); g.addColorStop(1, c + "00");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * (on ? 5.5 : 3.6), 0, 7); ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";
      ns.forEach((n) => {
        const p = P.get(n.id); if (!p) return;
        const c = nodeColor(n);
        const r = 4 + Math.sqrt((p.deg || 0) + 1) * 3;
        const on = hl.has(n.id);
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fillStyle = c; ctx.fill();
        ctx.lineWidth = on ? 2 : 0.8; ctx.strokeStyle = on ? "#fff" : c; ctx.stroke();
        ctx.font = `${on ? 700 : 500} 10px -apple-system, sans-serif`;
        ctx.fillStyle = on ? "#fff" : "rgba(200,212,228,0.78)";
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(n.label || "", p.x, p.y + r + 3);
      });
      raf = requestAnimationFrame(step);
    };
    step();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); canvas.removeEventListener("click", onClick); };
  }, []);

  return <div ref={wrapRef} style={{ position: "absolute", inset: 0 }}><canvas ref={canvasRef} style={{ cursor: "pointer" }} /></div>;
}
