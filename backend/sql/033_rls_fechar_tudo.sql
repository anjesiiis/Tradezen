-- ============================================================
-- TRADEZEN — 033: RLS LIGADO EM TUDO, NENHUMA POLICY "using (true)"
-- ============================================================
--
-- MEDIÇÃO QUE MOTIVOU ISTO
-- Com a chave PUBLICÁVEL (a que está no bundle do site, visível pra
-- qualquer pessoa), consultando a API REST do Supabase direto, por fora
-- do backend:
--
--   templates_oco           -> anônimo via 2 de 2 linhas   ABERTA
--   templates_topo_duplo    -> anônimo via 0 de 25         ok
--   templates_niveis        -> anônimo via 0 de 14         ok
--   templates_bandeira_alta -> anônimo via 0 de 212        ok
--   profiles                -> anônimo via 0 de 6          ok
--   usuarios                -> anônimo via 0 de 5          ok
--
-- A causa está na 001_enable_rls.sql:26 — `create policy "leitura
-- publica" ... for select using (true)` em templates_oco,
-- templates_topo_duplo e templates_niveis. A 004 existe pra desfazer
-- isso, e nas duas últimas funcionou; em templates_oco não. Hoje o
-- vazamento é pequeno (2 linhas, OCO foi abandonado cedo), mas a porta
-- está aberta: marcação OCO nova nasce pública, por fora do portão Pro.
--
-- POR QUE ESTE ARQUIVO É GENÉRICO
-- Eu não consigo listar as tabelas do banco daqui — só o que as
-- migrations criam, e há objeto criado à mão no painel (a função
-- usuario_eh_admin, por exemplo, não existe em nenhum arquivo do
-- projeto). Uma lista escrita à mão aqui já nasceria incompleta. Então
-- os dois blocos abaixo varrem o catálogo do próprio Postgres e avisam,
-- linha por linha, o que mudaram.
--
-- POR QUE NÃO SE CRIA POLICY DE ADMIN NEM DE PRO AQUI
-- Porque não é assim que este projeto funciona. Medido no frontend: ele
-- só toca TRÊS tabelas com a chave publicável — profiles, sessao_telas e
-- graficos_usuario —, e as três já têm policy de dono (auth.uid()). O
-- painel de admin NÃO fala com o Supabase direto: fala com o backend
-- (admin/adminApi.js usa fetch), que usa a chave SECRETA e por definição
-- ignora RLS. Então toda tabela de template, modelo e auditoria precisa
-- de RLS ligado e ZERO policy: nada legítimo passa por ali com chave
-- pública. Criar uma policy de admin só acrescentaria uma porta.
--
-- E por isso também não se mexe em `usuario_eh_admin()` aqui: policy
-- nenhuma deste projeto precisa dela.
--
-- Idempotente. Roda inteiro em transação. SQL Editor do Supabase.

begin;

-- ── 1) RLS LIGADO EM TODA TABELA DE public ────────────────────
-- Sem RLS, a chave publicável lê e escreve a tabela inteira. Ligar RLS
-- sem policy nenhuma bloqueia TUDO pra chave pública e não muda nada pro
-- backend, que usa a chave secreta.
do $$
declare
  t record;
  n int := 0;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public' and rowsecurity = false
    order by tablename
  loop
    -- Tabela de extensao (postgis e parentes) as vezes mora em public e
    -- NAO e sua: o alter falha por permissao. Sem este tratamento, uma
    -- tabela dessas abortaria a transacao inteira e o conserto de verdade
    -- nao aconteceria. Aqui ela e PULADA COM AVISO, bem visivel, e as
    -- suas tabelas seguem sendo fechadas.
    begin
      execute format('alter table public.%I enable row level security', t.tablename);
      raise notice 'RLS LIGADO: %', t.tablename;
      n := n + 1;
    exception when insufficient_privilege then
      raise warning 'PULADA (nao e sua, provavelmente de extensao): %', t.tablename;
    end;
  end loop;
  if n = 0 then
    raise notice 'RLS: nada a fazer, todas as tabelas de public ja tinham RLS';
  else
    raise notice 'RLS: % tabela(s) fechada(s)', n;
  end if;
end $$;

-- ── 2) FORA AS POLICIES "using (true)" / "with check (true)" ──
-- `using (true)` em SELECT = leitura liberada pra qualquer um com a
-- chave pública. `with check (true)` em INSERT é pior: escrita liberada.
-- Nenhuma das três tabelas que o frontend realmente usa tem policy
-- assim (as três comparam com auth.uid()), então esta varredura não
-- alcança nada legítimo.
do $$
declare
  p record;
  n int := 0;
begin
  for p in
    select tablename, policyname, cmd, qual::text as usando, with_check::text as checando
    from pg_policies
    where schemaname = 'public'
      and (qual::text = 'true' or with_check::text = 'true')
    order by tablename, policyname
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
    raise notice 'POLICY REMOVIDA: %.% (cmd=%, using=%, check=%)',
      p.tablename, p.policyname, p.cmd, coalesce(p.usando,'-'), coalesce(p.checando,'-');
    n := n + 1;
  end loop;
  if n = 0 then
    raise notice 'POLICIES: nenhuma policy permissiva encontrada';
  else
    raise notice 'POLICIES: % removida(s)', n;
  end if;
end $$;

-- ── 3) CINTO E SUSPENSÓRIO NAS QUATRO DA 004 ──────────────────
-- Explícito, pelo nome, porque é o alvo medido. Se a 004 nunca rodou,
-- aqui ela acontece; se rodou, estas linhas não fazem nada.
alter table templates_oco        enable row level security;
alter table templates_topo_duplo enable row level security;
alter table templates_niveis     enable row level security;
alter table rotulagens_oco       enable row level security;
drop policy if exists "leitura publica" on templates_oco;
drop policy if exists "leitura publica" on templates_topo_duplo;
drop policy if exists "leitura publica" on templates_niveis;
drop policy if exists "leitura publica" on rotulagens_oco;

commit;

-- ============================================================
-- CONFERÊNCIA — as três têm que voltar VAZIAS
-- ============================================================

-- 1) tabela de public sem RLS
select tablename from pg_tables
where schemaname = 'public' and rowsecurity = false order by tablename;

-- 2) policy que libera pra qualquer um
select tablename, policyname, cmd, qual::text, with_check::text
from pg_policies
where schemaname = 'public' and (qual::text = 'true' or with_check::text = 'true');

-- 3) função SECURITY DEFINER sem search_path travado
--    (search_path solto numa função que roda como dono é sequestrável
--     por quem puder criar objeto num schema do caminho)
select p.proname, p.proconfig
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
  and (p.proconfig is null or not exists (
        select 1 from unnest(p.proconfig) c where c like 'search_path=%'));

-- 4) PROVA FINAL, e esta é a que vale: depois de rodar, repita o teste
--    que achou o furo. Troque CHAVE pela publicável (Settings -> API):
--
--    curl -s -I "https://wxkgcpclxgwlxdmeaigp.supabase.co/rest/v1/templates_oco?select=id" \
--      -H "apikey: CHAVE" -H "Authorization: Bearer CHAVE" \
--      -H "Prefer: count=exact" -H "Range: 0-0" | grep -i content-range
--
--    ANTES:  content-range: 0-1/2   (anônimo via as 2 linhas)
--    DEPOIS: content-range: */0     (anônimo não vê nada)
