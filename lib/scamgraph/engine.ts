import type {
  AgentFinding,
  AuditEvent,
  CustomerAnswers,
  GraphEdge,
  GraphNode,
  InvestigationResult,
  Outcome,
  ReplayFacts,
  RiskLevel,
} from "./types";

const defaultAnswers: CustomerAnswers = {
  contactedFirst: true,
  accountUnsafe: true,
  safeAccount: true,
  claimedBank: true,
  secrecy: true,
  urgency: true,
};

const baseTransfer = {
  from: "Everyday Checking •••• 2841",
  recipient: "Secure Holdings LLC",
  amount: 4800,
  purpose: "Account protection",
  speed: "Same day",
  note: "Transfer requested by security department",
  balance: 12240,
};

const now = () => new Date().toISOString();
const cap = (score: number) => Math.max(0, Math.min(100, score));

function riskLevel(score: number): RiskLevel {
  if (score < 25) return "Low";
  if (score < 50) return "Medium";
  if (score < 75) return "High";
  return "Critical";
}

function outcomeFor(level: RiskLevel): Outcome {
  if (level === "Low") return "RELEASE";
  if (level === "Medium") return "VERIFY";
  if (level === "High") return "PAUSE";
  return "PAUSE_AND_ESCALATE";
}

class Builder {
  nodes: GraphNode[] = [];
  edges: GraphEdge[] = [];
  findings: AgentFinding[] = [];
  audit: AuditEvent[] = [];
  score = 0;
  status = "CREATED";

  node(node: GraphNode) {
    if (!this.nodes.some((existing) => existing.id === node.id)) this.nodes.push(node);
    return node.id;
  }

  edge(source: string, target: string, label: GraphEdge["label"]) {
    const id = `${source}-${label}-${target}`;
    if (!this.edges.some((edge) => edge.id === id)) this.edges.push({ id, source, target, label });
  }

  signal(node: GraphNode, source = "transfer") {
    this.node(node);
    this.edge(source, node.id, "EXHIBITS");
    this.score += node.riskDelta ?? 0;
  }

  finding(agent: string, status: AgentFinding["status"], finding: string, nodesVisited: string[], evidence: string[]) {
    this.findings.push({ agent, status, finding, nodesVisited, evidence });
  }

  record(walker: string, nodesVisited: string[], evidence: string[], finding: string, policy?: string) {
    const previousStatus = this.status;
    this.status = finding;
    this.audit.push({
      timestamp: now(),
      walker,
      nodesVisited,
      evidenceConsidered: evidence,
      findingCreated: finding,
      policyInvoked: policy,
      previousStatus,
      newStatus: this.status,
    });
  }
}

function seedGraph(b: Builder) {
  b.node({ id: "investigation", type: "Investigation", label: "Investigation demo-case" });
  b.node({ id: "customer", type: "Customer", label: "Authenticated customer", detail: "Customer is correctly signed in" });
  b.node({ id: "account", type: "Account", label: "Everyday Checking •••• 2841", detail: "$12,240 available" });
  b.node({ id: "transfer", type: "Transfer", label: "$4,800 same-day transfer", detail: "Purpose: Account protection" });
  b.node({ id: "recipient", type: "Recipient", label: "Secure Holdings LLC", detail: "Added 8 minutes ago" });
  b.edge("customer", "account", "OWNS");
  b.edge("customer", "transfer", "INITIATED");
  b.edge("transfer", "recipient", "SENT_TO");
  b.edge("investigation", "transfer", "SUPPORTED_BY");
}

function transaction_context_walker(b: Builder, facts: ReplayFacts) {
  if (!facts.establishedRecipient) {
    b.signal({ id: "new-recipient", type: "TransactionSignal", label: "New recipient", detail: "Added 8 minutes ago", riskDelta: 18, evidence: ["recipient"] });
  }
  b.signal({ id: "unusual-amount", type: "TransactionSignal", label: "Amount 4.3x normal", detail: "$4,800 exceeds fictional normal transfer size", riskDelta: 14, evidence: ["transfer"] });
  b.finding("Transaction Investigator", "Complete", "Detected new payee and unusual transfer size.", ["transfer", "recipient"], ["Amount over 3x normal", "Recipient age checked"]);
  b.record("transaction_context_walker", ["transfer", "recipient"], ["$4,800", "Added 8 minutes ago"], "Transaction context signals created");
}

