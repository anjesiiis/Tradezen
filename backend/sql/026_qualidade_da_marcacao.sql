-- TRADEZEN — 026: QUALIDADE DA MARCAÇÃO (0 a 4)
-- =============================================
-- Quão bom EXEMPLO DA FORMA é esta marcação. Cinco níveis:
--
--   4 Ótimo  → exemplo de livro, a forma é inequívoca
--   3 Alta   → forma clara, um detalhe fora do ideal
--   2 Média  → dá pra reconhecer, mas tem ressalva
--   1 Baixa  → duvidoso, mais contra do que a favor
--   0 Falha  → não é o padrão
--
-- POR QUE UMA COLUNA NOVA, e não mexer na `resultado`: são eixos
-- diferentes, e confundi-los corrompe dado real.
--   `resultado`  → o DESFECHO (o padrão se formou e aí o quê). É texto
--                  livre, digitado à mão na tela de marcação.
--   `qualidade`  → quão bom exemplo da FORMA é o desenho.
-- Um ombro-cabeça-ombro de livro que não andou é qualidade 4 com
-- resultado ruim. Derivar um do outro apagaria um dos dois.
--
-- NULL de propósito no começo: "ninguém avaliou ainda" não é o mesmo que
-- "avaliei e é média". Preencher tudo com 2 criaria 212 avaliações que
-- nenhum humano deu — e é esse dado que vai pro treino depois.
--
-- Nível 0 e as tabelas _fracasso: marcar 0 é dizer "não é o padrão", que
-- é justo o que as tabelas `*_fracasso` guardam. O certo depois de um 0 é
-- MOVER a marcação pra lá (rota mover-para-fracasso, migration 023). O 0
-- existe pra registrar o julgamento na hora; mover é o passo seguinte, e
-- é manual de propósito — mover sozinho tiraria a marcação da tela sem
-- a pessoa pedir.
--
-- Independente da 025: não precisa dela pra rodar nem ela desta.
--
-- COMO RODAR
--   1. https://supabase.com/dashboard/project/wxkgcpclxgwlxdmeaigp/sql/new
--   2. Cole este arquivo INTEIRO
--   3. Run
--   4. `notify pgrst, 'reload schema';` já vai no fim: sem isso o
--      PostgREST pode responder "coluna não existe" pra coluna que
--      acabou de nascer.
--
-- Seguro rodar mais de uma vez.

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

    -- smallint e não um enum: a escala é ORDINAL, e comparar (">= 3",
    -- "order by qualidade") é o que a tela e o treino fazem o tempo todo.
    -- Enum compara pela ordem de declaração, que é fácil de quebrar numa
    -- migration futura sem ninguém notar.
    execute format($f$
      alter table %I
        add column if not exists qualidade smallint,
        add column if not exists qualidade_em timestamptz,
        add column if not exists qualidade_por text
    $f$, t);

    execute format('alter table %I drop constraint if exists %I', t, t || '_qualidade_ck');
    execute format($f$
      alter table %I add constraint %I
        check (qualidade is null or qualidade between 0 and 4)
    $f$, t, t || '_qualidade_ck');

    -- Parcial: o que se filtra é "já avaliei" e "os ótimos". A maioria
    -- das linhas é NULL no começo, e indexar NULL é indexar a tabela
    -- toda pra nada.
    execute format(
      'create index if not exists %I on %I (qualidade) where qualidade is not null',
      'idx_' || t || '_qualidade', t);

    feitas := feitas + 1;
    raise notice 'ok %', t;
  end loop;

  raise notice '--- % tabelas com qualidade, % puladas ---', feitas, puladas;
end $$;

-- O PostgREST guarda cache do schema: sem isto ele pode responder
-- "coluna qualidade nao existe" pra coluna que acabou de nascer, e o
-- sintoma fica idêntico a migration não rodada.
notify pgrst, 'reload schema';

-- Conferência: uma linha por tabela, com quantas já foram avaliadas.
-- Esperado nesta primeira rodada: 21 linhas em 'ok', avaliadas = 0.
do $$
declare
  t text;
begin
  drop table if exists _conf_qualidade;
  create temp table _conf_qualidade (tabela text, coluna text, avaliadas bigint, total bigint);

  for t in
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name like 'templates\_%'
    order by table_name
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'qualidade')
    then
      execute format(
        'insert into _conf_qualidade select %L, ''ok'', count(qualidade), count(*) from %I', t, t);
    else
      insert into _conf_qualidade values (t, 'FALTANDO', 0, 0);
    end if;
  end loop;
end $$;

select tabela, coluna, avaliadas, total from _conf_qualidade order by tabela;
