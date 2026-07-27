/**
 * Live adapter: turns the real Jac backend's output into the shapes the audit
 * dashboard already renders. The UI was built against static mock data in
 * `data.ts`; this produces the identical structures from an actual pipeline run,
 * so nothing on screen is scripted.
 *
 * Backend: core.jac (8 walker agents) -> app.py -> /api/run, /api/graph.
 */
import type { Edge, Node } from "@xyflow/react";
import type {
  AgentId,
  AgentStatus,
  DecisionSnapshot,
  EvidenceItem,
  GraphNodeData,
  GraphNodeStatus,
  NodeStage,
  PolicyRule,
  TimelineLevel,
} from "./types";
import type { NodeUpdate, PolicyUpdate, RunStep } from "./data";

// ---------- backend payload shapes (from GraphState / RunCase in core.jac) ----------
export interface JacNode {
  id: string;
  type: string;
  label: string;
  data: Record<string, any>;
}
export interface JacEdge { src: string; dst: string; rel: string }
export interface JacGraph { nodes: JacNode[]; edges: JacEdge[] }
export interface TraceEntry { agent: string; verdict: string; reasoning: string }
export interface JacSummary {
  case_id: string;
  draft_outcome: string;
  final_outcome: string;
  flipped: boolean;
  denied: boolean;
  has_plan: boolean;
  plan_mode: string;
  independent_verdict: string;
  vetoed: boolean;
  agree: boolean;
  engine: string;
  trace: TraceEntry[];
}

export interface RemediationStepData {
  factor: string; current: string; target: string; action: string; impact: string; status: string;
}
export interface RemediationPlanData {
  mode: string; summary: string; feasible: boolean;
  reapply_facts: Record<string, string>; steps: RemediationStepData[];
}

/** The Jac/FastAPI engine is a separate process from this site. Turn any way it
 *  can be unreachable — connection refused, proxy 502, an HTML error page — into
 *  one clear error rather than a downstream JSON parse failure. */
async function backend(path: string, init?: RequestInit): Promise<any> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new Error("the decision engine is not reachable");
  }
  if (!res.ok) {
    throw new Error(`the decision engine returned ${res.status}`);
  }
  try {
    return await res.json();
  } catch {
    throw new Error("the decision engine returned an unexpected response");
  }
}

/** Fetch the current graph (used by the appeal page across navigation). */
export async function getGraph(): Promise<JacGraph> {
  return backend("/api/graph");
}

/** The remediation plan attached to the final decision, if there is one. */
export function planOf(graph: JacGraph): RemediationPlanData | null {
  const p = graph.nodes.find((n) => n.type === "RemediationPlan");
  return p ? (p.data as unknown as RemediationPlanData) : null;
}


// ---------- shared helpers used by both the audit page and the appeal page ----------

/** trace agent name -> dashboard agent id */
export const AGENT_KEY: Record<string, AgentId> = {
  Intake: "intake",
  Affordability: "affordability",
  Risk: "risk",
  Collateral: "collateral",
  Adjudicator: "adjudicator",
  NoDiscrimination: "policy",
  Advisor: "advisor",
};

/** The agent statuses a completed run ends on (used to render a finished pipeline). */
export function finalStatuses(summary: JacSummary): Record<string, AgentStatus> {
  const out: Record<string, AgentStatus> = {
    intake: "idle", affordability: "idle", risk: "idle", collateral: "idle",
    adjudicator: "idle", policy: "idle", advisor: "idle",
  };
  for (const t of summary.trace) {
    const id = AGENT_KEY[t.agent];
    if (id) out[id] = /VETO/i.test(t.verdict) ? "veto" : "complete";
  }
  return out;
}

export interface AgentDetail {
  agentId: AgentId;
  verdict: string;
  reasoning: string;
  /** the specific facts this agent actually read, when it cited any */
  cited: { key: string; value: string; sensitivity: string }[];
}