function relationship_walker(b: Builder, facts: ReplayFacts) {
  if (facts.establishedRecipient) {
    b.signal({ id: "recurring-recipient", type: "ExculpatorySignal", label: "Paid monthly for 18 months", detail: "Established recurring recipient", riskDelta: -30, evidence: ["recipient"] });
    b.edge("recurring-recipient", "new-recipient", "CONTRADICTED_BY");
    b.finding("Relationship Investigator", "Complete", "Found recurring payment history with this recipient.", ["recipient"], ["18 monthly payments"]);
  } else {
    b.node({ id: "no-verification", type: "AgentFinding", label: "No independent verification", detail: "No known relationship outside caller instruction", evidence: ["recipient"] });
    b.edge("recipient", "no-verification", "SUPPORTED_BY");
    b.finding("Relationship Investigator", "Complete", "No verified prior relationship with the recipient.", ["recipient"], ["No payment history", "No trusted contact record"]);
  }
  b.record("relationship_walker", ["recipient"], facts.establishedRecipient ? ["Recurring history"] : ["No recurring history"], "Recipient relationship evaluated");
}

function manipulation_walker(b: Builder, answers: CustomerAnswers, facts: ReplayFacts) {
  b.node({ id: "communication", type: "Communication", label: facts.customerInitiated ? "Customer initiated payment" : "Unknown caller initiated contact" });
  b.edge("customer", "communication", "CONTACTED_BY");
  if (!facts.customerInitiated && answers.contactedFirst) b.signal({ id: "contacted-first", type: "ManipulationSignal", label: "Someone contacted customer first", riskDelta: 12, evidence: ["communication"] }, "communication");
  if (answers.claimedBank) b.signal({ id: "claimed-bank", type: "Claim", label: "Claimed to represent bank", riskDelta: 18, evidence: ["communication"] }, "communication");
  if (answers.accountUnsafe) b.signal({ id: "account-unsafe", type: "Claim", label: "Account allegedly unsafe", riskDelta: 15, evidence: ["communication"] }, "communication");
  if (answers.safeAccount && !facts.customerInitiated) b.signal({ id: "safe-account", type: "Instruction", label: "Move money to a safe account", riskDelta: 25, evidence: ["communication"] }, "communication");
  if (answers.secrecy) b.signal({ id: "secrecy", type: "ManipulationSignal", label: "Possible secrecy request", riskDelta: 15, evidence: ["communication"] }, "communication");
  if (answers.urgency) b.signal({ id: "urgency", type: "ManipulationSignal", label: "Immediate urgency", riskDelta: 12, evidence: ["communication"] }, "communication");
  if (facts.customerInitiated) b.signal({ id: "customer-initiated", type: "ExculpatorySignal", label: "Customer initiated independently", riskDelta: -15, evidence: ["communication"] }, "communication");
  b.finding("Manipulation Investigator", "Complete", facts.customerInitiated ? "Customer initiation reduces manipulation concern." : "Detected bank-impersonation and safe-account indicators.", ["communication"], ["Structured customer answers"]);
  b.record("manipulation_walker", ["communication"], Object.entries(answers).filter(([, value]) => value).map(([key]) => key), "Manipulation indicators evaluated");
}

function pattern_match_walker(b: Builder) {
  const ids = new Set(b.nodes.map((node) => node.id));
  const supported = ["contacted-first", "claimed-bank", "account-unsafe", "safe-account"].every((id) => ids.has(id));
  if (supported) {
    b.node({ id: "bank-impersonation-pattern", type: "ScamPattern", label: "Bank-impersonation pattern", detail: "Caller + unsafe account + safe-account instruction" });
    ["contacted-first", "claimed-bank", "account-unsafe", "safe-account"].forEach((id) => b.edge(id, "bank-impersonation-pattern", "MATCHES_PATTERN"));
    b.finding("Pattern Matcher", "Complete", "Multiple independently supported signals match a bank-impersonation pattern.", ["communication", "bank-impersonation-pattern"], ["Caller initiated", "Bank claim", "Unsafe account claim", "Safe-account instruction"]);
  } else {
    b.finding("Pattern Matcher", "Complete", "No full scam pattern matched after counterfactual changes.", ["communication"], ["Missing required pattern combination"]);
  }
  b.record("pattern_match_walker", ["communication", "transfer"], ["Combined signal traversal"], "Pattern matching completed");
}

