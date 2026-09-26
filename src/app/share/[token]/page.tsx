import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Edge, Node } from "@xyflow/react";
import FamilyGraph from "@/components/graph/FamilyGraph";
import type { PersonNodeData } from "@/components/graph/PersonNode";
import { createAdminClient } from "@/lib/supabase/admin";
import { shareCookieName, verifyShareAccess } from "@/lib/share";
import { unlockShare } from "./actions";

function initials(firstName: string, lastName: string) {
  return (firstName.slice(0, 1) + lastName.slice(0, 1)).toUpperCase() || "?";
}

export default async function SharedGraphPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const admin = createAdminClient();

  const { data: share } = await admin
    .from("share_links")
    .select("id,graph_id,password_hash,active,expires_at")
    .eq("token", token)
    .single();

  if (
    !share ||
    !share.active ||
    !share.expires_at ||
    new Date(share.expires_at).getTime() <= Date.now()
  ) {
    notFound();
  }

  if (share.password_hash) {
    const cookieStore = await cookies();
    const signature = cookieStore.get(shareCookieName(token))?.value;

    if (!verifyShareAccess(token, signature)) {
      return (
        <main className="authPage">
          <section className="authCard card">
            <div className="eyebrow">Grafo protetto</div>
            <h1>Inserisci la password</h1>
            <p>Questo link familiare è stato protetto dal proprietario.</p>
            {error ? <div className="notice">{error}</div> : null}
            <form action={unlockShare.bind(null, token)} className="formStack">
              <label>
                Password
                <input name="password" type="password" required autoFocus />
              </label>
              <button className="btn btnPrimary">Apri il grafo</button>
            </form>
          </section>
        </main>
      );
    }
  }

  const [{ data: graph }, { data: persons }, { data: relationships }] = await Promise.all([
    admin.from("family_graphs").select("id,name,description").eq("id", share.graph_id).single(),
    admin.from("persons").select("*").eq("graph_id", share.graph_id).order("created_at"),
    admin.from("relationships").select("*").eq("graph_id", share.graph_id).order("created_at"),
  ]);

  if (!graph) notFound();

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

  return (
    <main className="appShell">
      <header className="graphHeader">
        <div>
          <div className="eyebrow">Condivisione familiare</div>
          <h1>{graph.name}</h1>
          <p>Sola visualizzazione · {(persons ?? []).length} persone</p>
        </div>
      </header>

      {(persons ?? []).length ? (
        <FamilyGraph initialNodes={nodes} initialEdges={edges} />
      ) : (
        <div className="graphEmpty">
          <div>
            <h2>Questo grafo non contiene ancora persone.</h2>
          </div>
        </div>
      )}
    </main>
  );
}
