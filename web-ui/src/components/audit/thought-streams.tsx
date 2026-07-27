"use client";

import { AGENT_ICONS } from "~/components/icons";
import { Card, CardContent } from "~/components/ui/card";
import { AGENTS } from "~/lib/audit/data";
import type { AgentId } from "~/lib/audit/types";
import { cn } from "~/lib/utils";

export interface Thought {
  agentId: AgentId;
  verdict: string;
  reasoning: string;
}

function tone(v: string) {
  if (/VETO/i.test(v)) return "text-destructive border-destructive/40 bg-destructive/10";
  if (/APPROVE|affordable|strong|standard|upheld/i.test(v))
    return "text-secondary border-secondary/40 bg-secondary/10";
  if (/DENY|elevated|unaffordable|unverified|disagree/i.test(v))
    return "text-amber-400 border-amber-400/40 bg-amber-400/10";
  return "text-muted-foreground border-border/60";
}

/** One panel per agent showing its actual chain of thought as it works.
 *  The graph shows the artifacts; this shows the deliberation. */
export function ThoughtStreams({
  thoughts,
  activeIndex,
}: {
  thoughts: Thought[];
  activeIndex: number;
}) {
  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
      <CardContent className="flex flex-col gap-2.5 p-5">
        <h3 className="font-display text-sm font-bold tracking-tight text-foreground">
          Agent deliberation
        </h3>
        {thoughts.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Run the audit to watch each agent reason in turn.
          </p>
        )}
        {thoughts.map((t, i) => {
          const agent = AGENTS[t.agentId];
          const Icon = AGENT_ICONS[t.agentId];
          const active = i === activeIndex;
          return (
            <div
              key={`${t.agentId}-${i}`}
              className={cn(
                "animate-fade-in-up rounded-xl border p-3 transition-colors",
                active
                  ? "border-primary/60 bg-primary/5 shadow-[0_0_24px_-8px_var(--color-primary)]"
                  : "border-border/50 bg-background/40",
              )}
            >
              <div className="flex items-center gap-2">
                {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
                <span className="text-xs font-semibold text-foreground">{agent?.name ?? t.agentId}</span>
                <span className="text-[10px] text-muted-foreground">{agent?.role}</span>
                <span
                  className={cn(
                    "ml-auto rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                    tone(t.verdict),
                  )}
                >
                  {t.verdict}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                {t.reasoning}
                {active && <span className="ml-0.5 animate-pulse text-primary">▍</span>}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
