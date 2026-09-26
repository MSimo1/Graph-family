"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createFamilyGraph(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data, error } = await supabase
    .from("family_graphs")
    .insert({
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      owner_id: auth.user.id,
    })
    .select("id")
    .single();

  if (error) {
    redirect("/dashboard?message=" + encodeURIComponent(error.message));
  }

  redirect("/graph/" + data.id);
}
