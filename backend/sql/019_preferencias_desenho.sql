-- TRADEZEN — PREFERÊNCIAS DE DESENHO DO USUÁRIO
-- =============================================
--
-- Cor, espessura, traço e fonte de cada ferramenta do gráfico, pra
-- acompanhar a pessoa de um aparelho pro outro. Quem não está cadastrado
-- guarda isso no próprio navegador e não precisa desta coluna.
--
-- Rodar no SQL Editor do Supabase. É seguro rodar duas vezes.

alter table profiles
  add column if not exists preferencias_desenho jsonb not null default '{}'::jsonb;

comment on column profiles.preferencias_desenho is
  'Estilo escolhido por ferramenta de desenho do gráfico (ver frontend/src/lib/grafico/estiloDesenho.js).';

-- A política de UPDATE e o gatilho que protege `plano` vêm da 018. Esta
-- coluna entra no mesmo pacote: o usuário edita só a própria linha, e
-- `plano`/`id`/`criado_em` continuam fora do alcance dele.
