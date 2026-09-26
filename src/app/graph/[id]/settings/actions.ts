"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createShareToken, hashPassword } from "@/lib/share";

async function requireUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  return { supabase, user: auth.user };
}

export async function createInvite(graphId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "member");

  if (!email) return;

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("invitations").insert({
    graph_id: graphId,
    email,
    role,
    token,
    invited_by: user.id,
    expires_at: expiresAt,
  });

  if (error) {
    redirect("/graph/" + graphId + "/settings?message=" + encodeURIComponent(error.message));
  }

  revalidatePath("/graph/" + graphId + "/settings");
}

export async function createShareLink(graphId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const password = String(formData.get("password") ?? "");
  const daysRaw = Number(formData.get("days") ?? 30);
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(daysRaw, 365) : 30;

  const { error } = await supabase.from("share_links").insert({
    graph_id: graphId,
    token: createShareToken(),
    password_hash: password ? hashPassword(password) : null,
    expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
    created_by: user.id,
  });

  if (error) {
    redirect("/graph/" + graphId + "/settings?message=" + encodeURIComponent(error.message));
  }

  revalidatePath("/graph/" + graphId + "/settings");
}

export async function disableShareLink(graphId: string, shareId: string) {
  const { supabase } = await requireUser();

  await supabase
    .from("share_links")
    .update({ active: false })
    .eq("id", shareId)
    .eq("graph_id", graphId);

  revalidatePath("/graph/" + graphId + "/settings");
}

export async function updateMemberRole(
  graphId: string,
  userId: string,
  formData: FormData
) {
  const { supabase } = await requireUser();
  const role = String(formData.get("role") ?? "member");

  await supabase
    .from("graph_members")
    .update({ role })
    .eq("graph_id", graphId)
    .eq("user_id", userId);

  revalidatePath("/graph/" + graphId + "/settings");
}

export async function removeMember(graphId: string, userId: string) {
  const { supabase } = await requireUser();

  await supabase
    .from("graph_members")
    .delete()
    .eq("graph_id", graphId)
    .eq("user_id", userId);

  revalidatePath("/graph/" + graphId + "/settings");
}
