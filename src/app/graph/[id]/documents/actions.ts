"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  return { supabase, user: auth.user };
}

export async function uploadDocument(graphId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const file = formData.get("file");
  const target = String(formData.get("target") ?? "");

  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > 10 * 1024 * 1024) {
    redirect("/graph/" + graphId + "/documents?message=" + encodeURIComponent("File troppo grande. Limite: 10 MB."));
  }

  const [targetType, targetId] = target.split(":");
  if (!targetId || !["person", "relationship"].includes(targetType)) return;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const storagePath =
    graphId + "/" + user.id + "/" + randomUUID() + "-" + safeName;

  const { error: uploadError } = await supabase.storage
    .from("family-documents")
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    redirect("/graph/" + graphId + "/documents?message=" + encodeURIComponent(uploadError.message));
  }

  const payload = {
    graph_id: graphId,
    uploaded_by: user.id,
    storage_path: storagePath,
    original_name: file.name,
    person_id: targetType === "person" ? targetId : null,
    relationship_id: targetType === "relationship" ? targetId : null,
  };

  const { error: insertError } = await supabase.from("documents").insert(payload);

  if (insertError) {
    await supabase.storage.from("family-documents").remove([storagePath]);
    redirect("/graph/" + graphId + "/documents?message=" + encodeURIComponent(insertError.message));
  }

  revalidatePath("/graph/" + graphId + "/documents");
}

export async function deleteDocument(
  graphId: string,
  documentId: string,
  storagePath: string
) {
  const { supabase } = await requireUser();

  const { error: storageError } = await supabase.storage
    .from("family-documents")
    .remove([storagePath]);

  if (storageError) {
    redirect("/graph/" + graphId + "/documents?message=" + encodeURIComponent(storageError.message));
  }

  const { error: rowError } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("graph_id", graphId);

  if (rowError) {
    redirect("/graph/" + graphId + "/documents?message=" + encodeURIComponent(rowError.message));
  }

  revalidatePath("/graph/" + graphId + "/documents");
}
