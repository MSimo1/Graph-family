"use client";

import { useCallback, useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import PersonNode, { type PersonNodeData } from "./PersonNode";

type Props = {
  initialNodes: Node<PersonNodeData>[];
  initialEdges: Edge[];
  editable?: boolean;
};

export default function FamilyGraph({
  initialNodes,
  initialEdges,
  editable = false,
}: Props) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const nodeTypes = useMemo(() => ({ person: PersonNode }), []);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!editable) return;
      setEdges((current) => addEdge(connection, current));
    },
    [editable, setEdges]
  );

  return (
    <div className="graphCanvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodesDraggable={editable}
        nodesConnectable={editable}
        fitView
        fitViewOptions={{ padding: 0.25 }}
      >
        <Background gap={24} size={1} />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  );
}
