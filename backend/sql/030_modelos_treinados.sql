-- ============================================================
-- TRADEZEN — 030: MODELOS TREINADOS (Random Forest da bandeira)
-- ============================================================
--
-- Um registro por treino: a versão, as métricas que saíram e o próprio
-- modelo. Serve pra responder "qual está em produção e por que ele, e
-- não o anterior" sem depender da memória de ninguém.
--
-- POR QUE O MODELO VAI NO BANCO (coluna modelo_b64)
-- O Render recria o disco a cada deploy. Modelo só em arquivo desaparece
-- no próximo push, e o painel passaria a mostrar "v4 ativo" apontando pra
-- um arquivo que não existe — pior que não ter modelo, porque mente. O
-- base64 aqui é o original; o .pkl em disco é cache, reescrito a partir
-- daqui quando falta.
--
-- `ativo` NASCE FALSE em todo treino. Treinar não é promover: quem promove
-- é uma pessoa olhando as métricas, pela rota /ativar. Modelo novo subir
-- sozinho significaria que um treino ruim derruba o que funcionava.
--
-- RLS LIGADO E SEM POLICY, como nas tabelas de template: só a chave
-- secreta do backend lê e escreve. Esta tabela guarda o modelo inteiro —
-- deixá-la legível pela chave anon publicaria o modelo.
--
-- Idempotente. Rodar no SQL Editor do Supabase.

begin;

create table if not exists modelos_treinados (
  id                   uuid primary key default gen_random_uuid(),
  padrao               text not null,
  versao               int not null,
  arquivo_pkl          text,
  -- O modelo serializado. Fica em text, não em bytea: o PostgREST
  -- devolve bytea em formato hexadecimal escapado, e o cliente Python
  -- teria de desfazer isso na mão a cada leitura.
  modelo_b64           text,
  precisao             double precision,
  recall               double precision,
  f1                   double precision,
  accuracy             double precision,
  roc_auc              double precision,
  n_templates_sucesso  int,
  n_templates_falha    int,
  -- Métricas e detalhes completos (matriz de confusão, importância das
  -- features, quais templates foram pulados e por quê). As colunas soltas
  -- acima existem pra `order by` e pra comparação rápida; o jsonb é a
  -- memória do treino.
  metricas             jsonb,
  detalhes             jsonb,
  ativo                boolean not null default false,
  treinado_em          timestamptz not null default now(),

  constraint modelos_treinados_padrao_ck
    check (padrao in ('bandeira_alta', 'bandeira_baixa')),
  -- Duas linhas com a mesma versão do mesmo padrão fariam "v3" significar
  -- dois modelos diferentes.
  constraint modelos_treinados_versao_uk unique (padrao, versao)
);

alter table modelos_treinados enable row level security;

create index if not exists modelos_treinados_padrao_idx
  on modelos_treinados (padrao, versao desc);

-- UM ativo por padrão, garantido pelo banco e não só pelo código: duas
-- linhas ativas dariam duas respostas diferentes pra mesma pergunta,
-- dependendo de qual o banco devolvesse primeiro.
create unique index if not exists modelos_treinados_um_ativo_idx
  on modelos_treinados (padrao) where ativo;

comment on table modelos_treinados is
  'Um registro por treino do Random Forest. modelo_b64 e o modelo original; o .pkl em disco e cache. ativo nasce false: treinar nao promove.';

notify pgrst, 'reload schema';

commit;

-- ── Confirmação (só leitura) ────────────────────────────────
select padrao, count(*) as modelos, count(*) filter (where ativo) as ativos
  from modelos_treinados
 group by padrao
 order by padrao;
