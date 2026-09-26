import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing">
      <nav className="topbar container">
        <Link href="/" className="brand">Graph Family</Link>
        <div className="navActions">
          <Link className="btn btnGhost" href="/login">Accedi</Link>
          <Link className="btn btnPrimary" href="/graph/demo">Apri demo</Link>
        </div>
      </nav>

      <section className="hero container">
        <div className="eyebrow">La tua famiglia, connessa.</div>
        <h1>Un grafo familiare collaborativo, semplice da costruire e condividere.</h1>
        <p>
          Crea persone e relazioni, invita i tuoi familiari e mantieni il controllo
          con ruoli Owner, Admin e Member.
        </p>
        <div className="heroActions">
          <Link className="btn btnPrimary btnLarge" href="/login">Crea la tua famiglia</Link>
          <Link className="btn btnGhost btnLarge" href="/graph/demo">Vedi il grafo demo</Link>
        </div>
      </section>

      <section className="featureGrid container">
        <article className="card featureCard">
          <span>01</span>
          <h2>Costruisci</h2>
          <p>Aggiungi membri della famiglia e collega genitori, figli, partner e fratelli.</p>
        </article>
        <article className="card featureCard">
          <span>02</span>
          <h2>Collabora</h2>
          <p>I Member modificano ciò che creano; Owner e Admin gestiscono l'intero grafo.</p>
        </article>
        <article className="card featureCard">
          <span>03</span>
          <h2>Condividi</h2>
          <p>Genera un link read-only, con password e scadenza opzionali.</p>
        </article>
      </section>
    </main>
  );
}
