"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentTimeline } from "~/components/audit/agent-timeline";
import { DataPanel } from "~/components/audit/data-panel";
import { AgentDetailCard } from "~/components/audit/agent-detail";
import { PipelineDiagram, type StageId } from "~/components/audit/pipeline-diagram";
import { PolicyPanel } from "~/components/audit/policy-panel";
import { ThoughtStreams, type Thought } from "~/components/audit/thought-streams";
import { IconPlay, IconRefresh } from "~/components/icons";
import { Magnetic } from "~/components/magnetic";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { initialAgentStatuses } from "~/lib/audit/data";
import { agentDetail, finalStatuses, retryEngine, runScenario, type Scenario } from "~/lib/audit/live";
import { saveLast } from "~/lib/audit/session";
import type { AgentId, AgentStatus, PolicyRule, TimelineEvent } from "~/lib/audit/types";
import { cn } from "~/lib/utils";

/** trace agent name -> dashboard agent id */
const AGENT_KEY: Record<string, string> = {
  Intake: "intake",
  Affordability: "affordability",
  Risk: "risk",
  Collateral: "collateral",
  Adjudicator: "adjudicator",
  NoDiscrimination: "policy",
  Advisor: "advisor",
};

/** trace agent name -> pipeline stage */
const STAGE_KEY: Record<string, StageId> = {
  Intake: "read",
  Affordability: "assess",
  Risk: "assess",
  Collateral: "assess",
  Adjudicator: "draft",
  NoDiscrimination: "review",
  Advisor: "final",
};

type RunPhase = "idle" | "running" | "done";

function formatElapsed(ms: number) {
  const total = ms / 1000;
  const m = Math.floor(total / 60);
  const s = (total % 60).toFixed(1).padStart(4, "0");
  return `+${m.toString().padStart(2, "0")}:${s}`;
}

export interface AuditDashboardProps {
  caseId: string;
  label: string;
  facts: Record<string, string>;
  isMine?: boolean;
  autoRun?: boolean;
}

