-- TRADEZEN — CONSENTIMENTO DE MARKETING (LGPD art. 7º, I)
-- =======================================================
--
-- Rode no SQL Editor do Supabase:
--   https://supabase.com/dashboard/project/wxkgcpclxgwlxdmeaigp/sql/new
--
-- POR QUE UMA COLUNA PRÓPRIA, E NÃO "tem telefone = pode mandar":
-- o telefone é guardado com base legal de LEGÍTIMO INTERESSE, só para
-- alerta e suporte. Marketing exige CONSENTIMENTO, que é outra base legal
-- (art. 7º, I) e precisa ser demonstrável, específico e revogável. Deduzir
-- consentimento da existência do telefone é exatamente o que a LGPD não
-- aceita — e deixaria o projeto sem como provar que o titular concordou.
--
-- `not null default false`: consentimento que vem ligado por omissão não é
-- consentimento. Quem já tem conta nasce com false, ou seja, sem permissão
-- de marketing até marcar a caixa.
--
-- `consentimento_em`: a data é parte da prova. Sem ela não há como mostrar
-- QUANDO o titular concordou, e a revogação também fica sem registro.

alter table profiles
  add column if not exists marketing_whatsapp boolean not null default false,
  add column if not exists marketing_em timestamptz;

comment on column profiles.marketing_whatsapp is
  'Consentimento LGPD art. 7 I para marketing por WhatsApp. Revogavel. Nunca deduzir de outro campo.';
comment on column profiles.marketing_em is
  'Quando o consentimento foi dado ou revogado. E a prova da data.';

-- O trigger do cadastro passa a copiar a escolha feita na caixinha. Sem
-- isto, marcar a caixa no cadastro não chegaria ao banco: o valor viaja no
-- raw_user_meta_data do auth.users e alguém tem que trazer pra cá.
--
-- `coalesce(..., false)`: cadastro antigo, ou qualquer chamada que não
-- mande o campo, cai em "não consentiu".
create or replace function public.criar_perfil_no_cadastro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, nome, marketing_whatsapp, marketing_em)
  values (
    new.id,
    new.raw_user_meta_data ->> 'nome',
    coalesce((new.raw_user_meta_data ->> 'marketing_whatsapp')::boolean, false),
    case when (new.raw_user_meta_data ->> 'marketing_whatsapp')::boolean
         then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

notify pgrst, 'reload schema';

-- Conferência
select count(*) as perfis,
       count(*) filter (where marketing_whatsapp) as consentiram
from profiles;
