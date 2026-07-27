"use client";

import {
  IconAlert,
  IconCheck,
  IconInfo,
  IconOctagonAlert,
} from "~/components/icons";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { AGENTS } from "~/lib/audit/data";
import { timelineLevelStyles } from "~/lib/audit/status";
import type { TimelineEvent } from "~/lib/audit/types";
import { cn } from "~/lib/utils";

const levelIcons = {
  info: IconInfo,
  success: IconCheck,
  warning: IconAlert,
  error: IconOctagonAlert,
};

interface AgentTimelineProps {
  events: TimelineEvent[];
}

export function AgentTimeline({ events }: AgentTimelineProps) {
  return (
    <Card className="flex h-full flex-col gap-3 py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-sm">Agent Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-4">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Run the audit to watch agents process this application in real time.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {events.map((event) => {
              const style = timelineLevelStyles[event.level];
              const Icon = levelIcons[event.level];
              const agent = AGENTS[event.agentId];
              return (
                <li key={event.id} className="animate-fade-in-up flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full bg-muted",
                        style.text,
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                    <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
                  </div>
                  <div className="pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {agent.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {event.timestamp}
                      </span>
                    </div>
                    <p className={cn("text-xs", style.text)}>{event.message}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
