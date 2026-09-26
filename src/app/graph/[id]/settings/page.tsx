import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createInvite,
  createShareLink,
  disableShareLink,
  removeMember,
  updateMemberRole,
} from "./actions";

export default async function GraphSettingsPage({
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
    { data: members },
    { data: invitations },
    { data: shareLinks },
  ] = await Promise.all([
    supabase.from("family_graphs").select("id,name,owner_id").eq("id", id).single(),
    supabase.from("graph_members").select("role").eq("graph_id", id).eq("user_id", auth.user.id).single(),
    supabase.from("graph_members").select("user_id,role,joined_at").eq("graph_id", id).order("joined_at"),
    supabase.from("invitations").select("id,email,role,token,expires_at,accepted_at").eq("graph_id", id).order("created_at", { ascending: false }),
    supabase.from("share_links").select("id,token,password_hash,expires_at,active,created_at").eq("graph_id", id).order("created_at", { ascending: false }),
  ]);

  if (!graph || !membership) notFound();

  const isOwner = membership.role === "owner";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <main className="settingsPage">
      <header className="graphHeader">
        <div>
          <Link href={"/graph/" + id} className="backLink">← {graph.name}</Link>
          <h1>Gestione famiglia</h1>
          <p>Ruolo attuale: {membership.role}</p>
        </div>
      </header>

      <div className="container settingsGrid">
        {message ? <div className="notice settingsNotice">{message}</div> : null}

        <section className="card settingsCard">
          <div className="eyebrow">Collaboratori</div>
          <h2>Membri del grafo</h2>

          <div className="memberList">
            {(members ?? []).map((member) => {
              const isGraphOwner = member.user_id === graph.owner_id;
              const roleAction = updateMemberRole.bind(null, id, member.user_id);
              const removeAction = removeMember.bind(null, id, member.user_id);

              return (
                <div className="memberRow" key={member.user_id}>
                  <div>
                    <strong>{isGraphOwner ? "Owner" : "Membro"}</strong>
                    <div className="small muted">{member.user_id}</div>
                  </div>
                  <div className="memberActions">
                    {isOwner && !isGraphOwner ? (
                      <>
                        <form action={roleAction}>
                          <select name="role" defaultValue={member.role}>
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button className="btn btnGhost">Aggiorna</button>
                        </form>
                        <form action={removeAction}>
                          <button className="btn btnDanger">Rimuovi</button>
                        </form>
                      </>
                    ) : (
                      <span className="rolePill">{member.role}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <hr className="separator" />

          <h3>Invita un familiare</h3>
          <form action={createInvite.bind(null, id)} className="formInline">
            <input name="email" type="email" required placeholder="email@esempio.com" />
            <select name="role" defaultValue="member">
              <option value="member">Member</option>
              {isOwner ? <option value="admin">Admin</option> : null}
            </select>
            <button className="btn btnPrimary">Crea invito</button>
          </form>

          {(invitations ?? []).length ? (
            <div className="inviteList">
              {(invitations ?? []).map((invite) => (
                <div className="inviteItem" key={invite.id}>
                  <div>
                    <strong>{invite.email}</strong>
                    <div className="small muted">
                      {invite.accepted_at ? "Accettato" : "In attesa"} · {invite.role}
                    </div>
                  </div>
                  {!invite.accepted_at ? (
                    <code>{appUrl + "/invite/" + invite.token}</code>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="card settingsCard" id="share">
          <div className="eyebrow">Condivisione</div>
          <h2>Link in sola lettura</h2>
          <p className="muted">
            Chi apre il link può vedere il grafo ma non può modificarlo.
          </p>

          <form action={createShareLink.bind(null, id)} className="formStack">
            <label>
              Password opzionale
              <input name="password" type="password" placeholder="Lascia vuoto per nessuna password" />
            </label>
            <label>
              Scadenza
              <select name="days" defaultValue="30">
                <option value="7">7 giorni</option>
                <option value="30">30 giorni</option>
                <option value="90">90 giorni</option>
                <option value="365">1 anno</option>
              </select>
            </label>
            <button className="btn btnPrimary">Genera link</button>
          </form>

          <div className="shareList">
            {(shareLinks ?? []).map((share) => (
              <div className="shareItem" key={share.id}>
                <div>
                  <strong>{share.active ? "Attivo" : "Disattivato"}</strong>
                  <div className="small muted">
                    {share.password_hash ? "Protetto da password" : "Senza password"}
                  </div>
                  <code>{appUrl + "/share/" + share.token}</code>
                </div>
                {share.active ? (
                  <form action={disableShareLink.bind(null, id, share.id)}>
                    <button className="btn btnDanger">Disattiva</button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
