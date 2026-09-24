-- TRADEZEN — FLÂMULAS + BANDEIRA DE BAIXA EM 8 PONTOS
-- =================================================================
-- Cria as duas tabelas de FLÂMULA (alta e baixa) e acerta as medidas da
-- bandeira de baixa, que passou a usar a mesma marcação da de alta: 8
-- pontos em 4 pares (mastro 1, as duas bordas da consolidação e mastro 2).
--
-- Bandeira e flâmula têm a mesma mecânica de marcação; muda o desenho da
-- consolidação (bandeira = retângulo inclinado, flâmula = triângulo que
-- fecha). Por isso as tabelas são idênticas às da bandeira — cada padrão
-- na sua, pro ML treinar separado.
--
-- RLS ligado desde já, sem nenhuma policy: só a chave secreta do backend
-- (que ignora RLS) lê e escreve. Mesmo cuidado de 004_fechar_tabelas_admin.
--
-- Rode no SQL Editor do painel do Supabase. Seguro rodar mais de uma vez.
-- (Precisa que sql/006_templates_bandeira.sql já tenha sido aplicado.)

create table if not exists templates_flamula_alta (
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
alter table templates_flamula_alta enable row level security;

create table if not exists templates_flamula_baixa (
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
alter table templates_flamula_baixa enable row level security;

-- ── Medidas do padrão (calculadas pelo banco) ─────────────────
-- altura_mastro1 / altura_mastro2: tamanho de cada mastro. Na bandeira e na
-- flâmula de BAIXA saem negativas (o mastro cai), o que é o esperado.
do $medidas$
declare
  t text;
begin
  foreach t in array array[
    'templates_bandeira_alta', 'templates_bandeira_baixa',
    'templates_flamula_alta', 'templates_flamula_baixa'
  ] loop
    execute format($f$
      alter table %I add column if not exists altura_mastro1 numeric
        generated always as (
          (pontos -> 'p2_topo_mastro1' ->> 'preco')::numeric
          - (pontos -> 'p1_inicio_mastro1' ->> 'preco')::numeric
        ) stored
    $f$, t);
    execute format($f$
      alter table %I add column if not exists altura_mastro2 numeric
        generated always as (
          (pontos -> 'p8_topo_mastro2' ->> 'preco')::numeric
          - (pontos -> 'p7_inicio_mastro2' ->> 'preco')::numeric
        ) stored
    $f$, t);
  end loop;
end
$medidas$;

-- ── Alertas ───────────────────────────────────────────────────
-- Mesmo gatilho das outras tabelas de template: quem tiver alerta pro
-- ticker e pro padrão recebe notificação quando um template é marcado.
-- Só roda se as tabelas de alertas existirem (sql/005_alertas.sql) — sem
-- isso, o gatilho faria qualquer marcação falhar ao salvar.
do $alertas$
begin
  if to_regclass('public.notificacoes_alerta') is null or to_regclass('public.alertas') is null then
    raise notice 'Tabelas de alertas ausentes (sql/005_alertas.sql) — gatilho não criado.';
    return;
  end if;

  create or replace function public.notificar_alertas_padrao()
  returns trigger
  language plpgsql
  security definer set search_path = public
  as $fn$
  declare
    v_tipo text;
  begin
    v_tipo := case
      when TG_TABLE_NAME = 'templates_oco'            then 'oco'
      when TG_TABLE_NAME = 'templates_topo_duplo'     then 'topo_duplo'
      when TG_TABLE_NAME = 'templates_niveis'         then NEW.tipo
      when TG_TABLE_NAME = 'templates_bandeira_alta'  then 'bandeira_alta'
      when TG_TABLE_NAME = 'templates_bandeira_baixa' then 'bandeira_baixa'
      when TG_TABLE_NAME = 'templates_flamula_alta'   then 'flamula_alta'
      when TG_TABLE_NAME = 'templates_flamula_baixa'  then 'flamula_baixa'
    end;

    insert into notificacoes_alerta (usuario_id, alerta_id, ticker, padrao, template_id, template_tabela)
    select a.usuario_id, a.id, NEW.ticker, v_tipo, NEW.id, TG_TABLE_NAME
    from alertas a
    where a.ticker = NEW.ticker
      and v_tipo = any(a.padroes);

    return NEW;
  end;
  $fn$;

  drop trigger if exists ao_marcar_flamula_alta_notificar on templates_flamula_alta;
  create trigger ao_marcar_flamula_alta_notificar
    after insert on templates_flamula_alta
    for each row execute function public.notificar_alertas_padrao();

  drop trigger if exists ao_marcar_flamula_baixa_notificar on templates_flamula_baixa;
  create trigger ao_marcar_flamula_baixa_notificar
    after insert on templates_flamula_baixa
    for each row execute function public.notificar_alertas_padrao();
end
$alertas$;

-- Conferência:
--   select table_name, column_name from information_schema.columns
--   where table_name like 'templates_%' and column_name like 'altura_mastro%'
--   order by table_name, column_name;
