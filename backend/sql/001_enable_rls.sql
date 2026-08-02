-- Ativa Row Level Security nas tabelas que já existem hoje.
--
-- Por quê: o backend fala com o Supabase usando a chave SECRETA
-- (sb_secret_...), que sempre ignora RLS — então isso aqui não muda nada
-- do que já funciona hoje (admin, /padroes-marcados, etc.).
--
-- O motivo de fazer isso AGORA, antes de precisar: no dia em que o
-- cadastro de usuário for pro ar, o frontend vai precisar de uma chave
-- PUBLICÁVEL do Supabase (sb_publishable_...) pra autenticação. Essa
-- chave é pública por design — qualquer um que abrir o site vai conseguir
-- vê-la. Sem RLS, quem tiver essa chave consegue ler E escrever essas
-- tabelas direto pela API REST do Supabase, sem passar pelo nosso
-- backend, pelas nossas regras, ou pelo require_admin. Foi exatamente
-- esse o buraco mostrado no vídeo. Ativar agora garante que, quando a
-- chave publicável existir, essas tabelas já estão fechadas por padrão.
--
-- Rode isso no SQL Editor do painel do Supabase (Project → SQL Editor).

alter table templates_oco         enable row level security;
alter table templates_topo_duplo  enable row level security;
alter table templates_niveis      enable row level security;

-- Leitura pública: esses dados já são servidos sem login nenhum pelo
-- endpoint GET /padroes-marcados/{ticker} — é conteúdo educativo, não tem
-- problema ficar de leitura livre pra quem tiver a chave publicável.
create policy "leitura publica" on templates_oco         for select using (true);
create policy "leitura publica" on templates_topo_duplo  for select using (true);
create policy "leitura publica" on templates_niveis      for select using (true);

-- Reparem que NÃO criamos nenhuma policy de insert/update/delete —
-- de propósito. Sem uma policy explícita liberando, RLS bloqueia por
-- padrão qualquer escrita vinda da chave publicável. Só a chave secreta
-- do backend (que ignora RLS) consegue escrever, exatamente como já
-- acontece hoje através das rotas /admin/* protegidas por require_admin.

-- IMPORTANTE pro futuro: quando criar a tabela de usuários/perfis pro
-- cadastro, siga o mesmo princípio — mas em vez de "leitura pública",
-- use algo como:
--   create policy "cada um só vê o próprio perfil" on profiles
--     for select using (auth.uid() = id);
--   create policy "cada um só edita o próprio perfil" on profiles
--     for update using (auth.uid() = id);
-- Nunca deixe uma tabela com dado de usuário sem RLS, mesmo que "por
-- enquanto ninguém vá explorar isso" — é exatamente esse tipo de tabela
-- "esquecida" que aparece nesses vídeos de vulnerabilidade.
