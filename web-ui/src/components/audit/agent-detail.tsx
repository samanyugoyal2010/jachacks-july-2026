"use client";

import { AGENT_ICONS } from "~/components/icons";
import { Card, CardContent } from "~/components/ui/card";
import { AGENTS } from "~/lib/audit/data";
import type { AgentDetail as Detail } from "~/lib/audit/live";
import { cn } from "~/lib/utils";

const SENS: Record<string, string> = {
  PERMISSIBLE: "text-muted-foreground border-border/60",
  PROXY_RISK: "text-amber-400 border-amber-400/40",
  PROHIBITED_BASIS: "text-destructive border-destructive/40",
};

function tone(v: string) {
  if (/VETO/i.test(v)) return "bg-destructive/25 text-destructive";
  if (/APPROVE|affordable|strong|standard|upheld/i.test(v)) return "bg-secondary/20 text-secondary";
  if (/DENY|elevated|unaffordable|unverified|disagree/i.test(v)) return "bg-amber-400/20 text-amber-400";
  return "bg-background/60 text-muted-foreground";
}

/** What one agent actually did — shown when you click its box in the pipeline.
 *  This is the interactive alternative to reading the full trace below. */
export function AgentDetailCard({
  detail,
  onClose,
}: {
  detail: Detail;
  onClose: () => void;
}) {
  const agent = AGENTS[detail.agentId];
  const Icon = AGENT_ICONS[detail.agentId];
  const vetoed = /VETO/i.test(detail.verdict);

  return (
    <Card
      className={cn(
        "animate-fade-in-up",
        vetoed ? "border-destructive/60 bg-destructive/8" : "border-primary/50 bg-primary/5",
      )}
    >
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
          <span className="text-sm font-semibold text-foreground">{agent?.name}</span>
          <span className="text-[11px] text-muted-foreground">{agent?.role}</span>
          <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", tone(detail.verdict))}>
            {detail.verdict}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Close ✕
          </button>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
            What it did
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-foreground">{detail.reasoning}</p>
        </div>

        {detail.cited.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
              {detail.agentId === "policy" ? "The factor it caught" : "Evidence it read"}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {detail.cited.map((c, i) => (
                <span
                  key={i}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px]",
                    SENS[c.sensitivity] ?? SENS.PERMISSIBLE,
                  )}
                >
                  <span className="capitalize">{c.key.replace(/_/g, " ")}</span>
                  {c.value ? <span className="font-semibold"> = {c.value}</span> : null}
                  {c.sensitivity !== "PERMISSIBLE" && (
                    <span className="ml-1 opacity-80">
                      ({c.sensitivity === "PROHIBITED_BASIS" ? "prohibited" : "proxy"})
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {detail.agentId === "policy" && (
          <p className="rounded-lg border border-border/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            This agent reached its verdict from the permissible facts <em>before</em> it was shown the
            draft — and it is the only agent allowed to read protected data.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
