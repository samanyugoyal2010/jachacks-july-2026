"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Circle, FastForward, PauseCircle } from "lucide-react";

const graphNodes = [
  { id: "transfer", label: "$4,800 Transfer", x: 8, y: 38, tone: "neutral" },
  { id: "recipient", label: "New Recipient", x: 36, y: 16, tone: "neutral" },
  { id: "caller", label: "Unknown Caller", x: 36, y: 60, tone: "neutral" },
  { id: "instruction", label: "“Safe Account” Instruction", x: 62, y: 38, tone: "warning" },
  { id: "risk", label: "94 Critical Risk", x: 70, y: 12, tone: "critical" },
  { id: "paused", label: "Payment Paused", x: 70, y: 66, tone: "paused" },
];

const edges = [
  ["transfer", "recipient"],
  ["transfer", "caller"],
  ["caller", "instruction"],
  ["recipient", "risk"],
  ["instruction", "risk"],
  ["risk", "paused"],
];

const analysisSteps = [
  "Reviewing transaction",
  "Checking recipient relationship",
  "Searching for manipulation signals",
  "Skeptic Agent challenging conclusion",
  "Payment paused",
];

export function HeroInvestigationPreview() {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(reduceMotion ? graphNodes.length : 1);
  const complete = step >= graphNodes.length;
  const nodeMap = useMemo(() => new Map(graphNodes.map((node) => [node.id, node])), []);

  useEffect(() => {
    if (reduceMotion || complete) return;
    const timer = window.setInterval(() => {
      setStep((current) => Math.min(current + 1, graphNodes.length));
    }, 650);
    return () => window.clearInterval(timer);
  }, [complete, reduceMotion]);

  const visibleNodeIds = new Set(graphNodes.slice(0, step).map((node) => node.id));
  const activeAnalysisIndex = Math.min(Math.max(step - 1, 0), analysisSteps.length - 1);

  return (
    <div className="heroDemo" aria-label="Simplified animated investigation graph">
      <div className="heroDemoHeader">
        <div>
          <div className="fine">Live product state</div>
          <strong>{complete ? "Safety gate applied" : analysisSteps[activeAnalysisIndex]}</strong>
        </div>
        <button className="miniButton" type="button" onClick={() => setStep(graphNodes.length)}>
          <FastForward size={14} /> Skip animation
        </button>
      </div>
      <div className="simpleGraph">
        <svg className="simpleEdges" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#7590ad" />
            </marker>
          </defs>
          {edges.map(([from, to], index) => {
            const start = nodeMap.get(from);
            const end = nodeMap.get(to);
            if (!start || !end || !visibleNodeIds.has(from) || !visibleNodeIds.has(to)) return null;
            return (
              <motion.line
                key={`${from}-${to}`}
                x1={start.x + 10}
                y1={start.y + 5}
                x2={end.x + 5}
                y2={end.y + 5}
                markerEnd="url(#arrow)"
                initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: index * 0.05, duration: 0.28 }}
              />
            );
          })}
        </svg>
        {graphNodes.map((node, index) => {
          const visible = visibleNodeIds.has(node.id);
          return (
            <motion.div
              className={`simpleNode ${node.tone} node-${node.id}`}
              key={node.id}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
              animate={visible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.25 }}
            >
              {node.tone === "critical" ? <AlertTriangle size={16} /> : node.tone === "paused" ? <PauseCircle size={16} /> : <Circle size={14} />}
              <span>{node.label}</span>
            </motion.div>
          );
        })}
      </div>
      <div className="analysisState">
        {analysisSteps.map((label, index) => {
          const done = complete || index < activeAnalysisIndex;
          const active = !complete && index === activeAnalysisIndex;
          return (
            <div className={`analysisStep ${active ? "active" : ""}`} key={label}>
              {done ? <CheckCircle2 size={15} /> : <Circle size={15} />}
              <span>{label}</span>
            </div>
          );
        })}
      </div>
      {complete ? <div className="statusBanner">PAUSED — POSSIBLE BANK IMPERSONATION</div> : null}
    </div>
  );
}
