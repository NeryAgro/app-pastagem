-- Agro Express Pasto: catálogo único de produtos, com aprovação do dono.
-- Cole tudo no SQL Editor do Supabase e clique em Run. Pode rodar mais de uma vez.

create table if not exists public.produtos (
  id text primary key,
  nome text not null,
  industria text,
  principios jsonb not null default '[]'::jsonb,   -- [{"nome":"Aminopiralide","conc":"240 g/L"}]
  formulacao text,
  volume text not null default 'L' check (volume in ('L','kg')),   -- como o produto é vendido
  unidade text not null default 'L',                                -- unidade da dose por hectare (L, mL, g, kg)
  tipo text,
  status text not null default 'pendente' check (status in ('pendente','aprovado','rejeitado')),
  motivo text,
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  revisado_por uuid,
  revisado_em timestamptz,
  atualizado_em timestamptz not null default now()
);
alter table public.produtos enable row level security;

create or replace function public.produtos_carimbo() returns trigger language plpgsql as $$
begin new.atualizado_em := clock_timestamp(); return new; end $$;
drop trigger if exists produtos_carimbo on public.produtos;
create trigger produtos_carimbo before insert or update on public.produtos
  for each row execute function public.produtos_carimbo();

-- Todos os usuários ativos veem os aprovados e os que eles mesmos enviaram. O dono vê todos.
drop policy if exists produtos_ler on public.produtos;
create policy produtos_ler on public.produtos for select to authenticated
  using ((public.eh_ativo() and (status = 'aprovado' or criado_por = auth.uid())) or public.eh_admin());
-- Usuário ativo pode sugerir produto novo, que sempre entra como pendente.
drop policy if exists produtos_sugerir on public.produtos;
create policy produtos_sugerir on public.produtos for insert to authenticated
  with check (public.eh_ativo() and criado_por = auth.uid() and (status = 'pendente' or public.eh_admin()));
-- Só o dono aprova, rejeita e edita.
drop policy if exists produtos_editar on public.produtos;
create policy produtos_editar on public.produtos for update to authenticated
  using (public.eh_admin()) with check (public.eh_admin());
revoke delete on public.produtos from authenticated, anon;
grant select, insert, update on public.produtos to authenticated;

-- Lista inicial (aprovada). Indústria e princípio ativo podem ser completados pelo dono no Painel.
insert into public.produtos (id, nome, volume, unidade, tipo, status, criado_por) values
 ('tecnologia-xt-s','Tecnologia XT-S','L','L','Herbicida','aprovado',null),
 ('tecnologia-ultra-s','Tecnologia Ultra-S','L','L','Herbicida','aprovado',null),
 ('disparo-ultra-s','Disparo Ultra-S','L','L','Herbicida','aprovado',null),
 ('dominum-xt-s','Dominum XT-S','L','L','Herbicida','aprovado',null),
 ('garlon-480-br','Garlon 480 BR','L','L','Herbicida','aprovado',null),
 ('jaguar-ultra-s','Jaguar Ultra-S','L','L','Herbicida','aprovado',null),
 ('juvix','Juvix','L','L','Herbicida','aprovado',null),
 ('navius','Navius','kg','g','Herbicida','aprovado',null),
 ('padron','Padron','L','L','Herbicida','aprovado',null),
 ('palace-ultra-s','Palace Ultra-S','L','L','Herbicida','aprovado',null),
 ('panoramic-ultra-s','Panoramic Ultra-S','L','L','Herbicida','aprovado',null),
 ('stopper-xt-s','Stopper XT-S','L','L','Herbicida','aprovado',null),
 ('tordon-ultra-s','Tordon Ultra-S','L','L','Herbicida','aprovado',null),
 ('trueno-xt-s','Trueno XT-S','L','L','Herbicida','aprovado',null),
 ('truper','Truper','L','L','Herbicida','aprovado',null),
 ('metsulfuron','Metsulfuron','kg','g','Herbicida','aprovado',null),
 ('planador-xt-s','Planador XT-S','L','L','Herbicida','aprovado',null),
 ('oleo-mineral','Óleo mineral','L','mL','Adjuvante','aprovado',null),
 ('redutor-ph','Redutor de pH','L','mL','Adjuvante','aprovado',null),
 ('2-4-d','2,4-D','L','L','Herbicida','aprovado',null)
on conflict (id) do nothing;
