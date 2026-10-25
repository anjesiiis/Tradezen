-- TRADEZEN — 018: o perfil que o usuário edita
-- ============================================
-- A 017 criou profiles com nome e plano, e DE PROPÓSITO não deu permissão
-- de escrita pra ninguém: era isso que impedia alguém de virar premium
-- sozinho pelo console do navegador.
--
-- Agora o usuário precisa editar o próprio nome, telefone e avatar. A
-- saída não é soltar a tabela inteira: é liberar o UPDATE da própria
-- linha e deixar um gatilho defendendo as colunas que não são dele.
-- RLS não sabe restringir COLUNA, só linha — o gatilho faz essa parte.
--
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.

alter table profiles add column if not exists telefone text;
alter table profiles add column if not exists avatar_tipo text;
alter table profiles add column if not exists avatar_valor text;
alter table profiles add column if not exists atualizado_em timestamptz default now();

-- emoji | iniciais | upload. Texto livre com checagem no gatilho abaixo,
-- em vez de CHECK constraint: acrescentar um tipo novo não vai precisar
-- de migration, e linha antiga com valor estranho não trava a tabela.

-- ── o que o usuário PODE mudar ──
drop policy if exists "usuario edita o proprio perfil" on profiles;
create policy "usuario edita o proprio perfil"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── e o que ele NÃO pode ──
-- plano, id e criado_em voltam ao valor antigo mesmo que venham alterados
-- no update. Assim o painel do admin (que usa a chave secreta e passa por
-- cima da RLS) segue sendo o único jeito de mudar plano.
create or replace function proteger_campos_do_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then          -- null = backend com chave secreta
    new.plano := old.plano;
    new.id := old.id;
    new.criado_em := old.criado_em;
  end if;
  new.atualizado_em := now();
  -- tipo de avatar que o app não conhece vira nulo, e aí a tela cai nas
  -- iniciais em vez de tentar desenhar algo que não existe
  if new.avatar_tipo is not null and new.avatar_tipo not in ('emoji','iniciais','upload') then
    new.avatar_tipo := null;
    new.avatar_valor := null;
  end if;
  return new;
end;
$$;

drop trigger if exists ao_editar_perfil on profiles;
create trigger ao_editar_perfil
  before update on profiles
  for each row execute function proteger_campos_do_perfil();

-- Conferência: deve listar as colunas novas
select column_name, data_type from information_schema.columns
where table_name = 'profiles' order by ordinal_position;
