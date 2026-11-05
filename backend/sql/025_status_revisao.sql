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
-- Rode no SQL Editor do Supabase.

do $$
declare
  t text;
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
      raise notice 'pulando %: tabela nao existe', t;
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
  end loop;
end $$;

-- Conferência: quantas marcações em cada pé, por tabela. Tudo deve sair
-- como 'nao_visto' nesta primeira rodada.
do $$
declare
  t text;
begin
  drop table if exists _conf_status;
  create temp table _conf_status (tabela text, status_revisao text, quantas bigint);
  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'status_revisao'
      and table_name like 'templates_%'
  loop
    execute format(
      'insert into _conf_status select %L, status_revisao, count(*) from %I group by status_revisao',
      t, t);
  end loop;
end $$;

select tabela, status_revisao, quantas from _conf_status order by tabela, status_revisao;
