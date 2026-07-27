"use client";

import { AGENT_ICONS } from "~/components/icons";
import { AGENTS } from "~/lib/audit/data";
import type { AgentId, AgentStatus } from "~/lib/audit/types";
import { cn } from "~/lib/utils";

/**
 * The orchestration, drawn at fixed positions.
 *
 * This replaces the force-directed constellation. A physics sim gave a different
 * picture on every run and could collapse; the pipeline is the same five stages
 * every time, so it reads instantly and can be pointed at during a demo.
 *
 * The one thing this must communicate above all: stage 4 sends work BACKWARDS to
 * stage 3. A pipeline that only flows forward cannot catch itself.
 */

export type StageId = "read" | "assess" | "draft" | "review" | "final";

export interface PipelineProps {
  statuses: Record<string, AgentStatus>;
  vetoActive: boolean;
  draftOutcome?: string | null;
  finalOutcome?: string | null;
  /** story-mode focus: which stage is on screen right now */
  activeStage?: StageId | null;
  onSelectStage?: (id: StageId) => void;
  /** click an agent to inspect what it did */
  selectedAgent?: AgentId | null;
  onSelectAgent?: (id: AgentId) => void;
}

const ASSESS: AgentId[] = ["affordability", "risk", "collateral"];

function tone(status: AgentStatus | undefined, dim: boolean) {
  if (status === "veto") return "border-destructive/70 bg-destructive/10";
  if (status === "complete") return "border-secondary/50 bg-secondary/8";
  if (status === "processing") return "border-primary/70 bg-primary/10";
  return dim ? "border-border/40 bg-background/30" : "border-border/50 bg-background/40";
}

function Dot({ status }: { status?: AgentStatus }) {
  return (
    <span
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        status === "veto"
          ? "bg-destructive"
          : status === "complete"
            ? "bg-secondary"
            : status === "processing"
              ? "animate-pulse bg-primary"
              : "bg-muted-foreground/40",
      )}
    />
  );
}

function AgentChip({
  id,
  statuses,
  selected,
  onSelect,
}: {
  id: AgentId;
  statuses: Record<string, AgentStatus>;
  selected?: boolean;
  onSelect?: (id: AgentId) => void;
}) {
  const Icon = AGENT_ICONS[id];
  const st = statuses[id];
  const done = st === "complete" || st === "veto";
  return (
    <button
      type="button"
      disabled={!onSelect || !done}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(id);
      }}
      title={done ? "See what this agent did" : undefined}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left transition-colors",
        done && onSelect && "hover:bg-foreground/10 cursor-pointer",
        selected && "bg-primary/20 ring-1 ring-primary/50",
      )}
    >
      <Dot status={st} />
      {Icon ? <Icon className="size-3 shrink-0 text-muted-foreground" /> : null}
      <span className="truncate text-[11px] font-medium text-foreground">
        {AGENTS[id]?.name.replace(" Agent", "").replace(" Analyst", "")}
      </span>
      {done && onSelect ? (
        <span className="ml-auto shrink-0 text-[9px] text-muted-foreground">view</span>
      ) : null}
    </button>
  );
}

function Stage({
  id,
  label,
  agents,
  statuses,
  activeStage,
  chip,
  chipTone,
  onSelect,
  selectedAgent,
  onSelectAgent,
  className,
}: {
  id: StageId;
  label: string;
  agents: AgentId[];
  statuses: Record<string, AgentStatus>;
  activeStage?: StageId | null;
  chip?: string | null;
  chipTone?: "approve" | "deny" | "veto";
  onSelect?: (id: StageId) => void;
  selectedAgent?: AgentId | null;
  onSelectAgent?: (id: AgentId) => void;
  className?: string;
}) {
  const dim = !!activeStage && activeStage !== id;
  const focused = activeStage === id;
  const worst: AgentStatus | undefined = agents.some((a) => statuses[a] === "veto")
    ? "veto"
    : agents.some((a) => statuses[a] === "processing")
      ? "processing"
      : agents.every((a) => statuses[a] === "complete")
        ? "complete"
        : undefined;

  return (
    <div
      onClick={() => onSelect?.(id)}
      className={cn(
        "flex min-w-0 flex-col gap-1.5 rounded-xl border p-2.5 text-left transition-all duration-300",
        tone(worst, dim),
        focused && "scale-[1.03] shadow-[0_0_26px_-6px_var(--color-primary)] ring-1 ring-primary/50",
        dim && "opacity-45",
        className,
      )}
    >
      <div className="text-[9.5px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-col gap-1">
        {agents.map((a) => (
          <AgentChip
            key={a}
            id={a}
            statuses={statuses}
            selected={selectedAgent === a}
            onSelect={onSelectAgent}
          />
        ))}
      </div>
      {chip ? (
        <span
          className={cn(
            "mt-0.5 w-fit rounded-full px-2 py-0.5 text-[10px] font-bold",
            chipTone === "approve" && "bg-secondary/20 text-secondary",
            chipTone === "deny" && "bg-destructive/20 text-destructive",
            chipTone === "veto" && "bg-destructive/25 text-destructive",
          )}
        >
          {chip}
        </span>
      ) : null}
    </div>
  );
}

