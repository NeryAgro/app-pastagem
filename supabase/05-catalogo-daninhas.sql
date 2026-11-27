-- Agro Express Pasto: fotos das plantas daninhas (usadas no Orçamento prévio).
-- Cole tudo no SQL Editor do Supabase e clique em Run. Pode rodar mais de uma vez.
-- As fotos ficam só no banco (não vão para o GitHub). Usuários ativos podem ver; só o dono cadastra.

create table if not exists public.catalogo_daninhas (
  nome text primary key,            -- nome como aparece na lista do app (ex.: "Assa-peixe-branco")
  cientifico text,
  thumb text not null,              -- miniatura (data:image/jpeg;base64,...)
  foto text not null,               -- foto para o PDF (data:image/jpeg;base64,...)
  apagado boolean not null default false,
  atualizado_em timestamptz not null default now()
);
alter table public.catalogo_daninhas enable row level security;

create or replace function public.catalogo_daninhas_carimbo() returns trigger language plpgsql as $$
begin new.atualizado_em := clock_timestamp(); return new; end $$;
drop trigger if exists catalogo_daninhas_carimbo on public.catalogo_daninhas;
create trigger catalogo_daninhas_carimbo before insert or update on public.catalogo_daninhas
  for each row execute function public.catalogo_daninhas_carimbo();

drop policy if exists catalogo_ler on public.catalogo_daninhas;
create policy catalogo_ler on public.catalogo_daninhas for select to authenticated
  using (public.eh_ativo() or public.eh_admin());
drop policy if exists catalogo_inserir on public.catalogo_daninhas;
create policy catalogo_inserir on public.catalogo_daninhas for insert to authenticated
  with check (public.eh_admin());
drop policy if exists catalogo_editar on public.catalogo_daninhas;
create policy catalogo_editar on public.catalogo_daninhas for update to authenticated
  using (public.eh_admin()) with check (public.eh_admin());
revoke delete on public.catalogo_daninhas from authenticated, anon;
grant select, insert, update on public.catalogo_daninhas to authenticated;

create index if not exists catalogo_daninhas_atualizado on public.catalogo_daninhas (atualizado_em);
