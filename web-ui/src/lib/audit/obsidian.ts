import type { Edge, Node } from "@xyflow/react";
import type { AgentId, GraphNodeData, GraphNodeStatus } from "./types";

export type ThoughtNodeKind = "stage" | "reasoning" | "evidence";

export interface ThoughtNode {
  id: string;
  label: string;
  kind: ThoughtNodeKind;
  agentId: AgentId;
  status: GraphNodeStatus;
  stageId: string;
  flagged?: boolean;
}

export interface ThoughtLink {
  source: string;
  target: string;
}

export interface ThoughtGraph {
  nodes: ThoughtNode[];
  links: ThoughtLink[];
}

export function buildThoughtGraph(
  nodes: Node<GraphNodeData>[],
  edges: Edge[] = [],
): ThoughtGraph {
  const tNodes: ThoughtNode[] = [];
  const tLinks: ThoughtLink[] = [];

  for (const n of nodes) {
    tNodes.push({
      id: n.id,
      label: n.data.title,
      kind: "stage",
      agentId: n.data.agentId,
      status: n.data.status,
      stageId: n.id,
      flagged: n.data.flagged,
    });
  }

  // link only between stage nodes that actually exist in this run
  const present = new Set(nodes.map((n) => n.id));
  for (const edge of edges) {
    if (present.has(edge.source) && present.has(edge.target)) {
      tLinks.push({ source: edge.source, target: edge.target });
    }
  }

  // Deliberately NO reasoning/evidence satellites. They produced 50-80 unlabeled
  // dots that collapsed into a blob — unreadable, and the worst possible thing to
  // show someone mid-loan-application. The constellation shows the decision
  // artifacts only; the reasoning lives in the agent-deliberation panel and the
  // evidence in the node inspector.

  return { nodes: tNodes, links: tLinks };
}
