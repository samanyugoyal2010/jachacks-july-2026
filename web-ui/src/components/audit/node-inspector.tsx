"use client";

import type { Node } from "@xyflow/react";
import {
  AGENT_ICONS,
  IconAlert,
  IconClose,
  IconInfo,
  IconUser,
} from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { AGENTS } from "~/lib/audit/data";
import { nodeStatusStyles } from "~/lib/audit/status";
import type { GraphNodeData } from "~/lib/audit/types";
import { cn } from "~/lib/utils";

const stageLineage: GraphNodeData["stage"][] = [
  "application",
  "facts",
  "assessment",
  "decision",
  "verification",
  "final",
];

const stageLabels: Record<GraphNodeData["stage"], string> = {
  application: "Application",
  facts: "Facts",
  assessment: "Assessments",
  decision: "Decision",
  verification: "Verification",
  final: "Final Decision",
};

interface NodeInspectorProps {
  node: Node<GraphNodeData> | null;
  onClose: () => void;
}

export function NodeInspector({ node, onClose }: NodeInspectorProps) {
  if (!node) {
    return (
      <Card className="flex h-full min-h-[400px] items-center justify-center text-center">
        <CardContent className="flex flex-col items-center gap-2 px-6 text-muted-foreground">
          <IconInfo className="size-6" aria-hidden />
          <p className="text-sm">
            Select any node in the graph to inspect its evidence, reasoning, and
            lineage.
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = node.data;
  const agent = AGENTS[data.agentId];
  const AgentIcon = AGENT_ICONS[data.agentId];
  const style = nodeStatusStyles[data.status];
  const currentStageIndex = stageLineage.indexOf(data.stage);

  return (
    <Card
      key={node.id}
      className="animate-fade-in-up flex h-full flex-col gap-4 overflow-hidden"
    >
      <CardHeader className="flex-row items-start justify-between gap-2 pb-0">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {stageLabels[data.stage]}
          </span>
          <CardTitle className="text-lg">{data.title}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close node inspector"
        >
          <IconClose className="size-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {/* Lineage breadcrumb */}
        <nav
          aria-label="Decision lineage"
          className="flex flex-wrap items-center gap-1 text-[11px]"
        >
          {stageLineage.map((stage, i) => (
            <span key={stage} className="flex items-center gap-1">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5",
                  i === currentStageIndex
                    ? "bg-primary text-primary-foreground font-medium"
                    : i < currentStageIndex
                      ? "bg-success/15 text-success"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {stageLabels[stage]}
              </span>
              {i < stageLineage.length - 1 && (
                <span className="text-muted-foreground" aria-hidden>
                  →
                </span>
              )}
            </span>
          ))}
        </nav>

        {/* Agent + status */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <AgentIcon className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {agent.name}
              </p>
              <p className="text-xs text-muted-foreground">{agent.role}</p>
            </div>
          </div>
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              style.border,
            )}
          >
            <span
              className={cn("size-1.5 rounded-full", style.dot)}
              aria-hidden
            />
            {style.label}
          </span>
        </div>

        {data.status === "pending" ? (
          <p className="text-sm text-muted-foreground">
            This step has not run yet. Start the audit to see this agent's
            output.
          </p>
        ) : (
          <>
            {data.confidence !== null && (
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    Confidence
                  </span>
                  <span className="text-muted-foreground">
                    {data.confidence}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      data.flagged ? "bg-destructive" : "bg-success",
                    )}
                    style={{ width: `${data.confidence}%` }}
                  />
                </div>
              </div>
            )}

            {data.flagged && data.flagReason && (
              <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-foreground">
                <IconAlert
                  className="mt-0.5 size-4 shrink-0 text-destructive"
                  aria-hidden
                />
                <p>{data.flagReason}</p>
              </div>
            )}

            <p className="text-sm text-foreground/90">{data.summary}</p>

            {/* Evidence */}
            <div>
              <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Evidence used
              </h4>
              <ul className="flex flex-col gap-1.5">
                {data.evidence.map((item) => (
                  <li
                    key={item.label}
                    className={cn(
                      "flex flex-col gap-0.5 rounded-md border px-3 py-2 text-xs",
                      item.flagged
                        ? "border-destructive/40 bg-destructive/5"
                        : "border-border bg-card",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          "font-mono",
                          item.flagged
                            ? "text-destructive"
                            : "text-foreground/80",
                        )}
                      >
                        {item.value}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <IconUser className="size-2.5" aria-hidden />
                      {item.source}
                    </span>
                    {item.flagged && item.flagReason && (
                      <span className="text-[10px] text-destructive">
                        {item.flagReason}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Reasoning */}
            <div>
              <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Reasoning trace
              </h4>
              <ol className="flex flex-col gap-2">
                {data.reasoning.map((step, i) => (
                  <li
                    key={step}
                    className="flex gap-2 text-xs text-foreground/90"
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {data.version > 1 && (
              <p className="text-[11px] text-muted-foreground">
                Revision v{data.version} — regenerated after policy correction.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
