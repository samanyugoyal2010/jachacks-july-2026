export type Outcome = "RELEASE" | "VERIFY" | "PAUSE" | "PAUSE_AND_ESCALATE";
export type RiskLevel = "Low" | "Medium" | "High" | "Critical";
export type AgentStatus = "Waiting" | "Investigating" | "Challenging" | "Complete" | "Escalated";

export type CustomerAnswers = {
  contactedFirst: boolean;
  accountUnsafe: boolean;
  safeAccount: boolean;
  claimedBank: boolean;
  secrecy: boolean;
  urgency: boolean;
};

export type ReplayFacts = {
  establishedRecipient: boolean;
  customerInitiated: boolean;
};

export type GraphNode = {
  id: string;
  label: string;
  type:
    | "Customer"
    | "Account"
    | "Transfer"
    | "Recipient"
    | "Communication"
    | "Claim"
    | "Instruction"
    | "TransactionSignal"
    | "ManipulationSignal"
    | "ExculpatorySignal"
    | "ScamPattern"
    | "AgentFinding"
    | "Policy"
    | "Intervention"
    | "Investigation"
    | "AuditEvent";
  detail?: string;
  riskDelta?: number;
  evidence?: string[];
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label:
    | "OWNS"
    | "INITIATED"
    | "SENT_TO"
    | "CONTACTED_BY"
    | "CLAIMED_TO_BE"
    | "INSTRUCTED"
    | "EXHIBITS"
    | "SUPPORTED_BY"
    | "CONTRADICTED_BY"
    | "CHALLENGED_BY"
    | "MATCHES_PATTERN"
    | "TRIGGERED"
    | "GOVERNED_BY"
    | "RECORDED_AS";
};

export type AgentFinding = {
  agent: string;
  status: AgentStatus;
  finding: string;
  nodesVisited: string[];
  evidence: string[];
};

export type AuditEvent = {
  timestamp: string;
  walker: string;
  nodesVisited: string[];
  evidenceConsidered: string[];
  findingCreated: string;
  policyInvoked?: string;
  previousStatus: string;
  newStatus: string;
};

export type InvestigationResult = {
  id: string;
  transfer: {
    from: string;
    recipient: string;
    amount: number;
    purpose: string;
    speed: string;
    note: string;
    balance: number;
  };
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  findings: AgentFinding[];
  audit: AuditEvent[];
  riskScore: number;
  riskLevel: RiskLevel;
  outcome: Outcome;
  intervention: {
    status: string;
    headline: string;
    recommendation: string;
    explanation: string;
  };
  skepticConclusion: string;
  demoLogicLabel: string;
};
