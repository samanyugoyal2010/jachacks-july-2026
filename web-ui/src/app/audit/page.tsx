"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuditDashboard } from "~/components/audit/audit-dashboard";
import { Button } from "~/components/ui/button";
import { CASES } from "~/lib/audit/cases";
import { loadMine } from "~/lib/audit/session";

interface Target {
  caseId: string;
  label: string;
  facts: Record<string, string>;
  isMine: boolean;
}

export default function AuditPage() {
  // Read the query string on the client. Avoids a Suspense boundary around
  // useSearchParams, which stalls the static shell in Next 16.
  const [target, setTarget] = useState<Target | null>(null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("mine") === "1") {
      const facts = loadMine();
      if (!facts) {
        setEmpty(true);
        return;
      }
      setTarget({ caseId: "MY-APPLICATION", label: "your application", facts, isMine: true });
      return;
    }
    const c = CASES.find((x) => x.id === p.get("demo")) ?? CASES[0];
    setTarget({
      caseId: c.id,
      label: `example: ${c.name} — ${c.headline}`,
      facts: c.facts,
      isMine: false,
    });
  }, []);

  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-28 pb-16 sm:px-6 lg:px-8">
      {empty && (
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-2xl font-semibold text-foreground">
            No application yet
          </h1>
          <p className="text-sm text-muted-foreground">
            Fill in your details and we&apos;ll run the decision.
          </p>
          <Button asChild className="w-fit">
            <Link href="/apply">Apply</Link>
          </Button>
        </div>
      )}
      {!empty && !target && <p className="text-sm text-muted-foreground">Loading…</p>}
      {target && (
        <AuditDashboard
          key={target.caseId}
          caseId={target.caseId}
          label={target.label}
          facts={target.facts}
          isMine={target.isMine}
          autoRun
        />
      )}
    </main>
  );
}
