# Backup e restauro da base de dados

A existência de uma cópia não garante que seja utilizável. Por isso o backup do Mwanga
**testa o restauro de cada vez que corre**.

## O que acontece automaticamente

O workflow `.github/workflows/db-backup.yml` corre todas as segundas-feiras às 02:30 UTC
(e quando o carregas à mão em *Actions → Database backup → Run workflow*):

1. `pg_dump` do esquema `public` da produção (Supabase).
2. Restaura a cópia numa base PostgreSQL 17 vazia, criada só para o teste.
3. Compara o número de linhas de **cada tabela** entre a produção e a cópia restaurada.
   Falha se faltar uma tabela ou se a diferença passar de 5 linhas ou 1 %.
4. Cifra a cópia com AES-256 (`gpg`) e guarda-a 30 dias como artefacto do workflow.

O repositório é público: o log só mostra o número de tabelas, e a cópia só sai do
runner cifrada.

Se o workflow ficar vermelho, o backup dessa semana **não é fiável**: abre o log, vê a
linha `MISSING` ou `MISMATCH` e corrige antes da semana seguinte.

## Configurar (uma vez)

Em GitHub → *Settings → Secrets and variables → Actions → New repository secret*:

| Segredo | Valor |
|---|---|
| `BACKUP_DATABASE_URL` | No Supabase: *Project Settings → Database → Connection string → Session pooler* (porta **5432**). O *transaction pooler* (6543) não serve para `pg_dump`. |
| `BACKUP_PASSPHRASE` | Uma frase longa e aleatória, por exemplo `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. **Guarda-a fora do GitHub** (gestor de palavras-passe): sem ela a cópia não abre. |

Depois corre o workflow à mão uma vez e confirma que termina com `RESTORE OK`.

Sem estes segredos o workflow não falha: termina com um aviso a dizer o que falta.

**Supabase também faz backups?** No plano gratuito não há backups que possas descarregar;
no Pro há cópias diárias (7 dias) e, pago à parte, *Point-in-Time Recovery*. O workflow
acima funciona em qualquer plano e é a cópia que controlas.

## Restaurar (quando algo correu mal)

Pratica isto numa base de teste antes de precisares dele a sério.

1. Descarrega o artefacto `mwanga-db-backup` da execução que queres
   (*Actions → Database backup → execução → Artifacts*). Vem num `.zip`.
2. Decifra:
   ```bash
   unzip mwanga-db-backup.zip
   gpg --decrypt --output mwanga.dump mwanga-AAAA-MM-DD.dump.gpg   # pede a BACKUP_PASSPHRASE
   ```
3. **Primeiro, restaura para uma base nova** (outro projecto Supabase ou um PostgreSQL local),
   nunca por cima da produção:
   ```bash
   pg_restore --no-owner --no-privileges --dbname="$URL_DA_BASE_NOVA" mwanga.dump
   ```
   O erro `schema "public" already exists` é normal.
4. Confirma os dados (por exemplo, as últimas transacções de uma conta tua) e só então:
   - **Perda total:** aponta `DATABASE_URL` no Render para a base nova e faz *Manual Deploy*.
   - **Perda parcial** (uma tabela apagada por engano): copia só essa tabela da base nova
     para a produção com `pg_dump --table=nome | psql`.
5. Regista o que aconteceu e porquê.

## Reverter uma versão da aplicação

| Parte | Como voltar atrás |
|---|---|
| API (Render) | *Render → serviço → Events → deploy anterior → Rollback*. |
| Web (Vercel) | *Vercel → Deployments → deploy anterior → Promote to Production*. |
| Android | As versões anteriores ficam em GitHub Releases. A página /baixar descarrega a release marcada como *Latest*: marca a anterior como *Latest* (ou apaga a má) e quem instalar recebe a anterior. |
| Base de dados | As tabelas novas são criadas com `CREATE TABLE IF NOT EXISTS` e as colunas novas são aditivas, por isso uma API anterior continua a funcionar com a base actual. Uma alteração destrutiva (apagar ou renomear coluna) exige backup testado antes. |
