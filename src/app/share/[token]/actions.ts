"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  shareCookieName,
  signShareAccess,
  verifyPassword,
} from "@/lib/share";

export async function unlockShare(token: string, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const admin = createAdminClient();

  const { data: share } = await admin
    .from("share_links")
    .select("password_hash,active,expires_at")
    .eq("token", token)
    .single();

  const expired = !share?.expires_at || new Date(share.expires_at).getTime() <= Date.now();

  if (!share || !share.active || expired || !share.password_hash) {
    redirect("/share/" + token + "?error=Link non disponibile");
  }

  if (!verifyPassword(password, share.password_hash)) {
    redirect("/share/" + token + "?error=Password non corretta");
  }

  const cookieStore = await cookies();
  cookieStore.set(shareCookieName(token), signShareAccess(token), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
    path: "/share/" + token,
  });

  redirect("/share/" + token);
}
