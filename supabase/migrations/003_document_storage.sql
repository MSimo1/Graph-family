insert into storage.buckets (id, name, public)
values ('family-documents', 'family-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "graph members read family documents" on storage.objects;
create policy "graph members read family documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'family-documents'
  and public.is_graph_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "graph members upload family documents" on storage.objects;
create policy "graph members upload family documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'family-documents'
  and public.is_graph_member(((storage.foldername(name))[1])::uuid)
  and owner_id = auth.uid()
);

drop policy if exists "owner admin uploader delete family documents" on storage.objects;
create policy "owner admin uploader delete family documents"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'family-documents'
  and (
    owner_id = auth.uid()
    or public.graph_role_of(((storage.foldername(name))[1])::uuid) in ('owner','admin')
  )
);
