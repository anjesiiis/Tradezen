-- TRADEZEN — BANDEIRA DE ALTA EM 8 PONTOS (4 PARES)
-- =================================================================
-- A marcação da bandeira de ALTA passou a ter 8 pontos, em 4 pares
-- independentes — cada par são 2 cliques e vira uma linha no gráfico:
--
--   Mastro 1           p1_inicio_mastro1 → p2_topo_mastro1
--   Fundo da Bandeira  p3_inicio_fundo   → p4_fim_fundo
--   Topo da Bandeira   p5_inicio_topo    → p6_fim_topo
--   Mastro 2           p7_inicio_mastro2 → p8_topo_mastro2
--
-- Os pontos continuam no campo `pontos` (jsonb) da tabela que já existe —
-- é ele que a edição, a visualização e o desenho usam, e é junto dele que
-- ficam os candles do trecho marcado. O que entra aqui são as duas MEDIDAS
-- pedidas, como colunas de verdade (calculadas pelo banco, então não há
-- como discordarem dos pontos):
--
--   altura_mastro1 = topo do mastro 1 − início do mastro 1
--   altura_mastro2 = topo do mastro 2 − início do mastro 2
--
-- Templates marcados nos formatos anteriores ficam com NULL nas duas — a
-- medida simplesmente não existe pra eles.
--
-- Rode no SQL Editor do painel do Supabase. Seguro rodar mais de uma vez.
-- (Precisa que sql/006_templates_bandeira.sql já tenha sido aplicado.)

alter table templates_bandeira_alta
  add column if not exists altura_mastro1 numeric
    generated always as (
      (pontos -> 'p2_topo_mastro1' ->> 'preco')::numeric
      - (pontos -> 'p1_inicio_mastro1' ->> 'preco')::numeric
    ) stored;

alter table templates_bandeira_alta
  add column if not exists altura_mastro2 numeric
    generated always as (
      (pontos -> 'p8_topo_mastro2' ->> 'preco')::numeric
      - (pontos -> 'p7_inicio_mastro2' ->> 'preco')::numeric
    ) stored;

-- Conferência:
--   select id, ticker, altura_mastro1, altura_mastro2
--   from templates_bandeira_alta order by criado_em desc limit 10;
