import Link from "next/link";
import { signIn, signUp } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <main className="authPage">
      <section className="authCard card">
        <Link href="/" className="backLink">← Graph Family</Link>
        <div className="authIntro">
          <div className="eyebrow">Area privata</div>
          <h1>Entra nella tua famiglia.</h1>
          <p>Accedi oppure crea un account per iniziare un nuovo grafo.</p>
        </div>

        {message ? <div className="notice">{message}</div> : null}

        <form className="formStack">
          <label>
            Nome visualizzato
            <input name="displayName" placeholder="Maxim" />
          </label>
          <label>
            Email
            <input name="email" type="email" required placeholder="tu@email.com" />
          </label>
          <label>
            Password
            <input name="password" type="password" minLength={8} required placeholder="Almeno 8 caratteri" />
          </label>

          <div className="formActions">
            <button className="btn btnPrimary" formAction={signIn}>Accedi</button>
            <button className="btn btnGhost" formAction={signUp}>Crea account</button>
          </div>
        </form>
      </section>
    </main>
  );
}
