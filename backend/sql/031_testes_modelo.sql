-- ============================================================
-- TRADEZEN — 031: TESTES DE MODELO (laboratório de validação)
-- ============================================================
--
-- Guarda o resultado de rodar um modelo salvo sobre todos os templates
-- marcados: uma linha por execução, com o json inteiro (resumo, matriz,
-- e cada template com a confiança do modelo e o rótulo humano).
--
-- POR QUE GUARDAR em vez de recalcular
-- Abrir a aba de teste não pode custar 200 extrações de feature. O
-- resultado de um MESMO modelo sobre o MESMO acervo é determinístico, e
-- recalcular daria exatamente o mesmo json.
--
-- E POR QUE AINDA ASSIM TEM "FORÇAR NOVO TESTE"
-- O acervo muda: marcação corrigida, template novo, estrela trocada. O
-- cache guardado passa a descrever um acervo que não existe mais. Então o
-- padrão é reusar, e quem acabou de remarcar algo força.
--
-- Depende da 030 (modelos_treinados). RLS ligado e sem policy, como as
-- outras tabelas de admin: o json tem os pontos de cada marcação.
--
-- Idempotente. Rodar no SQL Editor do Supabase.

begin;

create table if not exists testes_modelo (
  id            uuid primary key default gen_random_uuid(),
  modelo_id     uuid not null references modelos_treinados(id) on delete cascade,
  padrao        text not null,
  -- Quantos templates o teste olhou. Fica em coluna própria pra dar pra
  -- ver, sem abrir o json, que o cache é de um acervo de outro tamanho.
  n_templates   int,
  resumo        jsonb,
  resultado_json jsonb not null,
  criado_em     timestamptz not null default now()
);

alter table testes_modelo enable row level security;

create index if not exists testes_modelo_modelo_idx
  on testes_modelo (modelo_id, criado_em desc);

comment on table testes_modelo is
  'Cache do laboratorio: um modelo rodado sobre todos os templates marcados. Reusado por padrao; Forcar novo teste grava outra linha.';

notify pgrst, 'reload schema';

commit;

-- ── Confirmação (só leitura) ────────────────────────────────
select padrao, count(*) as testes, max(criado_em) as ultimo
  from testes_modelo
 group by padrao
 order by padrao;
