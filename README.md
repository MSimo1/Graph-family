# Graph Family

MVP collaborativo per costruire, navigare e condividere un grafo genealogico familiare.

## Modello di accesso

- **Owner**: unico proprietario del grafo. Può gestire tutto, inclusi Admin e Member.
- **Admin**: può gestire contenuti e Member, ma non può sostituire l'Owner.
- **Member**: può aggiungere persone e relazioni; modifica o elimina solo ciò che ha creato.
- **Guest via link**: sola lettura. Il link può essere protetto da password e avere una scadenza.

## Stack

- Next.js / React / TypeScript
- Supabase Auth
- PostgreSQL + Row Level Security
- Supabase Storage per documenti privati
- React Flow per la visualizzazione del grafo
- GitHub Actions per typecheck e build

## Funzioni implementate

- landing page e demo del grafo
- registrazione e login
- dashboard con creazione di più famiglie
- creazione persone e relazioni
- grafo interattivo con zoom, pan e drag
- modifica/eliminazione persone secondo i permessi
- eliminazione relazioni secondo i permessi
- ruoli Owner / Admin / Member
- inviti tramite link con token e scadenza
- accettazione invito legata all'email invitata
- link di condivisione read-only
- password opzionale sui link condivisi
- scadenza e revoca dei link
- documenti privati associati a persone o relazioni
- activity log lato database
- policy RLS e policy Supabase Storage
- CI automatica su GitHub

## Avvio locale

### 1. Installa le dipendenze

```bash
npm install
```

### 2. Configura l'ambiente

Copia `.env.example` in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SHARE_SESSION_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Non committare mai `.env.local` o la service role key.

Per creare un secret locale:

```bash
openssl rand -hex 32
```

### 3. Applica le migration Supabase

Esegui in ordine:

```text
supabase/migrations/001_init.sql
supabase/migrations/002_collaboration_rules.sql
supabase/migrations/003_document_storage.sql
```

Le migration creano:

- profili
- grafi familiari
- membership e ruoli
- persone
- relazioni
- documenti
- inviti
- link condivisi
- activity log
- policy RLS
- bucket privato `family-documents`

### 4. Avvia l'app

```bash
npm run dev
```

Apri `http://localhost:3000`.

## Struttura principale

```text
src/
  app/
    auth/
    dashboard/
    graph/
      [id]/
        documents/
        people/
        settings/
    invite/
    share/
  components/
    graph/
  lib/
    supabase/
  types/

supabase/
  migrations/
```

## Regola di sicurezza principale

I permessi non sono affidati soltanto alla UI. Le regole principali sono replicate a livello PostgreSQL tramite Row Level Security.

## Nota documenti

I documenti caricati servono solo come supporto informativo interno al grafo. L'MVP non attribuisce loro valore di certificazione legale.

## CI

Ogni push su `main` esegue:

```text
npm install
npx tsc --noEmit
npm run build
```
