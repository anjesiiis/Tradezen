-- TRADEZEN — 015: canal passa a ter 4 pontos
-- =================================================================
-- O canal era marcado por 6 toques (p1_fundo1, p2_topo1, p3_fundo2...).
-- Agora são 4 pontos, duas retas:
--
--   Canal de ALTA    p1 Fundo Esq. → p2 Fundo Dir. → p3 Topo Esq. → p4 Topo Dir.
--   Canal de BAIXA   p1 Topo Esq.  → p2 Topo Dir.  → p3 Fundo Esq. → p4 Fundo Dir.
--
-- As colunas geradas do sql/012 liam as chaves antigas e ficariam nulas
-- pra sempre: aqui elas são refeitas em cima das chaves novas. Coluna
-- gerada não dá pra alterar, só recriar.
--
-- As duas tabelas estavam VAZIAS quando isto foi escrito (nenhum canal
-- marcado ainda). Se houver canal salvo no formato antigo, ele perde as
-- medidas — o desenho dele não volta, remarque.
--
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.

alter table templates_canal_alta  drop column if exists abertura_inicio;
alter table templates_canal_alta  drop column if exists abertura_fim;
alter table templates_canal_alta  drop column if exists inclinacao_suporte;
alter table templates_canal_alta  drop column if exists inclinacao_resistencia;

alter table templates_canal_baixa drop column if exists abertura_inicio;
alter table templates_canal_baixa drop column if exists abertura_fim;
alter table templates_canal_baixa drop column if exists inclinacao_suporte;
alter table templates_canal_baixa drop column if exists inclinacao_resistencia;

-- abertura = distância entre as duas linhas; inclinação = preço por candle.
-- nullif(..., 0): se as duas pontas caíssem no mesmo candle a conta
-- estouraria. A validação já impede, isto é o cinto de segurança.

alter table templates_canal_alta add column abertura_inicio numeric
  generated always as (
    (pontos -> 'p3' ->> 'preco')::numeric - (pontos -> 'p1' ->> 'preco')::numeric
  ) stored;

alter table templates_canal_alta add column abertura_fim numeric
  generated always as (
    (pontos -> 'p4' ->> 'preco')::numeric - (pontos -> 'p2' ->> 'preco')::numeric
  ) stored;

alter table templates_canal_alta add column inclinacao_suporte numeric
  generated always as (
    ((pontos -> 'p2' ->> 'preco')::numeric - (pontos -> 'p1' ->> 'preco')::numeric)
    / nullif((pontos -> 'p2' ->> 'i')::numeric - (pontos -> 'p1' ->> 'i')::numeric, 0)
  ) stored;

alter table templates_canal_alta add column inclinacao_resistencia numeric
  generated always as (
    ((pontos -> 'p4' ->> 'preco')::numeric - (pontos -> 'p3' ->> 'preco')::numeric)
    / nullif((pontos -> 'p4' ->> 'i')::numeric - (pontos -> 'p3' ->> 'i')::numeric, 0)
  ) stored;

alter table templates_canal_baixa add column abertura_inicio numeric
  generated always as (
    (pontos -> 'p3' ->> 'preco')::numeric - (pontos -> 'p1' ->> 'preco')::numeric
  ) stored;

alter table templates_canal_baixa add column abertura_fim numeric
  generated always as (
    (pontos -> 'p4' ->> 'preco')::numeric - (pontos -> 'p2' ->> 'preco')::numeric
  ) stored;

alter table templates_canal_baixa add column inclinacao_suporte numeric
  generated always as (
    ((pontos -> 'p2' ->> 'preco')::numeric - (pontos -> 'p1' ->> 'preco')::numeric)
    / nullif((pontos -> 'p2' ->> 'i')::numeric - (pontos -> 'p1' ->> 'i')::numeric, 0)
  ) stored;

alter table templates_canal_baixa add column inclinacao_resistencia numeric
  generated always as (
    ((pontos -> 'p4' ->> 'preco')::numeric - (pontos -> 'p3' ->> 'preco')::numeric)
    / nullif((pontos -> 'p4' ->> 'i')::numeric - (pontos -> 'p3' ->> 'i')::numeric, 0)
  ) stored;
