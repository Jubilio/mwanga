# Ambiente de testes (staging)

Hoje cada merge para `main` vai directamente para produção. Um ambiente de testes deixa
experimentar uma mudança com dados falsos antes de chegar às pessoas.

Custo: zero no plano gratuito do Render, Vercel e Supabase. Tempo: cerca de 30 minutos.

## 1. Base de dados de testes (Supabase)

1. Cria um segundo projecto no Supabase, por exemplo `mwanga-staging`.
2. Copia o esquema da produção, **sem dados**:
   ```bash
   pg_dump --schema-only --no-owner --no-privileges --schema=public "$URL_PRODUCAO" > esquema.sql
   psql "$URL_STAGING" -f esquema.sql
   ```
3. Nunca copies dados reais de pessoas para staging. Cria contas de teste na própria app.

## 2. API de testes (Render)

1. *Render → New → Web Service* a partir do mesmo repositório, nome `mwanga-staging`,
   ramo `main` (ou um ramo `staging` se quiseres aprovar antes).
2. Variáveis de ambiente: as mesmas da produção, **excepto**:
   - `DATABASE_URL` = a base de staging.
   - `JWT_SECRET`, `AI_CREDENTIALS_ENCRYPTION_KEY`, `FILE_ENCRYPTION_KEY`: valores **novos**,
     diferentes da produção.
   - Chaves de IA: uma chave separada com limite baixo, e `AI_MONTHLY_BUDGET_USD=2`.
   - Sem `GMAIL_*`, `EVOLUTION_*` e PaySuite reais (para não enviar emails, mensagens ou
     cobranças a pessoas reais).
   - `FRONTEND_URL` = o URL de staging da Vercel.
3. Activa *Pull Request Previews* no serviço, se quiseres uma API por PR.

## 3. Web de testes (Vercel)

A Vercel já cria um *Preview Deployment* para cada PR. Em *Project → Settings →
Environment Variables*, define `VITE_API_URL` **só para Preview** com o URL da API de
staging. Assim os previews nunca falam com a API de produção.

## 4. Rotina

1. Abre o PR → a CI corre os testes → a Vercel cria o preview ligado a staging.
2. Experimenta o fluxo alterado no preview (no telemóvel também).
3. Se mexeu na Binth: `npm run eval:binth` (ver `server/evals/binth/README.md`).
4. Merge → produção.

## Alterações à base de dados

As tabelas são criadas no arranque (`CREATE TABLE IF NOT EXISTS`) e os SQL em
`server/migrations/` são aplicados à mão. Regra até haver uma ferramenta de migrações:

- Aplica primeiro em staging, depois em produção, e anota no PR "migração aplicada em
  produção em AAAA-MM-DD".
- Só alterações aditivas (tabela ou coluna nova). Apagar ou renomear exige backup
  testado no mesmo dia (`docs/BACKUP_E_RESTAURO.md`).
