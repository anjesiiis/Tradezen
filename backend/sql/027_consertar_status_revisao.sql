-- TRADEZEN — 027: CONSERTAR O QUE SOBROU DE VERSÕES ERRADAS DA 025
-- ================================================================
-- Diagnostica E conserta num Run só. Não toca em NADA da 026.
--
-- POR QUE ISTO EXISTE
-- O backend pede exatamente estas quatro colunas:
--     select id, status_revisao, status_em, revisto_em, revisto_por
-- Se UMA faltar, o PostgREST recusa o select inteiro e a tela mostra o
-- banner vermelho. Como a 026 (qualidade) funciona na mesma tabela, com
-- a mesma autenticação e o mesmo padrão de rota, o problema não é cache,
-- nem deploy, nem permissão: é coluna.
--
-- O SUSPEITO PRINCIPAL é `status_em`. Circularam versões "corrigidas" da
-- 025 que criam `visto_em` no lugar dela. Rodar uma dessas deixa a tabela
-- com status_revisao + visto_em, e o select do backend quebra em
-- `status_em` — o sintoma é idêntico a não ter rodado migration nenhuma.
--
-- O QUE ISTO FAZ, por tabela:
--   1. RENOMEIA visto_em → status_em quando só a primeira existe. Renomear
--      e não criar do zero: a coluna pode já ter datas, e criar uma vazia
--      ao lado jogaria fora quando cada marcação foi olhada.
--   2. Cria o que ainda faltar (igual à 025).
--   3. Derruba trava CHECK de outra versão. As versões de 4 valores não
--      têm 'aberto', e é 'aberto' que entra sozinho ao abrir uma
--      marcação: com ela no lugar, TODA abertura falha.
--   4. Converte revisto_por de uuid pra text, com a FK pra auth.users se
--      houver. O backend grava o EMAIL do admin ali; uuid faz todo
--      clique em "Revisto" falhar por tipo.
--
-- Seguro rodar mais de uma vez. Tabela que já está certa não é tocada.
--
-- COMO RODAR
--   https://supabase.com/dashboard/project/wxkgcpclxgwlxdmeaigp/sql/new
--   Cole inteiro, Run, espere ~10s, Cmd+Shift+R no TradeZen.

do $$
declare
  t text;
  c record;
  tipo text;
  renomeadas int := 0;
  travas int := 0;
  tipos int := 0;
  tabelas text[] := array[
    'templates_oco', 'templates_topo_duplo', 'templates_niveis',
    'templates_bandeira_alta', 'templates_bandeira_baixa',
    'templates_bandeira_alta_fracasso', 'templates_bandeira_baixa_fracasso',
    'templates_flamula_alta', 'templates_flamula_baixa',
    'templates_cunha_alta', 'templates_cunha_baixa',
    'templates_canal_alta', 'templates_canal_baixa',
    'templates_fundo_duplo', 'templates_oco_invertido',
    'templates_topo_triplo', 'templates_fundo_triplo',
    'templates_triangulo_ascendente', 'templates_triangulo_descendente',
    'templates_triangulo_simetrico', 'templates_retangulo'
  ];
  existe boolean;
