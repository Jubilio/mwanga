# Categorias de despesas com ML

**Recomendação:** sugerir a categoria com um modelo pequeno que aprende o histórico de cada família no próprio telemóvel (memória + Naive Bayes + regras partilhadas), e medir em produção quantas sugestões são mantidas ou corrigidas. Sem LLM: não custa nada, funciona offline e as descrições nunca saem do aparelho.

## Enquadramento

| | |
|---|---|
| **Decisão** | Que categoria fica pré-seleccionada quando a pessoa regista uma despesa (formulário, importação de SMS, sincronização Android). Uma categoria errada estraga orçamentos, a pirâmide de mordomia e os avisos da Binth. |
| **Alvo** | A categoria de cada transacção (15 categorias de `MAIN_CATEGORIES`). |
| **Dados** | As transacções da própria família (até 1000 já carregadas na app). As etiquetas são as categorias escolhidas ou corrigidas pela pessoa. Linhas de SMS gravadas automaticamente como `other` **não** contam como etiqueta: ninguém as escolheu. |
| **Custo dos erros** | Uma sugestão errada aceite sem olhar é pior do que não sugerir, porque passa despercebida. Por isso só se pré-preenche acima de um limiar de confiança e, na sincronização Android (sem revisão humana), o limiar é mais alto (0,70). |
| **Critério de sucesso** | Bater o comportamento actual (formulário abre sempre em "Alimentação"; SMS grava sempre "Outros") e as regras partilhadas, com precisão ≥ 90 % quando sugere. Em produção: ≥ 80 % das sugestões mantidas. |

## Como funciona (`src/utils/categoryModel.js`)

1. **Memória:** a mesma descrição já foi categorizada ("Tio Zeca", "Shoprite Matola", "CENTRO MED")? Usa a escolha mais frequente. Uma escolha anterior dá confiança 0,67; três iguais, 0,80.
2. **Modelo:** Naive Bayes multinomial sobre as palavras e pares de palavras da descrição, treinado com as transacções da família, separado entre entradas e saídas. Palavras do canal ("M-Pesa", "Compra", "Transferência enviada"), números e acentos são ignorados.
3. **Regras:** palavras comuns em Moçambique (chapa, txopela, Credelec, FIPAG, Shoprite, propina, dízimo...) para famílias novas e palavras nunca vistas.
4. **Nada:** sem confiança suficiente, não sugere e o formulário fica como estava.

Uma categoria de entrada (salário) nunca é sugerida para uma despesa, nem o contrário. Quando a pessoa muda a categoria à mão, a sugestão pára para esse registo. Uma correcção (editar a categoria) passa a ser o exemplo de treino seguinte, sem passo extra.

## Avaliação

`server/evals/categorias/run.mjs` reproduz o uso real: para cada família, por ordem de data, prevê cada transacção só com as anteriores e depois aprende-a (avaliação prequencial, sem fuga de informação do futuro). Intervalos de 95 % por bootstrap sobre famílias.

```bash
cd server
node evals/categorias/run.mjs                    # famílias sintéticas
DATABASE_URL=... node evals/categorias/run.mjs --db   # dados reais, só agregados
```

Resultado em dados **sintéticos** (60 famílias, 13 383 transacções, limiar 0,55):

| Estratégia | Exactidão (IC95) | Macro-F1 (IC95) | Cobertura | Precisão quando sugere |
|---|---|---|---|---|
| Actual (Alimentação / Salário) | 22,6 % (21,1–23,9) | 7,5 % | 100 % | 22,6 % |
| Só regras | 65,7 % (64,4–67,1) | 69,0 % | 66,8 % | 91,7 % |
| **Modelo** | **84,7 % (83,6–85,8)** | **85,7 %** | 89,1 % | **93,0 %** |

Curva de aprendizagem do modelo: 70 % nas primeiras 10 transacções de uma família (praticamente as regras), 75 % entre 10 e 29, 83 % entre 30 e 99, 88 % a partir de 100. A confiança declarada é conservadora (0,55–0,65 acerta 90 %).