const Arrow = () => (
  <div className="hidden shrink-0 items-center px-0.5 text-muted-foreground/50 sm:flex">→</div>
);

export function PipelineDiagram({
  statuses,
  vetoActive,
  draftOutcome,
  finalOutcome,
  activeStage,
  onSelectStage,
  selectedAgent,
  onSelectAgent,
}: PipelineProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* forward flow */}
      <div className="flex items-stretch gap-1.5">
        <Stage
          id="read"
          label="1 · Read"
          agents={["intake"]}
          statuses={statuses}
          activeStage={activeStage}
          onSelect={onSelectStage}
          selectedAgent={selectedAgent}
          onSelectAgent={onSelectAgent}
          className="flex-1"
        />
        <Arrow />
        <Stage
          id="assess"
          label="2 · Assess — in parallel"
          agents={ASSESS}
          statuses={statuses}
          activeStage={activeStage}
          onSelect={onSelectStage}
          selectedAgent={selectedAgent}
          onSelectAgent={onSelectAgent}
          className="flex-[1.3]"
        />
        <Arrow />
        <Stage
          id="draft"
          label="3 · Draft"
          agents={["adjudicator"]}
          statuses={statuses}
          activeStage={activeStage}
          onSelect={onSelectStage}
          selectedAgent={selectedAgent}
          onSelectAgent={onSelectAgent}
          chip={draftOutcome ? `Draft: ${draftOutcome}` : null}
          chipTone={draftOutcome === "APPROVE" ? "approve" : "deny"}
          className="flex-1"
        />
        <Arrow />
        <Stage
          id="final"
          label="5 · Outcome & recourse"
          agents={["advisor"]}
          statuses={statuses}
          activeStage={activeStage}
          onSelect={onSelectStage}
          selectedAgent={selectedAgent}
          onSelectAgent={onSelectAgent}
          chip={finalOutcome ? `Final: ${finalOutcome}` : null}
          chipTone={finalOutcome === "APPROVE" ? "approve" : "deny"}
          className="flex-1"
        />
      </div>

      {/* the review sits BELOW the draft and feeds back into it */}
      <div className="flex items-start gap-1.5">
        <div className="flex-1" />
        <div className="hidden w-[18px] sm:block" />
        <div className="flex-[1.3]" />
        <div className="hidden w-[18px] sm:block" />
        <div className="flex flex-1 flex-col items-center gap-1">
          <div
            className={cn(
              "flex flex-col items-center leading-none transition-colors duration-300",
              vetoActive ? "text-destructive" : "text-muted-foreground/40",
            )}
          >
            <span className={cn("text-sm", vetoActive && "animate-bounce")}>↑</span>
            <span className="text-[9px] font-bold uppercase tracking-wider">
              {vetoActive ? "sends it back" : "can send back"}
            </span>
          </div>
          <Stage
            id="review"
            label="4 · Independent review"
            agents={["policy"]}
            statuses={statuses}
            activeStage={activeStage}
            onSelect={onSelectStage}
            selectedAgent={selectedAgent}
            onSelectAgent={onSelectAgent}
            chip={vetoActive ? "VETO" : null}
            chipTone="veto"
            className="w-full"
          />
        </div>
        <div className="hidden w-[18px] sm:block" />
        <div className="flex-1" />
      </div>
    </div>
  );
}
