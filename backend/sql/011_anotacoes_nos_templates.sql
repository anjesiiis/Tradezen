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

do $anotacoes$
declare
  tabela text;
begin
  foreach tabela in array array[
    'templates_oco',
    'templates_topo_duplo',
    'templates_niveis',
    'templates_bandeira_alta',
    'templates_bandeira_baixa',
    'templates_flamula_alta',
    'templates_flamula_baixa',
    'templates_cunha_alta',
    'templates_cunha_baixa'
  ]
  loop
    if to_regclass(tabela) is not null then
      -- sem NOT NULL: templates antigos e payloads que não mandam o
      -- campo gravam null, e a tela trata null como lista vazia.
      execute format(
        'alter table %I add column if not exists anotacoes jsonb default ''[]''::jsonb',
        tabela
      );
    end if;
  end loop;
end
$anotacoes$;
