-- TRADEZEN — 014: as 8 tabelas dos padrões novos
-- =================================================================
-- Fundo Duplo, OCO Invertido, Topo Triplo, Fundo Triplo, os três
-- triângulos e o Retângulo.
--
-- `like templates_topo_duplo including all` copia a estrutura da tabela
-- que já existe — colunas, tipos, not null, defaults, índices e a
-- identity do id. Assim as novas nascem iguais às antigas por
-- construção, sem risco de uma coluna sair diferente.
--
-- O que muda em cada padrão são as chaves dentro de `pontos`, e isso é
-- validado no backend (padroes_extras.py), não no banco.
--
-- `origem` separa o que foi marcado à mão do que o detector automático
-- achou: sem ela, treinar o modelo com o que o detector já acha seria
-- ensinar o que ele já sabe.
--
-- RLS ligado e sem policy: só a chave secreta do backend lê e escreve.
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.

create table if not exists templates_fundo_duplo            (like templates_topo_duplo including all);
create table if not exists templates_oco_invertido           (like templates_topo_duplo including all);
create table if not exists templates_topo_triplo             (like templates_topo_duplo including all);
create table if not exists templates_fundo_triplo            (like templates_topo_duplo including all);
create table if not exists templates_triangulo_ascendente    (like templates_topo_duplo including all);
create table if not exists templates_triangulo_descendente   (like templates_topo_duplo including all);
create table if not exists templates_triangulo_simetrico     (like templates_topo_duplo including all);
create table if not exists templates_retangulo               (like templates_topo_duplo including all);

alter table templates_fundo_duplo          add column if not exists origem text not null default 'manual';
alter table templates_oco_invertido        add column if not exists origem text not null default 'manual';
alter table templates_topo_triplo          add column if not exists origem text not null default 'manual';
alter table templates_fundo_triplo         add column if not exists origem text not null default 'manual';
alter table templates_triangulo_ascendente add column if not exists origem text not null default 'manual';
alter table templates_triangulo_descendente add column if not exists origem text not null default 'manual';
alter table templates_triangulo_simetrico  add column if not exists origem text not null default 'manual';
alter table templates_retangulo            add column if not exists origem text not null default 'manual';

create index if not exists templates_fundo_duplo_ticker_idx            on templates_fundo_duplo (ticker);
create index if not exists templates_oco_invertido_ticker_idx          on templates_oco_invertido (ticker);
create index if not exists templates_topo_triplo_ticker_idx            on templates_topo_triplo (ticker);
create index if not exists templates_fundo_triplo_ticker_idx           on templates_fundo_triplo (ticker);
create index if not exists templates_triangulo_ascendente_ticker_idx   on templates_triangulo_ascendente (ticker);
create index if not exists templates_triangulo_descendente_ticker_idx  on templates_triangulo_descendente (ticker);
create index if not exists templates_triangulo_simetrico_ticker_idx    on templates_triangulo_simetrico (ticker);
create index if not exists templates_retangulo_ticker_idx              on templates_retangulo (ticker);

alter table templates_fundo_duplo            enable row level security;
alter table templates_oco_invertido          enable row level security;
alter table templates_topo_triplo            enable row level security;
alter table templates_fundo_triplo           enable row level security;
alter table templates_triangulo_ascendente   enable row level security;
alter table templates_triangulo_descendente  enable row level security;
alter table templates_triangulo_simetrico    enable row level security;
alter table templates_retangulo              enable row level security;

-- Conferência: tem que listar as 8
select table_name from information_schema.tables
where table_schema = 'public' and table_name in (
  'templates_fundo_duplo','templates_oco_invertido','templates_topo_triplo',
  'templates_fundo_triplo','templates_triangulo_ascendente',
  'templates_triangulo_descendente','templates_triangulo_simetrico','templates_retangulo')
order by table_name;