/** What one agent did on this run: its verdict, its chain of thought, and the
 *  exact evidence it cited. Powers the click-a-box detail view. */
export function agentDetail(
  scenario: Scenario,
  agentId: AgentId,
): AgentDetail | null {
  const entry = scenario.summary.trace.find((t) => AGENT_KEY[t.agent] === agentId);
  if (!entry) return null;

  const g = scenario.graph;
  let cited: AgentDetail["cited"] = [];

  // analysts cite the facts they reasoned from
  const assessment = g.nodes.find(
    (n) => n.type === "Assessment" && AGENT_KEY[cap(String(n.data.agent))] === agentId,
  );
  if (assessment) {
    const ids = g.edges.filter((e) => e.rel === "cites" && e.src === assessment.id).map((e) => e.dst);
    cited = g.nodes
      .filter((n) => ids.includes(n.id))
      .map((n) => ({
        key: String(n.data.key ?? ""),
        value: String(n.data.value ?? ""),
        sensitivity: String(n.data.sensitivity ?? "PERMISSIBLE"),
      }));
  }

  // the reviewer's "evidence" is the leaked factor it caught
  if (agentId === "policy") {
    const review = g.nodes.find((n) => n.type === "Review");
    if (review?.data.leak_factor) {
      const f = g.nodes.find((n) => n.type === "Fact" && n.data.key === review.data.leak_factor);
      cited = [
        {
          key: String(review.data.leak_factor),
          value: f ? String(f.data.value ?? "") : "",
          sensitivity: f ? String(f.data.sensitivity ?? "PROXY_RISK") : "PROXY_RISK",
        },
      ];
    }
  }

  return { agentId, verdict: entry.verdict, reasoning: entry.reasoning, cited };
}

export interface Scenario {
  applicationId: string;
  nodes: Node<GraphNodeData>[];
  edges: Edge[];
  steps: RunStep[];
  policyRules: PolicyRule[];
  agentStatuses: Record<string, AgentStatus>;
  draft: DecisionSnapshot | null;
  final: DecisionSnapshot | null;
  summary: JacSummary;
  graph: JacGraph;
}

// ---------- agent mapping (our 8 walkers -> the dashboard's agent ids) ----------
const AGENT_OF: Record<string, AgentId> = {
  Intake: "intake",
  Affordability: "affordability",
  Risk: "risk",
  Collateral: "collateral",
  Adjudicator: "adjudicator",
  NoDiscrimination: "policy",
  Advisor: "advisor",
};
const agentFor = (traceAgent: string): AgentId => AGENT_OF[traceAgent] ?? "intake";

// which dashboard agent "owns" each backend node type
function ownerOf(n: JacNode): AgentId {
  switch (n.type) {
    case "Application": return "intake";
    case "Fact": return "intake";
    case "Assessment":
      return (AGENT_OF[cap(n.data.agent ?? "")] ?? "affordability") as AgentId;
    case "DraftDecision": return "adjudicator";
    case "Review": return "policy";
    case "Decision": return "adjudicator";
    default: return "advisor";
  }
}
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const STAGE_OF: Record<string, NodeStage> = {
  Application: "application",
  Fact: "facts",
  Assessment: "assessment",
  DraftDecision: "decision",
  Review: "verification",
  Decision: "final",
  RemediationPlan: "final",
  RemediationStep: "final",
};

