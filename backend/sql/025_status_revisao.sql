-- TRADEZEN — 025: STATUS DE REVISÃO DAS MARCAÇÕES
-- ===============================================
-- Revisar 212 marcações não se faz numa sentada. Isto guarda em que pé
-- está cada uma, pra dar pra parar e voltar sabendo o que falta.
--
-- Os cinco valores, e a diferença entre eles importa:
--
--   nao_visto     → ninguém abriu ainda
--   aberto        → ABRIU. Só isso. É posto automaticamente, e de
--                   propósito NÃO quer dizer "está certa": três segundos
--                   de tela aberta não são um julgamento, e usar isso
--                   como "aprovada" encheria o treino de aprovação que
--                   ninguém deu.
--   visto         → olhou e está OK, não precisa mexer. Clique seu.
--   em_andamento  → ainda analisando, quer voltar. Clique seu.
--   revisto       → reclassificou, ou confirmou com certeza. Clique seu,
--                   ou automático quando a marcação troca de lado
--                   (ver admin_templates_mover).
--
-- `revisto_em` e `revisto_por` são separados do `status_em` de propósito:
-- "esta marcação já passou por olho humano" é um fato durável e serve pro
-- ML depois. Se o status mudar de 'revisto' pra outra coisa, o `status_em`
-- muda, mas o registro de que foi revisada uma vez fica.
--
-- Roda nas 21 tabelas de marcação que existirem. Tabela cuja migration
-- ainda não rodou é pulada em silêncio. Seguro rodar mais de uma vez.
--
-- COMO RODAR
--   1. https://supabase.com/dashboard/project/wxkgcpclxgwlxdmeaigp/sql/new
--   2. Cole este arquivo INTEIRO
--   3. Run
--   4. F5 na página de templates. O backend não precisa reiniciar: ele
--      descobre a coluna na primeira consulta.
--
--   `npx supabase db push` NÃO funciona neste projeto: não existe pasta
--   `supabase/` nem migrations linkadas ao CLI. As migrations daqui são
--   rodadas à mão no SQL Editor, em ordem. Ver sql/MIGRATIONS.md.
--
-- As mensagens de progresso saem na aba de mensagens do SQL Editor, não
-- na grade de resultados — a grade mostra só a conferência do fim.

do $$
declare
  t text;
  feitas int := 0;
  puladas int := 0;
  tabelas text[] := array[
    'templates_oco', 'templates_topo_duplo', 'templates_niveis',
    'templates_bandeira_alta', 'templates_bandeira_baixa',
    'templates_bandeira_alta_fracasso', 'templates_bandeira_baixa_fracasso',
    'templates_flamula_alta', 'templates_flamula_baixa',
    'templates_cunha_alta', 'templates_cunha_baixa',
    'templates_canal_alta', 'templates_canal_baixa',
    'templates_fundo_duplo', 'templates_oco_invertido',
    'templates_topo_triplo', 'templates_fundo_triplo',
    'templates_triangulo_ascendente', 'templates_triangulo_descendente',
    'templates_triangulo_simetrico', 'templates_retangulo'
  ];
begin
  foreach t in array tabelas loop
    if to_regclass('public.' || t) is null then
      puladas := puladas + 1;
      raise notice 'pulada %: tabela nao existe (a migration dela ainda nao rodou)', t;
      continue;
    end if;

    execute format($f$
      alter table %I
        add column if not exists status_revisao text not null default 'nao_visto',
        add column if not exists status_em timestamptz,
        add column if not exists revisto_em timestamptz,
        add column if not exists revisto_por text
    $f$, t);

    -- A trava é o que impede um status inventado entrar por um PATCH
    -- torto e sumir da contagem dos filtros sem ninguém ver.
    execute format('alter table %I drop constraint if exists %I', t, t || '_status_revisao_ck');
    execute format($f$
      alter table %I add constraint %I
        check (status_revisao in ('nao_visto','aberto','visto','em_andamento','revisto'))
    $f$, t, t || '_status_revisao_ck');

    -- Índice parcial: o filtro que interessa é "o que FALTA revisar", e
    -- 'nao_visto' é o valor da maioria das linhas — indexar ele inteiro
    -- seria indexar a tabela toda pra nada.
    execute format(
      'create index if not exists %I on %I (status_revisao) where status_revisao <> ''nao_visto''',
      'idx_' || t || '_status_revisao', t);

    feitas := feitas + 1;
    raise notice 'ok %', t;
  end loop;

  raise notice '--- % tabelas com status de revisao, % puladas ---', feitas, puladas;
end $$;

-- Rede de segurança: se um dia nascer uma tabela templates_% que não
-- esteja no array acima, ela fica SEM as colunas e a tela dela mostra o
-- aviso de "status indisponível" — sem ninguém saber por quê. Isto não
-- altera tabela desconhecida (alterar às cegas o que ninguém revisou é
-- pior), só grita o nome dela nas mensagens.
do $$
declare
  t text;
  achou boolean := false;
begin
  for t in
    select c.table_name
    from information_schema.tables c
    where c.table_schema = 'public'
      and c.table_name like 'templates\_%'
      and not exists (
        select 1 from information_schema.columns k
        where k.table_schema = 'public' and k.table_name = c.table_name
          and k.column_name = 'status_revisao')
  loop
    achou := true;
    raise warning 'tabela % ficou SEM status_revisao: acrescente no array desta migration e em TABELAS de backend/admin_status_revisao.py', t;
  end loop;
  if not achou then
    raise notice 'nenhuma tabela de marcacao ficou de fora';
  end if;
end $$;

-- Conferência. O SQL Editor do Supabase mostra só o resultado da ÚLTIMA
-- instrução, então as duas perguntas saem num SELECT só:
--   secao 'colunas' → cada tabela de marcação tem a coluna? (o que
--                     responde se a migration pegou: esperado 21 linhas,
--                     todas em 'ok')
--   secao 'status'  → em que pé está cada marcação. Nesta primeira
--                     rodada tudo sai como 'nao_visto'.
do $$
declare
  t text;
begin
  drop table if exists _conf_status;
  create temp table _conf_status (secao text, tabela text, detalhe text, quantas bigint);

  for t in
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name like 'templates\_%'
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t
        and column_name = 'status_revisao')
    then
      insert into _conf_status values ('colunas', t, 'ok', 1);
      execute format(
        'insert into _conf_status select ''status'', %L, status_revisao, count(*) from %I group by status_revisao',
        t, t);
    else
      insert into _conf_status values ('colunas', t, 'FALTANDO', 0);
    end if;
  end loop;
end $$;

select secao, tabela, detalhe, quantas from _conf_status
order by secao, tabela, detalhe;
