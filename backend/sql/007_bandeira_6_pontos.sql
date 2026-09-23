-- TRADEZEN — BANDEIRA EM 6 PONTOS CRONOLÓGICOS
-- =================================================================
-- A marcação da bandeira passou de 6 pontos "por função" (mastro + 2 toques
-- no topo e 2 no fundo do canal) para 6 pontos na ORDEM em que o padrão
-- acontece no tempo:
--
--   p1_inicio_mastro → p2_topo_mastro → p3_fundo1 → p4_topo1
--   → p5_fundo2 → p6_rompimento
--
-- Os pontos continuam no mesmo campo `pontos` (jsonb) das tabelas que já
-- existem — é ele que a edição, a visualização e o desenho no gráfico usam,
-- e é junto dele que ficam os candles do trecho marcado. O que este arquivo
-- acrescenta são as duas MEDIDAS do padrão como colunas de verdade, pra o
-- pipeline de ML filtrar e ordenar em SQL sem abrir o jsonb na mão:
--
--   altura_mastro     = preço do topo do mastro − preço do início
--   retracao_bandeira = quanto do mastro a consolidação devolveu (0 a 1)
--
-- Colunas GERADAS (calculadas pelo banco a cada gravação): não há como elas
-- discordarem dos pontos, nem risco de alguém gravar um valor errado à mão.
-- Templates no formato antigo ficam com NULL nas duas — o jsonb deles não
-- tem essas chaves —, o que é o correto: a medida não existe pra eles.
--
-- Rode no SQL Editor do painel do Supabase (Project → SQL Editor).
-- Seguro rodar mais de uma vez.

-- ── BANDEIRA DE ALTA ──────────────────────────────────────────
alter table templates_bandeira_alta
  add column if not exists altura_mastro numeric
    generated always as (
      (pontos -> 'p2_topo_mastro' ->> 'preco')::numeric
      - (pontos -> 'p1_inicio_mastro' ->> 'preco')::numeric
    ) stored;

alter table templates_bandeira_alta
  add column if not exists retracao_bandeira numeric
    generated always as (
      (
        (pontos -> 'p2_topo_mastro' ->> 'preco')::numeric
        - (pontos -> 'p3_fundo1' ->> 'preco')::numeric
      ) / nullif(
        (pontos -> 'p2_topo_mastro' ->> 'preco')::numeric
        - (pontos -> 'p1_inicio_mastro' ->> 'preco')::numeric,
        0
      )
    ) stored;

-- ── BANDEIRA DE BAIXA ─────────────────────────────────────────
-- Mesma conta, espelhada pelo próprio dado: na bandeira de baixa o mastro
-- cai, então `altura_mastro` sai negativa e a retração continua positiva
-- (numerador e denominador trocam de sinal juntos).
alter table templates_bandeira_baixa
  add column if not exists altura_mastro numeric
    generated always as (
      (pontos -> 'p2_topo_mastro' ->> 'preco')::numeric
      - (pontos -> 'p1_inicio_mastro' ->> 'preco')::numeric
    ) stored;

alter table templates_bandeira_baixa
  add column if not exists retracao_bandeira numeric
    generated always as (
      (
        (pontos -> 'p2_topo_mastro' ->> 'preco')::numeric
        - (pontos -> 'p3_fundo1' ->> 'preco')::numeric
      ) / nullif(
        (pontos -> 'p2_topo_mastro' ->> 'preco')::numeric
        - (pontos -> 'p1_inicio_mastro' ->> 'preco')::numeric,
        0
      )
    ) stored;

-- Conferência rápida depois de rodar:
--   select id, ticker, altura_mastro, retracao_bandeira
--   from templates_bandeira_alta order by criado_em desc limit 10;
