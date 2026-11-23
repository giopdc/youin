-- Carteles: bucket público de lectura; solo administradores suben o borran.
insert into storage.buckets (id, name, public)
values ('posters', 'posters', true)
on conflict (id) do nothing;

create policy "admin sube carteles" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'posters' and (select public.is_admin()));

create policy "admin actualiza carteles" on storage.objects
  for update to authenticated
  using (bucket_id = 'posters' and (select public.is_admin()));

create policy "admin borra carteles" on storage.objects
  for delete to authenticated
  using (bucket_id = 'posters' and (select public.is_admin()));
