import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createFamilyGraph } from "./actions";
import { signOut } from "@/app/auth/actions";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/login");

  const { data: graphs } = await supabase
    .from("family_graphs")
    .select("id,name,description,updated_at")
    .order("updated_at", { ascending: false });

  return (
    <main className="dashboardPage">
      <header className="dashboardHeader container">
        <Link href="/" className="brand">Graph Family</Link>
        <form action={signOut}>
          <button className="btn btnGhost">Esci</button>
        </form>
      </header>

      <section className="container dashboardGrid">
        <div>
          <div className="eyebrow">Dashboard</div>
          <h1>Le tue famiglie</h1>
          <p className="muted">Crea un grafo o continua quello su cui stavi lavorando.</p>

          {message ? <div className="notice">{message}</div> : null}

          <div className="graphCards">
            {(graphs ?? []).map((graph) => (
              <Link key={graph.id} href={"/graph/" + graph.id} className="card graphCard">
                <div>
                  <h2>{graph.name}</h2>
                  <p>{graph.description || "Grafo familiare collaborativo"}</p>
                </div>
                <span>Apri →</span>
              </Link>
            ))}

            {!graphs?.length ? (
              <div className="emptyState card">
                <h2>Nessun grafo ancora</h2>
                <p>Creane uno dal pannello qui accanto.</p>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="card createPanel">
          <div className="eyebrow">Nuovo grafo</div>
          <h2>Crea una famiglia</h2>
          <form action={createFamilyGraph} className="formStack">
            <label>
              Nome
              <input name="name" required placeholder="Famiglia Simo" />
            </label>
            <label>
              Descrizione
              <textarea name="description" rows={4} placeholder="Un breve contesto opzionale" />
            </label>
            <button className="btn btnPrimary">Crea grafo</button>
          </form>
        </aside>
      </section>
    </main>
  );
}
