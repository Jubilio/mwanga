# Score de crédito do Mwanga

Este documento explica, em linguagem simples, como o Mwanga calcula o score de
crédito de um utilizador. Serve para o utilizador, para os parceiros de crédito
e para o regulador (Banco de Moçambique). O código está em
`server/src/services/scoring.service.js`.

## Papel do Mwanga

- O Mwanga **não concede crédito** nem move dinheiro. Calcula um score e
  encaminha o pedido para um parceiro licenciado, que decide e entrega o dinheiro.
- O score só é calculado quando o utilizador **marca a autorização** no último
  passo do pedido de crédito. A data dessa autorização fica em
  `credit_applications.score_consent_at` e no `audit_log`
  (`CREDIT_SCORE_CONSENT`). Sem autorização o servidor recusa o pedido.
- Quando o parceiro confirma que entregou o dinheiro, um administrador regista
  a referência do contrato do parceiro (`partner_reference`). Só então o
  Mwanga cria o plano de prestações, para o utilizador acompanhar a dívida.

## Como o score é calculado

O score vai de **0 a 1000**. Começa em **500** e soma ou subtrai pontos em três
partes. O resultado é devolvido com o detalhe (`breakdown`) de cada parte.

| Parte | Dados usados | Regra | Pontos |
|---|---|---|---|
| Rendimento | Transacções do tipo `receita` da família nos últimos 3 meses | Valor médio por transacção acima de 20 000 MZN | +200 |
| | | acima de 10 000 MZN | +100 |
| | | acima de 0 | +50 |
| | | sem receitas | 0 |
| Pagamentos | Prestações de empréstimos anteriores registados no Mwanga (`loan_payments`) | 90% ou mais pagas | +300 |
| | | 70% a 89% pagas | +150 |
| | | 50% a 69% pagas | 0 |
| | | menos de 50% pagas | −200 |
| | | sem empréstimos anteriores | 0 |
| Actividade | SMS financeiros importados e reconhecidos (`financial_messages`, estado `parsed`) | mais de 10 | +100 |

**Nível de risco:** 700 ou mais = baixo; 500 a 699 = médio; abaixo de 500 = alto.

**Sinal de pedidos repetidos:** se o score for pedido mais de 5 vezes numa
hora (só com a cache Upstash activa), retira 100 pontos e o risco passa a
"extremo". Serve para detectar quem tenta vários pedidos seguidos.

**Cache:** o resultado fica guardado 24 horas.

**Regra de esforço:** independentemente do score, o pedido é recusado se a
prestação mensal passar de 1/3 do salário indicado nas definições.

## Dados que **não** entram no score

Género, idade, província, estado civil, contactos, localização e o texto
livre das transacções não são usados.

## Limitações conhecidas (a corrigir antes de um piloto)

1. O "rendimento" usa a média por transacção, não o total mensal. Quem recebe
   o salário em várias parcelas fica com menos pontos.
2. Os limites (20 000, 10 000, 90%...) foram escolhidos à mão e ainda não
   foram validados com dados reais de pagamento.
3. Rendimento e actividade são da família inteira, mas o score fica associado
   à pessoa que pede.
4. Ainda não há medição de diferenças por género ou região. Num piloto, o
   parceiro e o Mwanga devem comparar a taxa de aprovação e de incumprimento
   por grupo.

## Direitos do utilizador

- Pedir ao suporte o seu score e o detalhe de cada parte (a API devolve o `breakdown` com o pedido; ainda não é mostrado no ecrã).
- Recusar a autorização: a app continua a funcionar, só não pode pedir crédito.
- Apagar a conta em Definições > Perfil > Apagar conta, o que apaga também o
  score, os pedidos e os documentos.
