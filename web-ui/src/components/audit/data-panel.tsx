"use client";

import { Card, CardContent } from "~/components/ui/card";
import type { JacNode } from "~/lib/audit/live";

const CAT_LABEL: Record<string, string> = {
  identification: "Identification",
  income: "Income",
  income_proof: "Income proof",
  collateral: "Collateral",
  applicant_network: "Banking & references",
  demographic: "Demographic — withheld from scoring",
  other: "Other",
};
const ORDER = ["identification", "income", "income_proof", "collateral", "applicant_network", "demographic", "other"];

const SENS: Record<string, { label: string; cls: string }> = {
  PERMISSIBLE: { label: "permissible", cls: "text-muted-foreground border-border/60" },
  PROXY_RISK: { label: "proxy risk", cls: "text-amber-400 border-amber-400/40" },
  PROHIBITED_BASIS: { label: "prohibited basis", cls: "text-destructive border-destructive/40" },
};

/** The raw application data — deliberately NOT in the constellation, which stays
 *  a picture of reasoning. Here it's grouped and labelled by sensitivity. */
export function DataPanel({ facts }: { facts: JacNode[] }) {
  if (!facts.length) return null;
  const groups: Record<string, JacNode[]> = {};
  for (const f of facts) {
    const c = String(f.data.category ?? "other");
    (groups[c] ||= []).push(f);
  }
  const withheld = facts.filter((f) => f.data.sensitivity === "PROHIBITED_BASIS").length;

  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-sm font-bold tracking-tight text-foreground">
            What we read from the application
          </h3>
          <span className="text-[10px] text-muted-foreground">
            {facts.length} fields{withheld ? ` · ${withheld} withheld` : ""}
          </span>
        </div>

        {ORDER.filter((c) => groups[c]).map((c) => (
          <div key={c} className="flex flex-col gap-1">
            <div className="text-[10px] font-medium uppercase tracking-[0.09em] text-primary">
              {CAT_LABEL[c] ?? c}
            </div>
            {groups[c].map((f) => {
              const s = SENS[String(f.data.sensitivity)] ?? SENS.PERMISSIBLE;
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-3 border-b border-border/40 py-1.5 text-xs last:border-0"
                >
                  <span className="min-w-[150px] capitalize text-muted-foreground">
                    {String(f.data.key ?? "").replace(/_/g, " ")}
                  </span>
                  <span className="font-medium text-foreground">{String(f.data.value ?? "")}</span>
                  {f.data.sensitivity !== "PERMISSIBLE" && (
                    <span className={`ml-auto rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${s.cls}`}>
                      {s.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Fields marked <span className="text-destructive">prohibited basis</span> sit on a
          restricted channel the scoring agents cannot read at all — enforced by the data layer,
          not by a prompt. Fields marked <span className="text-amber-400">proxy risk</span> look
          neutral but correlate with a protected class, so the No-Discrimination agent watches them.
        </p>
      </CardContent>
    </Card>
  );
}
