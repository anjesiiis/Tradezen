-- TradeZen — as mesas que a pessoa deixou abertas
--
-- Quem abre PETR4 no diário e VALE3 no semanal lado a lado está montando
-- uma bancada, não navegando. Dar F5 e perder a bancada é perder trabalho,
-- mesmo que nenhum desenho tenha sido feito.
--
-- Uma linha por usuário: é o estado de UMA bancada, não um histórico.
-- O conteúdo é JSON porque o que define uma mesa muda com as features
-- (hoje é ticker e timeframe; amanhã pode ser o tipo de gráfico), e
-- versionar coluna a coluna obrigaria uma migration por mudança.
--
-- Guarda o que a pessoa MONTOU, e mais nada: não há registro de quando
-- ela olhou, por quanto tempo, nem em que ordem clicou.
--
-- Rodar no SQL Editor do Supabase. É seguro rodar duas vezes.

create table if not exists sessao_telas (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  telas         jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

alter table sessao_telas enable row level security;

-- Cada um enxerga e mexe só na própria linha. `with check` no insert e no
-- update impede gravar com o user_id de outra pessoa.
drop policy if exists "sessao propria: ler"     on sessao_telas;
drop policy if exists "sessao propria: inserir" on sessao_telas;
drop policy if exists "sessao propria: mudar"   on sessao_telas;
drop policy if exists "sessao propria: apagar"  on sessao_telas;

create policy "sessao propria: ler"     on sessao_telas
  for select using (auth.uid() = user_id);
create policy "sessao propria: inserir" on sessao_telas
  for insert with check (auth.uid() = user_id);
create policy "sessao propria: mudar"   on sessao_telas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessao propria: apagar"  on sessao_telas
  for delete using (auth.uid() = user_id);

-- `atualizado_em` é do banco, não do cliente: relógio de navegador erra,
-- e é esta coluna que decide o que é mais novo entre dois aparelhos.
create or replace function tocar_sessao_telas() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists sessao_telas_tocar on sessao_telas;
create trigger sessao_telas_tocar before update on sessao_telas
  for each row execute function tocar_sessao_telas();
