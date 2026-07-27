"use client";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { IconAlert, IconCheck, IconSpinner } from "~/components/icons";
import { AGENTS } from "~/lib/audit/data";
import { nodeStatusStyles } from "~/lib/audit/status";
import type { GraphNodeData } from "~/lib/audit/types";
import { cn } from "~/lib/utils";

const stageLabels: Record<GraphNodeData["stage"], string> = {
  application: "Application",
  facts: "Facts",
  assessment: "Assessment",
  decision: "Decision",
  verification: "Verification",
  final: "Final Decision",
};

export function AuditNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as GraphNodeData;
  const style = nodeStatusStyles[nodeData.status];
  const agent = AGENTS[nodeData.agentId];
  const isPending = nodeData.status === "pending";

  return (
    <div
      className={cn(
        "w-64 cursor-pointer rounded-xl border-2 bg-card/80 px-4 py-3 text-left shadow-md shadow-black/5 backdrop-blur-md transition-[transform,box-shadow,border-color,opacity] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] active:duration-100",
        style.border,
        style.ring,
        isPending && "opacity-50",
        selected && "scale-[1.02] shadow-xl",
        nodeData.status === "veto" && "animate-pulse",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-border !border-none !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-border !border-none !w-2 !h-2"
      />
      {/* Vertical pair, used where the flow stacks instead of running across. */}
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        className="!bg-border !border-none !w-2 !h-2"
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className="!bg-border !border-none !w-2 !h-2"
      />

      <span className="sr-only">
        {nodeData.title}, status {style.label}
      </span>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          {stageLabels[nodeData.stage]}
        </span>
        <span className="flex items-center gap-1">
          {nodeData.status === "active" && (
            <IconSpinner
              className="size-3 animate-spin text-secondary"
              aria-hidden
            />
          )}
          {(nodeData.status === "complete" ||
            nodeData.status === "approved") && (
            <IconCheck className="size-3 text-success" aria-hidden />
          )}
          {nodeData.status === "veto" && (
            <IconAlert className="size-3 text-destructive" aria-hidden />
          )}
          <span
            className={cn("size-1.5 rounded-full", style.dot)}
            aria-hidden
          />
        </span>
      </div>

      <h3 className="mt-1 text-sm font-semibold text-foreground">
        {nodeData.title}
      </h3>
      <p className="text-xs text-muted-foreground">{nodeData.subtitle}</p>

      {!isPending && nodeData.summary && (
        <p className="mt-2 line-clamp-2 text-xs text-foreground/80">
          {nodeData.summary}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <span className="text-[10px] text-muted-foreground">{agent.name}</span>
        {nodeData.confidence !== null && !isPending && (
          <span className="font-mono text-[10px] font-medium text-foreground">
            {nodeData.confidence}% conf.
          </span>
        )}
      </div>

      {nodeData.flagged && !isPending && (
        <div className="mt-2 flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive">
          <IconAlert className="size-3 shrink-0" aria-hidden />
          Flagged evidence
        </div>
      )}
    </div>
  );
}
