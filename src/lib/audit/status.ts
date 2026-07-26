import type { AgentStatus, GraphNodeStatus, TimelineLevel } from "./types";

export const nodeStatusStyles: Record<
  GraphNodeStatus,
  { border: string; ring: string; dot: string; label: string }
> = {
  pending: {
    border: "border-border",
    ring: "",
    dot: "bg-muted-foreground/40",
    label: "Pending",
  },
  active: {
    border: "border-secondary",
    ring: "ring-2 ring-secondary/40",
    dot: "bg-secondary",
    label: "Processing",
  },
  complete: {
    border: "border-success/50",
    ring: "",
    dot: "bg-success",
    label: "Complete",
  },
  approved: {
    border: "border-success/60",
    ring: "ring-2 ring-success/30",
    dot: "bg-success",
    label: "Approved",
  },
  veto: {
    border: "border-destructive",
    ring: "ring-2 ring-destructive/40",
    dot: "bg-destructive",
    label: "Veto",
  },
  superseded: {
    border: "border-border",
    ring: "",
    dot: "bg-muted-foreground/40",
    label: "Superseded",
  },
};

export const agentStatusStyles: Record<
  AgentStatus,
  { dot: string; text: string; label: string; pulse?: boolean }
> = {
  idle: {
    dot: "bg-muted-foreground/40",
    text: "text-muted-foreground",
    label: "Idle",
  },
  processing: {
    dot: "bg-secondary",
    text: "text-secondary",
    label: "Processing",
    pulse: true,
  },
  complete: { dot: "bg-success", text: "text-success", label: "Complete" },
  veto: {
    dot: "bg-destructive",
    text: "text-destructive",
    label: "Veto",
    pulse: true,
  },
};

export const timelineLevelStyles: Record<
  TimelineLevel,
  { dot: string; text: string }
> = {
  info: { dot: "bg-muted-foreground/50", text: "text-muted-foreground" },
  success: { dot: "bg-success", text: "text-success" },
  warning: { dot: "bg-secondary", text: "text-secondary" },
  error: { dot: "bg-destructive", text: "text-destructive" },
};
