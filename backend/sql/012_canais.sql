-- TRADEZEN — CANAL DE ALTA E CANAL DE BAIXA
-- =================================================================
-- Padrão novo, marcado por TOQUES (não por pares como a bandeira):
--
--   Linha de suporte      p1_fundo1 → p3_fundo2 → p5_fundo3 (opcional)
--   Linha de resistência  p2_topo1  → p4_topo2  → p6_topo3  (opcional)
--
-- A mediana (50%) desenhada no gráfico é calculada, não marcada.
--
-- Colunas geradas: as medidas que o ML vai usar — a abertura do canal no
-- começo e no fim (se as duas forem parecidas, o canal é paralelo) e a
-- inclinação de cada linha.
--
-- RLS ligado e sem policy: só a chave secreta do backend lê e escreve.
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.

create table if not exists templates_canal_alta (
  id                bigint generated always as identity primary key,
  ticker            text not null,
  timeframe         text not null,
  candles           jsonb not null,
  candles_contexto  jsonb not null,
  pontos            jsonb not null,
  anotacoes         jsonb default '[]'::jsonb,
  data_p1           timestamptz,
  resultado         text,
  observacao        text,
  criado_em         timestamptz not null default now()
);

create table if not exists templates_canal_baixa (
  id                bigint generated always as identity primary key,
  ticker            text not null,
  timeframe         text not null,
  candles           jsonb not null,
  candles_contexto  jsonb not null,
  pontos            jsonb not null,
  anotacoes         jsonb default '[]'::jsonb,
  data_p1           timestamptz,
  resultado         text,
  observacao        text,
  criado_em         timestamptz not null default now()
);

alter table templates_canal_alta  enable row level security;
alter table templates_canal_baixa enable row level security;

-- ── Medidas para o ML ─────────────────────────────────────────
-- nullif(..., 0) nas divisões: se dois toques caíssem no mesmo candle a
-- conta estouraria. A validação já impede, isto é só o cinto de segurança.

alter table templates_canal_alta add column if not exists abertura_inicio numeric
  generated always as (
    (pontos -> 'p2_topo1' ->> 'preco')::numeric - (pontos -> 'p1_fundo1' ->> 'preco')::numeric
  ) stored;

alter table templates_canal_alta add column if not exists abertura_fim numeric
  generated always as (
    (pontos -> 'p4_topo2' ->> 'preco')::numeric - (pontos -> 'p3_fundo2' ->> 'preco')::numeric
  ) stored;

alter table templates_canal_alta add column if not exists inclinacao_suporte numeric
  generated always as (
    ((pontos -> 'p3_fundo2' ->> 'preco')::numeric - (pontos -> 'p1_fundo1' ->> 'preco')::numeric)
    / nullif((pontos -> 'p3_fundo2' ->> 'i')::numeric - (pontos -> 'p1_fundo1' ->> 'i')::numeric, 0)
  ) stored;

alter table templates_canal_alta add column if not exists inclinacao_resistencia numeric
  generated always as (
    ((pontos -> 'p4_topo2' ->> 'preco')::numeric - (pontos -> 'p2_topo1' ->> 'preco')::numeric)
    / nullif((pontos -> 'p4_topo2' ->> 'i')::numeric - (pontos -> 'p2_topo1' ->> 'i')::numeric, 0)
  ) stored;

alter table templates_canal_baixa add column if not exists abertura_inicio numeric
  generated always as (
    (pontos -> 'p2_topo1' ->> 'preco')::numeric - (pontos -> 'p1_fundo1' ->> 'preco')::numeric
  ) stored;

alter table templates_canal_baixa add column if not exists abertura_fim numeric
  generated always as (
    (pontos -> 'p4_topo2' ->> 'preco')::numeric - (pontos -> 'p3_fundo2' ->> 'preco')::numeric
  ) stored;

alter table templates_canal_baixa add column if not exists inclinacao_suporte numeric
  generated always as (
    ((pontos -> 'p3_fundo2' ->> 'preco')::numeric - (pontos -> 'p1_fundo1' ->> 'preco')::numeric)
    / nullif((pontos -> 'p3_fundo2' ->> 'i')::numeric - (pontos -> 'p1_fundo1' ->> 'i')::numeric, 0)
  ) stored;

alter table templates_canal_baixa add column if not exists inclinacao_resistencia numeric
  generated always as (
    ((pontos -> 'p4_topo2' ->> 'preco')::numeric - (pontos -> 'p2_topo1' ->> 'preco')::numeric)
    / nullif((pontos -> 'p4_topo2' ->> 'i')::numeric - (pontos -> 'p2_topo1' ->> 'i')::numeric, 0)
  ) stored;

create index if not exists idx_templates_canal_alta_ticker  on templates_canal_alta (ticker);
create index if not exists idx_templates_canal_baixa_ticker on templates_canal_baixa (ticker);
