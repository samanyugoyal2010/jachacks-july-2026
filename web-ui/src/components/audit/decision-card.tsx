"use client";

import { IconArrowRight, IconBan, IconCheck } from "~/components/icons";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { AGENTS } from "~/lib/audit/data";
import type { DecisionSnapshot } from "~/lib/audit/types";
import { cn } from "~/lib/utils";

const verdictLabel: Record<DecisionSnapshot["verdict"], string> = {
  DENY: "Declined",
  APPROVE: "Approved",
  APPROVE_WITH_CONDITIONS: "Approved with Conditions",
};

function DecisionSummary({
  decision,
  label,
}: {
  decision: DecisionSnapshot;
  label: string;
}) {
  const isDenied = decision.verdict === "DENY";
  return (
    <div
      className={cn(
        "animate-fade-in-up flex flex-1 flex-col gap-3 rounded-xl border-2 p-4",
        isDenied
          ? "border-destructive/50 bg-destructive/5"
          : "border-success/50 bg-success/5",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </span>
        {isDenied ? (
          <IconBan className="size-4 text-destructive" aria-hidden />
        ) : (
          <IconCheck className="size-4 text-success" aria-hidden />
        )}
      </div>
      <div>
        <p
          className={cn(
            "font-display text-2xl font-semibold italic",
            isDenied ? "text-destructive" : "text-success",
          )}
        >
          {verdictLabel[decision.verdict]}
        </p>
        <p className="font-mono text-sm text-muted-foreground">
          {decision.amount}
        </p>
      </div>
      <ul className="flex flex-col gap-1.5 text-xs text-foreground/85">
        {decision.rationale.map((r) => (
          <li key={r} className="flex gap-2">
            <span aria-hidden>•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
        <span>{AGENTS[decision.generatedBy].name}</span>
        <span className="font-mono">{decision.confidence}% confidence</span>
      </div>
    </div>
  );
}

interface DecisionCardProps {
  draft: DecisionSnapshot | null;
  final: DecisionSnapshot | null;
}

export function DecisionCard({ draft, final }: DecisionCardProps) {
  return (
    <Card className="py-4">
      <CardHeader className="flex-row items-center justify-between px-4 pb-0">
        <CardTitle className="text-sm">Decision Outcome</CardTitle>
        {draft && final && (
          <Badge variant="outline" className="border-secondary text-secondary">
            Corrected after policy review
          </Badge>
        )}
      </CardHeader>
      <CardContent className="px-4">
        {!draft && !final ? (
          <p className="text-sm text-muted-foreground">
            No decision yet — run the audit to generate one.
          </p>
        ) : (
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {draft && (
              <DecisionSummary decision={draft} label="Draft decision" />
            )}
            {draft && final && (
              <IconArrowRight
                className="mx-auto size-5 shrink-0 rotate-90 text-muted-foreground sm:rotate-0"
                aria-hidden
              />
            )}
            {final && (
              <DecisionSummary decision={final} label="Final decision" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
