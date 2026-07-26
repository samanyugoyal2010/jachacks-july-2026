"use client";

import type { Edge, Node } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentStatusBar } from "~/components/audit/agent-status-bar";
import { AgentTimeline } from "~/components/audit/agent-timeline";
import { DecisionCard } from "~/components/audit/decision-card";
import { NodeInspector } from "~/components/audit/node-inspector";
import { ObsidianGraph } from "~/components/audit/obsidian-graph";
import { PolicyPanel } from "~/components/audit/policy-panel";
import { ProvenanceGraph } from "~/components/audit/provenance-graph";
import {
  IconFlow,
  IconPlay,
  IconRefresh,
  IconThoughtGraph,
} from "~/components/icons";
import { Magnetic } from "~/components/magnetic";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  APPLICATION_ID,
  draftDecision,
  finalDecision,
  initialAgentStatuses,
  initialEdges,
  initialNodes,
  POLICY_RULES,
  RUN_STEPS,
} from "~/lib/audit/data";
import { buildThoughtGraph } from "~/lib/audit/obsidian";
import type {
  AgentStatus,
  GraphNodeData,
  PolicyRule,
  TimelineEvent,
} from "~/lib/audit/types";
import { cn } from "~/lib/utils";

type RunPhase = "idle" | "running" | "done";
type GraphView = "flow" | "thought";

function formatElapsed(ms: number) {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(1).padStart(4, "0");
  return `+${minutes.toString().padStart(2, "0")}:${seconds}`;
}

export function AuditDashboard() {
  const [nodes, setNodes] = useState<Node<GraphNodeData>[]>(initialNodes);
  const [edgeHighlights, setEdgeHighlights] = useState<
    Record<string, "active" | "veto">
  >({});
  const [agentStatuses, setAgentStatuses] =
    useState<Record<string, AgentStatus>>(initialAgentStatuses);
  const [policyRules, setPolicyRules] = useState<PolicyRule[]>(POLICY_RULES);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [runPhase, setRunPhase] = useState<RunPhase>("idle");
  const [graphView, setGraphView] = useState<GraphView>("flow");

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    elapsedRef.current = 0;
    setNodes(initialNodes);
    setEdgeHighlights({});
    setAgentStatuses(initialAgentStatuses);
    setPolicyRules(POLICY_RULES);
    setTimelineEvents([]);
    setSelectedNodeId(null);
    setRunPhase("idle");
  }, []);

  const runAudit = useCallback(() => {
    reset();
    setRunPhase("running");

    const scheduleStep = (index: number) => {
      if (index >= RUN_STEPS.length) {
        setRunPhase("done");
        return;
      }
      const step = RUN_STEPS[index];
      elapsedRef.current += step.delay;
      const elapsedAtStep = elapsedRef.current;

      timeoutRef.current = setTimeout(() => {
        if (step.agentStatuses) {
          setAgentStatuses((prev) => ({ ...prev, ...step.agentStatuses }));
        }
        if (step.nodeUpdates) {
          setNodes((prev) =>
            prev.map((node) => {
              const update = step.nodeUpdates?.find((u) => u.id === node.id);
              if (!update) return node;
              return {
                ...node,
                data: {
                  ...node.data,
                  ...(update.status ? { status: update.status } : {}),
                  ...update.data,
                },
              };
            }),
          );
        }
        if (step.activeEdges) {
          setEdgeHighlights((prev) => {
            const next = { ...prev };
            for (const id of step.activeEdges ?? []) {
              next[id] = step.vetoMoment ? "veto" : "active";
            }
            return next;
          });
        }
        if (step.policyUpdates) {
          setPolicyRules((prev) =>
            prev.map((rule) => {
              const update = step.policyUpdates?.find((u) => u.id === rule.id);
              return update ? { ...rule, status: update.status } : rule;
            }),
          );
        }
        const timeline = step.timeline;
        if (timeline) {
          setTimelineEvents((prev) => [
            ...prev,
            {
              id: step.id,
              agentId: timeline.agentId,
              message: timeline.message,
              level: timeline.level,
              timestamp: formatElapsed(elapsedAtStep),
            },
          ]);
        }
        scheduleStep(index + 1);
      }, step.delay);
    };

    scheduleStep(0);
  }, [reset]);

  const edges: Edge[] = useMemo(
    () =>
      initialEdges.map((edge) => {
        const highlight = edgeHighlights[edge.id];
        return {
          ...edge,
          animated: highlight === "active",
          style:
            highlight === "veto"
              ? { stroke: "var(--color-destructive)", strokeWidth: 2.5 }
              : highlight === "active"
                ? { stroke: "var(--color-secondary)", strokeWidth: 2.5 }
                : { stroke: "var(--color-border)", strokeWidth: 1.5 },
        };
      }),
    [edgeHighlights],
  );

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const verificationNode = nodes.find((n) => n.id === "verification");
  const vetoActive = verificationNode?.data.status === "veto";

  const draftNode = nodes.find((n) => n.id === "decision-draft");
  const finalNode = nodes.find((n) => n.id === "decision-final");
  const showDraft = draftNode ? draftNode.data.status !== "pending" : false;
  const showFinal = finalNode ? finalNode.data.status !== "pending" : false;

  const thoughtGraph = useMemo(() => buildThoughtGraph(nodes), [nodes]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              Glass <em className="text-primary italic">Box</em>
            </h1>
            <Badge
              variant="outline"
              className="border-secondary text-secondary"
            >
              AI Decision Audit
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Application <span className="font-mono">{APPLICATION_ID}</span> —
            live multi-agent provenance trace
          </p>
        </div>
        <div className="flex gap-2">
          <Magnetic>
            <Button
              onClick={runAudit}
              disabled={runPhase === "running"}
              className="gap-2"
            >
              <IconPlay className="size-4" />
              {runPhase === "idle" ? "Run Audit" : "Run Again"}
            </Button>
          </Magnetic>
          {runPhase !== "idle" && (
            <Button variant="outline" onClick={reset} className="gap-2">
              <IconRefresh className="size-4" />
              Reset
            </Button>
          )}
        </div>
      </header>

      <AgentStatusBar statuses={agentStatuses} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold tracking-tight text-foreground">
              {graphView === "flow" ? "Provenance Graph" : "Thought Graph"}
            </h2>
            <div className="inline-flex rounded-full border border-border/60 bg-card/70 p-1 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setGraphView("flow")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium tracking-wide transition-all duration-150 ease-out active:scale-95",
                  graphView === "flow"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <IconFlow className="size-3.5" />
                Flow
              </button>
              <button
                type="button"
                onClick={() => setGraphView("thought")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium tracking-wide transition-all duration-150 ease-out active:scale-95",
                  graphView === "thought"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <IconThoughtGraph className="size-3.5" />
                Thought Graph
              </button>
            </div>
          </div>

          <div key={graphView} className="animate-fade-in-up">
            {graphView === "flow" ? (
              <ProvenanceGraph
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            ) : (
              <ObsidianGraph
                graph={thoughtGraph}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            )}
          </div>
          <PolicyPanel rules={policyRules} vetoActive={!!vetoActive} />
          <DecisionCard
            draft={showDraft ? draftDecision : null}
            final={showFinal ? finalDecision : null}
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="xl:h-[400px]">
            <NodeInspector
              node={selectedNode}
              onClose={() => setSelectedNodeId(null)}
            />
          </div>
          <div className="xl:h-[320px]">
            <AgentTimeline events={timelineEvents} />
          </div>
        </div>
      </div>
    </div>
  );
}