// ---------- policy rules, driven by the real review node ----------
export function policyRulesFrom(graph: JacGraph): PolicyRule[] {
  const review = graph.nodes.find((n) => n.type === "Review");
  const leaked = !!review?.data.leak;
  const vetoed = !!review?.data.vetoed;
  const pass = (ok: boolean) => (review ? (ok ? "pass" : "fail") : "pending") as PolicyRule["status"];
  return [
    {
      id: "reg-b",
      title: "Prohibited Basis Screen",
      citation: "ECOA / Reg B § 1002.6",
      description:
        "Decisions may not rely, directly or by proxy, on race, color, national origin, sex, marital status, age, or receipt of public assistance.",
      status: pass(!leaked),
    },
    {
      id: "proxy-variable",
      title: "Proxy Variable Detection",
      citation: "ECOA Disparate Impact",
      description:
        "Flags inputs statistically correlated with protected classes even when facially neutral (ZIP code is the canonical case).",
      status: pass(!leaked),
    },
    {
      id: "independent-review",
      title: "Independent Review",
      citation: "CFPB Circular 2022-03",
      description:
        "A reviewer must reach its own verdict from permissible facts before seeing the draft, and may overturn it in either direction.",
      status: review ? "pass" : "pending",
    },
    {
      id: "affordability",
      title: "Affordability Rule",
      citation: "Internal Credit Policy § 2.1",
      description:
        "Debt-to-income at or above 43% is a hard limit; collateral strength cannot override it.",
      status: review ? (vetoed && !leaked ? "fail" : "pass") : "pending",
    },
    {
      id: "explainability",
      title: "Specific Reasons & Recourse",
      citation: "Reg B § 1002.9",
      description:
        "An adverse action must state its specific principal reasons and never cite a prohibited basis in the recourse given.",
      status: review ? "pass" : "pending",
    },
  ];
}

// ---------- graph -> react-flow nodes/edges ----------
const COL: Record<NodeStage, number> = {
  application: 0, facts: 300, assessment: 640, decision: 980, verification: 980, final: 1320,
};

function evidenceFor(n: JacNode, graph: JacGraph): EvidenceItem[] {
  if (n.type === "Assessment") {
    // the facts this assessment actually cited
    const cited = graph.edges.filter((e) => e.rel === "cites" && e.src === n.id).map((e) => e.dst);
    return graph.nodes
      .filter((f) => cited.includes(f.id))
      .map((f) => ({
        label: String(f.data.key ?? "").replace(/_/g, " "),
        value: String(f.data.value ?? ""),
        source: String(f.data.source ?? "application"),
        flagged: f.data.sensitivity !== "PERMISSIBLE",
        flagReason:
          f.data.sensitivity === "PROHIBITED_BASIS"
            ? "Prohibited basis under ECOA"
            : f.data.sensitivity === "PROXY_RISK"
              ? "Facially neutral but correlated with a protected class"
              : undefined,
      }));
  }
  if (n.type === "Application") {
    return graph.nodes
      .filter((f) => f.type === "Fact")
      .slice(0, 8)
      .map((f) => ({
        label: String(f.data.key ?? "").replace(/_/g, " "),
        value: String(f.data.value ?? ""),
        source: String(f.data.category ?? "application"),
        flagged: f.data.sensitivity !== "PERMISSIBLE",
      }));
  }
  if (n.type === "DraftDecision" || n.type === "Decision") {
    return (n.data.relied_on ?? []).map((r: string) => ({
      label: "Relied on", value: r, source: "decision",
      flagged: /public assistance|marital|age|race|religion|ZIP|area risk/i.test(r),
    }));
  }
  if (n.type === "Review") {
    return [
      { label: "Independent verdict", value: String(n.data.independent_verdict), source: "own analysis" },
      { label: "Draft said", value: String(n.data.draft_outcome), source: "adjudicator" },
      ...(n.data.leak_factor
        ? [{ label: "Leaked factor", value: String(n.data.leak_factor), source: "leak scan", flagged: true }]
        : []),
    ];
  }
  return [];
}

function statusFor(n: JacNode): GraphNodeStatus {
  if (n.type === "Review") return n.data.vetoed ? "veto" : "complete";
  if (n.type === "DraftDecision") {
    // a vetoed draft is superseded by the final decision
    return "superseded";
  }
  if (n.type === "Decision") return n.data.outcome === "APPROVE" ? "approved" : "complete";
  return "complete";
}

