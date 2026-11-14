-- ============================================================
-- TRADEZEN — 029: MEIA ESTRELA NA QUALIDADE DA MARCAÇÃO
-- ============================================================
--
-- A escala de qualidade era de 5 níveis (0..4). Agora são NOVE passos,
-- de 1 a 5 estrelas de meia em meia, guardados como smallint 0..8:
--
--     valor     0    1    2    3    4    5    6    7    8
--     estrelas  1   1,5   2   2,5   3   3,5   4   4,5   5
--     nome    Falha  —  Baixa  —  Média  —  Alta  —  Ótimo
--
-- Valor PAR é nível com nome; ímpar é o meio-passo entre dois nomes.
--
-- POR QUE DOBRAR EM VEZ DE VIRAR DECIMAL
-- A coluna já é smallint, e `order by qualidade` e `qualidade >= 6` são o
-- que a tela e o treino fazem o tempo todo. Decimal traria comparação por
-- igualdade em ponto flutuante (`= 3.5`), que um dia erra. Dobrar mantém
-- inteiro e mantém a ordem.
--
-- O QUE ACONTECE COM AS AVALIAÇÕES QUE JÁ EXISTEM
-- São convertidas: `qualidade * 2`. Quem tinha 3 estrelas continua com 3
-- estrelas, mesmo nome, mesma cor, mesma posição nos filtros. Nenhuma
-- avaliação é criada, apagada ou reinterpretada — só reescrita na escala
-- nova. NULL continua NULL: "ninguém avaliou" não é nota.
--
-- IDEMPOTENTE, e isso aqui é o ponto delicado desta migration: rodar duas
-- vezes NÃO pode dobrar de novo (4 viraria 8 e depois 16). O marcador é o
-- COMENTÁRIO da coluna. Enquanto ele não disser "escala 0-8", a tabela
-- ainda está na escala antiga e é convertida; depois de convertida, ela é
-- pulada. Dá pra rodar à vontade.
--
-- A ORDEM importa: a trava vai de 0..4 pra 0..8 ANTES do update, senão o
-- próprio update (4*2=8) seria recusado pela constraint velha.
--
-- Só leitura de confirmação no fim. Rodar no SQL Editor do Supabase.
--
-- TUDO OU NADA: begin/commit em volta das 21 tabelas. Sem isso, um erro
-- na décima tabela deixaria nove convertidas e doze na escala velha — e o
-- marcador de idempotência faria a segunda tentativa pular justamente as
-- nove que deram certo. Com a transação, ou o banco inteiro muda, ou nada
-- muda. O `notify` fica DENTRO: o Postgres só entrega a notificação no
-- commit, então ela nunca avisa de uma conversão que foi desfeita.

begin;

do $$
declare
  t text;
  tabelas text[] := array[
    'templates_oco', 'templates_topo_duplo', 'templates_niveis',
    'templates_bandeira_alta', 'templates_bandeira_baixa',
    'templates_bandeira_alta_fracasso', 'templates_bandeira_baixa_fracasso',
    'templates_flamula_alta', 'templates_flamula_baixa',
    'templates_canal_alta', 'templates_canal_baixa',
    'templates_cunha_alta', 'templates_cunha_baixa',
    'templates_fundo_duplo', 'templates_oco_invertido',
    'templates_topo_triplo', 'templates_fundo_triplo',
    'templates_triangulo_ascendente', 'templates_triangulo_descendente',
    'templates_triangulo_simetrico', 'templates_retangulo'
  ];
  marca text := 'escala 0-8';
  comentario_atual text;
  convertidas int := 0;
  ja_estavam int := 0;
  puladas int := 0;
  quantas bigint;
