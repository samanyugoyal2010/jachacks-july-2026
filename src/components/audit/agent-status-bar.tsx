"use client";

import { Card } from "~/components/ui/card";
import { AGENT_ORDER, AGENTS } from "~/lib/audit/data";
import { agentStatusStyles } from "~/lib/audit/status";
import type { AgentStatus } from "~/lib/audit/types";
import { cn } from "~/lib/utils";

interface AgentStatusBarProps {
  statuses: Record<string, AgentStatus>;
}

export function AgentStatusBar({ statuses }: AgentStatusBarProps) {
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
      {AGENT_ORDER.map((id) => {
        const agent = AGENTS[id];
        const status = statuses[id] ?? "idle";
        const style = agentStatusStyles[status];
        return (
          <div key={id} className="flex min-w-0 items-center gap-2">
            <span className="relative flex size-2.5 shrink-0">
              {style.pulse && (
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                    style.dot,
                  )}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  "relative inline-flex size-2.5 rounded-full",
                  style.dot,
                )}
                aria-hidden
              />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                {agent.name}
              </p>
              <p className={cn("text-[10px]", style.text)}>{style.label}</p>
            </div>
          </div>
        );
      })}
    </Card>
  );
}
