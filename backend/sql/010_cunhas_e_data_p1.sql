-- TRADEZEN — CUNHAS + DATA DO PRIMEIRO PONTO
-- =================================================================
-- 1) Cria as tabelas de CUNHA (alta e baixa). Mesma marcação de bandeira e
--    flâmula — 8 pontos em 4 pares —, muda só o desenho da consolidação
--    (na cunha as duas bordas convergem inclinando pro mesmo lado).
-- 2) Cria as tabelas de FLÂMULA, caso o sql/009 ainda não tenha rodado.
-- 3) Adiciona `data_p1` em TODAS as tabelas de template: a data do primeiro
--    ponto do padrão. É o que permite a listagem em cards e os marcadores
--    cinzas no gráfico sem precisar abrir os candles de cada template.
-- 4) Repõe as medidas (altura dos mastros) nas tabelas novas.
--
-- RLS ligado e sem policy: só a chave secreta do backend lê e escreve.
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.

-- ── TABELAS NOVAS ─────────────────────────────────────────────
do $tabelas$
declare
  t text;
begin
  foreach t in array array[
    'templates_flamula_alta', 'templates_flamula_baixa',
    'templates_cunha_alta', 'templates_cunha_baixa'
  ] loop
    execute format($f$
      create table if not exists %I (
        id                bigint generated always as identity primary key,
        ticker            text not null,
        timeframe         text not null,
        candles           jsonb not null,
        candles_contexto  jsonb not null,
        pontos            jsonb not null,
        resultado         text,
        observacao        text,
        criado_em         timestamptz not null default now()
      )
    $f$, t);
    execute format('alter table %I enable row level security', t);
  end loop;
end
$tabelas$;

-- ── data_p1 + medidas ─────────────────────────────────────────
do $colunas$
declare
  t text;
begin
  -- a data do primeiro ponto vale pra qualquer padrão marcado
  foreach t in array array[
    'templates_oco', 'templates_topo_duplo', 'templates_niveis',
    'templates_bandeira_alta', 'templates_bandeira_baixa',
    'templates_flamula_alta', 'templates_flamula_baixa',
    'templates_cunha_alta', 'templates_cunha_baixa'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table %I add column if not exists data_p1 timestamptz', t);
    end if;
  end loop;

  -- altura dos dois mastros: só os padrões de continuação têm
  foreach t in array array[
    'templates_bandeira_alta', 'templates_bandeira_baixa',
    'templates_flamula_alta', 'templates_flamula_baixa',
    'templates_cunha_alta', 'templates_cunha_baixa'
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
$colunas$;

-- ── Alertas ───────────────────────────────────────────────────
-- Mesmo gatilho das outras tabelas: quem tiver alerta pro ticker e pro
-- padrão recebe notificação quando um template é marcado. Só roda se as
-- tabelas de alerta existirem (sql/005) — sem isso o gatilho faria
-- qualquer marcação falhar ao salvar.
do $alertas$
declare
  t text;
  tipo text;
begin
  if to_regclass('public.notificacoes_alerta') is null or to_regclass('public.alertas') is null then
    raise notice 'Tabelas de alertas ausentes (sql/005_alertas.sql) — gatilhos não criados.';
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
      when TG_TABLE_NAME = 'templates_cunha_alta'     then 'cunha_alta'
      when TG_TABLE_NAME = 'templates_cunha_baixa'    then 'cunha_baixa'
    end;

    insert into notificacoes_alerta (usuario_id, alerta_id, ticker, padrao, template_id, template_tabela)
    select a.usuario_id, a.id, NEW.ticker, v_tipo, NEW.id, TG_TABLE_NAME
    from alertas a
    where a.ticker = NEW.ticker
      and v_tipo = any(a.padroes);

    return NEW;
  end;
  $fn$;

  foreach t in array array[
    'templates_flamula_alta', 'templates_flamula_baixa',
    'templates_cunha_alta', 'templates_cunha_baixa'
  ] loop
    execute format('drop trigger if exists ao_marcar_notificar on %I', t);
    execute format(
      'create trigger ao_marcar_notificar after insert on %I for each row execute function public.notificar_alertas_padrao()',
      t
    );
  end loop;
end
$alertas$;

-- Conferência:
--   select table_name, column_name from information_schema.columns
--   where table_name like 'templates_%' and column_name in ('data_p1','altura_mastro1')
--   order by table_name, column_name;
