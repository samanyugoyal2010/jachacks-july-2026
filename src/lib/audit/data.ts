import type { Edge, Node } from "@xyflow/react";
import type {
  Agent,
  AgentId,
  AgentStatus,
  DecisionSnapshot,
  GraphNodeData,
  GraphNodeStatus,
  PolicyRule,
  PolicyRuleStatus,
  TimelineLevel,
} from "./types";

export const APPLICATION_ID = "A-48213";

export const AGENTS: Record<AgentId, Agent> = {
  intake: {
    id: "intake",
    name: "Intake Agent",
    role: "Fact Extraction",
    description:
      "Parses the raw application and supporting documents into structured, verifiable facts.",
    initials: "IN",
  },
  affordability: {
    id: "affordability",
    name: "Affordability Analyst",
    role: "Income & Debt Analysis",
    description:
      "Evaluates income stability, debt-to-income ratio, and repayment affordability.",
    initials: "AA",
  },
  risk: {
    id: "risk",
    name: "Risk Analyst",
    role: "Credit Signal Analysis",
    description:
      "Scores credit risk using bureau data, payment history, and behavioral signals.",
    initials: "RA",
  },
  policy: {
    id: "policy",
    name: "Policy Verifier",
    role: "Fairness & Compliance",
    description:
      "Audits every upstream assessment and decision against fair-lending policy before it can ship.",
    initials: "PV",
  },
  adjudicator: {
    id: "adjudicator",
    name: "Adjudicator",
    role: "Final Decision Synthesis",
    description:
      "Synthesizes verified assessments into a single explainable decision.",
    initials: "AJ",
  },
};

export const AGENT_ORDER: AgentId[] = [
  "intake",
  "affordability",
  "risk",
  "policy",
  "adjudicator",
];

export const initialAgentStatuses: Record<AgentId, AgentStatus> = {
  intake: "idle",
  affordability: "idle",
  risk: "idle",
  policy: "idle",
  adjudicator: "idle",
};

export const POLICY_RULES: PolicyRule[] = [
  {
    id: "reg-b",
    title: "Prohibited Basis Screen",
    citation: "Reg B § 1002.6",
    description:
      "Decisions may not rely, directly or by proxy, on race, color, national origin, or neighborhood composition.",
    status: "pending",
  },
  {
    id: "proxy-variable",
    title: "Proxy Variable Detection",
    citation: "ECOA Disparate Impact",
    description:
      "Flags model inputs statistically correlated with protected classes, even when facially neutral.",
    status: "pending",
  },
  {
    id: "explainability",
    title: "Explainability Requirement",
    citation: "Internal Model Governance § 4.2",
    description:
      "Every adverse action must trace to specific, disclosable, individualized evidence.",
    status: "pending",
  },
  {
    id: "adverse-action",
    title: "Adverse Action Accuracy",
    citation: "Reg B § 1002.9",
    description:
      "If declined, the stated reasons must match the actual drivers of the model's output.",
    status: "pending",
  },
];

function baseNode(
  id: string,
  position: { x: number; y: number },
  data: GraphNodeData,
): Node<GraphNodeData> {
  return {
    id,
    type: "auditNode",
    position,
    data,
    draggable: true,
  };
}

