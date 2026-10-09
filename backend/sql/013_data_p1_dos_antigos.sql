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
-- Rodar no SQL Editor do Supabase. Pode rodar mais de uma vez: só mexe em
-- quem está com data_p1 nulo.

-- ── pontos nomeados ({ topo1: { i, preco }, ... }) ────────────────
update templates_topo_duplo t
set data_p1 = to_timestamp(((t.candles -> idx.i) ->> 'timestamp')::bigint / 1000)
from (
  select id, (select min((v ->> 'i')::int) from jsonb_each(pontos) as e(k, v)) as i
  from templates_topo_duplo where data_p1 is null and pontos is not null
) idx
where t.id = idx.id and idx.i is not null and (t.candles -> idx.i) ->> 'timestamp' is not null;

update templates_oco t
set data_p1 = to_timestamp(((t.candles -> idx.i) ->> 'timestamp')::bigint / 1000)
from (
  select id, (select min((v ->> 'i')::int) from jsonb_each(pontos) as e(k, v)) as i
  from templates_oco where data_p1 is null and pontos is not null
) idx
where t.id = idx.id and idx.i is not null and (t.candles -> idx.i) ->> 'timestamp' is not null;

-- ── níveis: os pontos são a lista `toques` ────────────────────────
update templates_niveis t
set data_p1 = to_timestamp(((t.candles -> idx.i) ->> 'timestamp')::bigint / 1000)
from (
  select id, (select min((el ->> 'i')::int) from jsonb_array_elements(pontos -> 'toques') as el) as i
  from templates_niveis where data_p1 is null and pontos -> 'toques' is not null
) idx
where t.id = idx.id and idx.i is not null and (t.candles -> idx.i) ->> 'timestamp' is not null;

-- ── conferência (deve voltar 0 em cada tabela) ───────────────────
-- select 'topo_duplo' as tabela, count(*) from templates_topo_duplo where data_p1 is null
-- union all select 'oco', count(*) from templates_oco where data_p1 is null
-- union all select 'niveis', count(*) from templates_niveis where data_p1 is null;