**Limites destes números:** os dados sintéticos foram escritos por quem escreveu as regras, por isso as regras estão provavelmente sobrestimadas; as famílias sintéticas têm nomes pessoais, comerciantes ambíguos (Vodacom, Game, Galp), erros de escrita, texto de SMS e 4 % de etiquetas erradas, mas não substituem dados reais. **O número que conta é o do `--db`**, que só imprime agregados (nenhuma descrição, id ou família).

O teste `src/utils/categoryModel.test.js` falha se o modelo cair abaixo de 80 % ou deixar de bater as regras por 10 pontos nos dados sintéticos.

## Monitorização em produção

- **Sugestões no formulário:** cada registo manual com sugestão envia `POST /api/behavior/category-suggestion` só com categorias, confiança, origem e versão (nunca a descrição). Fica em `behavior_events` como `category_suggestion_accepted` ou `category_suggestion_corrected`.
- **Correcções posteriores:** editar a categoria de qualquer transacção grava `transaction_category_corrected` (com `sms` ou `manual`), o que apanha erros da importação de SMS.

```sql
-- Taxa de aceitação por semana e origem
SELECT date_trunc('week', created_at) AS semana,
       context->>'source' AS origem,
       COUNT(*) AS sugestoes,
       ROUND(AVG(CASE WHEN event_name = 'category_suggestion_accepted' THEN 1 ELSE 0 END), 3) AS aceites
FROM behavior_events
WHERE event_name IN ('category_suggestion_accepted', 'category_suggestion_corrected')
GROUP BY 1, 2 ORDER BY 1 DESC, 2;

-- Correcções de transacções vindas de SMS (de -> para)
SELECT context->>'from' AS de, context->>'to' AS para, COUNT(*)
FROM behavior_events
WHERE event_name = 'transaction_category_corrected' AND event_source = 'sms'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 20;
```

**Quando agir:** se a aceitação descer abaixo de 80 % numa origem, rever essa camada (subir o limiar, corrigir regras). As correcções de SMS mais frequentes dizem que regras faltam.

## Próximas fases

1. **Agora (este PR):** memória + Naive Bayes + regras no telemóvel; avaliação; monitorização.
2. **Com 4–6 semanas de eventos:** correr `--db`, ajustar o limiar pela taxa de aceitação real e pela curva de calibração.
3. **Se uma família nova com poucas transacções continuar fraca:** um modelo global (regressão logística sobre palavras) treinado com descrições de todas as famílias, só depois de rever privacidade e consentimento, porque mistura dados de várias famílias.
4. **Binth no servidor:** `guessCategory` em `binthActions.js` ainda usa só regras; pode passar a usar o mesmo modelo com o histórico da família.

## Riscos

| Risco | Mitigação |
|---|---|
| A pessoa aceita sugestões erradas sem olhar | Limiar de confiança; nota "Sugerida pelo teu histórico. Podes mudar." junto à categoria; limiar mais alto onde não há revisão |
| Etiquetas erradas reforçam-se (feedback loop) | Sugestões aceites contam como etiqueta, mas cada correcção pesa igual e muda a memória; a monitorização mede correcções |
| Família nova sem histórico | Regras partilhadas; a curva mostra a melhoria a partir de ~10 transacções |
| Privacidade | Treino e inferência no aparelho; o servidor só recebe categorias e confiança |
| Telemóveis fracos | Treinar 1000 transacções leva poucos milissegundos e só repete quando a lista muda |

## Leitura

- Murphy, *Probabilistic Machine Learning: An Introduction* (Livro 1): classificadores generativos e Naive Bayes; regressão logística para a fase 3. probml.github.io/pml-book
- *Introduction to Machine Learning Systems*: monitorização, deriva e ciclos de feedback com etiquetas dos utilizadores. mlsysbook.ai
