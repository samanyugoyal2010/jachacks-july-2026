export type AgentId =
  | "intake"
  | "affordability"
  | "risk"
  | "policy"
  | "adjudicator";

export type AgentStatus = "idle" | "processing" | "complete" | "veto";

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  initials: string;
}

export interface EvidenceItem {
  label: string;
  value: string;
  source: string;
  flagged?: boolean;
  flagReason?: string;
}

export type NodeStage =
  | "application"
  | "facts"
  | "assessment"
  | "decision"
  | "verification"
  | "final";

export type GraphNodeStatus =
  | "pending"
  | "active"
  | "complete"
  | "veto"
  | "superseded"
  | "approved";

export interface GraphNodeData {
  [key: string]: unknown;
  stage: NodeStage;
  title: string;
  subtitle: string;
  agentId: AgentId;
  status: GraphNodeStatus;
  confidence: number | null;
  summary: string;
  evidence: EvidenceItem[];
  reasoning: string[];
  version: number;
  flagged?: boolean;
  flagReason?: string;
}

export type PolicyRuleStatus = "pending" | "pass" | "fail";

export interface PolicyRule {
  id: string;
  title: string;
  citation: string;
  description: string;
  status: PolicyRuleStatus;
}

export type TimelineLevel = "info" | "success" | "warning" | "error";

export interface TimelineEvent {
  id: string;
  agentId: AgentId;
  message: string;
  level: TimelineLevel;
  timestamp: string;
}

export type Verdict = "DENY" | "APPROVE" | "APPROVE_WITH_CONDITIONS";

export interface DecisionSnapshot {
  verdict: Verdict;
  headline: string;
  amount: string;
  rationale: string[];
  confidence: number;
  generatedBy: AgentId;
  flagged?: boolean;
}
