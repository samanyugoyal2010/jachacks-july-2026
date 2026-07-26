import type { Node } from "@xyflow/react";
import { initialEdges } from "./data";
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

export function buildThoughtGraph(nodes: Node<GraphNodeData>[]): ThoughtGraph {
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

  for (const edge of initialEdges) {
    tLinks.push({ source: edge.source, target: edge.target });
  }

  for (const n of nodes) {
    if (n.data.status === "pending") continue;

    n.data.reasoning.forEach((text, i) => {
      const id = `${n.id}-r${i}`;
      tNodes.push({
        id,
        label: text,
        kind: "reasoning",
        agentId: n.data.agentId,
        status: n.data.status,
        stageId: n.id,
      });
      tLinks.push({ source: n.id, target: id });
    });

    n.data.evidence.forEach((ev, i) => {
      const id = `${n.id}-e${i}`;
      tNodes.push({
        id,
        label: `${ev.label}: ${ev.value}`,
        kind: "evidence",
        agentId: n.data.agentId,
        status: n.data.status,
        stageId: n.id,
        flagged: ev.flagged,
      });
      tLinks.push({ source: n.id, target: id });
    });
  }

  return { nodes: tNodes, links: tLinks };
}
