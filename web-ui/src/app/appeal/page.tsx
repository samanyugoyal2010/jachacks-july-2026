"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FadeIn } from "~/components/fade-in";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  agentDetail,
  finalStatuses,
  getGraph,
  planOf,
  runScenario,
  type RemediationPlanData,
  type Scenario,
} from "~/lib/audit/live";
import { AgentDetailCard } from "~/components/audit/agent-detail";
import { PipelineDiagram } from "~/components/audit/pipeline-diagram";
import type { AgentId } from "~/lib/audit/types";
import { loadLast } from "~/lib/audit/session";

export default function Appeal() {
  const [plan, setPlan] = useState<RemediationPlanData | null>(null);
  const [label, setLabel] = useState("");
  const [caseId, setCaseId] = useState("MY-APPLICATION");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [rerun, setRerun] = useState<Scenario | null>(null);
  const [showWork, setShowWork] = useState(false);
  const [engineDown, setEngineDown] = useState(false);
  const [picked, setPicked] = useState<AgentId | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      const last = loadLast();
      if (last) {
        setLabel(last.label);
        setCaseId(last.caseId);
      }
      // live engine first, then the recorded run for whichever case was last shown
      try {
        setPlan(planOf(await getGraph(last?.caseId)));
      } catch {
        setEngineDown(true);
      }
      setLoading(false);
    })();
  }, []);

  async function recheck() {
    if (!plan) return;
    setBusy(true);
    setResult(null);
    setRerun(null);
    setShowWork(false);
    setPicked(null);
    // the run is fast; hold the "re-running" state briefly so the click registers visually
    let sc: Scenario;
    try {
      [sc] = await Promise.all([
        runScenario({ case_id: `${caseId}-REAPPLY`, facts: plan.reapply_facts }),
        new Promise((r) => setTimeout(r, 650)),
      ]);
    } catch {
      setEngineDown(true);
      setBusy(false);
      return;
    }
    setResult(sc.summary.final_outcome);
    setRerun(sc);
    setBusy(false);
    // the outcome card renders below the fold — bring it to the user
    requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 pt-32 pb-16 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading your decision…</p>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 pt-32 pb-16 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Appeal &amp; fix
        </h1>
        <p className="text-sm text-muted-foreground">
          {engineDown ? (
            <>
              This page needs the Jac agent pipeline, which keeps its provenance graph in a live
              process and can&apos;t run on a serverless host. Either start it locally with{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">./run.sh</code>, or deploy the
              engine and set{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">GLASSBOX_API</code>.
            </>
          ) : (
            <>
              This page unlocks only when an application is declined. There&apos;s nothing to
              appeal right now.
            </>
          )}
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/apply">Apply</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">See a worked example</Link>
          </Button>
        </div>
      </main>
    );
  }

  const fixable = plan.mode === "fixable";

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 pt-32 pb-16 sm:px-6">
      <FadeIn>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Here&apos;s how to fix it
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {label ? `${label} was declined. ` : "You were declined. "}
            This is the specific reason and the concrete change that would qualify you — calculated
            from the same numbers used to decide, not generic advice.
          </p>
        </div>
      </FadeIn>

      <FadeIn>
        <Card
          className={
            fixable
              ? "border-primary/50 bg-primary/5 backdrop-blur-xl"
              : "border-secondary/50 bg-secondary/5 backdrop-blur-xl"
          }
        >
          <CardContent className="flex flex-col gap-2 p-5">
            <span
              className={`w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                fixable ? "bg-primary/20 text-primary" : "bg-secondary/20 text-secondary"
              }`}
            >
              {fixable ? "Fixable — paperwork" : "Substantive — the numbers"}
            </span>
            <p className="text-sm leading-relaxed text-foreground">{plan.summary}</p>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn>
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {fixable ? "Send us these" : "Choose one of these"}
        </h2>
      </FadeIn>

      {plan.steps.map((s, i) => (
        <FadeIn key={i}>
          <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
            <CardContent className="flex gap-4 p-5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">{s.action}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                  {s.current !== "missing" && (
                    <>
                      <span className="text-muted-foreground line-through">{s.current}</span>
                      <span className="font-semibold text-secondary">→ {s.target}</span>
                    </>
                  )}
                  <span className="ml-auto rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-bold text-secondary">
                    {s.impact}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      ))}

      <FadeIn>
        <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
          <CardContent className="flex flex-col gap-3 p-5">
            <h3 className="font-display text-sm font-bold text-foreground">
              Check it before you commit
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              We&apos;ll re-run the <strong>real</strong> decision with this change applied, so you
              can see the outcome before doing any of the work. This is an actual run of the same
              agents — not a promise.
            </p>
            <Button className="w-fit" disabled={busy} onClick={recheck}>
              {busy ? "Re-running the decision…" : "Re-check with this fix applied"}
            </Button>
          </CardContent>
        </Card>
      </FadeIn>

      <div ref={resultRef} />
      {busy && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-5">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            <span className="text-sm text-foreground">
              Re-running the full decision with your fix applied…
            </span>
          </CardContent>
        </Card>
      )}
      {result && (
        <FadeIn>
          <Card
            className={
              result === "APPROVE"
                ? "border-secondary/60 bg-secondary/10"
                : "border-destructive/60 bg-destructive/10"
            }
          >
            <CardContent className="flex flex-col gap-2 p-5">
              <div
                className={`font-display text-2xl font-bold ${
                  result === "APPROVE" ? "text-secondary" : "text-destructive"
                }`}
              >
                {result === "APPROVE" ? "You would be approved" : "Still short"}
              </div>
              <p className="text-sm text-muted-foreground">
                {result === "APPROVE"
                  ? "With that one change, the full decision comes back approved. Make the change and reapply."
                  : "That change alone isn't enough yet — try the other step as well."}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setShowWork((v) => !v)}>
                  {showWork ? "Hide the reasoning ▴" : "Show me the reasoning ▾"}
                </Button>
                <Button asChild variant="outline">
                  <Link href="/apply">Start a new application</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {showWork && rerun && (
        <FadeIn>
          <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
            <CardContent className="flex flex-col gap-3 p-5">
              <div>
                <h3 className="font-display text-sm font-bold text-foreground">
                  How that re-decision was reached
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  The same seven agents ran again on your corrected application — including the
                  independent reviewer. Click any agent to see what it did. You should not have to
                  take an automated decision on trust.
                </p>
              </div>

              <PipelineDiagram
                statuses={finalStatuses(rerun.summary)}
                vetoActive={rerun.summary.vetoed}
                draftOutcome={rerun.summary.draft_outcome}
                finalOutcome={rerun.summary.final_outcome}
                selectedAgent={picked}
                onSelectAgent={(id) => setPicked((p) => (p === id ? null : id))}
              />

              {picked &&
                (() => {
                  const d = agentDetail(rerun, picked);
                  return d ? (
                    <AgentDetailCard detail={d} onClose={() => setPicked(null)} />
                  ) : null;
                })()}
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </main>
  );
}
