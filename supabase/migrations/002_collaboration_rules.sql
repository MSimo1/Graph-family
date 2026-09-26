-- Tighten collaboration permissions and add invitation acceptance/activity tracking.

drop policy if exists "owner admin add memberships" on public.graph_members;
drop policy if exists "owner admin update memberships" on public.graph_members;
drop policy if exists "owner admin delete memberships" on public.graph_members;

create policy "owner admin add memberships" on public.graph_members
for insert with check (
  (
    public.graph_role_of(graph_id) = 'owner'
    and role in ('admin', 'member')
  )
  or
  (
    public.graph_role_of(graph_id) = 'admin'
    and role = 'member'
  )
);

create policy "owner updates member roles" on public.graph_members
for update using (
  public.graph_role_of(graph_id) = 'owner'
  and user_id <> auth.uid()
  and role <> 'owner'
)
with check (
  public.graph_role_of(graph_id) = 'owner'
  and user_id <> auth.uid()
  and role in ('admin', 'member')
);

create policy "owner admin remove collaborators" on public.graph_members
for delete using (
  user_id <> auth.uid()
  and role <> 'owner'
  and (
    public.graph_role_of(graph_id) = 'owner'
    or (
      public.graph_role_of(graph_id) = 'admin'
      and role = 'member'
    )
  )
);

create or replace function public.accept_graph_invitation(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_row public.invitations%rowtype;
  current_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select email into current_email
  from auth.users
  where id = auth.uid();

  select *
  into invitation_row
  from public.invitations
  where token = invite_token
    and accepted_at is null
    and expires_at > now()
  for update;

  if invitation_row.id is null then
    raise exception 'Invitation not found or expired';
  end if;

  if lower(invitation_row.email) <> lower(current_email) then
    raise exception 'This invitation belongs to another email address';
  end if;

  if invitation_row.role = 'owner' then
    raise exception 'Owner role cannot be assigned by invitation';
  end if;

  insert into public.graph_members(graph_id, user_id, role)
  values (invitation_row.graph_id, auth.uid(), invitation_row.role)
  on conflict (graph_id, user_id)
  do update set role = excluded.role;

  update public.invitations
  set accepted_at = now()
  where id = invitation_row.id;

  insert into public.activity_logs(graph_id, actor_id, action, entity_type, entity_id)
  values (
    invitation_row.graph_id,
    auth.uid(),
    'invitation.accepted',
    'graph_member',
    auth.uid()::text
  );

  return invitation_row.graph_id;
end;
$$;

grant execute on function public.accept_graph_invitation(text) to authenticated;

create or replace function public.log_graph_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_graph uuid;
  actor uuid;
  target_id text;
begin
  target_graph := coalesce(new.graph_id, old.graph_id);
  actor := auth.uid();
  target_id := coalesce(new.id, old.id)::text;

  insert into public.activity_logs(graph_id, actor_id, action, entity_type, entity_id)
  values (
    target_graph,
    actor,
    tg_op,
    tg_table_name,
    target_id
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists persons_activity on public.persons;
create trigger persons_activity
after insert or update or delete on public.persons
for each row execute procedure public.log_graph_change();

drop trigger if exists relationships_activity on public.relationships;
create trigger relationships_activity
after insert or update or delete on public.relationships
for each row execute procedure public.log_graph_change();

create or replace function public.shares_graph_with(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.graph_members mine
    join public.graph_members theirs
      on mine.graph_id = theirs.graph_id
    where mine.user_id = auth.uid()
      and theirs.user_id = target_user
  );
$$;

drop policy if exists "profile owner can read self" on public.profiles;
create policy "collaborators can read profiles" on public.profiles
for select using (id = auth.uid() or public.shares_graph_with(id));
