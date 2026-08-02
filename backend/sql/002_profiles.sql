-- Tabela de perfis de usuário + trigger que cria a linha automaticamente
-- no cadastro. Ver 001_enable_rls.sql pro contexto de por que RLS importa
-- aqui — essa tabela guarda dado de usuário de verdade, então é a que
-- mais precisa estar fechada direito desde o primeiro dia.

create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null default '',
  telefone   text default '',
  plano      text not null default 'free' check (plano in ('free', 'premium')),
  criado_em  timestamptz not null default now()
);

alter table profiles enable row level security;

-- Cada usuário só enxerga a própria linha.
create policy "usuario le o proprio perfil" on profiles
  for select using (auth.uid() = id);

-- Cada usuário pode editar o próprio nome/telefone — mas o "with check"
-- exige que o "plano" da linha nova seja IGUAL ao que já estava salvo.
-- Ou seja: dá pra atualizar nome e telefone livremente, mas trocar o
-- próprio plano pra "premium" via API fica bloqueado pelo banco, não
-- importa o que o cliente mande no corpo da requisição. É o mesmo
-- princípio do "nunca confiar em campo de permissão vindo do cliente"
-- que vimos no vídeo, só que aplicado como regra do banco em vez de
-- código do backend — funciona mesmo se alguém pular nosso site
-- inteiro e chamar a API do Supabase direto.
create policy "usuario edita o proprio perfil, menos o plano" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and plano = (select plano from profiles where id = auth.uid()));

-- Cria a linha em "profiles" sozinho, assim que alguém termina o cadastro
-- no Supabase Auth. "security definer" pra rodar com permissão de dono
-- da função (senão não conseguiria inserir, já que o usuário novo ainda
-- não tem uma policy de insert — e de propósito NÃO criamos uma policy
-- de insert pra usuário comum: a única forma de existir uma linha em
-- profiles é por aqui, nunca por um INSERT direto do cliente).
create or replace function public.criar_perfil_no_cadastro()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome, telefone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    coalesce(new.raw_user_meta_data->>'telefone', '')
  );
  return new;
end;
$$;

drop trigger if exists ao_cadastrar_criar_perfil on auth.users;
create trigger ao_cadastrar_criar_perfil
  after insert on auth.users
  for each row execute function public.criar_perfil_no_cadastro();