export function AuditDashboard({ caseId, label, facts, isMine, autoRun }: AuditDashboardProps) {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [beat, setBeat] = useState(-1); // index into scenario.summary.trace
  const [agentStatuses, setAgentStatuses] =
    useState<Record<string, AgentStatus>>(initialAgentStatuses);
  const [policyRules, setPolicyRules] = useState<PolicyRule[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [runPhase, setRunPhase] = useState<RunPhase>("idle");
  const [runError, setRunError] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentId | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef(0);
  const skipRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    skipRef.current = false;
    elapsedRef.current = 0;
    setScenario(null);
    setThoughts([]);
    setBeat(-1);
    setAgentStatuses(initialAgentStatuses);
    setPolicyRules([]);
    setTimelineEvents([]);
    setShowTrace(false);
    setSelectedAgent(null);
    setRunPhase("idle");
  }, []);

  /** jump straight to the resting state — judges won't always want the show */
  const finish = useCallback((sc: Scenario) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setAgentStatuses(finalStatuses(sc.summary));
    setPolicyRules(sc.policyRules.map((r, i) => ({ ...r, status: sc.steps.length ? r.status : r.status })));
    setBeat(sc.summary.trace.length - 1);
    setRunPhase("done");
  }, []);

  const runAudit = useCallback(async () => {
    reset();
    setRunError(null);
    setRunPhase("running");
    retryEngine(); // a deliberate run always re-probes, in case it started since

    // The decisioning engine is a separate Jac/FastAPI process. On a static
    // host (Vercel) it is not reachable, so fail with an explanation instead of
    // spinning forever.
    let sc: Scenario;
    try {
      sc = await runScenario({ case_id: caseId, facts });
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "the decision engine did not respond");
      setRunPhase("idle");
      return;
    }
    setScenario(sc);
    setPolicyRules(sc.policyRules);
    setAgentStatuses(sc.agentStatuses);
    saveLast({
      caseId,
      label,
      denied: sc.summary.denied,
      planMode: sc.summary.plan_mode,
      isMine: !!isMine,
    });
    setThoughts(
      sc.summary.trace.map((t) => ({
        agentId: (AGENT_KEY[t.agent] ?? "intake") as never,
        verdict: t.verdict,
        reasoning: t.reasoning,
      })),
    );

    const STEPS = sc.steps;
    const step = (i: number) => {
      if (skipRef.current) return;
      if (i >= STEPS.length) {
        setRunPhase("done");
        return;
      }
      const s = STEPS[i];
      elapsedRef.current += s.delay;
      const at = elapsedRef.current;
      timeoutRef.current = setTimeout(() => {
        if (skipRef.current) return;
        if (s.agentStatuses) setAgentStatuses((p) => ({ ...p, ...s.agentStatuses }));
        if (s.policyUpdates) {
          setPolicyRules((p) =>
            p.map((r) => {
              const u = s.policyUpdates?.find((x) => x.id === r.id);
              return u ? { ...r, status: u.status } : r;
            }),
          );
        }
        if (s.timeline) {
          setTimelineEvents((p) => [
            ...p,
            { id: s.id, agentId: s.timeline!.agentId, message: s.timeline!.message, level: s.timeline!.level, timestamp: formatElapsed(at) },
          ]);
        }
        setBeat(i);
        step(i + 1);
      }, s.delay);
    };
    step(0);
  }, [reset, caseId, label, facts, isMine]);

  const started = useRef(false);
  useEffect(() => {
    if (autoRun && !started.current) {
      started.current = true;
      void runAudit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  // ---------- derived ----------
  const trace = scenario?.summary.trace ?? [];
  const current = beat >= 0 ? trace[beat] : null;
  const vetoActive = !!scenario?.summary.vetoed && beat >= trace.findIndex((t) => /VETO/i.test(t.verdict));
  const isVetoBeat = !!current && /VETO/i.test(current.verdict);
  const activeStage: StageId | null =
    runPhase === "running" && current ? (STAGE_KEY[current.agent] ?? null) : null;

  // outcomes only appear once their beat has passed
  const draftIdx = trace.findIndex((t) => t.agent === "Adjudicator");
  const showDraft = draftIdx >= 0 && beat >= draftIdx;
  const finalIdx = trace.findIndex((t) => t.agent === "NoDiscrimination");
  const showFinal = runPhase === "done" || (finalIdx >= 0 && beat > finalIdx);

  const summary = scenario?.summary;
  const approved = summary?.final_outcome === "APPROVE";
  const factNodes = useMemo(
    () => (scenario?.graph.nodes ?? []).filter((n) => n.type === "Fact"),
    [scenario],
  );

  const skip = () => {
    if (!scenario) return;
    skipRef.current = true;
    finish(scenario);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ---------- header ---------- */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              Glass <em className="text-primary italic">Box</em>
            </h1>
            <Badge variant="outline" className="border-secondary text-secondary">
              AI Decision Audit
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono">{scenario?.applicationId ?? caseId}</span> — {label}
            {scenario ? (
              <span className="ml-2 rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                engine: {scenario.summary.engine}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {runPhase === "running" && scenario && (
            <Button variant="outline" onClick={skip} className="gap-2">
              Skip to result
            </Button>
          )}
          <Magnetic>
            <Button onClick={runAudit} disabled={runPhase === "running"} className="gap-2">
              <IconPlay className="size-4" />
              {runPhase === "idle" ? "Run Audit" : "Run Again"}
            </Button>
          </Magnetic>
          {runPhase !== "idle" && (
            <Button variant="outline" onClick={reset} className="gap-2">
              <IconRefresh className="size-4" />
              Reset
            </Button>
          )}
        </div>
      </header>

      {/* ---------- the pipeline: the one persistent visual ---------- */}
      <Card className="border-border/60 bg-card/70 backdrop-blur-xl">
        <CardContent className="flex flex-col gap-2 p-4">
          {runPhase === "done" && (
            <p className="text-[11px] text-muted-foreground">
              Click any agent to see exactly what it did and the evidence it read.
            </p>
          )}
          <PipelineDiagram
            statuses={agentStatuses}
            vetoActive={vetoActive}
            draftOutcome={showDraft ? summary?.draft_outcome : null}
            finalOutcome={showFinal ? summary?.final_outcome : null}
            activeStage={activeStage}
            selectedAgent={selectedAgent}
            onSelectAgent={(id) => setSelectedAgent((p) => (p === id ? null : id))}
          />
        </CardContent>
      </Card>

      {/* ---------- click an agent box to see exactly what it did ---------- */}
      {selectedAgent && scenario && (() => {
        // `thoughts` always has an entry for every agent that ran, so the card can
        // never come up empty; agentDetail only enriches it with cited evidence.
        const t = thoughts.find((x) => x.agentId === selectedAgent);
        if (!t) return null;
        const enriched = agentDetail(scenario, selectedAgent);
        return (
          <AgentDetailCard
            detail={{
              agentId: selectedAgent,
              verdict: t.verdict,
              reasoning: t.reasoning,
              cited: enriched?.cited ?? [],
            }}
            onClose={() => setSelectedAgent(null)}
          />
        );
      })()}

      {/* ---------- the beat ---------- */}
      {runError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col gap-2 p-6">
            <h3 className="font-display text-sm font-bold text-foreground">
              Your own application needs the live engine
            </h3>
            <p className="text-sm text-muted-foreground">
              The five worked examples have a recorded run of the real pipeline, so they work
              anywhere. Deciding numbers nobody has run before needs the Jac engine itself, which
              keeps its provenance graph in a live process and can&apos;t run on a serverless host.
              Start it with <code className="rounded bg-muted px-1 py-0.5 text-xs">./run.sh</code>,
              or deploy it (see the Dockerfile) and set{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">GLASSBOX_API</code>.
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/?examples=1">See a worked example</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/80">Details: {runError}</p>
          </CardContent>
        </Card>
      )}

      {runPhase === "idle" && (
        <Card className="border-border/60 bg-card/70">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="max-w-md text-sm text-muted-foreground">
              Seven agents will review this application in turn. You&apos;ll see each one&apos;s
              reasoning as it works — including the reviewer that can overrule the others.
            </p>
            <Button size="lg" onClick={runAudit} className="gap-2">
              <IconPlay className="size-4" />
              Run the audit
            </Button>
          </CardContent>
        </Card>
      )}

      {runPhase === "running" && current && (
        <Card
          className={cn(
            "transition-colors duration-300",
            isVetoBeat
              ? "border-destructive/70 bg-destructive/10"
              : "border-primary/50 bg-primary/5",
          )}
        >
          <CardContent className="flex flex-col gap-2 p-6">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  isVetoBeat ? "bg-destructive" : "animate-pulse bg-primary",
                )}
              />
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {isVetoBeat ? "Veto" : `Step ${beat + 1} of ${trace.length}`}
              </span>
              <span className="text-sm font-semibold text-foreground">{current.agent}</span>
              <span
                className={cn(
                  "ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                  isVetoBeat
                    ? "bg-destructive/25 text-destructive"
                    : "bg-background/60 text-muted-foreground",
                )}
              >
                {current.verdict}
              </span>
            </div>
            <p
              className={cn(
                "leading-relaxed",
                isVetoBeat ? "text-base text-foreground" : "text-[13px] text-muted-foreground",
              )}
            >
              {current.reasoning}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ---------- resting state: the verdict ---------- */}
      {runPhase === "done" && summary && (
        <>
          <Card
            className={cn(
              approved
                ? "border-secondary/60 bg-secondary/10"
                : "border-destructive/60 bg-destructive/10",
            )}
          >
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    "font-display text-3xl font-bold",
                    approved ? "text-secondary" : "text-destructive",
                  )}
                >
                  {approved ? "Approved" : "Declined"}
                </span>
                {summary.flipped && (
                  <span className="rounded-full bg-background/60 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                    ⟲ {summary.draft_outcome} → {summary.final_outcome} · overturned on review
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {summary.flipped && approved
                  ? "The first draft declined this application using a factor it isn't allowed to use. The independent reviewer reached its own verdict, caught it, and overturned the decision."
                  : summary.flipped && !approved
                    ? "The adjudicator approved on collateral despite failing the affordability rule. The independent reviewer overturned the unsound approval."
                    : summary.denied
                      ? "A legitimate decline. The independent reviewer agreed, and the Advisor built a plan to fix it."
                      : "The independent reviewer reached the same verdict on its own. No prohibited factor was involved."}
              </p>
              <div className="flex flex-wrap gap-2">
                {summary.denied && (
                  <Button asChild>
                    <Link href="/appeal">See how to fix it →</Link>
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowTrace((v) => !v)}>
                  {showTrace ? "Hide full trace ▴" : "Show full trace ▾"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ---------- everything else lives here ---------- */}
          {showTrace && (
            <div className="flex flex-col gap-4">
              <section className="flex flex-col gap-3">
                <h2 className="font-display text-sm font-bold tracking-tight text-foreground">
                  Why — each agent&apos;s reasoning and the rules applied
                </h2>
                <ThoughtStreams thoughts={thoughts} activeIndex={-1} />
                <PolicyPanel rules={policyRules} vetoActive={vetoActive} />
              </section>

              <section className="flex flex-col gap-3">
                <h2 className="font-display text-sm font-bold tracking-tight text-foreground">
                  What we read
                </h2>
                <DataPanel facts={factNodes} />
              </section>

              <section className="flex flex-col gap-3">
                <h2 className="font-display text-sm font-bold tracking-tight text-foreground">
                  Full trace
                </h2>
                <div className="h-[320px]">
                  <AgentTimeline events={timelineEvents} />
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