export const initialNodes: Node<GraphNodeData>[] = [
  baseNode(
    "application",
    { x: 0, y: 190 },
    {
      stage: "application",
      title: `Loan Application ${APPLICATION_ID}`,
      subtitle: "Submitted application package",
      agentId: "intake",
      status: "complete",
      confidence: null,
      summary:
        "$42,000 auto loan request submitted with pay stubs, credit authorization, and residency documents.",
      evidence: [
        {
          label: "Applicant",
          value: "J. Whitfield",
          source: "Application form",
        },
        {
          label: "Requested amount",
          value: "$42,000",
          source: "Application form",
        },
        { label: "Term", value: "60 months", source: "Application form" },
        {
          label: "Submitted",
          value: "2026-07-24 09:12 UTC",
          source: "Intake system",
        },
      ],
      reasoning: ["Raw application received and queued for automated review."],
      version: 1,
    },
  ),
  baseNode(
    "facts",
    { x: 300, y: 190 },
    {
      stage: "facts",
      title: "Extracted Facts",
      subtitle: "Structured applicant profile",
      agentId: "intake",
      status: "pending",
      confidence: null,
      summary: "",
      evidence: [],
      reasoning: [],
      version: 1,
    },
  ),
  baseNode(
    "affordability",
    { x: 620, y: 0 },
    {
      stage: "assessment",
      title: "Affordability Assessment",
      subtitle: "Income & debt analysis",
      agentId: "affordability",
      status: "pending",
      confidence: null,
      summary: "",
      evidence: [],
      reasoning: [],
      version: 1,
    },
  ),
  baseNode(
    "risk",
    { x: 620, y: 380 },
    {
      stage: "assessment",
      title: "Credit Risk Assessment",
      subtitle: "Credit signal analysis",
      agentId: "risk",
      status: "pending",
      confidence: null,
      summary: "",
      evidence: [],
      reasoning: [],
      version: 1,
    },
  ),
  baseNode(
    "decision-draft",
    { x: 940, y: 0 },
    {
      stage: "decision",
      title: "Draft Decision",
      subtitle: "Adjudicator v1 output",
      agentId: "adjudicator",
      status: "pending",
      confidence: null,
      summary: "",
      evidence: [],
      reasoning: [],
      version: 1,
    },
  ),
  baseNode(
    "verification",
    { x: 940, y: 380 },
    {
      stage: "verification",
      title: "Policy Verification",
      subtitle: "Fairness & compliance audit",
      agentId: "policy",
      status: "pending",
      confidence: null,
      summary: "",
      evidence: [],
      reasoning: [],
      version: 1,
    },
  ),
  baseNode(
    "decision-final",
    { x: 1260, y: 190 },
    {
      stage: "final",
      title: "Final Decision",
      subtitle: "Adjudicator v2 output",
      agentId: "adjudicator",
      status: "pending",
      confidence: null,
      summary: "",
      evidence: [],
      reasoning: [],
      version: 1,
    },
  ),
];

export const initialEdges: Edge[] = [
  { id: "e-app-facts", source: "application", target: "facts" },
  { id: "e-facts-afford", source: "facts", target: "affordability" },
  { id: "e-facts-risk", source: "facts", target: "risk" },
  { id: "e-afford-draft", source: "affordability", target: "decision-draft" },
  { id: "e-risk-draft", source: "risk", target: "decision-draft" },
  {
    id: "e-draft-verify",
    source: "decision-draft",
    target: "verification",
    sourceHandle: "bottom",
    targetHandle: "top",
  },
  {
    id: "e-verify-final",
    source: "verification",
    target: "decision-final",
  },
  {
    id: "e-afford-final",
    source: "affordability",
    target: "decision-final",
  },
  { id: "e-risk-final", source: "risk", target: "decision-final" },
].map((e) => ({ ...e, animated: false }));

export const draftDecision: DecisionSnapshot = {
  verdict: "DENY",
  headline: "Application Declined",
  amount: "$42,000 requested",
  rationale: [
    "Elevated composite risk score (712/1000) driven primarily by neighborhood risk multiplier.",
    "Debt-to-income ratio within acceptable range but outweighed by risk signal.",
    "Model confidence 91% in composite risk assessment.",
  ],
  confidence: 91,
  generatedBy: "adjudicator",
  flagged: true,
};

export const finalDecision: DecisionSnapshot = {
  verdict: "APPROVE_WITH_CONDITIONS",
  headline: "Application Approved with Conditions",
  amount: "$42,000 requested → $38,000 approved",
  rationale: [
    "Debt-to-income ratio of 0.31 is within policy threshold for the requested term.",
    "660 credit score with 4-year clean payment history supports standard risk tier.",
    "Loan amount adjusted to $38,000 at a 60-month term to keep monthly payment affordable.",
    "Neighborhood risk multiplier excluded as a prohibited proxy variable; decision now relies only on individualized financial evidence.",
  ],
  confidence: 96,
  generatedBy: "adjudicator",
};

export interface NodeUpdate {
  id: string;
  status?: GraphNodeStatus;
  data?: Partial<GraphNodeData>;
}

export interface PolicyUpdate {
  id: string;
  status: PolicyRuleStatus;
}

export interface RunStep {
  id: string;
  delay: number;
  agentStatuses?: Partial<Record<AgentId, AgentStatus>>;
  nodeUpdates?: NodeUpdate[];
  activeEdges?: string[];
  policyUpdates?: PolicyUpdate[];
  timeline?: { agentId: AgentId; message: string; level: TimelineLevel };
  vetoMoment?: boolean;
  clearVeto?: boolean;
}

