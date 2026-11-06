# Migrations do Supabase — TradeZen

As migrations ficam em `backend/sql/`, numeradas, e **rodam à mão** no SQL
Editor do Supabase, **em ordem**.

**`npx supabase db push` não funciona neste projeto.** Não existe pasta
`supabase/` nem migrations linkadas ao CLI — o comando não acha nada pra
enviar. Se alguma instrução mandar usar o CLI, é porque está descrevendo
outro projeto.

## Como rodar uma

1. [SQL Editor → New query](https://supabase.com/dashboard/project/wxkgcpclxgwlxdmeaigp/sql/new)
2. Cole o arquivo **inteiro**
3. **Run**
4. Mensagens de `raise notice` saem na aba de **mensagens**, não na grade
   de resultados. A grade mostra só o `select` final, quando há um.

Todas são idempotentes: rodar de novo não quebra nada.

## Como saber o que já rodou

**Não confie em lista escrita à mão** — ela desatualiza no primeiro
esquecimento. Pergunte ao banco. Esta consulta diz quais tabelas e colunas
das migrations mais recentes já existem:

```sql
select
  case
    when to_regclass('public.profiles') is null                   then '002/017 FALTA'
    else '002/017 ok' end                                         as perfis,
  case
    when to_regclass('public.graficos_do_usuario') is null        then '020 FALTA'
    else '020 ok' end                                             as graficos,
  case
    when to_regclass('public.sessao_telas') is null               then '022 FALTA'
    else '022 ok' end                                             as telas,
  case
    when not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'templates_oco'
        and column_name = 'status_revisao')                       then '025 FALTA'
    else '025 ok' end                                             as status_revisao;
```

A própria **025** termina com uma conferência mais detalhada: lista cada
tabela de marcação como `ok` ou `FALTANDO`, e as contagens por status.

## A lista

| # | Arquivo | O que faz |
|---|---|---|
| 001 | `001_enable_rls.sql` | Liga Row Level Security nas tabelas que já existiam |
| 002 | `002_profiles.sql` | Perfis + trigger que cria a linha no cadastro |
| 003 | `003_criar_usuarios.sql` | Tabela de usuários (magic link) |
| 004 | `004_fechar_tabelas_admin.sql` | Fecha ao público as tabelas que só o backend usa |
| 005 | `005_alertas.sql` | Alertas de padrão |
| 006 | `006_templates_bandeira.sql` | Primeira tabela de marcação (bandeira) |
| 007 | `007_bandeira_6_pontos.sql` | Bandeira em 6 pontos cronológicos |
| 008 | `008_bandeira_alta_8_pontos.sql` | Bandeira de alta em 8 pontos (4 pares) |
| 009 | `009_flamulas_e_bandeira_baixa.sql` | Flâmulas + bandeira de baixa |
| 010 | `010_cunhas_e_data_p1.sql` | Cunhas + coluna `data_p1` |
| 011 | `011_anotacoes_nos_templates.sql` | Etiquetas de texto no template |
| 012 | `012_canais.sql` | Canal de alta e de baixa |
| 013 | `013_data_p1_dos_antigos.sql` | Preenche `data_p1` do que já estava salvo |
| 014 | `014_padroes_reversao_e_consolidacao.sql` | As 8 tabelas dos padrões novos |
| 015 | `015_canal_4_pontos.sql` | Canal passa a ter 4 pontos |
| 016 | `016_fracassos_bandeira.sql` | Fracassos de bandeira (contraexemplos de forma) |
| 017 | `017_profiles_e_planos.sql` | Planos free/premium. **Sem policy de UPDATE em `profiles`, de propósito**: é o que impede o usuário se promover a premium |
| 018 | `018_perfil_do_usuario.sql` | O perfil que o usuário edita |
| 019 | `019_preferencias_desenho.sql` | Preferências de desenho |
| 020 | `020_graficos_do_usuario.sql` | Gráficos salvos do usuário |
| 021 | `021_preferencias_grafico.sql` | Aparência do gráfico por usuário |
| 022 | `022_sessao_telas.sql` | As telas que a pessoa deixou abertas |
| 023 | `023_mover_entre_padrao_e_fracasso.sql` | Mover marcação entre "é o padrão" e "não é" |
| 024 | `024_diagnostico_templates.sql` | **Só leitura.** Diagnóstico: quantos templates estão corrompidos e por quê |
| 025 | `025_status_revisao.sql` | Status de revisão nas **21** tabelas de marcação |

## Sobre a 025 — três coisas que não se podem mudar nela

Mais de uma vez chegou uma versão "corrigida" da 025 que quebraria a tela.
O que o backend exige, e por quê:

| Na migration | Por que | Se mudar |
|---|---|---|
| CHECK com **5** valores, incluindo `aberto` | `aberto` entra sozinho ao abrir a marcação, e de propósito **não** quer dizer "aprovada" — 3 segundos de tela não são julgamento | Violação de constraint em **toda** abertura de marcação |
| Coluna `status_em` (e não `visto_em`) | É o nome que `admin_status_revisao.py` lê e escreve | Coluna faltando → 503 permanente, que é justo o erro que se queria tirar |
| `revisto_por` é **`text`** | `require_admin` devolve o **email** do admin, não um UUID | Todo clique em "Revisto" falha por tipo |
| Inclui **`templates_niveis`** | Níveis é tela de marcação como as outras: tem `ticker`, `timeframe`, `resultado`, `data_p1` e rota própria em `TABELAS`. Não tem relação com Fibonacci | A tela de Níveis fica sem status de revisão |

A lista das 21 tabelas é a mesma de `TABELAS` em
`backend/admin_status_revisao.py`, e o teste
`frontend/src/test/rotasStatusEmSincronia.test.js` compara os dois
arquivos — se uma lista mudar sem a outra, o teste quebra.
