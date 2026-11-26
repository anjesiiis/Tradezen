-- ============================================================
-- TRADEZEN — 032: LOGS DE AUDITORIA
-- ============================================================
--
-- Hoje o que acontece de sensivel sai no log do Render (ver logs.py):
-- stdout, canal tradezen.seguranca. Isso serve pra OLHAR agora, mas nao
-- pra responder "quem mudou o plano desse usuario no mes passado?" — o
-- log do Render e volatil e nao se consulta com SQL.
--
-- Esta tabela e so pra ACAO DELIBERADA de consequencia: mudar plano de
-- alguem, treinar modelo, excluir conta, tentativa de acesso admin
-- negada. Nao e log de navegacao, e nao recebe uma linha por request —
-- isso encheria a tabela de ruido e deixaria o que importa invisivel.
--
-- ON DELETE SET NULL, E NAO A FALTA DELE
-- A spec desta tabela trazia `references auth.users(id)` sem clausula de
-- delete, o que no Postgres e NO ACTION: a primeira exclusao de conta
-- (rota /eu/conta, direito do art. 18 da LGPD) passaria a FALHAR com
-- violacao de chave estrangeira, porque existiria log apontando pro
-- usuario. Com SET NULL a conta vai embora e a linha de auditoria fica,
-- orfa de proposito — que e exatamente o que se quer: o registro de que
-- a exclusao aconteceu tem que sobreviver a ela.
--
-- O email fica copiado em coluna propria pelo mesmo motivo: depois da
-- exclusao, o id nao resolve mais pra ninguem. Pra nao guardar dado
-- pessoal de quem pediu exclusao, a propria rota anonimiza o email
-- (ver auditoria.anonimizar_usuario).
--
-- RLS ligado e SEM policy: o acesso e so pela chave secreta do backend,
-- como as outras tabelas de admin. Uma policy "admin le" com os emails
-- escritos no SQL (como a spec sugeria) seria uma SEGUNDA lista de
-- admins, fora do ADMIN_EMAILS do Render, pra sair de sincronia no dia
-- em que um admin entrar ou sair.
--
-- Idempotente. Rodar no SQL Editor do Supabase.

begin;

create table if not exists logs_auditoria (
  id          uuid primary key default gen_random_uuid(),
  -- quem fez. Nulo quando a conta foi excluida depois (SET NULL) ou
  -- quando a tentativa partiu de quem nao tem conta.
  usuario_id  uuid references auth.users(id) on delete set null,
  usuario_email text,
  -- o que foi feito: nome curto e estavel, usado em filtro.
  -- Ver ACOES em backend/auditoria.py — a lista canonica mora lá.
  acao        text not null,
  -- sobre o que: 'usuario', 'modelo', 'template', 'conta'...
  recurso     text,
  recurso_id  text,
  -- o resto, sem formato fixo: plano_antes/plano_depois, padrao, etc.
  detalhes    jsonb,
  ip          text,
  user_agent  text,
  criado_em   timestamptz not null default now()
);

-- Os dois jeitos de ler isto: "o que esse usuario fez" e "quem fez essa
-- acao". Sempre do mais novo pro mais velho, que e como se investiga.
create index if not exists idx_logs_auditoria_usuario
  on logs_auditoria (usuario_id, criado_em desc);
create index if not exists idx_logs_auditoria_acao
  on logs_auditoria (acao, criado_em desc);

alter table logs_auditoria enable row level security;

commit;
