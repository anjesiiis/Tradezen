-- TRADEZEN — 013: preenche data_p1 dos templates antigos
--
-- POR QUE: o emoji no gráfico e o item do sidebar saem de `data_p1`. As
-- telas de Topo Duplo, OCO e Níveis nunca gravaram essa coluna, então
-- esses templates existiam no banco mas eram INVISÍVEIS em toda tela de
-- marcação (23 topos duplos, 1 OCO e 14 níveis).
--
-- O código já grava data_p1 nos salvos novos; isto aqui é o conserto dos
-- antigos: a data é a do candle do primeiro ponto do padrão.
--
-- Rodar no SQL Editor do Supabase, SOZINHO (um arquivo por Run). Pode
-- rodar mais de uma vez: só mexe em quem está com data_p1 nulo.
--
-- A primeira versão varria o JSON inteiro atrás do menor índice
-- (jsonb_each + subconsulta). Como o primeiro ponto de cada padrão tem
-- nome fixo e é sempre o de menor índice — conferido nas 39 linhas —,
-- aqui vai direto nele: menos SQL, menos chance de erro.

-- Topo Duplo: o primeiro ponto é "topo1"
update templates_topo_duplo
set data_p1 = to_timestamp(
      ((candles -> (pontos -> 'topo1' ->> 'i')::int ->> 'timestamp')::bigint) / 1000)
where data_p1 is null
  and pontos ? 'topo1'
  and candles -> (pontos -> 'topo1' ->> 'i')::int ->> 'timestamp' is not null;

-- OCO: o primeiro ponto é "comeco"
update templates_oco
set data_p1 = to_timestamp(
      ((candles -> (pontos -> 'comeco' ->> 'i')::int ->> 'timestamp')::bigint) / 1000)
where data_p1 is null
  and pontos ? 'comeco'
  and candles -> (pontos -> 'comeco' ->> 'i')::int ->> 'timestamp' is not null;

-- Níveis: os pontos são a lista "toques"; o primeiro toque é o [0]
update templates_niveis
set data_p1 = to_timestamp(
      ((candles -> (pontos -> 'toques' -> 0 ->> 'i')::int ->> 'timestamp')::bigint) / 1000)
where data_p1 is null
  and pontos -> 'toques' -> 0 ->> 'i' is not null
  and candles -> (pontos -> 'toques' -> 0 ->> 'i')::int ->> 'timestamp' is not null;

-- ── conferência (deve voltar 0 em cada tabela) ───────────────────
-- select 'topo_duplo' as tabela, count(*) from templates_topo_duplo where data_p1 is null
-- union all select 'oco', count(*) from templates_oco where data_p1 is null
-- union all select 'niveis', count(*) from templates_niveis where data_p1 is null;