export const RUN_STEPS: RunStep[] = [
  {
    id: "intake-start",
    delay: 400,
    agentStatuses: { intake: "processing" },
    activeEdges: ["e-app-facts"],
    timeline: {
      agentId: "intake",
      message: "Parsing application package and supporting documents…",
      level: "info",
    },
  },
  {
    id: "intake-complete",
    delay: 1400,
    agentStatuses: { intake: "complete" },
    nodeUpdates: [
      {
        id: "facts",
        status: "complete",
        data: {
          summary:
            "12 structured facts extracted from application, pay stubs, and credit bureau pull.",
          evidence: [
            {
              label: "Annual income",
              value: "$71,400",
              source: "Pay stubs (3 mo.)",
            },
            {
              label: "Existing monthly debt",
              value: "$1,120",
              source: "Credit bureau pull",
            },
            {
              label: "Credit score",
              value: "660",
              source: "Credit bureau pull",
            },
            {
              label: "Payment history",
              value: "48 mo. clean",
              source: "Credit bureau pull",
            },
            {
              label: "Employment",
              value: "3.2 yrs, same employer",
              source: "Pay stubs",
            },
            {
              label: "Residential zip code",
              value: "60623",
              source: "Application form",
            },
          ],
          reasoning: [
            "Cross-referenced applicant-provided data against bureau and payroll records.",
            "All facts passed document-consistency checks with no discrepancies.",
          ],
        },
      },
    ],
    timeline: {
      agentId: "intake",
      message:
        "Extracted 12 verified facts — income, debt, credit, and residency confirmed.",
      level: "success",
    },
  },
  {
    id: "afford-start",
    delay: 900,
    agentStatuses: { affordability: "processing" },
    nodeUpdates: [{ id: "affordability", status: "active" }],
    activeEdges: ["e-facts-afford"],
    timeline: {
      agentId: "affordability",
      message: "Calculating debt-to-income ratio and affordability envelope…",
      level: "info",
    },
  },
  {
    id: "risk-start",
    delay: 300,
    agentStatuses: { risk: "processing" },
    nodeUpdates: [{ id: "risk", status: "active" }],
    activeEdges: ["e-facts-risk"],
    timeline: {
      agentId: "risk",
      message:
        "Scoring credit risk from bureau signals and geographic model features…",
      level: "info",
    },
  },
  {
    id: "afford-complete",
    delay: 1500,
    agentStatuses: { affordability: "complete" },
    nodeUpdates: [
      {
        id: "affordability",
        status: "complete",
        data: {
          confidence: 94,
          summary:
            "Debt-to-income ratio of 0.31 — within standard approval threshold.",
          evidence: [
            { label: "Monthly income", value: "$5,950", source: "Facts" },
            {
              label: "Monthly debt obligations",
              value: "$1,120 + est. $756 new payment",
              source: "Facts + pricing model",
            },
            { label: "DTI ratio", value: "0.31", source: "Computed" },
            {
              label: "Policy threshold",
              value: "≤ 0.40",
              source: "Underwriting policy v3.2",
            },
          ],
          reasoning: [
            "Computed DTI from verified income and existing obligations plus estimated new payment.",
            "0.31 falls comfortably under the 0.40 policy ceiling for this loan term.",
          ],
        },
      },
    ],
    timeline: {
      agentId: "affordability",
      message: "Affordability confirmed — DTI 0.31, within policy threshold.",
      level: "success",
    },
  },
  {
    id: "risk-complete",
    delay: 900,
    agentStatuses: { risk: "complete" },
    nodeUpdates: [
      {
        id: "risk",
        status: "complete",
        data: {
          confidence: 91,
          flagged: true,
          flagReason:
            "Includes a neighborhood risk multiplier statistically correlated with protected-class composition — a prohibited proxy variable.",
          summary:
            "Composite risk score 712/1000 — elevated primarily by a neighborhood risk multiplier.",
          evidence: [
            { label: "Credit score", value: "660", source: "Facts" },
            {
              label: "Payment history",
              value: "48 mo. clean",
              source: "Facts",
            },
            {
              label: "Neighborhood risk multiplier",
              value: "×1.38",
              source: "Legacy risk model v2",
              flagged: true,
              flagReason:
                "Derived from zip-code-level default rates; correlated with redlined districts.",
            },
            {
              label: "Composite risk score",
              value: "712 / 1000",
              source: "Computed",
            },
          ],
          reasoning: [
            "Base score of 516 computed from individualized credit signals.",
            "Neighborhood risk multiplier applied from legacy model, raising composite to 712.",
            "Multiplier is derived from zip-code-aggregated default rates, not individual behavior.",
          ],
        },
      },
    ],
    timeline: {
      agentId: "risk",
      message:
        "Risk score computed: 712/1000. Uses legacy neighborhood risk multiplier.",
      level: "warning",
    },
  },
  {
    id: "adjudicator-draft-start",
    delay: 900,
    agentStatuses: { adjudicator: "processing" },
    nodeUpdates: [{ id: "decision-draft", status: "active" }],
    activeEdges: ["e-afford-draft", "e-risk-draft"],
    timeline: {
      agentId: "adjudicator",
      message:
        "Synthesizing affordability and risk assessments into a draft decision…",
      level: "info",
    },
  },
  {
    id: "adjudicator-draft-complete",
    delay: 1400,
    agentStatuses: { adjudicator: "complete" },
    nodeUpdates: [
      {
        id: "decision-draft",
        status: "veto",
        data: {
          confidence: 91,
          flagged: true,
          summary:
            "DRAFT: Decline — composite risk score exceeds approval threshold.",
          evidence: [
            { label: "Verdict", value: "DENY", source: "Adjudicator v1" },
            {
              label: "Primary driver",
              value: "Composite risk score 712/1000",
              source: "Risk Assessment",
            },
            {
              label: "DTI (secondary)",
              value: "0.31 (passing)",
              source: "Affordability Assessment",
            },
          ],
          reasoning: [
            "Weighted risk assessment (712/1000) above the 700 decline threshold.",
            "Affordability was within range but insufficient to offset risk signal.",
            "Recommends adverse action notice citing elevated credit risk.",
          ],
        },
      },
    ],
    timeline: {
      agentId: "adjudicator",
      message: "Draft decision produced: DENY (91% confidence).",
      level: "warning",
    },
  },
  {
    id: "policy-start",
    delay: 900,
    agentStatuses: { policy: "processing" },
    nodeUpdates: [{ id: "verification", status: "active" }],
    activeEdges: ["e-draft-verify"],
    policyUpdates: [
      { id: "reg-b", status: "pending" },
      { id: "proxy-variable", status: "pending" },
    ],
    timeline: {
      agentId: "policy",
      message:
        "Auditing draft decision and upstream evidence against fair-lending policy…",
      level: "info",
    },
  },
  {
    id: "policy-scan-1",
    delay: 1100,
    policyUpdates: [{ id: "explainability", status: "pass" }],
    timeline: {
      agentId: "policy",
      message:
        "Explainability check passed — decision traces to disclosed evidence.",
      level: "info",
    },
  },
  {
    id: "policy-veto",
    delay: 1200,
    agentStatuses: { policy: "veto" },
    nodeUpdates: [
      {
        id: "verification",
        status: "veto",
        data: {
          confidence: 99,
          flagged: true,
          summary:
            "VETO — Policy Violation Detected. Draft decision relies on a prohibited proxy variable.",
          evidence: [
            {
              label: "Violating input",
              value: "Neighborhood risk multiplier",
              source: "Risk Assessment v1",
            },
            {
              label: "Correlation",
              value: "0.83 with protected-class composition",
              source: "Fair-lending audit model",
            },
            {
              label: "Rule violated",
              value: "Reg B § 1002.6 — Prohibited Basis",
              source: "Policy engine",
            },
          ],
          reasoning: [
            "Traced the 712/1000 composite score back through Risk Assessment v1.",
            "Identified the neighborhood risk multiplier as a zip-code-derived proxy for protected-class composition.",
            "Disparate impact analysis shows 0.83 correlation with historically redlined districts.",
            "VETO issued: draft decision cannot proceed on this evidence.",
          ],
        },
      },
      { id: "decision-draft", status: "veto" },
    ],
    policyUpdates: [
      { id: "reg-b", status: "fail" },
      { id: "proxy-variable", status: "fail" },
      { id: "adverse-action", status: "fail" },
    ],
    activeEdges: ["e-draft-verify"],
    vetoMoment: true,
    timeline: {
      agentId: "policy",
      message:
        "VETO — Policy Violation Detected: neighborhood risk multiplier is a prohibited proxy variable.",
      level: "error",
    },
  },
  {
    id: "risk-recompute-start",
    delay: 2200,
    agentStatuses: { risk: "processing" },
    nodeUpdates: [{ id: "risk", status: "active" }],
    timeline: {
      agentId: "risk",
      message: "Recomputing risk score with the proxy variable removed…",
      level: "info",
    },
  },
  {
    id: "risk-recompute-complete",
    delay: 1300,
    agentStatuses: { risk: "complete" },
    nodeUpdates: [
      {
        id: "risk",
        status: "approved",
        data: {
          version: 2,
          confidence: 95,
          flagged: false,
          flagReason: undefined,
          summary:
            "Composite risk score 516/1000 — recomputed from individualized signals only.",
          evidence: [
            { label: "Credit score", value: "660", source: "Facts" },
            {
              label: "Payment history",
              value: "48 mo. clean",
              source: "Facts",
            },
            {
              label: "Composite risk score",
              value: "516 / 1000",
              source: "Computed (v2, corrected)",
            },
          ],
          reasoning: [
            "Neighborhood risk multiplier removed per Policy Verifier ruling.",
            "Score now derives solely from individualized credit signals.",
            "516/1000 places applicant in the standard approval risk tier.",
          ],
        },
      },
    ],
    timeline: {
      agentId: "risk",
      message:
        "Risk score recomputed: 516/1000 using only individualized evidence.",
      level: "success",
    },
  },
  {
    id: "policy-verify-2",
    delay: 900,
    agentStatuses: { policy: "processing" },
    nodeUpdates: [{ id: "verification", status: "active" }],
    timeline: {
      agentId: "policy",
      message: "Re-auditing corrected risk assessment…",
      level: "info",
    },
  },
  {
    id: "policy-pass",
    delay: 1100,
    agentStatuses: { policy: "complete" },
    clearVeto: true,
    nodeUpdates: [
      {
        id: "verification",
        status: "approved",
        data: {
          version: 2,
          flagged: false,
          summary:
            "PASS — all evidence individualized, no prohibited basis detected.",
          evidence: [
            {
              label: "Violating input",
              value: "None (removed)",
              source: "Risk Assessment v2",
            },
            {
              label: "Rule check",
              value: "Reg B § 1002.6 — Pass",
              source: "Policy engine",
            },
            {
              label: "Rule check",
              value: "Proxy variable scan — Pass",
              source: "Policy engine",
            },
          ],
          reasoning: [
            "Re-audited corrected Risk Assessment v2 and unchanged Affordability Assessment.",
            "No prohibited basis or proxy variables detected in remaining evidence.",
            "Cleared for final adjudication.",
          ],
        },
      },
    ],
    policyUpdates: [
      { id: "reg-b", status: "pass" },
      { id: "proxy-variable", status: "pass" },
      { id: "adverse-action", status: "pass" },
    ],
    timeline: {
      agentId: "policy",
      message: "PASS — corrected evidence clears all fair-lending checks.",
      level: "success",
    },
  },
  {
    id: "adjudicator-final-start",
    delay: 900,
    agentStatuses: { adjudicator: "processing" },
    nodeUpdates: [{ id: "decision-final", status: "active" }],
    activeEdges: ["e-afford-final", "e-risk-final", "e-verify-final"],
    timeline: {
      agentId: "adjudicator",
      message:
        "Regenerating final decision from verified, compliant evidence only…",
      level: "info",
    },
  },
  {
    id: "adjudicator-final-complete",
    delay: 1500,
    agentStatuses: { adjudicator: "complete" },
    nodeUpdates: [
      {
        id: "decision-final",
        status: "approved",
        data: {
          confidence: 96,
          summary: "Approved with conditions — $38,000 at 60 months.",
          evidence: [
            {
              label: "Verdict",
              value: "APPROVE WITH CONDITIONS",
              source: "Adjudicator v2",
            },
            {
              label: "Approved amount",
              value: "$38,000",
              source: "Pricing model",
            },
            {
              label: "Risk score (corrected)",
              value: "516/1000",
              source: "Risk Assessment v2",
            },
            { label: "DTI", value: "0.31", source: "Affordability Assessment" },
          ],
          reasoning: [
            "Recombined corrected Risk Assessment v2 with unchanged Affordability Assessment.",
            "Both inputs individualized and policy-verified.",
            "Loan amount trimmed to $38,000 to preserve DTI margin at standard risk tier.",
          ],
        },
      },
    ],
    timeline: {
      agentId: "adjudicator",
      message:
        "Final decision issued: APPROVE WITH CONDITIONS (96% confidence).",
      level: "success",
    },
  },
];
