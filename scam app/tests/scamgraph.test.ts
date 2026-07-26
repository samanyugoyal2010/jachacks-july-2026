import { describe, expect, it } from "vitest";
import { replay_walker, runInvestigation } from "@/lib/scamgraph/engine";

describe("ScamGraph deterministic walkers", () => {
  it("pauses and escalates the primary bank-impersonation scenario", () => {
    const result = runInvestigation();
    expect(result.riskLevel).toBe("Critical");
    expect(result.outcome).toBe("PAUSE_AND_ESCALATE");
    expect(result.skepticConclusion).toContain("No independent evidence");
  });

  it("links every risk signal to evidence", () => {
    const result = runInvestigation();
    const signals = result.graph.nodes.filter((node) => (node.riskDelta ?? 0) > 0);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every((signal) => signal.evidence && signal.evidence.length > 0)).toBe(true);
  });

  it("creates audit events for intervention and policy decisions", () => {
    const result = runInvestigation();
    expect(result.audit.some((event) => event.walker === "safety_gate_walker")).toBe(true);
    expect(result.audit.some((event) => event.policyInvoked?.includes("Critical risk"))).toBe(true);
  });

  it("prevents critical customer override release", () => {
    const result = runInvestigation();
    expect(result.riskLevel).toBe("Critical");
    expect(result.outcome).not.toBe("RELEASE");
  });

  it("replay lowers risk when legitimate facts are supplied", () => {
    const replay = replay_walker();
    expect(replay.original.riskScore).toBeGreaterThan(replay.replayed.riskScore);
    expect(["RELEASE", "VERIFY"]).toContain(replay.replayed.outcome);
  });
});
