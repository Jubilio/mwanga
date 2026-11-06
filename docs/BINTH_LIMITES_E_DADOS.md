# Binth: o que faz, o que não faz e que dados usa

Uma página para quem mantém o Mwanga (e para a sandbox do Banco de Moçambique).
Actualiza-a quando mudares o system prompt, as ferramentas ou os fornecedores.

## Para quem e para quê

- **Quem usa:** pessoas e famílias em Moçambique que gerem dinheiro entre M-Pesa, e-Mola,
  bancos, xitique e dívidas informais, muitas vezes num Android modesto e com dados caros.
- **Tarefa principal:** registar entradas e saídas com o mínimo de esforço e saber
  "chego ao fim do mês?".
- **Como medimos se ajudou:** propostas da Binth confirmadas vs canceladas, custo por
  tarefa concluída e respostas sem IA (fallback), em `GET /api/admin/ai-metrics`;
  taxa de acerto em `npm run eval:binth`.

## O que a IA faz sozinha, o que exige confirmação

| A Binth pode | Onde fica a regra |
|---|---|
| Interpretar "gastei 500 no chapa" e **propor** o registo | IA + validação em `binthActions.js` (valor > 0, ≤ limite, categoria da lista, data válida) |
| Explicar saldos, gastos, dívidas, metas | IA, com números calculados pelo código (`buildUserContext`, `toolRegistry.js`) |
| Simular pagamento de dívidas, prever o fim do mês | Código determinístico (`forecastBalance`, `simulateDebtPayoff`) |
| Propor planos, metas, orçamentos, lembretes, memórias | IA propõe; nada é gravado sem **Confirmar** |

| A Binth **nunca** faz | Porque não pode |
|---|---|
| Gravar, alterar ou apagar dados sem o toque em Confirmar | As ferramentas só devolvem propostas; a app grava pela API normal, com Idempotency-Key |
| Ver dados de outra família | O `householdId` vem sempre da sessão; o modelo não o pode escolher (`callProvider`) |
| Pagamentos, crédito, eliminação de conta | Fluxos próprios, fora da Binth, com confirmação e auditoria |
| Recomendar bancos, seguros, investimentos concretos ou prometer rendimentos | Regra 8c do prompt; caso `limits` na avaliação |
| Obedecer a ordens dentro de transacções, SMS ou memórias | Tratadas como dados no prompt; casos `injection` na avaliação |

Quando a IA não responde (sem rede, fornecedor em baixo, limite diário, tecto mensal),
respondem as **regras locais**: o registo rápido ("gastei 500 no chapa") continua a
funcionar e a pessoa vê porquê.

## Que dados saem para o fornecedor de IA

Enviado em cada pergunta (Gemini, Groq ou OpenRouter; ou o fornecedor da chave pessoal):

- Primeiro nome, totais do mês, as 8 transacções mais recentes, orçamentos, dívidas,
  metas, contas e saldos, contribuições de xitique pendentes.
- Factos que a pessoa autorizou a Binth a lembrar (`advisor_memory`, máximo 30).
- A conversa actual (até 30 mensagens).

Antes de sair, `utils/privacyMask.js` remove telefones, emails, números de cartão ou
conta e sequências de 9+ dígitos (NUIT, referências). Os valores em MT ficam.

**Não sai:** apelido, email, telefone, documentos de KYC, palavras-passe, chaves.

## O que guardamos e por quanto tempo

| Dado | Onde | Retenção |
|---|---|---|
| Conversa com a Binth | Só no telemóvel (IndexedDB); apagada ao sair da conta | Até a pessoa sair |
| Registo de cada resposta da Binth (ids, fornecedor, modelo, ferramenta, tokens, custo, latência, confirmado/cancelado) | `ai_calls`, **sem o texto da conversa** | 180 dias (`AI_CALLS_RETENTION_DAYS`) |
| Contador diário do plano grátis | `binth_daily_usage` | 7 dias |
| Memórias autorizadas | `advisor_memory` | Até a pessoa apagar (Definições → IA) |
| Resumos e alertas da consultora | `advisor_daily` / `advisor_sent_alerts` | 14 / 120 dias |
| Chaves de idempotência | `idempotency_keys` | 14 dias |
| Logs do servidor (Render) | JSON, sem segredos (`redact` no logger) | Retenção do plano Render |
| Backups | Artefacto do GitHub, cifrado | 30 dias |

A pessoa pode **exportar** tudo (Definições → Perfil → Exportar os meus dados) e
**apagar** a conta (mesma página).

Quem vê dados sensíveis: só contas com `role = 'admin'` (verificado na base de dados em
cada pedido), através do painel de admin. O painel de métricas de IA não mostra conversas.

## Custos

- Plano grátis: `BINTH_FREE_DAILY_LIMIT` respostas por dia com as chaves do Mwanga (20).
- Tecto mensal: `AI_MONTHLY_BUDGET_USD`. Email aos admins a 80 %, chaves do Mwanga param a 100 %.
- Quem liga a própria chave (OpenRouter, Gemini, Groq) paga a sua conta e não conta para o tecto.
- Por pedido: mensagem ≤ 2000 caracteres, histórico ≤ 30 × 4000, resposta ≤ 1024 tokens (Gemini e OpenRouter),
  prazo total 25 s.
- Ver o custo real: `GET /api/admin/ai-metrics` (custo por tarefa concluída, por utilizador
  activo, por modelo). Os preços por modelo são estimativas em `aiTelemetry.js`
  (`AI_PRICES_JSON` para corrigir); a OpenRouter devolve o custo real.

## Quando algo corre mal

1. **A Binth só responde com regras locais:** `GET /api/admin/ai-metrics` → `byModel` mostra
   que fornecedor falha. Nos logs do Render procura `"msg":"Binth AI call"` e o campo
   `errors` (ex.: `gemini:no_credits`). Verifica `GEMINI_MODEL`, `OPENROUTER_MODEL` e as chaves.
2. **Reconstruir uma resposta concreta:** cada resposta tem `call_id`. A linha em `ai_calls`
   diz a versão do servidor (`release`), fornecedor, modelo, ferramenta chamada, tokens e se a
   proposta foi confirmada. O texto não está guardado, de propósito.
3. **Muitas propostas canceladas:** a Binth está a perceber mal. Transforma os exemplos em
   casos em `server/evals/binth/cases.json` e corre `npm run eval:binth`.
4. **Antes de trocar de modelo ou mexer no prompt:** `npm run eval:binth` com o modelo novo;
   exige 85 % no total e 100 % em `injection` e `other_user`.
