"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type Node,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { AuditNode } from "~/components/audit/audit-node";
import type { GraphNodeData } from "~/lib/audit/types";

const nodeTypes = { auditNode: AuditNode };

interface ProvenanceGraphProps {
  nodes: Node<GraphNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
}

export function ProvenanceGraph({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
}: ProvenanceGraphProps) {
  const decoratedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      })),
    [nodes, selectedNodeId],
  );

  const decoratedEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        style: edge.style ?? {
          stroke: "var(--color-border)",
          strokeWidth: 1.5,
        },
      })),
    [edges],
  );

  return (
    <div className="h-[400px] w-full overflow-hidden rounded-xl border border-border/60 bg-card/70 shadow-lg shadow-black/5 backdrop-blur-xl backdrop-saturate-150 sm:h-[460px]">
      <ReactFlow
        nodes={decoratedNodes}
        edges={decoratedEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        fitView
        fitViewOptions={{ padding: 0.08, maxZoom: 1 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={1.5}
        nodesConnectable={false}
        edgesFocusable={false}
        aria-label="AI decision provenance graph"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--color-border)"
        />
        <Controls showInteractive={false} className="!shadow-none" />
      </ReactFlow>
    </div>
  );
}