begin
  foreach t in array tabelas loop
    if to_regclass('public.' || t) is null then
      puladas := puladas + 1;
      raise notice 'pulada %: tabela nao existe (a migration dela ainda nao rodou)', t;
      continue;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'qualidade'
    ) then
      puladas := puladas + 1;
      raise notice 'pulada %: sem coluna qualidade (rode a 026 primeiro)', t;
      continue;
    end if;

    select col_description(c.oid, a.attnum) into comentario_atual
      from pg_class c
      join pg_attribute a on a.attrelid = c.oid
     where c.relname = t
       and c.relnamespace = 'public'::regnamespace
       and a.attname = 'qualidade';

    if comentario_atual is not null and comentario_atual like '%' || marca || '%' then
      ja_estavam := ja_estavam + 1;
      raise notice 'ja convertida %', t;
      continue;
    end if;

    -- 1) abre a trava ANTES de dobrar, senão 4*2 bate na constraint velha
    execute format('alter table %I drop constraint if exists %I', t, t || '_qualidade_ck');
    execute format($f$
      alter table %I add constraint %I
        check (qualidade is null or qualidade between 0 and 8)
    $f$, t, t || '_qualidade_ck');

    -- 2) converte o que já foi avaliado. NULL fica NULL de propósito.
    execute format('update %I set qualidade = qualidade * 2 where qualidade is not null', t);
    get diagnostics quantas = row_count;

    -- 3) marca a coluna como convertida — é este comentário que torna a
    --    migration idempotente, e também documenta a escala pra quem
    --    abrir a tabela no painel do Supabase.
    execute format($f$
      comment on column %I.qualidade is
        'Qualidade da FORMA, %s: 0=Falha(1 estrela) .. 8=Otimo(5 estrelas), de meia em meia. Par = nivel com nome, impar = meio-passo. NULL = ninguem avaliou.'
    $f$, t, marca);

    convertidas := convertidas + 1;
    raise notice 'ok % (% avaliacoes convertidas)', t, quantas;
  end loop;

  raise notice '--- % convertidas, % ja estavam, % puladas ---',
    convertidas, ja_estavam, puladas;
end $$;

-- O PostgREST guarda cache do schema: sem isto ele pode responder com a
-- definição antiga da coluna, e o sintoma fica idêntico a migration não
-- rodada.
notify pgrst, 'reload schema';

commit;

-- ── Confirmação (só leitura) ────────────────────────────────
-- Esperado: toda nota entre 0 e 8, e `impares` > 0 só depois de alguém
-- usar meia estrela na tela. Se aparecer alguma nota ímpar ANTES disso,
-- algo converteu errado.
do $$
declare
  t text;
  tabelas text[] := array[
    'templates_oco', 'templates_topo_duplo', 'templates_niveis',
    'templates_bandeira_alta', 'templates_bandeira_baixa',
    'templates_bandeira_alta_fracasso', 'templates_bandeira_baixa_fracasso',
    'templates_flamula_alta', 'templates_flamula_baixa',
    'templates_canal_alta', 'templates_canal_baixa',
    'templates_cunha_alta', 'templates_cunha_baixa',
    'templates_fundo_duplo', 'templates_oco_invertido',
    'templates_topo_triplo', 'templates_fundo_triplo',
    'templates_triangulo_ascendente', 'templates_triangulo_descendente',
    'templates_triangulo_simetrico', 'templates_retangulo'
  ];
begin
  drop table if exists _conf_meia_estrela;
  create temp table _conf_meia_estrela (
    tabela text, avaliadas bigint, minimo int, maximo int, impares bigint);

  foreach t in array tabelas loop
    if to_regclass('public.' || t) is null then continue; end if;
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'qualidade'
    ) then continue; end if;

    execute format($f$
      insert into _conf_meia_estrela
      select %L, count(qualidade), min(qualidade), max(qualidade),
             count(*) filter (where qualidade %% 2 = 1)
        from %I
    $f$, t, t);
  end loop;
end $$;

select tabela, avaliadas, minimo, maximo, impares
  from _conf_meia_estrela
 where avaliadas > 0
 order by tabela;