begin
  foreach t in array tabelas loop
    if to_regclass('public.' || t) is null then
      raise notice 'pulada %: tabela nao existe', t;
      continue;
    end if;

    -- 1. visto_em de versao errada vira status_em, PRESERVANDO as datas
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name=t and column_name='visto_em')
       and not exists (select 1 from information_schema.columns
               where table_schema='public' and table_name=t and column_name='status_em')
    then
      execute format('alter table %I rename column visto_em to status_em', t);
      renomeadas := renomeadas + 1;
      raise notice 'ok %: visto_em renomeada para status_em', t;
    end if;

    -- 2. o que ainda faltar
    execute format($f$
      alter table %I
        add column if not exists status_revisao text not null default 'nao_visto',
        add column if not exists status_em timestamptz,
        add column if not exists revisto_em timestamptz,
        add column if not exists revisto_por text
    $f$, t);

    -- 3. trava de outra versao: qualquer CHECK que fale de status_revisao
    --    e nao seja a desta migration. Nome fixo nao serve, porque cada
    --    versao batizou a dela de um jeito.
    for c in
      select conname from pg_constraint
      where conrelid = ('public.' || t)::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%status_revisao%'
        and conname <> t || '_status_revisao_ck'
    loop
      execute format('alter table %I drop constraint %I', t, c.conname);
      travas := travas + 1;
      raise notice 'ok %: trava % derrubada (era de outra versao)', t, c.conname;
    end loop;

    execute format('alter table %I drop constraint if exists %I', t, t || '_status_revisao_ck');
    execute format($f$
      alter table %I add constraint %I
        check (status_revisao in ('nao_visto','aberto','visto','em_andamento','revisto'))
    $f$, t, t || '_status_revisao_ck');

    -- 4. revisto_por uuid vira text (o backend grava email)
    select data_type into tipo from information_schema.columns
      where table_schema='public' and table_name=t and column_name='revisto_por';
    if tipo = 'uuid' then
      for c in
        select conname from pg_constraint
        where conrelid = ('public.' || t)::regclass and contype = 'f'
          and pg_get_constraintdef(oid) ilike '%revisto_por%'
      loop
        execute format('alter table %I drop constraint %I', t, c.conname);
      end loop;
      execute format('alter table %I alter column revisto_por type text using revisto_por::text', t);
      tipos := tipos + 1;
      raise notice 'ok %: revisto_por uuid convertida para text', t;
    end if;

    execute format(
      'create index if not exists %I on %I (status_revisao) where status_revisao <> ''nao_visto''',
      'idx_' || t || '_status_revisao', t);
  end loop;

  raise notice '--- % renomeadas, % travas derrubadas, % tipos corrigidos ---',
    renomeadas, travas, tipos;
end $$;

notify pgrst, 'reload schema';
notify pgrst, 'reload config';

-- Conferência: o select do backend, tabela por tabela. Esperado em todas
-- as 21 linhas: as 4 colunas presentes, revisto_por em text, e 'aberto'
-- aceito pela trava.
with esperadas(coluna) as (
  values ('status_revisao'), ('status_em'), ('revisto_em'), ('revisto_por')
),
tabelas(tabela) as (
  select unnest(array[
    'templates_oco','templates_topo_duplo','templates_niveis',
    'templates_bandeira_alta','templates_bandeira_baixa',
    'templates_bandeira_alta_fracasso','templates_bandeira_baixa_fracasso',
    'templates_flamula_alta','templates_flamula_baixa',
    'templates_cunha_alta','templates_cunha_baixa',
    'templates_canal_alta','templates_canal_baixa',
    'templates_fundo_duplo','templates_oco_invertido',
    'templates_topo_triplo','templates_fundo_triplo',
    'templates_triangulo_ascendente','templates_triangulo_descendente',
    'templates_triangulo_simetrico','templates_retangulo'
  ])
)
select
  t.tabela,
  count(c.column_name)                                             as das_4_colunas,
  string_agg(e.coluna, ', ') filter (where c.column_name is null)   as faltando,
  (select data_type from information_schema.columns
     where table_schema='public' and table_name=t.tabela
       and column_name='revisto_por')                               as tipo_revisto_por,
  (select count(*) from pg_constraint
     where conrelid = ('public.' || t.tabela)::regclass and contype='c'
       and pg_get_constraintdef(oid) ilike '%aberto%')               as trava_aceita_aberto
from tabelas t
cross join esperadas e
left join information_schema.columns c
  on c.table_schema='public' and c.table_name=t.tabela and c.column_name=e.coluna
where to_regclass('public.' || t.tabela) is not null
group by t.tabela
order by t.tabela;
