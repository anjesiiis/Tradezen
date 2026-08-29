-- TRADEZEN — TEMPLATES DE BANDEIRA (padrão de continuação)
-- =================================================================
-- Duas tabelas separadas (bandeira de alta / bandeira de baixa), mesmo
-- espírito de templates_oco/templates_topo_duplo/templates_niveis: marcação
-- manual de um analista, sem detector automático rodando. Cada linha guarda
-- 6 pontos — início/fim do mastro (o movimento forte que antecede a
-- bandeira) + 2 toques no topo e 2 no fundo do canal de consolidação (ver
-- PontosBandeira em admin_templates_bandeira_alta.py/_baixa.py).
--
-- RLS ligado desde já (nunca depois — foi exatamente esquecer isso em
-- templates_oco que abriu a vulnerabilidade corrigida em
-- 004_fechar_tabelas_admin.sql). Sem nenhuma policy: só a chave SECRETA do
-- backend (que ignora RLS) lê/escreve essas tabelas, igual as rotas
-- /admin/templates-bandeira-alta e /admin/templates-bandeira-baixa já fazem.
--
-- Rode isso no SQL Editor do painel do Supabase (Project → SQL Editor).

create table if not exists templates_bandeira_alta (
  id                bigint generated always as identity primary key,
  ticker            text not null,
  timeframe         text not null,
  candles           jsonb not null,
  candles_contexto  jsonb not null,
  pontos            jsonb not null,
  resultado         text,
  observacao        text,
  criado_em         timestamptz not null default now()
);

alter table templates_bandeira_alta enable row level security;

create table if not exists templates_bandeira_baixa (
  id                bigint generated always as identity primary key,
  ticker            text not null,
  timeframe         text not null,
  candles           jsonb not null,
  candles_contexto  jsonb not null,
  pontos            jsonb not null,
  resultado         text,
  observacao        text,
  criado_em         timestamptz not null default now()
);

alter table templates_bandeira_baixa enable row level security;

-- Estende o mesmo trigger de alertas (ver sql/005_alertas.sql) pra também
-- disparar quando uma bandeira é marcada — sem isso, um usuário que criasse
-- um alerta pra "bandeira_alta"/"bandeira_baixa" nunca receberia
-- notificação nenhuma, mesmo com PADROES_VALIDOS já aceitando esses tipos
-- (ver alertas.py). CREATE OR REPLACE em vez de criar uma função nova —
-- é a mesma função, só com mais dois `when` no case.
create or replace function public.notificar_alertas_padrao()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_tipo text;
begin
  v_tipo := case
    when TG_TABLE_NAME = 'templates_oco'            then 'oco'
    when TG_TABLE_NAME = 'templates_topo_duplo'     then 'topo_duplo'
    when TG_TABLE_NAME = 'templates_niveis'         then NEW.tipo
    when TG_TABLE_NAME = 'templates_bandeira_alta'  then 'bandeira_alta'
    when TG_TABLE_NAME = 'templates_bandeira_baixa' then 'bandeira_baixa'
  end;

  insert into notificacoes_alerta (usuario_id, alerta_id, ticker, padrao, template_id, template_tabela)
  select a.usuario_id, a.id, NEW.ticker, v_tipo, NEW.id, TG_TABLE_NAME
  from alertas a
  where a.ticker = NEW.ticker
    and v_tipo = any(a.padroes);

  return NEW;
end;
$$;

drop trigger if exists ao_marcar_bandeira_alta_notificar on templates_bandeira_alta;
create trigger ao_marcar_bandeira_alta_notificar
  after insert on templates_bandeira_alta
  for each row execute function public.notificar_alertas_padrao();

drop trigger if exists ao_marcar_bandeira_baixa_notificar on templates_bandeira_baixa;
create trigger ao_marcar_bandeira_baixa_notificar
  after insert on templates_bandeira_baixa
  for each row execute function public.notificar_alertas_padrao();
