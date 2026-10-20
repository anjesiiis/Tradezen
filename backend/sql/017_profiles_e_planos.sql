-- TRADEZEN — 017: perfis de usuário e planos (free / premium)
-- ============================================================
-- O email e a senha ficam em auth.users, que é do Supabase e não se
-- mexe. O que é NOSSO sobre o usuário — o nome e o plano — mora aqui.
--
-- Regra de ouro desta migration: o usuário pode LER o próprio plano e
-- não pode ESCREVER nele. É isso que faz o gate valer alguma coisa; sem
-- isso, qualquer um com o anon key viraria premium sozinho pelo console
-- do navegador. Quem muda plano é só o backend, que usa a chave secreta
-- e por isso passa por cima da RLS.
--
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  plano text not null default 'free',
  criado_em timestamptz not null default now()
);

-- Perfil nasce junto com o usuário: sem isso, todo cadastro novo ficaria
-- sem linha em profiles e o app teria que adivinhar o plano.
-- `security definer` porque o trigger roda no contexto do cadastro, que
-- não tem permissão de escrever em profiles.
create or replace function criar_profile_do_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, nome)
  values (new.id, new.raw_user_meta_data ->> 'nome')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function criar_profile_do_usuario();

-- Quem já se cadastrou antes desta migration não passou pelo trigger.
insert into profiles (id, nome)
select u.id, u.raw_user_meta_data ->> 'nome'
from auth.users u
on conflict (id) do nothing;

alter table profiles enable row level security;

-- LER só a própria linha. Não existe policy de insert/update/delete de
-- propósito: é o que impede o usuário de se promover a premium.
drop policy if exists "usuario le o proprio perfil" on profiles;
create policy "usuario le o proprio perfil"
  on profiles for select
  using (auth.uid() = id);

-- Conferência: deve listar um perfil por usuário já cadastrado
select p.id, p.plano, p.criado_em from profiles p order by p.criado_em desc;
