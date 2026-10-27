-- TRADEZEN — GRÁFICOS SALVOS DO USUÁRIO
-- =====================================
--
-- O que a pessoa deixou montado em cada ativo: indicadores ligados e
-- desenhos (linhas, canais, retângulos, Fibonacci, textos).
--
-- Até agora isso vivia só no localStorage do navegador — ou seja, quem
-- entrava do celular não via o que tinha desenhado no computador, e
-- limpar o navegador apagava tudo. Esta tabela é o que faz o trabalho
-- acompanhar a pessoa.
--
-- Uma linha por (usuário, ativo). O conteúdo é JSON porque o formato dos
-- desenhos muda com as ferramentas novas, e versionar coluna a coluna
-- obrigaria uma migration a cada ferramenta.
--
-- Rodar no SQL Editor do Supabase. É seguro rodar duas vezes.

create table if not exists graficos_usuario (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  ticker        text not null,
  config        jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  unique (user_id, ticker)
);

create index if not exists graficos_usuario_user_idx on graficos_usuario (user_id);

alter table graficos_usuario enable row level security;

-- Cada um enxerga e mexe só nas próprias linhas. `with check` no insert e
-- no update impede gravar com o user_id de outra pessoa.
drop policy if exists "graficos proprios: ler"     on graficos_usuario;
drop policy if exists "graficos proprios: inserir" on graficos_usuario;
drop policy if exists "graficos proprios: mudar"   on graficos_usuario;
drop policy if exists "graficos proprios: apagar"  on graficos_usuario;

create policy "graficos proprios: ler"     on graficos_usuario
  for select using (auth.uid() = user_id);
create policy "graficos proprios: inserir" on graficos_usuario
  for insert with check (auth.uid() = user_id);
create policy "graficos proprios: mudar"   on graficos_usuario
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "graficos proprios: apagar"  on graficos_usuario
  for delete using (auth.uid() = user_id);

-- `atualizado_em` é do banco, não do cliente: relógio de navegador erra,
-- e esta coluna é quem decide o que é mais novo numa sincronização.
create or replace function tocar_grafico_usuario() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists graficos_usuario_tocar on graficos_usuario;
create trigger graficos_usuario_tocar before update on graficos_usuario
  for each row execute function tocar_grafico_usuario();
