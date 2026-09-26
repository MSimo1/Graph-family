create extension if not exists pgcrypto;

do $$ begin
  create type public.graph_role as enum ('owner', 'admin', 'member');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.relationship_type as enum ('parent', 'partner', 'spouse', 'sibling');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.family_graphs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.graph_members (
  graph_id uuid not null references public.family_graphs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.graph_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (graph_id, user_id)
);

create table if not exists public.persons (
  id uuid primary key default gen_random_uuid(),
  graph_id uuid not null references public.family_graphs(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  first_name text not null,
  last_name text not null default '',
  birth_date date,
  death_date date,
  photo_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  graph_id uuid not null references public.family_graphs(id) on delete cascade,
  from_person_id uuid not null references public.persons(id) on delete cascade,
  to_person_id uuid not null references public.persons(id) on delete cascade,
  type public.relationship_type not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint relationship_people_distinct check (from_person_id <> to_person_id)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  graph_id uuid not null references public.family_graphs(id) on delete cascade,
  person_id uuid references public.persons(id) on delete cascade,
  relationship_id uuid references public.relationships(id) on delete cascade,
  storage_path text not null,
  original_name text not null,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint document_has_one_target check (
    ((person_id is not null)::int + (relationship_id is not null)::int) = 1
  )
);

create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  graph_id uuid not null references public.family_graphs(id) on delete cascade,
  token text not null unique,
  password_hash text,
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  graph_id uuid not null references public.family_graphs(id) on delete cascade,
  email text not null,
  role public.graph_role not null default 'member',
  token text not null unique,
  invited_by uuid not null references public.profiles(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id bigint generated always as identity primary key,
  graph_id uuid not null references public.family_graphs(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists graph_members_user_idx on public.graph_members(user_id);
create index if not exists persons_graph_idx on public.persons(graph_id);
create index if not exists relationships_graph_idx on public.relationships(graph_id);
create index if not exists relationships_from_idx on public.relationships(from_person_id);
create index if not exists relationships_to_idx on public.relationships(to_person_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.add_owner_membership()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.graph_members(graph_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (graph_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

drop trigger if exists on_family_graph_created on public.family_graphs;
create trigger on_family_graph_created
after insert on public.family_graphs
for each row execute procedure public.add_owner_membership();

create or replace function public.is_graph_member(target_graph uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.graph_members gm
    where gm.graph_id = target_graph and gm.user_id = auth.uid()
  );
$$;

create or replace function public.graph_role_of(target_graph uuid)
returns public.graph_role
language sql
stable
security definer set search_path = public
as $$
  select gm.role from public.graph_members gm
  where gm.graph_id = target_graph and gm.user_id = auth.uid()
  limit 1;
$$;

alter table public.profiles enable row level security;
alter table public.family_graphs enable row level security;
alter table public.graph_members enable row level security;
alter table public.persons enable row level security;
alter table public.relationships enable row level security;
alter table public.documents enable row level security;
alter table public.share_links enable row level security;
alter table public.invitations enable row level security;
alter table public.activity_logs enable row level security;

create policy "profile owner can read self" on public.profiles
for select using (id = auth.uid());

create policy "profile owner can update self" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy "members can read graphs" on public.family_graphs
for select using (owner_id = auth.uid() or public.is_graph_member(id));

create policy "authenticated users create owned graphs" on public.family_graphs
for insert with check (owner_id = auth.uid());

create policy "owner admin update graphs" on public.family_graphs
for update using (public.graph_role_of(id) in ('owner','admin'));

create policy "owner deletes graphs" on public.family_graphs
for delete using (owner_id = auth.uid());

create policy "members read memberships" on public.graph_members
for select using (public.is_graph_member(graph_id));

create policy "owner admin add memberships" on public.graph_members
for insert with check (public.graph_role_of(graph_id) in ('owner','admin'));

create policy "owner admin update memberships" on public.graph_members
for update using (public.graph_role_of(graph_id) in ('owner','admin'));

create policy "owner admin delete memberships" on public.graph_members
for delete using (public.graph_role_of(graph_id) in ('owner','admin') and user_id <> auth.uid());

create policy "members read persons" on public.persons
for select using (public.is_graph_member(graph_id));

create policy "members create persons" on public.persons
for insert with check (public.is_graph_member(graph_id) and created_by = auth.uid());

create policy "owner admin creator update persons" on public.persons
for update using (
  public.graph_role_of(graph_id) in ('owner','admin') or created_by = auth.uid()
) with check (
  public.graph_role_of(graph_id) in ('owner','admin') or created_by = auth.uid()
);

create policy "owner admin creator delete persons" on public.persons
for delete using (
  public.graph_role_of(graph_id) in ('owner','admin') or created_by = auth.uid()
);

create policy "members read relationships" on public.relationships
for select using (public.is_graph_member(graph_id));

create policy "members create relationships" on public.relationships
for insert with check (public.is_graph_member(graph_id) and created_by = auth.uid());

create policy "owner admin creator update relationships" on public.relationships
for update using (
  public.graph_role_of(graph_id) in ('owner','admin') or created_by = auth.uid()
);

create policy "owner admin creator delete relationships" on public.relationships
for delete using (
  public.graph_role_of(graph_id) in ('owner','admin') or created_by = auth.uid()
);

create policy "members read documents" on public.documents
for select using (public.is_graph_member(graph_id));

create policy "members create documents" on public.documents
for insert with check (public.is_graph_member(graph_id) and uploaded_by = auth.uid());

create policy "owner admin uploader delete documents" on public.documents
for delete using (
  public.graph_role_of(graph_id) in ('owner','admin') or uploaded_by = auth.uid()
);

create policy "owner admin read shares" on public.share_links
for select using (public.graph_role_of(graph_id) in ('owner','admin'));

create policy "owner admin create shares" on public.share_links
for insert with check (
  public.graph_role_of(graph_id) in ('owner','admin') and created_by = auth.uid()
);

create policy "owner admin update shares" on public.share_links
for update using (public.graph_role_of(graph_id) in ('owner','admin'));

create policy "owner admin delete shares" on public.share_links
for delete using (public.graph_role_of(graph_id) in ('owner','admin'));

create policy "owner admin read invitations" on public.invitations
for select using (public.graph_role_of(graph_id) in ('owner','admin'));

create policy "owner admin create invitations" on public.invitations
for insert with check (
  public.graph_role_of(graph_id) in ('owner','admin') and invited_by = auth.uid()
);

create policy "members read activity" on public.activity_logs
for select using (public.is_graph_member(graph_id));