function skeptic_walker(b: Builder, facts: ReplayFacts) {
  const conclusion = facts.establishedRecipient || facts.customerInitiated
    ? "Independent facts support a legitimate explanation, lowering the risk score."
    : "No independent evidence supports a legitimate relationship with the recipient.";
  b.node({ id: "skeptic", type: "ExculpatorySignal", label: "Skeptic Agent challenge", detail: conclusion, evidence: ["recipient", "communication"] });
  b.edge("skeptic", "bank-impersonation-pattern", "CHALLENGED_BY");
  if (!facts.establishedRecipient) {
    b.node({ id: "no-innocent-evidence", type: "ExculpatorySignal", label: "No innocent explanation found", detail: "Searched vendor, recurring payment, and independent verification evidence" });
    b.edge("skeptic", "no-innocent-evidence", "SUPPORTED_BY");
  }
  b.finding("Skeptic Agent", "Challenging", conclusion, ["recipient", "communication", "transfer"], ["Vendor history", "Recurring obligation", "Customer initiation", "Contradictory evidence"]);
  b.record("skeptic_walker", ["recipient", "communication", "transfer"], ["Innocent explanations searched"], "Skeptic challenge recorded");
  return conclusion;
}

function safety_gate_walker(b: Builder) {
  const score = cap(b.score);
  const level = riskLevel(score);
  const outcome = outcomeFor(level);
  const policy = level === "Critical" ? "Critical risk cannot be automatically released" : "Transparent demo risk threshold";
  b.node({ id: "policy", type: "Policy", label: "Deterministic safety gate", detail: `${score}/100 ${level}` });
  b.node({ id: "intervention", type: "Intervention", label: outcome === "PAUSE_AND_ESCALATE" ? "Paused and escalated" : outcome, detail: policy });
  b.edge("transfer", "policy", "GOVERNED_BY");
  b.edge("policy", "intervention", "TRIGGERED");
  b.finding("Safety Gate", level === "Critical" ? "Escalated" : "Complete", `${level} risk: ${outcome}.`, ["policy", "intervention"], [policy]);
  b.record("safety_gate_walker", ["policy", "intervention"], [`Risk score ${score}`], `${outcome}`, policy);
  return { score, level, outcome };
}

function audit_walker(b: Builder) {
  b.node({ id: "audit-final", type: "AuditEvent", label: "Audit trail sealed", detail: "All findings and policy actions recorded" });
  b.edge("intervention", "audit-final", "RECORDED_AS");
  b.finding("Audit Agent", "Complete", "Recorded visited nodes, evidence, policy, and final intervention.", ["audit-final"], ["Audit event count " + b.audit.length]);
}

export function runInvestigation(input?: Partial<CustomerAnswers>, replayFacts?: Partial<ReplayFacts>): InvestigationResult {
  const answers = { ...defaultAnswers, ...input };
  const facts: ReplayFacts = { establishedRecipient: false, customerInitiated: false, ...replayFacts };
  const b = new Builder();
  seedGraph(b);
  transaction_context_walker(b, facts);
  relationship_walker(b, facts);
  manipulation_walker(b, answers, facts);
  pattern_match_walker(b);
  const skepticConclusion = skeptic_walker(b, facts);
  const gate = safety_gate_walker(b);
  audit_walker(b);
  const isPaused = gate.outcome === "PAUSE" || gate.outcome === "PAUSE_AND_ESCALATE";
  return {
    id: "demo-case",
    transfer: baseTransfer,
    graph: { nodes: b.nodes, edges: b.edges },
    findings: b.findings,
    audit: b.audit,
    riskScore: gate.score,
    riskLevel: gate.level,
    outcome: gate.outcome,
    skepticConclusion,
    demoLogicLabel: "Transparent hackathon demonstration logic, not a production banking model.",
    intervention: {
      status: isPaused ? "PAUSED — POSSIBLE BANK IMPERSONATION" : gate.outcome,
      headline: isPaused ? "We paused this transfer to protect you." : "This transfer can continue after review.",
      recommendation: "End the call and contact your bank using the number printed on your bank card or inside the official banking application.",
      explanation: "This transfer was paused because multiple independently supported signals formed a high-risk bank-impersonation pattern. No single signal caused the intervention.",
    },
  };
}

export function replay_walker() {
  const original = runInvestigation();
  const changedAnswers: Partial<CustomerAnswers> = {
    contactedFirst: false,
    accountUnsafe: false,
    safeAccount: false,
    claimedBank: false,
    secrecy: false,
    urgency: false,
  };
  const replayed = runInvestigation(changedAnswers, { establishedRecipient: true, customerInitiated: true });
  return {
    original,
    replayed,
    changedFacts: ["Recipient relationship: paid monthly for 18 months", "External contact: customer initiated independently"],
    affectedBranches: ["recipient relationship", "communication", "manipulation signals", "pattern match", "safety gate"],
    rerunAgents: ["Relationship Investigator", "Manipulation Investigator", "Pattern Matcher", "Skeptic Agent", "Safety Gate", "Audit Agent"],
    unchangedFindings: ["Transfer amount remains $4,800", "Same-day speed remains unchanged"],
  };
}
