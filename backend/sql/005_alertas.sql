-- TRADEZEN — ALERTAS DE PADRÃO
-- =================================================================
-- O usuário escolhe um ativo + quais tipos de padrão quer monitorar
-- (oco / topo_duplo / suporte / resistencia). Como a detecção desses
-- padrões ainda é 100% marcação manual no admin (não tem detector
-- automático rodando — ver templates_oco/templates_topo_duplo/
-- templates_niveis), o alerta dispara quando um analista marca um padrão
-- novo que bate com o que o usuário está monitorando. Não é "tempo real
-- de mercado", é "assim que alguém confirma manualmente".
--
-- Rode isso no SQL Editor do painel do Supabase (Project → SQL Editor).

create table if not exists alertas (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  ticker      text not null,
  padroes     text[] not null default '{}',
  criado_em   timestamptz not null default now(),
  unique (usuario_id, ticker)
);

alter table alertas enable row level security;
create policy "usuario ve os proprios alertas"   on alertas for select using (auth.uid() = usuario_id);
create policy "usuario cria os proprios alertas" on alertas for insert with check (auth.uid() = usuario_id);
create policy "usuario edita os proprios alertas" on alertas for update using (auth.uid() = usuario_id);
create policy "usuario apaga os proprios alertas" on alertas for delete using (auth.uid() = usuario_id);
-- Sem policy nenhuma pra outros usuários lerem/escreverem — RLS bloqueia
-- por padrão, igual o resto do projeto (ver 001_enable_rls.sql).

-- Notificações já disparadas — ficam guardadas até o usuário ler. É isso
-- que alimenta o sininho no dashboard.
create table if not exists notificacoes_alerta (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references auth.users(id) on delete cascade,
  alerta_id       uuid references alertas(id) on delete set null,
  ticker          text not null,
  padrao          text not null,
  template_id     integer,
  template_tabela text not null,
  criado_em       timestamptz not null default now(),
  lida            boolean not null default false
);

alter table notificacoes_alerta enable row level security;
create policy "usuario ve as proprias notificacoes" on notificacoes_alerta for select using (auth.uid() = usuario_id);
create policy "usuario marca como lida" on notificacoes_alerta for update using (auth.uid() = usuario_id);
-- Sem policy de insert pra usuário comum — as notificações nascem sozinhas
-- via trigger abaixo (security definer, ignora RLS), nunca por escrita
-- direta do cliente.

-- Sempre que um padrão novo é marcado no admin (insert em templates_oco /
-- templates_topo_duplo / templates_niveis), confere quem tem alerta pra
-- esse ticker+tipo e já cria a notificação — sem precisar de nenhum cron
-- ou worker rodando por fora, o próprio banco resolve na hora do insert.
create or replace function public.notificar_alertas_padrao()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_tipo text;
begin
  v_tipo := case
    when TG_TABLE_NAME = 'templates_oco'        then 'oco'
    when TG_TABLE_NAME = 'templates_topo_duplo' then 'topo_duplo'
    when TG_TABLE_NAME = 'templates_niveis'     then NEW.tipo
  end;

  insert into notificacoes_alerta (usuario_id, alerta_id, ticker, padrao, template_id, template_tabela)
  select a.usuario_id, a.id, NEW.ticker, v_tipo, NEW.id, TG_TABLE_NAME
  from alertas a
  where a.ticker = NEW.ticker
    and v_tipo = any(a.padroes);

  return NEW;
end;
$$;

drop trigger if exists ao_marcar_oco_notificar on templates_oco;
create trigger ao_marcar_oco_notificar
  after insert on templates_oco
  for each row execute function public.notificar_alertas_padrao();

drop trigger if exists ao_marcar_topo_duplo_notificar on templates_topo_duplo;
create trigger ao_marcar_topo_duplo_notificar
  after insert on templates_topo_duplo
  for each row execute function public.notificar_alertas_padrao();

drop trigger if exists ao_marcar_nivel_notificar on templates_niveis;
create trigger ao_marcar_nivel_notificar
  after insert on templates_niveis
  for each row execute function public.notificar_alertas_padrao();
