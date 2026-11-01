-- TRADEZEN — 024: DIAGNÓSTICO DOS TEMPLATES (SÓ LEITURA)
-- ======================================================
-- Responde "quantos templates estão quebrados, quais, e quantos sobram
-- pra revisar".
--
-- NÃO ALTERA NADA: nenhum UPDATE, ALTER ou DELETE. Rodar duas vezes por
-- engano não faz diferença. Se aparecer linha quebrada, o conserto é
-- decisão de quem marcou, e vem depois, num arquivo próprio.
--
-- Rode no SQL Editor do Supabase. Vem UM resultado só, de propósito: o
-- editor mostra o resultado do último comando, e três SELECTs separados
-- fariam os dois primeiros desaparecerem. A coluna `secao` separa:
--   1-placar     → quantos, por tabela e por motivo
--   2-quebrado   → um por linha, com o id que a tela agora mostra no erro
--   3-disponivel → quantos estão sadios e prontos pra revisar
--
-- O que conta como quebrado, e por quê:
--   candles vazio  → não há o que desenhar; o gráfico abriria em branco
--   pontos vazio   → não há marcação; apareceriam candles sem padrão
--   ticker vazio   → não se sabe de que ativo é
--   data_p1 nula   → vira AVISO, não defeito: a listagem mostra "—" na
--                    data, mas o template abre normal
--
-- `candles_contexto` fica de fora de propósito: quando falta, o template
-- abre pelo recorte estreito (ver comContextoLargo no frontend). É pior
-- de ler, não é quebrado.

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
  drop table if exists _diag_templates;
  create temp table _diag_templates (
    tabela text, id bigint, ticker text, criado_em timestamptz, problema text
  );
  drop table if exists _diag_totais;
  create temp table _diag_totais (tabela text, total bigint);

  foreach t in array tabelas loop
    -- Tabela de padrão que ainda não foi criada é pulada em silêncio: a
    -- migration dela pode simplesmente não ter rodado, e isso não é
    -- template quebrado.
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    execute format('insert into _diag_totais select %L, count(*) from %I', t, t);

    -- jsonb_array_length estoura se o valor não for array (template
    -- gravado torto, objeto onde devia haver lista). O jsonb_typeof na
    -- frente é o que faz o diagnóstico sobreviver ao dado que ele veio
    -- diagnosticar.
    execute format($f$
      with lido as (
        select id, ticker, criado_em, data_p1,
          case when jsonb_typeof(to_jsonb(candles)) = 'array'
               then jsonb_array_length(to_jsonb(candles)) else 0 end as n_candles,
          coalesce(to_jsonb(pontos)::text, 'null') as pontos_txt
        from %I
      )
      insert into _diag_templates (tabela, id, ticker, criado_em, problema)
      select %L, id, ticker, criado_em,
        case
          when ticker is null or btrim(ticker) = '' then 'SEM TICKER'
          when n_candles = 0                        then 'SEM CANDLES'
          when pontos_txt in ('{}', '[]', 'null')   then 'SEM PONTOS'
          else 'aviso: sem data_p1 (abre normal)'
        end
      from lido
      where ticker is null or btrim(ticker) = ''
         or n_candles = 0
         or pontos_txt in ('{}', '[]', 'null')
         or data_p1 is null
    $f$, t, t);
  end loop;
end $$;

-- Um resultado só, em três seções (ver o cabeçalho).
with quebrados as (
  select tabela, count(*) as quantos
  from _diag_templates
  where problema not like 'aviso%'
  group by tabela
)
select '1-placar' as secao, d.tabela, null::bigint as id, null as ticker,
       d.problema as detalhe, count(*) as quantos
  from _diag_templates d
  group by d.tabela, d.problema
union all
select '2-quebrado', d.tabela, d.id, d.ticker,
       d.problema || ' · ' || coalesce(to_char(d.criado_em, 'DD/MM/YYYY'), 'sem data'), null
  from _diag_templates d
  where d.problema not like 'aviso%'
union all
select '3-disponivel', t.tabela, null, null,
       'prontos pra revisar, de ' || t.total || ' no total',
       t.total - coalesce(q.quantos, 0)
  from _diag_totais t
  left join quebrados q on q.tabela = t.tabela
  where t.total > 0
order by secao, tabela, id nulls first;
