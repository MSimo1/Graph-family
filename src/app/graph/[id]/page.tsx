import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Edge, Node } from "@xyflow/react";
import FamilyGraph from "@/components/graph/FamilyGraph";
import type { PersonNodeData } from "@/components/graph/PersonNode";
import { createClient } from "@/lib/supabase/server";
import { addPerson, addRelationship } from "./actions";

function initials(firstName: string, lastName: string) {
  return (firstName.slice(0, 1) + lastName.slice(0, 1)).toUpperCase() || "?";
}

export default async function GraphPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { id } = await params;
  const { message } = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/login");

  const [{ data: graph }, { data: membership }, { data: persons }, { data: relationships }] =
    await Promise.all([
      supabase.from("family_graphs").select("id,name,description").eq("id", id).single(),
      supabase.from("graph_members").select("role").eq("graph_id", id).eq("user_id", auth.user.id).single(),
      supabase.from("persons").select("*").eq("graph_id", id).order("created_at"),
      supabase.from("relationships").select("*").eq("graph_id", id).order("created_at"),
    ]);

  if (!graph || !membership) notFound();

  const nodes: Node<PersonNodeData>[] = (persons ?? []).map((person, index) => ({
    id: person.id,
    type: "person",
    position: {
      x: (index % 4) * 230,
      y: Math.floor(index / 4) * 170,
    },
    data: {
      label: [person.first_name, person.last_name].filter(Boolean).join(" "),
      subtitle: person.birth_date ? "N. " + person.birth_date : undefined,
      initials: initials(person.first_name, person.last_name),
    },
  }));

  const edges: Edge[] = (relationships ?? []).map((relationship) => ({
    id: relationship.id,
    source: relationship.from_person_id,
    target: relationship.to_person_id,
    type: "smoothstep",
    label: relationship.type,
  }));

  const addPersonAction = addPerson.bind(null, id);
  const addRelationshipAction = addRelationship.bind(null, id);

  return (
    <main className="graphWorkspace">
      <header className="graphHeader">
        <div>
          <Link href="/dashboard" className="backLink">← Le mie famiglie</Link>
          <h1>{graph.name}</h1>
          <p>{membership.role} · {(persons ?? []).length} persone</p>
        </div>
        <div className="navActions">
          <Link className="btn btnGhost" href={"/graph/" + id + "/documents"}>Documenti</Link>
          <Link className="btn btnGhost" href={"/graph/" + id + "/settings"}>Gestione</Link>
          <Link className="btn btnPrimary" href={"/graph/" + id + "/settings#share"}>Condividi</Link>
        </div>
      </header>

      {message ? <div className="workspaceNotice notice">{message}</div> : null}

      <div className="workspaceBody">
        <aside className="graphSidebar">
          <section>
            <div className="eyebrow">Persona</div>
            <h2>Aggiungi membro</h2>
            <form action={addPersonAction} className="formStack compact">
              <label>
                Nome
                <input name="firstName" required />
              </label>
              <label>
                Cognome
                <input name="lastName" />
              </label>
              <label>
                Data di nascita
                <input name="birthDate" type="date" />
              </label>
              <button className="btn btnPrimary">Aggiungi persona</button>
            </form>
          </section>

          <section className="sidebarSection">
            <div className="eyebrow">Legame</div>
            <h2>Collega due persone</h2>
            {(persons ?? []).length >= 2 ? (
              <form action={addRelationshipAction} className="formStack compact">
                <label>
                  Da
                  <select name="fromPersonId" required defaultValue="">
                    <option value="" disabled>Seleziona</option>
                    {(persons ?? []).map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.first_name} {person.last_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Relazione
                  <select name="type" defaultValue="parent">
                    <option value="parent">Genitore di</option>
                    <option value="partner">Partner di</option>
                    <option value="spouse">Coniuge di</option>
                    <option value="sibling">Fratello/sorella di</option>
                  </select>
                </label>
                <label>
                  A
                  <select name="toPersonId" required defaultValue="">
                    <option value="" disabled>Seleziona</option>
                    {(persons ?? []).map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.first_name} {person.last_name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="btn btnGhost">Crea legame</button>
              </form>
            ) : (
              <p className="muted small">Aggiungi almeno due persone per creare un legame.</p>
            )}
          </section>
        </aside>

        <section className="graphStage">
          {(persons ?? []).length ? (
            <FamilyGraph initialNodes={nodes} initialEdges={edges} editable />
          ) : (
            <div className="graphEmpty">
              <div>
                <div className="eyebrow">Il grafo è vuoto</div>
                <h2>Comincia dalla prima persona.</h2>
                <p>Usa il pannello a sinistra. Il resto della famiglia crescerà da lì.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
