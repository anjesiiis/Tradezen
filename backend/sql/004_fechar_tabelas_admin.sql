-- Fecha pra leitura/escrita pública as tabelas que só o backend (chave
-- SECRETA, que sempre ignora RLS) e as rotas /admin/* (protegidas por
-- require_admin) devem tocar. Nenhum código do site — nem o backend, nem
-- o frontend — lê essas tabelas usando a chave PUBLICÁVEL, então fechar
-- 100% pra esse papel não quebra nada em produção; só fecha a porta que
-- ficava aberta pra quem pegasse a chave publicável (visível no bundle do
-- site) e chamasse a API REST do Supabase direto, por fora do backend.
--
-- Rode isso no SQL Editor do painel do Supabase (Project → SQL Editor).

-- 1) templates_oco — auditoria encontrou RLS DESLIGADO nessa tabela
-- (diferente de templates_niveis/templates_topo_duplo, que já estavam
-- corretas). Confirmado na prática: um INSERT anônimo com só a chave
-- publicável funcionou (retornou 201) antes desse fix. Ativar RLS aqui é
-- a correção da vulnerabilidade, não só um endurecimento.
alter table templates_oco enable row level security;
drop policy if exists "leitura publica" on templates_oco;

-- 2) templates_niveis — já tinha RLS ligado + policy de leitura pública
-- (001_enable_rls.sql). Endurecendo pra fechado por completo, a pedido:
-- o dado só precisa ser lido pelo backend (chave secreta) pra servir
-- GET /padroes-marcados; ninguém acessa essa tabela pela chave pública.
alter table templates_niveis enable row level security;
drop policy if exists "leitura publica" on templates_niveis;

-- 3) templates_topo_duplo — mesmo caso de templates_niveis.
alter table templates_topo_duplo enable row level security;
drop policy if exists "leitura publica" on templates_topo_duplo;

-- 4) rotulagens_oco — tabela de dados de treino do modelo (candles +
-- features + rótulo "é padrão"), nunca teve RLS ligado. Auditoria
-- confirmou na prática: SELECT e INSERT anônimos funcionavam sem
-- restrição nenhuma. Fechando 100% — só o backend (chave secreta) deve
-- ler/escrever aqui.
alter table rotulagens_oco enable row level security;

-- Nenhuma das 4 tabelas acima recebe policy nenhuma de propósito: sem
-- policy explícita, RLS bloqueia por padrão TUDO (select/insert/
-- update/delete) pra quem usa a chave publicável. Só a chave secreta do
-- backend, que ignora RLS, continua enxergando e escrevendo essas
-- tabelas normalmente — exatamente como as rotas /admin/* já fazem hoje.

-- 5) usuarios — já auditada e confirmada correta (backend/sql/
-- 003_criar_usuarios.sql): RLS ligado, cada usuário só lê/edita a
-- própria linha, sem policy de insert pra cliente (a linha nasce sozinha
-- via trigger no cadastro). Nada a mudar aqui.

-- 6) rotulagens_topo_duplo, analises_diarias, noticias — pedidas na
-- auditoria, mas NENHUMA das três existe no banco hoje (conferido direto
-- no schema do Supabase via API). Provavelmente tabelas planejadas pro
-- futuro. Quando forem criadas, seguir o mesmo princípio: RLS ligado
-- desde a primeira migration, nunca depois.
