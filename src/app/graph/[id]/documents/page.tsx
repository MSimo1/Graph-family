import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteDocument, uploadDocument } from "./actions";

export default async function DocumentsPage({
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

  const [
    { data: graph },
    { data: membership },
    { data: persons },
    { data: relationships },
    { data: documents },
  ] = await Promise.all([
    supabase.from("family_graphs").select("id,name").eq("id", id).single(),
    supabase.from("graph_members").select("role").eq("graph_id", id).eq("user_id", auth.user.id).single(),
    supabase.from("persons").select("id,first_name,last_name").eq("graph_id", id).order("first_name"),
    supabase.from("relationships").select("id,from_person_id,to_person_id,type").eq("graph_id", id),
    supabase.from("documents").select("*").eq("graph_id", id).order("created_at", { ascending: false }),
  ]);

  if (!graph || !membership) notFound();

  const personById = new Map(
    (persons ?? []).map((person) => [
      person.id,
      [person.first_name, person.last_name].filter(Boolean).join(" "),
    ])
  );

  const uploadAction = uploadDocument.bind(null, id);

  return (
    <main className="settingsPage">
      <header className="graphHeader">
        <div>
          <Link href={"/graph/" + id} className="backLink">← {graph.name}</Link>
          <h1>Documenti</h1>
          <p>Allegati informativi associati a persone o relazioni.</p>
        </div>
      </header>

      <div className="container settingsGrid">
        {message ? <div className="notice settingsNotice">{message}</div> : null}

        <section className="card settingsCard">
          <div className="eyebrow">Archivio</div>
          <h2>Documenti caricati</h2>

          {(documents ?? []).length ? (
            <div className="shareList">
              {(documents ?? []).map((document) => {
                const relation = (relationships ?? []).find(
                  (item) => item.id === document.relationship_id
                );

                const targetLabel = document.person_id
                  ? personById.get(document.person_id) ?? "Persona"
                  : relation
                    ? (personById.get(relation.from_person_id) ?? "Persona") +
                      " → " +
                      (personById.get(relation.to_person_id) ?? "Persona") +
                      " · " +
                      relation.type
                    : "Relazione";

                const canDelete =
                  membership.role === "owner" ||
                  membership.role === "admin" ||
                  document.uploaded_by === auth.user.id;

                return (
                  <div className="shareItem" key={document.id}>
                    <div>
                      <strong>{document.original_name}</strong>
                      <div className="small muted">{targetLabel}</div>
                    </div>
                    {canDelete ? (
                      <form
                        action={deleteDocument.bind(
                          null,
                          id,
                          document.id,
                          document.storage_path
                        )}
                      >
                        <button className="btn btnDanger">Elimina</button>
                      </form>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="emptyState">
              <p>Nessun documento caricato.</p>
            </div>
          )}
        </section>

        <aside className="card settingsCard">
          <div className="eyebrow">Nuovo allegato</div>
          <h2>Carica documento</h2>
          <p className="muted small">
            Il documento supporta il contesto familiare ma non rappresenta una certificazione legale.
          </p>

          {(persons ?? []).length ? (
            <form action={uploadAction} className="formStack">
              <label>
                Associa a
                <select name="target" required defaultValue="">
                  <option value="" disabled>Seleziona persona o relazione</option>
                  <optgroup label="Persone">
                    {(persons ?? []).map((person) => (
                      <option key={person.id} value={"person:" + person.id}>
                        {person.first_name} {person.last_name}
                      </option>
                    ))}
                  </optgroup>
                  {(relationships ?? []).length ? (
                    <optgroup label="Relazioni">
                      {(relationships ?? []).map((relation) => (
                        <option
                          key={relation.id}
                          value={"relationship:" + relation.id}
                        >
                          {(personById.get(relation.from_person_id) ?? "Persona") +
                            " → " +
                            (personById.get(relation.to_person_id) ?? "Persona") +
                            " · " +
                            relation.type}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </label>

              <label>
                File
                <input
                  name="file"
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                />
              </label>

              <button className="btn btnPrimary">Carica documento</button>
            </form>
          ) : (
            <p className="muted">Aggiungi prima almeno una persona al grafo.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
