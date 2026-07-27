"use client";

import { AGENT_ICONS } from "~/components/icons";
import { Card, CardContent } from "~/components/ui/card";
import { AGENTS } from "~/lib/audit/data";
import type { AgentId, AgentStatus } from "~/lib/audit/types";
import { cn } from "~/lib/utils";

/** The orchestration: who hands off to whom, what runs in parallel, and the one
 *  agent that can send work backwards. This is the architecture, not a status list. */
const STAGES: { title: string; note: string; agents: AgentId[] }[] = [
  { title: "1 · Read", note: "parses the package, classifies every fact by sensitivity", agents: ["intake"] },
  { title: "2 · Assess", note: "three specialists in parallel — each blind to protected data", agents: ["affordability", "risk", "collateral"] },
  { title: "3 · Draft", note: "combines the assessments into a first call", agents: ["adjudicator"] },
  { title: "4 · Review", note: "independent verdict, then leak check — can veto either way", agents: ["policy"] },
  { title: "5 · Recourse", note: "on a decline, builds an actionable plan", agents: ["advisor"] },
];

const dot: Record<AgentStatus, string> = {
  idle: "bg-muted-foreground/40",
  processing: "bg-primary animate-pulse",
  complete: "bg-secondary",
  veto: "bg-destructive",
};

export function OrchestrationMap({
  statuses,
  vetoActive,
}: {
  statuses: Record<string, AgentStatus>;
  vetoActive: boolean;
}) {
  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-sm font-bold tracking-tight text-foreground">
            Agent orchestration
          </h3>
          <span className="text-[10px] text-muted-foreground">
            7 agents · handoffs through a shared graph
          </span>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
          {STAGES.map((stage, i) => (
            <div key={stage.title} className="flex flex-1 items-stretch gap-2">
              <div
                className={cn(
                  "flex flex-1 flex-col gap-2 rounded-xl border p-3 transition-colors",
                  stage.agents.some((a) => statuses[a] === "veto")
                    ? "border-destructive/60 bg-destructive/5"
                    : stage.agents.some((a) => statuses[a] === "complete")
                      ? "border-secondary/40 bg-secondary/5"
                      : "border-border/50 bg-background/40",
                )}
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {stage.title}
                </div>
                <div className="flex flex-col gap-1.5">
                  {stage.agents.map((a) => {
                    const Icon = AGENT_ICONS[a];
                    const st = statuses[a] ?? "idle";
                    return (
                      <div key={a} className="flex items-center gap-1.5">
                        <span className={cn("size-1.5 shrink-0 rounded-full", dot[st])} />
                        {Icon ? <Icon className="size-3 shrink-0 text-muted-foreground" /> : null}
                        <span className="truncate text-[11px] font-medium text-foreground">
                          {AGENTS[a]?.name.replace(" Agent", "").replace(" Analyst", "")}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-auto text-[10px] leading-snug text-muted-foreground">{stage.note}</p>
              </div>
              {i < STAGES.length - 1 && (
                <div className="hidden shrink-0 items-center text-muted-foreground/50 lg:flex">→</div>
              )}
            </div>
          ))}
        </div>

        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-[11px] leading-relaxed transition-colors",
            vetoActive
              ? "border-destructive/50 bg-destructive/10 text-foreground"
              : "border-border/50 text-muted-foreground",
          )}
        >
          {vetoActive ? (
            <>
              <strong className="text-destructive">Veto fired.</strong> Step 4 sent the decision back
              to step 3 to be re-made without the factor it wasn&apos;t allowed to use. That backward
              arrow is the whole point — a pipeline that can only move forward can&apos;t catch itself.
            </>
          ) : (
            <>
              Step 4 can send work <strong>backwards</strong> to step 3. The reviewer forms its own
              verdict before it is shown the draft, so it isn&apos;t just agreeing with what came before.
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