function titleFor(n: JacNode): string {
  switch (n.type) {
    case "Application": return `Application ${n.data.case_id}`;
    case "Fact": return String(n.data.key ?? "").replace(/_/g, " ");
    case "Assessment": return `${cap(String(n.data.agent))} Assessment`;
    case "DraftDecision": return `Draft Decision — ${n.data.outcome}`;
    case "Review": return n.data.vetoed ? "Independent Review — VETO" : "Independent Review";
    case "Decision": return `Final Decision — ${n.data.outcome}`;
    case "RemediationPlan": return "Reapplication Plan";
    case "RemediationStep": return `Fix: ${n.data.factor}`;
    default: return n.label;
  }
}

function summaryFor(n: JacNode): string {
  switch (n.type) {
    case "Application":
      return n.data.package_complete
        ? "Complete application package received and parsed into typed facts."
        : `Package incomplete — missing: ${(n.data.missing_docs ?? []).join(", ")}.`;
    case "Assessment": return String(n.data.rationale ?? "");
    case "DraftDecision": return (n.data.reasons ?? []).join(" ");
    case "Review": return String(n.data.finding ?? "");
    case "Decision":
      return [(n.data.reasons ?? []).join(" "), n.data.explanation].filter(Boolean).join(" ");
    case "RemediationPlan": return String(n.data.summary ?? "");
    case "RemediationStep": return `${n.data.action} (${n.data.impact})`;
    default: return n.label;
  }
}

function reasoningFor(n: JacNode): string[] {
  const r = n.data.reasoning ?? n.data.finding;
  if (typeof r === "string" && r) {
    return r.split(/(?<=\.)\s+/).filter(Boolean);
  }
  return [summaryFor(n)].filter(Boolean);
}

/** Build react-flow nodes/edges from the live graph, skipping raw Fact nodes
 *  (they'd swamp the canvas; the dashboard shows them as evidence instead). */
export function toFlow(graph: JacGraph): { nodes: Node<GraphNodeData>[]; edges: Edge[] } {
  const keep = graph.nodes.filter((n) => n.type !== "Fact");
  const perStage: Record<string, number> = {};
  const nodes: Node<GraphNodeData>[] = keep.map((n) => {
    const stage = STAGE_OF[n.type] ?? "assessment";
    const i = (perStage[n.type] = (perStage[n.type] ?? 0) + 1) - 1;
    const yBase = n.type === "Review" ? 420 : n.type === "RemediationPlan" || n.type === "RemediationStep" ? 520 : 120;
    return {
      id: n.id,
      type: "auditNode",
      position: { x: COL[stage] ?? 640, y: yBase + i * 150 },
      draggable: true,
      data: {
        stage,
        title: titleFor(n),
        subtitle: n.type === "Assessment" ? String(n.data.verdict) : n.type,
        agentId: ownerOf(n),
        status: statusFor(n),
        confidence: null,
        summary: summaryFor(n),
        evidence: evidenceFor(n, graph),
        reasoning: reasoningFor(n),
        version: n.type === "Decision" && n.data.vetoed_once ? 2 : 1,
        flagged: n.type === "Review" ? !!n.data.vetoed : undefined,
        flagReason: n.type === "Review" && n.data.vetoed ? String(n.data.finding) : undefined,
      },
    };
  });
  const ids = new Set(nodes.map((n) => n.id));
  const edges: Edge[] = graph.edges
    .filter((e) => ids.has(e.src) && ids.has(e.dst))
    .map((e) => ({
      id: `${e.src}-${e.dst}-${e.rel}`,
      source: e.src,
      target: e.dst,
      label: e.rel,
      animated: false,
      ...(e.rel === "vetoes" ? { sourceHandle: "bottom", targetHandle: "top" } : {}),
    }));
  return { nodes, edges };
}

