"use client";

import {
  IconAlert,
  IconCheck,
  IconDashedCircle,
  IconShield,
} from "~/components/icons";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { PolicyRule } from "~/lib/audit/types";
import { cn } from "~/lib/utils";

interface PolicyPanelProps {
  rules: PolicyRule[];
  vetoActive: boolean;
}

export function PolicyPanel({ rules, vetoActive }: PolicyPanelProps) {
  return (
    <Card className="flex flex-col gap-3 py-4">
      <CardHeader className="flex-row items-center justify-between px-4 pb-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <IconShield className="size-4 text-secondary" aria-hidden />
          Policy Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4">
        {vetoActive && (
          <div
            role="alert"
            className="animate-fade-in-up flex items-start gap-3 rounded-lg border-2 border-destructive bg-destructive/10 p-3 animate-pulse"
          >
            <IconAlert
              className="mt-0.5 size-5 shrink-0 text-destructive"
              aria-hidden
            />
            <div>
              <p className="text-sm font-bold text-destructive">
                VETO — Policy Violation Detected
              </p>
              <p className="text-xs text-foreground/80">
                The draft decision relies on a prohibited proxy variable. The
                Adjudicator has been blocked from issuing it.
              </p>
            </div>
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors",
                rule.status === "fail" &&
                  "border-destructive/50 bg-destructive/5",
                rule.status === "pass" && "border-success/40 bg-success/5",
                rule.status === "pending" && "border-border bg-muted/20",
              )}
            >
              {rule.status === "pending" && (
                <IconDashedCircle
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              )}
              {rule.status === "pass" && (
                <IconCheck
                  className="mt-0.5 size-4 shrink-0 text-success"
                  aria-hidden
                />
              )}
              {rule.status === "fail" && (
                <IconAlert
                  className="mt-0.5 size-4 shrink-0 text-destructive"
                  aria-hidden
                />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {rule.title}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {rule.citation}
                  </span>
                </div>
                <p className="text-muted-foreground">{rule.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
