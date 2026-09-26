import { Handle, Position, type NodeProps } from "@xyflow/react";

export type PersonNodeData = {
  label: string;
  subtitle?: string;
  initials: string;
};

export default function PersonNode({ data }: NodeProps) {
  const person = data as PersonNodeData;

  return (
    <div className="personNode">
      <Handle type="target" position={Position.Top} />
      <div className="personAvatar">{person.initials}</div>
      <div>
        <div className="personName">{person.label}</div>
        {person.subtitle ? <div className="personMeta">{person.subtitle}</div> : null}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
