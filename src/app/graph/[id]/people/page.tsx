import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canEditOwnedResource } from "@/lib/permissions";
import { deletePerson, deleteRelationship, updatePerson } from "../actions";

export default async function PeoplePage({
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
  ] = await Promise.all([
    supabase.from("family_graphs").select("id,name").eq("id", id).single(),
    supabase.from("graph_members").select("role").eq("graph_id", id).eq("user_id", auth.user.id).single(),
    supabase.from("persons").select("*").eq("graph_id", id).order("first_name"),
    supabase.from("relationships").select("*").eq("graph_id", id).order("created_at"),
  ]);

  if (!graph || !membership) notFound();

  const personById = new Map(
    (persons ?? []).map((person) => [
      person.id,
      [person.first_name, person.last_name].filter(Boolean).join(" "),
    ])
  );

  return (
    <main className="settingsPage">
      <header className="graphHeader">
        <div>
          <Link href={"/graph/" + id} className="backLink">← {graph.name}</Link>
          <h1>Persone e legami</h1>
          <p>Gestisci i dati che hai il permesso di modificare.</p>
        </div>
      </header>

      <div className="container peopleLayout">
        {message ? <div className="notice">{message}</div> : null}

        <section>
          <div className="eyebrow">Persone</div>
          <div className="peopleGrid">
            {(persons ?? []).map((person) => {
              const canEdit = canEditOwnedResource(
                membership.role,
                auth.user.id,
                person.created_by
              );

              return (
                <article className="card personEditor" key={person.id}>
                  <div className="personEditorHeader">
                    <div>
                      <strong>
                        {person.first_name} {person.last_name}
                      </strong>
                      <div className="small muted">
                        Creato da {person.created_by === auth.user.id ? "te" : person.created_by}
                      </div>
                    </div>
                    {!canEdit ? <span className="rolePill">sola lettura</span> : null}
                  </div>

                  {canEdit ? (
                    <form
                      action={updatePerson.bind(null, id, person.id)}
                      className="formStack compact"
                    >
                      <label>
                        Nome
                        <input name="firstName" defaultValue={person.first_name} required />
                      </label>
                      <label>
                        Cognome
                        <input name="lastName" defaultValue={person.last_name} />
                      </label>
                      <div className="twoCols">
                        <label>
                          Nascita
                          <input
                            name="birthDate"
                            type="date"
                            defaultValue={person.birth_date ?? ""}
                          />
                        </label>
                        <label>
                          Morte
                          <input
                            name="deathDate"
                            type="date"
                            defaultValue={person.death_date ?? ""}
                          />
                        </label>
                      </div>
                      <label>
                        Note
                        <textarea name="notes" rows={3} defaultValue={person.notes ?? ""} />
                      </label>

                      <div className="formActions">
                        <button className="btn btnPrimary">Salva</button>
                        <button
                          className="btn btnDanger"
                          formAction={deletePerson.bind(null, id, person.id)}
                        >
                          Elimina
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="readOnlyDetails">
                      <span>Nascita: {person.birth_date || "—"}</span>
                      <span>Morte: {person.death_date || "—"}</span>
                      {person.notes ? <p>{person.notes}</p> : null}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="relationshipsSection">
          <div className="eyebrow">Relazioni</div>
          <div className="card settingsCard">
            {(relationships ?? []).length ? (
              <div className="memberList">
                {(relationships ?? []).map((relationship) => {
                  const canEdit = canEditOwnedResource(
                    membership.role,
                    auth.user.id,
                    relationship.created_by
                  );

                  return (
                    <div className="memberRow" key={relationship.id}>
                      <div>
                        <strong>
                          {personById.get(relationship.from_person_id) ?? "Persona"}{" "}
                          → {personById.get(relationship.to_person_id) ?? "Persona"}
                        </strong>
                        <div className="small muted">{relationship.type}</div>
                      </div>

                      {canEdit ? (
                        <form action={deleteRelationship.bind(null, id, relationship.id)}>
                          <button className="btn btnDanger">Elimina legame</button>
                        </form>
                      ) : (
                        <span className="rolePill">sola lettura</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="muted">Nessuna relazione creata.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
