"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function acceptInvite(token: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login?message=" + encodeURIComponent("Accedi con l'email invitata, poi riapri il link."));
  }

  const { data, error } = await supabase.rpc("accept_graph_invitation", {
    invite_token: token,
  });

  if (error) {
    redirect("/invite/" + token + "?message=" + encodeURIComponent(error.message));
  }

  redirect("/graph/" + data);
}
