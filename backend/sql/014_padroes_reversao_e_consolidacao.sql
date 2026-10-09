-- TRADEZEN — 014: oito padrões novos
-- =================================================================
-- Fundo Duplo, OCO Invertido, Topo Triplo, Fundo Triplo, os três
-- triângulos e o Retângulo. Mesmas colunas das outras tabelas de
-- template: o CRUD é o mesmo (admin_templates_extras.py) e o que muda
-- são as chaves dentro de `pontos` e as regras de validação, que ficam
-- no backend (padroes_extras.py), não no banco.
--
-- RLS ligado e sem policy: só a chave secreta do backend lê e escreve.
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.

-- Fundo Duplo — vale1, pico, vale2, confirmacao
create table if not exists templates_fundo_duplo (
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
  -- 'manual' = marcado por um analista na tela; 'detector' = achado pelo
  -- detector automático. Sem essa coluna, o treino do modelo misturaria
  -- o que o detector já acha com o que ele precisa aprender.
  origem            text not null default 'manual',
  criado_em         timestamptz not null default now()
);
create index if not exists templates_fundo_duplo_ticker_idx on templates_fundo_duplo (ticker);
alter table templates_fundo_duplo enable row level security;

-- OCO Invertido — ombro_esq, cabeca, ombro_dir, pescoco
create table if not exists templates_oco_invertido (
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
  -- 'manual' = marcado por um analista na tela; 'detector' = achado pelo
  -- detector automático. Sem essa coluna, o treino do modelo misturaria
  -- o que o detector já acha com o que ele precisa aprender.
  origem            text not null default 'manual',
  criado_em         timestamptz not null default now()
);
create index if not exists templates_oco_invertido_ticker_idx on templates_oco_invertido (ticker);
alter table templates_oco_invertido enable row level security;

-- Topo Triplo — topo1, vale1, topo2, vale2, topo3
create table if not exists templates_topo_triplo (
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
  -- 'manual' = marcado por um analista na tela; 'detector' = achado pelo
  -- detector automático. Sem essa coluna, o treino do modelo misturaria
  -- o que o detector já acha com o que ele precisa aprender.
  origem            text not null default 'manual',
  criado_em         timestamptz not null default now()
);
create index if not exists templates_topo_triplo_ticker_idx on templates_topo_triplo (ticker);
alter table templates_topo_triplo enable row level security;

-- Fundo Triplo — fundo1, pico1, fundo2, pico2, fundo3
create table if not exists templates_fundo_triplo (
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
  -- 'manual' = marcado por um analista na tela; 'detector' = achado pelo
  -- detector automático. Sem essa coluna, o treino do modelo misturaria
  -- o que o detector já acha com o que ele precisa aprender.
  origem            text not null default 'manual',
  criado_em         timestamptz not null default now()
);
create index if not exists templates_fundo_triplo_ticker_idx on templates_fundo_triplo (ticker);
alter table templates_fundo_triplo enable row level security;

-- Triângulo Ascendente — res_esq, res_dir, sup_esq, sup_dir
create table if not exists templates_triangulo_ascendente (
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
  -- 'manual' = marcado por um analista na tela; 'detector' = achado pelo
  -- detector automático. Sem essa coluna, o treino do modelo misturaria
  -- o que o detector já acha com o que ele precisa aprender.
  origem            text not null default 'manual',
  criado_em         timestamptz not null default now()
);
create index if not exists templates_triangulo_ascendente_ticker_idx on templates_triangulo_ascendente (ticker);
alter table templates_triangulo_ascendente enable row level security;

-- Triângulo Descendente — mesmas 4 chaves
create table if not exists templates_triangulo_descendente (
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
  -- 'manual' = marcado por um analista na tela; 'detector' = achado pelo
  -- detector automático. Sem essa coluna, o treino do modelo misturaria
  -- o que o detector já acha com o que ele precisa aprender.
  origem            text not null default 'manual',
  criado_em         timestamptz not null default now()
);
create index if not exists templates_triangulo_descendente_ticker_idx on templates_triangulo_descendente (ticker);
alter table templates_triangulo_descendente enable row level security;

-- Triângulo Simétrico — topo_esq, topo_dir, fundo_esq, fundo_dir
create table if not exists templates_triangulo_simetrico (
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
  -- 'manual' = marcado por um analista na tela; 'detector' = achado pelo
  -- detector automático. Sem essa coluna, o treino do modelo misturaria
  -- o que o detector já acha com o que ele precisa aprender.
  origem            text not null default 'manual',
  criado_em         timestamptz not null default now()
);
create index if not exists templates_triangulo_simetrico_ticker_idx on templates_triangulo_simetrico (ticker);
alter table templates_triangulo_simetrico enable row level security;

-- Retângulo — res_esq, res_dir, sup_esq, sup_dir
create table if not exists templates_retangulo (
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
  -- 'manual' = marcado por um analista na tela; 'detector' = achado pelo
  -- detector automático. Sem essa coluna, o treino do modelo misturaria
  -- o que o detector já acha com o que ele precisa aprender.
  origem            text not null default 'manual',
  criado_em         timestamptz not null default now()
);
create index if not exists templates_retangulo_ticker_idx on templates_retangulo (ticker);
alter table templates_retangulo enable row level security;

-- ── conferência (deve listar as 8) ───────────────────────────────
-- select table_name from information_schema.tables
--  where table_name in (
--    'templates_fundo_duplo','templates_oco_invertido','templates_topo_triplo',
--    'templates_fundo_triplo','templates_triangulo_ascendente',
--    'templates_triangulo_descendente','templates_triangulo_simetrico',
--    'templates_retangulo');
