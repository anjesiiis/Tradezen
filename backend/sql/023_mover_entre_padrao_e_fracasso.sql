-- TradeZen — mover uma marcação entre "é o padrão" e "não é o padrão"
--
-- As duas coisas moram em tabelas separadas, e isso é de propósito:
--
--   templates_bandeira_alta            → a forma É uma bandeira.
--                                        Se ela deu certo ou não, isso
--                                        mora na coluna `resultado`.
--   templates_bandeira_alta_fracasso   → a forma NÃO é uma bandeira.
--                                        É contraexemplo de desenho.
--
-- Trocar de tabela é dizer "eu errei ao chamar isto de bandeira" — não é
-- dizer "esta bandeira não funcionou". Confundir as duas envenena o
-- treino: um padrão que se formou e fracassou no mercado continua sendo
-- um exemplo CERTO de forma.
--
-- Estas colunas existem pra que a marcação movida se identifique sem
-- precisar de JOIN — é o selo "revisado" na listagem.
--
-- Rodar no SQL Editor do Supabase. É seguro rodar duas vezes.

do $$
declare t text;
begin
  foreach t in array array[
    'templates_bandeira_alta',
    'templates_bandeira_baixa',
    'templates_bandeira_alta_fracasso',
    'templates_bandeira_baixa_fracasso'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table %I add column if not exists movido_de text', t);
      execute format('alter table %I add column if not exists movido_em timestamptz', t);
      execute format('alter table %I add column if not exists motivo_movimento text', t);
    end if;
  end loop;
end $$;

-- Quem moveu o quê, quando e por quê. Separado das tabelas porque a
-- linha muda de tabela e levaria o histórico junto; aqui ele fica.
create table if not exists log_reclassificacoes (
  id             uuid primary key default gen_random_uuid(),
  tabela_origem  text not null,
  tabela_destino text not null,
  id_origem      bigint not null,
  id_destino     bigint,
  ticker         text,
  motivo         text,
  admin_email    text,
  criado_em      timestamptz not null default now()
);

create index if not exists log_reclass_data_idx on log_reclassificacoes (criado_em desc);

alter table log_reclassificacoes enable row level security;

-- Só o backend escreve aqui, com a chave de serviço, que ignora RLS.
-- Nenhuma política de leitura: ninguém lê isto pelo cliente.
drop policy if exists "log de reclassificacao: ninguem" on log_reclassificacoes;