// ---------- the replay steps, generated from the real agent trace ----------
function levelFor(t: TraceEntry): TimelineLevel {
  if (/VETO/i.test(t.verdict)) return "error";
  if (/APPROVE|affordable|upheld|standard/i.test(t.verdict)) return "success";
  if (/DENY|elevated|unaffordable|unverified|disagree/i.test(t.verdict)) return "warning";
  return "info";
}

export function buildSteps(graph: JacGraph, summary: JacSummary): RunStep[] {
  const { nodes } = toFlow(graph);
  const byAgent = (a: AgentId) => nodes.filter((n) => n.data.agentId === a).map((n) => n.id);
  const steps: RunStep[] = [];
  let i = 0;
  for (const t of summary.trace) {
    const agentId = agentFor(t.agent);
    const isVeto = /VETO/i.test(t.verdict);
    const nodeUpdates: NodeUpdate[] = byAgent(agentId).map((id) => ({
      id,
      status: (isVeto && graph.nodes.find((g) => g.id === id)?.type === "Review"
        ? "veto"
        : "complete") as GraphNodeStatus,
    }));
    steps.push({
      id: `step-${i++}`,
      delay: isVeto ? 1200 : 800,
      agentStatuses: { [agentId]: (isVeto ? "veto" : "complete") as AgentStatus },
      nodeUpdates,
      timeline: { agentId, message: `${t.verdict} — ${t.reasoning}`, level: levelFor(t) },
      vetoMoment: isVeto || undefined,
      policyUpdates: agentId === "policy" ? (policyRulesFrom(graph).map((r) => ({ id: r.id, status: r.status })) as PolicyUpdate[]) : undefined,
    });
  }
  return steps;
}

// ---------- decision snapshots ----------
function snapshot(graph: JacGraph, summary: JacSummary, which: "draft" | "final"): DecisionSnapshot | null {
  const n = graph.nodes.find((g) => g.type === (which === "draft" ? "DraftDecision" : "Decision"));
  if (!n) return null;
  const outcome = String(n.data.outcome);
  const relied: string[] = n.data.relied_on ?? [];
  return {
    verdict: (outcome === "APPROVE" ? "APPROVE" : "DENY") as DecisionSnapshot["verdict"],
    headline:
      which === "draft"
        ? `Draft: ${outcome}`
        : summary.flipped
          ? `${outcome} — overturned on review`
          : `Final: ${outcome}`,
    amount: "—",
    rationale: [
      ...(n.data.reasons ?? []),
      ...(relied.length ? [`Relied on: ${relied.join(", ")}`] : []),
      ...(n.data.explanation ? [String(n.data.explanation)] : []),
    ],
    confidence: which === "final" ? 0.96 : 0.72,
    generatedBy: which === "draft" ? "adjudicator" : summary.vetoed ? "policy" : "adjudicator",
    flagged: which === "draft" && summary.vetoed,
  };
}

// ---------- API ----------
export async function runScenario(payload: {
  case_id: string;
  raw_text?: string;
  facts: Record<string, string>;
}): Promise<Scenario> {
  await backend("/api/reset", { method: "POST" });
  const summary: JacSummary = await backend("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw_text: "", ...payload }),
  });
  const graph: JacGraph = await backend("/api/graph");
  const { nodes, edges } = toFlow(graph);
  return {
    applicationId: summary.case_id,
    nodes: nodes.map((n) => ({ ...n, data: { ...n.data, status: "pending" as GraphNodeStatus } })),
    edges,
    steps: buildSteps(graph, summary),
    policyRules: policyRulesFrom(graph).map((r) => ({ ...r, status: "pending" as const })),
    agentStatuses: Object.fromEntries(
      (["intake", "affordability", "risk", "collateral", "adjudicator", "policy", "advisor"] as AgentId[]).map((a) => [a, "idle" as AgentStatus]),
    ),
    draft: snapshot(graph, summary, "draft"),
    final: snapshot(graph, summary, "final"),
    summary,
    graph,
  };
}
