-- Agro Express Pasto: guardar os PDFs de proposta gerados pelos usuários.
-- Cole tudo no SQL Editor do Supabase e clique em Run. Pode rodar mais de uma vez.

-- Pasta privada "propostas" no Storage (nada fica público).
insert into storage.buckets (id, name, public)
values ('propostas', 'propostas', false)
on conflict (id) do nothing;

-- Cada arquivo fica em propostas/<id do usuário>/<cliente>/<arquivo>.pdf
-- O usuário ativo envia e lê só os dele. O dono lê todos.
drop policy if exists "propostas_enviar" on storage.objects;
create policy "propostas_enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'propostas' and (storage.foldername(name))[1] = auth.uid()::text and public.eh_ativo());

drop policy if exists "propostas_ler" on storage.objects;
create policy "propostas_ler" on storage.objects for select to authenticated
  using (bucket_id = 'propostas' and (((storage.foldername(name))[1] = auth.uid()::text and public.eh_ativo()) or public.eh_admin()));
