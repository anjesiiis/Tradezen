-- TRADEZEN — 016: fracassos de bandeira (hard negatives de FORMA)
-- =================================================================
-- Aqui NÃO vão bandeiras que falharam. Bandeira que se formou e não
-- funcionou continua sendo bandeira: o desfecho dela mora na coluna
-- `resultado` da tabela de sucesso.
--
-- Estas tabelas guardam o contrário: trechos que PARECEM bandeira e não
-- são — mastro fraco demais, consolidação sem forma, ruído. São os
-- exemplos negativos que ensinam o detector a não confundir, e por isso
-- são outra classe, em outra tabela.
--
-- `like ... including all` copia a estrutura da tabela de sucesso
-- (colunas, tipos, defaults, índices, identity e as colunas calculadas
-- de medida), então as duas nascem idênticas por construção.
--
-- RLS ligado e sem policy: só a chave secreta do backend lê e escreve.
-- Rode no SQL Editor do Supabase. Seguro rodar mais de uma vez.

create table if not exists templates_bandeira_alta_fracasso  (like templates_bandeira_alta  including all);
create table if not exists templates_bandeira_baixa_fracasso (like templates_bandeira_baixa including all);

-- Por que não é uma bandeira. Opcional: o analista preenche quando vale
-- a pena registrar o porquê.
alter table templates_bandeira_alta_fracasso  add column if not exists motivo_fracasso text;
alter table templates_bandeira_baixa_fracasso add column if not exists motivo_fracasso text;

create index if not exists templates_bandeira_alta_fracasso_ticker_idx  on templates_bandeira_alta_fracasso (ticker);
create index if not exists templates_bandeira_baixa_fracasso_ticker_idx on templates_bandeira_baixa_fracasso (ticker);

alter table templates_bandeira_alta_fracasso  enable row level security;
alter table templates_bandeira_baixa_fracasso enable row level security;

-- Conferência: tem que listar as 2
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('templates_bandeira_alta_fracasso', 'templates_bandeira_baixa_fracasso')
order by table_name;
