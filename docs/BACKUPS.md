# TradeZen — Backup e recuperação

> Atualizado em 26 de novembro de 2026.
> **Uma coisa aqui precisa ser confirmada por você** (o plano do Supabase);
> está marcada como PENDENTE no lugar certo. O resto foi verificado no código.

## O que existe, e onde

| Dado | Onde mora | Perder isso significa |
|---|---|---|
| Contas, planos, perfis, alertas, bancadas salvas | Supabase (Postgres) | Os usuários perdem acesso e configuração. Irreparável. |
| Marcações de padrão (`templates_*`, 21 tabelas) | Supabase (Postgres) | **O ativo mais caro do projeto.** São meses de marcação manual, uma por uma, à mão. Não se regenera. |
| Modelos treinados | Supabase, coluna `modelos_treinados.modelo_b64` | Recuperável: treina de novo a partir das marcações — *se* as marcações existirem. |
| Modelo `.pkl` em disco no Render | Disco efêmero do Render | Nada. É cache; morre a cada deploy de propósito (ver `.gitignore`). |
| Código | GitHub (`anjesiiis/Tradezen`, branch `principal`) | Nada, enquanto o GitHub existir. |
| Cotações e histórico de preço | Yahoo Finance / Binance, em cache de 5 min | Nada. Vem de fora, sempre. |

A conclusão prática: **o backup que importa é o do Postgres do Supabase.**
Tudo o mais ou se regenera ou está no GitHub.

## Backup automático do Supabase — PENDENTE DE CONFIRMAÇÃO

Isto depende do plano do projeto, e a diferença é grande:

- **Plano Free:** *não há* backup automático. Nenhum. Um `drop table` ou um
  `delete` sem `where` é definitivo.
- **Plano Pro:** backup diário, retenção de 7 dias, restauração pelo painel.

👉 Confira em qual plano o projeto está:
https://supabase.com/dashboard/project/wxkgcpclxgwlxdmeaigp/settings/billing

Se estiver no Free, as 21 tabelas de marcação estão sem rede de proteção —
e é o único dado do projeto que não se regenera.

## Backup manual (funciona em qualquer plano)

Os backups automáticos ficam em:
https://supabase.com/dashboard/project/wxkgcpclxgwlxdmeaigp/database/backups

Para um dump próprio, com a *connection string* do projeto
(Settings → Database → Connection string → URI):

```bash
# Dump completo (esquema + dados). Não guarde o arquivo em pasta sincronizada
# com nuvem pública: ele contém o email de todos os usuários.
pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges -Fc -f tradezen_$(date +%Y%m%d).dump

# Só as marcações (o que não se regenera), se quiser um arquivo pequeno e frequente
pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges \
  $(psql "$SUPABASE_DB_URL" -Atc "select string_agg('-t '||tablename,' ') from pg_tables where schemaname='public' and tablename like 'templates\_%'") \
  -f templates_$(date +%Y%m%d).sql
```

Restaurar:

```bash
pg_restore --no-owner --no-privileges -d "$SUPABASE_DB_URL" tradezen_AAAAMMDD.dump
```

## O que NÃO é backup

- **`auth.users` não sai num `pg_dump` comum** do esquema `public`. A lista de
  contas é do Supabase Auth; um dump de `public` traz `profiles` (plano, nome)
  mas não traz os emails nem as senhas. Restaurar só `public` deixa perfis
  órfãos. Para as contas, o caminho é o backup do próprio Supabase.
- **O log do Render não é backup.** É volátil e não se consulta com SQL. A
  trilha de auditoria (`logs_auditoria`, sql/032) existe por isso.
- **Deploy da Vercel não é backup do banco.** Guarda o frontend, nada mais.

## Quem tem acesso

| Serviço | Quem entra |
|---|---|
| Supabase (banco, Auth, backups) | `anjesis@hotmail.com`, `ajsemsaida@gmail.com` |
| Render (backend, env vars) | o dono da conta |
| Vercel (frontend, env vars) | o dono da conta |
| GitHub | `anjesiiis` |

Conta de administrador é definida pela variável `ADMIN_EMAILS` no Render —
**não** por lista escrita no código ou no SQL. Era justamente para evitar uma
segunda lista de admins que a policy de RLS da `logs_auditoria` ficou de fora
(ver o comentário em `sql/032_logs_auditoria.sql`).

## Se o pior acontecer

1. **Não mexa mais no banco.** Um segundo erro em cima do primeiro é o que
   costuma tornar o dano irreversível.
2. Confira a data do backup mais recente no painel (link acima).
3. Restaure para um projeto **novo** do Supabase primeiro, confira, e só então
   aponte as variáveis de ambiente para ele. Restaurar por cima do que está no
   ar substitui a única cópia boa que você tem.
4. Depois de restaurar, rode as migrations que forem mais novas que o backup,
   em ordem (ver `backend/sql/MIGRATIONS.md`).
