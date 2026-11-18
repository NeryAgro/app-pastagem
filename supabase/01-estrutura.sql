-- Agro Express Pasto: estrutura do banco, logins e regras de acesso.
-- Cole tudo no SQL Editor do Supabase e clique em Run. Pode rodar mais de uma vez.

-- 1. Perfis de usuário (técnico, vendedor, dono)
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nome text,
  telefone text,
  papel text not null default 'tecnico' check (papel in ('tecnico','vendedor','admin')),
  status text not null default 'pendente' check (status in ('pendente','ativo','bloqueado')),
  criado_em timestamptz not null default now()
);
alter table public.perfis enable row level security;

-- O primeiro usuário a se cadastrar vira o dono (admin) e já entra ativo.
-- Todos os outros entram como "pendente" até o dono aprovar.
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare primeiro boolean;
begin
  select not exists(select 1 from public.perfis) into primeiro;
  insert into public.perfis(id,email,nome,telefone,papel,status)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'nome',''),
          coalesce(new.raw_user_meta_data->>'telefone',''),
          case when primeiro then 'admin'
               when new.raw_user_meta_data->>'papel'='vendedor' then 'vendedor'
               else 'tecnico' end,
          case when primeiro then 'ativo' else 'pendente' end)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.novo_usuario();

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.perfis where id = auth.uid() and papel = 'admin' and status = 'ativo');
$$;
create or replace function public.eh_ativo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.perfis where id = auth.uid() and status = 'ativo');
$$;

drop policy if exists perfis_ler on public.perfis;
create policy perfis_ler on public.perfis for select to authenticated
  using (id = auth.uid() or public.eh_admin());
-- Usuário pode mudar só o próprio nome e telefone; papel e status só o dono muda (função abaixo).
revoke update on public.perfis from authenticated, anon;
grant update (nome, telefone) on public.perfis to authenticated;
drop policy if exists perfis_editar on public.perfis;
create policy perfis_editar on public.perfis for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.admin_definir_usuario(alvo uuid, novo_status text, novo_papel text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'Somente o dono pode fazer isso'; end if;
  if alvo = auth.uid() and (novo_status <> 'ativo' or novo_papel <> 'admin') then
    raise exception 'Você não pode tirar o seu próprio acesso de dono';
  end if;
  update public.perfis set status = coalesce(novo_status,status), papel = coalesce(novo_papel,papel) where id = alvo;
end $$;
revoke execute on function public.admin_definir_usuario(uuid,text,text) from anon;

-- 2. Dados do app (clientes, pastos, áreas, produtos, ajustes) de cada usuário
create table if not exists public.docs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  col text not null,
  id text not null,
  data jsonb,
  apagado boolean not null default false,
  atualizado_em timestamptz not null default now(),
  primary key (user_id, col, id)
);
create index if not exists docs_user_atualizado on public.docs(user_id, atualizado_em);
alter table public.docs enable row level security;

create or replace function public.docs_carimbo() returns trigger language plpgsql as $$
begin new.atualizado_em := clock_timestamp(); return new; end $$;
drop trigger if exists docs_carimbo on public.docs;
create trigger docs_carimbo before insert or update on public.docs
  for each row execute function public.docs_carimbo();

-- Cada usuário ativo lê e grava só os próprios dados. O dono lê os dados de todos.
drop policy if exists docs_ler on public.docs;
create policy docs_ler on public.docs for select to authenticated
  using ((user_id = auth.uid() and public.eh_ativo()) or public.eh_admin());
drop policy if exists docs_inserir on public.docs;
create policy docs_inserir on public.docs for insert to authenticated
  with check (user_id = auth.uid() and public.eh_ativo());
drop policy if exists docs_alterar on public.docs;
create policy docs_alterar on public.docs for update to authenticated
  using (user_id = auth.uid() and public.eh_ativo())
  with check (user_id = auth.uid() and public.eh_ativo());
-- Ninguém apaga linhas de verdade: o app marca "apagado" (o histórico fica para a sugestão de doses).
revoke delete on public.docs from authenticated, anon;

grant select, insert, update on public.docs to authenticated;
grant select on public.perfis to authenticated;
