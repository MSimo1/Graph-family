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

  revalidatePath("/graph/" + graphId);
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

  revalidatePath("/graph/" + graphId);
}
