import Link from "next/link";
import FamilyGraph from "@/components/graph/FamilyGraph";
import type { Edge, Node } from "@xyflow/react";
import type { PersonNodeData } from "@/components/graph/PersonNode";

const nodes: Node<PersonNodeData>[] = [
  { id: "jean", type: "person", position: { x: 310, y: 20 }, data: { label: "Jean Simo", subtitle: "1948", initials: "JS" } },
  { id: "paul", type: "person", position: { x: 140, y: 180 }, data: { label: "Paul Simo", subtitle: "1974", initials: "PS" } },
  { id: "marie", type: "person", position: { x: 480, y: 180 }, data: { label: "Marie Simo", subtitle: "1977", initials: "MS" } },
  { id: "marco", type: "person", position: { x: 60, y: 350 }, data: { label: "Marco Simo", subtitle: "1998", initials: "MS" } },
  { id: "sarah", type: "person", position: { x: 230, y: 350 }, data: { label: "Sarah Simo", subtitle: "2001", initials: "SS" } },
];

const edges: Edge[] = [
  { id: "e1", source: "jean", target: "paul", type: "smoothstep" },
  { id: "e2", source: "jean", target: "marie", type: "smoothstep" },
  { id: "e3", source: "paul", target: "marco", type: "smoothstep" },
  { id: "e4", source: "paul", target: "sarah", type: "smoothstep" },
];

export default function DemoGraphPage() {
  return (
    <main className="appShell">
      <header className="graphHeader">
        <div>
          <Link href="/" className="backLink">← Graph Family</Link>
          <h1>Famiglia Simo</h1>
          <p>Demo · sola visualizzazione</p>
        </div>
        <Link className="btn btnPrimary" href="/login">Crea il tuo grafo</Link>
      </header>
      <FamilyGraph initialNodes={nodes} initialEdges={edges} />
    </main>
  );
}
