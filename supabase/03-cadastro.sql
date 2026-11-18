-- Agro Express Pasto: cadastro completo do usuário (WhatsApp, empresa, categoria, município, estado).
-- Cole tudo no SQL Editor do Supabase e clique em Run. Pode rodar mais de uma vez.

alter table public.perfis add column if not exists empresa text;
alter table public.perfis add column if not exists municipio text;
alter table public.perfis add column if not exists uf text;

-- Categoria: Técnico, Vendedor ou RC (o dono continua "admin").
alter table public.perfis drop constraint if exists perfis_papel_check;
alter table public.perfis add constraint perfis_papel_check check (papel in ('tecnico','vendedor','rc','admin'));

create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare primeiro boolean; m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  select not exists(select 1 from public.perfis) into primeiro;
  insert into public.perfis(id,email,nome,telefone,empresa,municipio,uf,papel,status)
  values (new.id, new.email,
          coalesce(m->>'nome',''), coalesce(m->>'telefone',''), coalesce(m->>'empresa',''),
          coalesce(m->>'municipio',''), upper(coalesce(m->>'uf','')),
          case when primeiro then 'admin'
               when m->>'papel' in ('vendedor','rc') then m->>'papel'
               else 'tecnico' end,
          case when primeiro then 'ativo' else 'pendente' end)
  on conflict (id) do nothing;
  return new;
end $$;

-- O próprio usuário pode completar/corrigir esses dados (não a categoria nem o status).
grant update (nome, telefone, empresa, municipio, uf) on public.perfis to authenticated;
