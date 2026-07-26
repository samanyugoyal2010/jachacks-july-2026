"use client";

import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import type { GraphEdge, GraphNode } from "@/lib/scamgraph/types";

const typeClass: Record<string, string> = {
  TransactionSignal: "signal",
  ManipulationSignal: "signal",
  Claim: "signal",
  Instruction: "signal",
  ScamPattern: "pattern",
  ExculpatorySignal: "exculpatory",
};

export function GraphView({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const flowNodes: Node[] = nodes.map((node, index) => ({
    id: node.id,
    position: { x: (index % 4) * 230 + 40, y: Math.floor(index / 4) * 125 + 40 },
    data: {
      label: (
        <div className={`nodeBox ${typeClass[node.type] ?? ""}`}>
          <div>{node.label}</div>
          {node.riskDelta ? <div className="fine">{node.riskDelta > 0 ? "+" : ""}{node.riskDelta} risk</div> : null}
          {node.detail ? <div className="fine">{node.detail}</div> : null}
        </div>
      ),
    },
    type: "default",
  }));
  const flowEdges: Edge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: ["MATCHES_PATTERN", "TRIGGERED", "CHALLENGED_BY"].includes(edge.label),
    style: { stroke: edge.label === "TRIGGERED" ? "#bf2f38" : "#6b7c93" },
  }));
  return (
    <ReactFlow nodes={flowNodes} edges={flowEdges} fitView>
      <Background />
      <Controls />
    </ReactFlow>
  );
}
