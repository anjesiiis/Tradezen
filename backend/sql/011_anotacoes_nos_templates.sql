-- 011 — Etiquetas de texto salvas junto com o template
--
-- O admin escreve textos ao lado dos pontos enquanto marca ("volume seca
-- aqui", "rompeu e voltou"). Antes eles sumiam ao sair da tela; agora vão
-- pro banco junto com o resto do template.
--
-- Formato de cada item do array:
--   { "texto": "...", "ancora": { "i": 12, "preco": 41.3 },
--     "largura": 170, "altura": 44 }
-- A âncora é candle + preço (índice dentro de `candles` do template, o
-- mesmo sistema de `pontos`) — nunca pixel, senão a etiqueta sairia do
-- lugar com zoom ou em outra tela.
--
-- Sem NOT NULL: templates antigos e payloads que não mandam o campo gravam
-- null, e a tela trata null como lista vazia.
-- `if exists` / `if not exists`: pode rodar mais de uma vez e não quebra em
-- tabela que ainda não foi criada.

alter table if exists templates_oco            add column if not exists anotacoes jsonb default '[]'::jsonb;
alter table if exists templates_topo_duplo     add column if not exists anotacoes jsonb default '[]'::jsonb;
alter table if exists templates_niveis         add column if not exists anotacoes jsonb default '[]'::jsonb;
alter table if exists templates_bandeira_alta  add column if not exists anotacoes jsonb default '[]'::jsonb;
alter table if exists templates_bandeira_baixa add column if not exists anotacoes jsonb default '[]'::jsonb;
alter table if exists templates_flamula_alta   add column if not exists anotacoes jsonb default '[]'::jsonb;
alter table if exists templates_flamula_baixa  add column if not exists anotacoes jsonb default '[]'::jsonb;
alter table if exists templates_cunha_alta     add column if not exists anotacoes jsonb default '[]'::jsonb;
alter table if exists templates_cunha_baixa    add column if not exists anotacoes jsonb default '[]'::jsonb;
