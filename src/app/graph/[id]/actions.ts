"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  return { supabase, user: auth.user };
}

function refreshGraph(graphId: string) {
  revalidatePath("/graph/" + graphId);
  revalidatePath("/graph/" + graphId + "/people");
}

export async function addPerson(graphId: string, formData: FormData) {
  const { supabase, user } = await requireUser();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "").trim();

  if (!firstName) return;

  const { error } = await supabase.from("persons").insert({
    graph_id: graphId,
    created_by: user.id,
    first_name: firstName,
    last_name: lastName,
    birth_date: birthDate || null,
  });

  if (error) {
    redirect("/graph/" + graphId + "?message=" + encodeURIComponent(error.message));
  }

  refreshGraph(graphId);
}

export async function updatePerson(
  graphId: string,
  personId: string,
  formData: FormData
) {
  const { supabase } = await requireUser();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "").trim();
  const deathDate = String(formData.get("deathDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!firstName) return;

  const { error } = await supabase
    .from("persons")
    .update({
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate || null,
      death_date: deathDate || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", personId)
    .eq("graph_id", graphId);

  if (error) {
    redirect("/graph/" + graphId + "/people?message=" + encodeURIComponent(error.message));
  }

  refreshGraph(graphId);
}

export async function deletePerson(graphId: string, personId: string) {
  const { supabase } = await requireUser();

  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("graph_id", graphId)
    .eq("person_id", personId);

  if ((count ?? 0) > 0) {
    redirect(
      "/graph/" +
        graphId +
        "/people?message=" +
        encodeURIComponent("Elimina prima i documenti associati a questa persona.")
    );
  }

  const { error } = await supabase
    .from("persons")
    .delete()
    .eq("id", personId)
    .eq("graph_id", graphId);

  if (error) {
    redirect("/graph/" + graphId + "/people?message=" + encodeURIComponent(error.message));
  }

  refreshGraph(graphId);
}

export async function addRelationship(graphId: string, formData: FormData) {
  const { supabase, user } = await requireUser();

  const fromPersonId = String(formData.get("fromPersonId") ?? "");
  const toPersonId = String(formData.get("toPersonId") ?? "");
  const type = String(formData.get("type") ?? "");

  if (!fromPersonId || !toPersonId || !type || fromPersonId === toPersonId) return;

  const { error } = await supabase.from("relationships").insert({
    graph_id: graphId,
    created_by: user.id,
    from_person_id: fromPersonId,
    to_person_id: toPersonId,
    type,
  });

  if (error) {
    redirect("/graph/" + graphId + "?message=" + encodeURIComponent(error.message));
  }

  refreshGraph(graphId);
}

export async function deleteRelationship(
  graphId: string,
  relationshipId: string
) {
  const { supabase } = await requireUser();

  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("graph_id", graphId)
    .eq("relationship_id", relationshipId);

  if ((count ?? 0) > 0) {
    redirect(
      "/graph/" +
        graphId +
        "/people?message=" +
        encodeURIComponent("Elimina prima i documenti associati a questa relazione.")
    );
  }

  const { error } = await supabase
    .from("relationships")
    .delete()
    .eq("id", relationshipId)
    .eq("graph_id", graphId);

  if (error) {
    redirect("/graph/" + graphId + "/people?message=" + encodeURIComponent(error.message));
  }

  refreshGraph(graphId);
}
