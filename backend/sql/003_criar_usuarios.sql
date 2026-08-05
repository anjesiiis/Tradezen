-- TRADEUP — TABELA DE USUÁRIOS (cadastro/login por magic link)
-- =================================================================
-- Perfil público vinculado a auth.users (Supabase Auth cuida da
-- autenticação/verificação de email — aqui só guardamos o que o app
-- precisa mostrar sem decodificar o JWT toda hora: nome, email e plano).
--
-- NOTA: existe um arquivo mais antigo (002_profiles.sql) de um planejamento
-- anterior, com uma tabela `profiles` (sem coluna email, com telefone).
-- Esse arquivo aqui é o que efetivamente foi pedido agora (tabela
-- `usuarios`, com email) — se `profiles` nunca chegou a ser rodada no
-- Supabase, dá pra ignorá-la.

create table if not exists usuarios (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null default '',
  email      text not null,
  plano      text not null default 'free' check (plano in ('free', 'premium')),
  criado_em  timestamptz not null default now()
);

alter table usuarios enable row level security;

-- Cada usuário só vê e edita o próprio cadastro — nunca o de outra pessoa.
create policy "usuario le o proprio cadastro"
  on usuarios for select
  using (auth.uid() = id);

-- Pode editar o nome, mas não pode se auto-promover de plano mudando a
-- própria linha (o "with check" força o plano continuar igual ao que já
-- estava salvo; só o backend, com a secret key — que ignora RLS —, muda
-- plano de verdade, ex: depois de confirmar um pagamento).
create policy "usuario edita o proprio cadastro, menos o plano"
  on usuarios for update
  using (auth.uid() = id)
  with check (auth.uid() = id and plano = (select plano from usuarios where id = auth.uid()));

-- Sem policy de insert pra usuário comum: a linha em `usuarios` nasce
-- sozinha via trigger (abaixo) quando o Supabase Auth cria o registro em
-- auth.users — nunca confiamos num insert vindo direto do cliente.

create or replace function public.criar_usuario_no_cadastro()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''), new.email);
  return new;
end;
$$;

drop trigger if exists ao_cadastrar_criar_usuario on auth.users;
create trigger ao_cadastrar_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_usuario_no_cadastro();
