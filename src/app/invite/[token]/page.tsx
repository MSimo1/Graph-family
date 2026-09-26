import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptInvite } from "./actions";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { token } = await params;
  const { message } = await searchParams;
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("invitations")
    .select("email,role,expires_at,accepted_at,graph_id")
    .eq("token", token)
    .single();

  if (
    !invite ||
    invite.accepted_at ||
    !invite.expires_at ||
    new Date(invite.expires_at).getTime() <= Date.now()
  ) {
    notFound();
  }

  const { data: graph } = await admin
    .from("family_graphs")
    .select("name")
    .eq("id", invite.graph_id)
    .single();

  return (
    <main className="authPage">
      <section className="authCard card">
        <Link href="/" className="backLink">← Graph Family</Link>
        <div className="eyebrow">Invito familiare</div>
        <h1>{graph?.name ?? "Famiglia"}</h1>
        <p>
          Sei stato invitato come <strong>{invite.role}</strong> usando l&apos;email{" "}
          <strong>{invite.email}</strong>.
        </p>

        {message ? <div className="notice">{message}</div> : null}

        <form action={acceptInvite.bind(null, token)}>
          <button className="btn btnPrimary btnLarge">Accetta invito</button>
        </form>

        <p className="small muted">
          Devi essere autenticato con la stessa email a cui è stato inviato l&apos;invito.
        </p>
      </section>
    </main>
  );
}
