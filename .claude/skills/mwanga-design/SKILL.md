---
name: mwanga-design
description: Use when designing, building, animating or reviewing any Mwanga screen (React + Tailwind v4, PWA + Android). Combines app-screen taste, UX quality checks and motion rules; the six hard rules live in ui-design-rules.
---

# Design, UX e movimento (Mwanga)

Esta skill diz **como o Mwanga deve parecer, funcionar e mexer-se**. As seis regras
duras (contraste 4.5:1, escala de 8px, pesos 400/700, botões de 48px, um botão principal,
sem texto em gradiente) estão em [`ui-design-rules`](../ui-design-rules/SKILL.md).
Lê as duas. Quando esta skill e a `ui-design-rules` dizem coisas diferentes, ganha a
`ui-design-rules`.

Destilada de quatro repositórios MIT (créditos no fim), adaptada a uma app de finanças
pessoais para Moçambique, usada sobretudo num telemóvel Android a 360px.

## 0. Antes de começar

1. Diz que ecrã é e qual é **a pergunta que ele responde** numa frase
   ("Quanto me sobra este mês?", "Quanto devo e a quem?"). O maior bloco do ecrã responde
   a essa pergunta. Se não consegues escrever a frase, o ecrã ainda não está decidido.
2. Diz qual é **a ação mais frequente** do ecrã. Fica a um toque do primeiro ecrã.
3. Abre o [`DESIGN.md`](../../../DESIGN.md) na raiz do repositório e usa os tokens de lá.
   Nada de hex soltos em componentes novos.

## 1. Identidade: único e elegante, não um kit

O utilizador quer um design próprio, **não uma cópia do My M-Pesa nem de outro produto**.
Não copies um `DESIGN.md` de outra marca (Revolut, Wise, Stripe...). A cara do Mwanga vem
do mundo dele:

- **Mwanga quer dizer "luz".** A luz é o motivo: o dourado (`gold`) é a luz sobre o fundo
  noite (`midnight`) e oceano (`ocean`). Usa-o com parcimónia, como luz, não como tinta.
- **Coisas que só o Mwanga tem:** o metical (MT), o xitique e a sua roda de membros,
  as SMS do M-Pesa e do e-Mola, a Binth (assistente), o dízimo/mordomia, a dívida
  informal a familiares. Um ecrã forte mostra um destes como **elemento próprio**
  (ex.: a roda do xitique com quem já recebeu e quem é o próximo; a SMS original ao lado
  do movimento importado), não um cartão genérico com um ícone.
- **Palavras do ofício** nos rótulos e estados vazios: "Ainda não pagaste a renda de
  Março", "Próximo a receber: Ana", nunca "Itens", "Registos", "Estado".
- **Dados reais com tamanho real.** Valores pequenos aparecem pequenos. Nada de
  "+12.5%" inventado, "10 000+ utilizadores" ou totais que não somam.

Teste do concorrente: troca "Mwanga" pelo nome de outra app de finanças. Se o ecrã
continua a fazer sentido igual, falta-lhe identidade.

## 2. Ecrãs de app (o Mwanga é quase todo isto)

Um ecrã de app é usado todos os dias, não lido uma vez. Regras tiradas de um estudo de
23 ecrãs de produtos reais (taste-skill, `app-screens.md`):

- **Cor nos dados, não na moldura.** A cor de destaque vai no número que importa, na
  barra do mês atual, na dívida em atraso. Navegação, cabeçalhos e cartões ficam neutros.
- **O número-resposta lidera.** O saldo (ou o valor que responde à pergunta) tem 30-36px
  e pelo menos 1.3x os outros números. Nada no ecrã é maior. Nada a 48px ou mais.
- **KPIs são texto, não azulejos.** Rótulo cinzento em cima, valor em baixo. Sem ícone
  num círculo colorido em cada KPI, sem sparkline em cada KPI. Prefere um cartão dividido
  por linhas finas a quatro cartões iguais.
- **Variações dizem bom ou mau, não sobe/desce.** Despesa a subir é má (`coral`), poupança
  a subir é boa (`leaf`). Variação zero ou sem base é cinzenta; de zero para algo escreve
  "+4 (novo)". Escreve sempre a janela: "vs. mês passado".
- **Números:** `tabular-nums`, alinhados à direita em listas e tabelas, sempre com `fmt()`
  (vírgula decimal, "MT"). Unidade num cinzento mais pequeno.
- **Listas e tabelas:** separadas por espaço ou linha de 1px; sem zebra, sem faixa de
  cabeçalho, sem cabeçalhos em maiúsculas espaçadas. Abaixo de 640px uma tabela vira
  lista de duas linhas: identidade e valor na linha 1, o resto em cinzento na linha 2.
- **Gráficos (Recharts):** um tom por gráfico, neutros para o resto, no máximo quatro tons
  por ecrã. Uma série não leva legenda. 3-5 linhas de grelha suaves, sem eixo Y desenhado.
  Linha de 2px reta, sem pontos em cada valor. Donut fino, valores numa lista ao lado.
  Gráfico vazio desenha a linha do zero e uma frase, não uma ilustração.
- **Superfícies:** uma borda **ou** uma sombra, nunca as duas. Sombra só no que flutua
  (menu, folha, modal, toast). Um raio escolhido e repetido.
- **Pills** só dentro de linhas ou ao lado de um valor: fundo pálido, texto escuro do
  mesmo tom, 16-24px de altura. Nunca por cima de um título.
- **Ícones:** um só conjunto (`lucide-react`), 14-20px, contorno, cinzento. **Nunca emoji
  como ícone**, marcador ou ilustração de estado vazio.
- **Rótulos pequenos:** mínimo 11px; preferir 12-14px em frase normal. Maiúsculas
  espaçadas (`uppercase tracking-widest`) para no máximo um tipo de rótulo por cartão.

### Estados (todos os blocos precisam dos quatro)

| Estado | Como |
| --- | --- |
| Zero real | Escreve "0 MT" no estilo normal. Pode ficar cinzento se ao lado estiver o próximo passo. |
| Sem valor | Um traço cinzento "—" do tamanho do texto, não do tamanho do número. |
| Vazio | O bloco mantém o título e a moldura e mostra uma frase com a ação ("Ainda sem movimentos. Importa uma SMS"). |
| A carregar | O layout final com barras cinzentas planas do tamanho real; rótulos já visíveis; nada salta quando os dados chegam. |
| Erro | Dentro do bloco que falhou, nunca a tapar o ecrã: o que falhou, quando foi a última vez que esteve bom, e um botão "Tentar de novo". |
| Desatualizado | Carimbo "Atualizado às 09:14" com botão de atualizar. |

### No telemóvel (o caso principal)

- Margens de 16px; alvos de toque de 44px (já no `index.css`); 8px entre alvos.
- Barra inferior de 5 destinos com rótulo curto e ícone. A atual muda de cor de texto,
  sem pílula colorida forte.
- O título do ecrã fica a 20-24px. Ações do cabeçalho vão para um menu, menos a principal.
- Filtros numa linha de chips que desliza para o lado dentro da própria linha; a página
  nunca desliza para o lado. A primeira linha da lista começa nos 60% de cima do ecrã.
- Blocos com ação (contas a pagar e "Pagar") sobem, não ficam no fundo.
- Respeita `safe-area` (`--sat`, `--sab`) em barras fixas.
- Ações escondidas no `hover` não existem no Android: `md:opacity-0 md:group-hover:opacity-100`.

## 3. Sinais de "feito por IA" a evitar

Nenhum está proibido por ser feio; estão proibidos por aparecerem por defeito, sem razão.

| Sinal | Em vez disso |
| --- | --- |
| "Bem-vindo de volta 👋" e saudação com emoji | Título com nome do ecrã, ou uma frase com dado real ("Sobram 4 200 MT até dia 30") |
| Orbes desfocados a pulsar no fundo (`blur-[100px] animate-pulse`) | Fundo sólido; a luz vem do dourado num dado |
| Vidro em tudo (`backdrop-blur` em cartões que não flutuam) | Superfície opaca um tom acima do fundo |
| Gradiente em fundos de cartão, texto, KPIs | Cor plana (o botão principal é a exceção definida na `ui-design-rules`) |
| Ícone num quadrado colorido em cada cartão ou cada linha | Um ícone cinzento de 16px onde ajuda, ou nenhum |
| Ponto de estado a pulsar ou `animate-ping` em avisos | Ponto estático; a urgência diz-se com a cor e a palavra |
| Gráfico arco-íris | Um tom por gráfico |
| Etiquetas minúsculas em maiúsculas espalhadas (8-10px) | Frase normal a 12-14px junto ao conteúdo |
| Texto de marketing: "desbloqueia", "potencia", "sem esforço", "tudo-em-um" | Verbo da ação: "Importar SMS", "Pagar", "Guardar" |
| "Começar" / "Saber mais" como rótulo de botão | O nome da ação |

Tirar estes sinais é metade do trabalho. A outra metade é pôr o produto no lugar deles:
os dados do utilizador, o elemento próprio, a pergunta respondida.

## 4. Qualidade de UX (por prioridade)

Da ui-ux-pro-max-skill, por ordem de impacto. Verifica de cima para baixo.

1. **Acessibilidade:** contraste (ver `ui-design-rules`); `aria-label` em todo o botão só
   com ícone; foco visível (2px, 3:1); não comunicar só com cor (junta palavra ou ícone);
   ordem de títulos h1→h2→h3; zoom nunca desativado.
2. **Toque:** 44px, 8px entre alvos, retorno visual em menos de 100ms
   (`active:scale-[0.97]` ou mudança de tom), botão desativado e com spinner enquanto
   grava; nada só com gesto (deslizar para apagar precisa de botão também).
3. **Desempenho:** reservar espaço para o que carrega (sem saltos); imagens com
   `width`/`height`; listas de 50+ itens não animam item a item; `font-display: swap`.
4. **Estilo:** um conjunto de ícones, um raio, uma escala de sombras; modos claro e escuro
   desenhados juntos e testados separadamente.
5. **Layout:** mobile primeiro (360px, depois 768px, 1024px); `min-h-dvh` em vez de
   `100vh`; sem scroll horizontal.
6. **Tipo e cor:** corpo 16px nos campos (evita zoom no iOS), 14px no texto de leitura,
   altura de linha 1.5; tokens semânticos.
7. **Movimento:** ver secção 5.
8. **Formulários:** rótulo visível (não só placeholder); erro por baixo do campo, com
   causa e como corrigir; `inputMode="decimal"` em valores, `type="tel"` em telefones,
   `autocomplete`; confirmar antes de apagar e oferecer "Desfazer"; toasts com
   `aria-live="polite"`, 3-5s, sem roubar o foco.
9. **Navegação:** voltar é previsível e mantém o scroll e os filtros; cada ecrã principal
   tem URL próprio (deep link para notificações); apagar conta e sair ficam separados do
   resto; modais não substituem navegação.
10. **Gráficos:** valor exato ao tocar; resumo em texto para leitores de ecrã; números
    formatados em pt-MZ.

## 5. Movimento

Do design-motion-principles (lentes de Emil Kowalski, Jakub Krehel e Jhey Tompkins).
Para uma app de finanças no telemóvel o peso é: **Jakub** (polimento discreto) primeiro,
**Emil** (contenção e rapidez) segundo, **Jhey** (brincadeira) só em momentos raros:
meta cumprida, primeira SMS importada, xitique completo.

### A porta da frequência (pergunta sempre primeiro)

| Quantas vezes o utilizador faz isto | Movimento |
| --- | --- |
| Raramente (meta atingida, onboarding) | Pode ser expressivo, até 500ms |
| Todos os dias (abrir o Início, abrir um modal) | Discreto e rápido, 150-250ms |
| Dezenas de vezes (trocar de separador, filtrar, digitar um valor) | Nenhum ou instantâneo |
| Iniciado no teclado | Nunca animar |

> "A melhor animação é a que ninguém nota."

### Receitas

- **Entrar:** `opacity` + `translateY(8px)`, 200-250ms, `cubic-bezier(0.22, 1, 0.36, 1)`.
- **Sair:** mais curta e mais pequena que a entrada (cerca de 60-70% da duração).
- **Pressionar:** `active:scale-[0.97]`, 100-150ms. Nunca a partir de `scale(0)`; mínimo `0.9`.
- **Folhas e modais:** sobem de baixo no telemóvel; menus e popovers abrem da origem
  (`transform-origin` no botão que os abriu). Sem mola com ressalto em utilidades.
- **Alturas:** não animar `height`/`width`/`top`/`left`. Usar `transform`, `opacity`,
  `clip-path`, ou `layout` do framer-motion.
- **Números:** contadores animados só no número-resposta e só na primeira vez da sessão.
- **Listas:** escalonar (`stagger`) no máximo uma lista por ecrã e só os primeiros 6-8
  itens. Uma lista de 200 movimentos com `delay: idx * 0.03` faz o último esperar 6s.
- **Transições de estado:** um bloco que aparece/desaparece por condição
  (`{x && <Y/>}`) e é importante para o utilizador entra e sai com `AnimatePresence`;
  conteúdo estático (títulos, parágrafos, navegação) aparece já, sem entrada.
- **Interrompível:** um toque a meio cancela a animação; nada bloqueia o toque.

### Sinais de movimento "feito por IA"

Pontos a pulsar; desfoque em todas as entradas; `hover:scale-105` em todos os cartões;
`stagger` em todas as listas; mola com ressalto em menus e modais; o mesmo fade-up em
todos os blocos; animação de entrada em títulos e texto; loops infinitos sem significado.
Um caso com intenção é polimento; o mesmo padrão em três sítios é o sinal.

### Movimento reduzido (obrigatório)

Toda a animação respeita `prefers-reduced-motion: reduce`. No Mwanga isto está ligado em
quatro sítios; mantém-nos:

- `src/index.css`: bloco global que reduz `animation`/`transition` a ~0.
- `src/main.jsx`: `<MotionConfig reducedMotion="user">` para o framer-motion.
- `src/hooks/useMwangaAnimations.js`: as funções GSAP saem logo se o utilizador pediu
  menos movimento (`prefersReducedMotion()` em `src/utils/motion.js`).
- `src/App.jsx`: o Lenis (scroll suave) não arranca com movimento reduzido.

Movimento funcional (dizer que algo mudou) precisa de uma alternativa sem movimento;
decorativo pode simplesmente desaparecer.

## 6. DESIGN.md

Do awesome-claude-design: um ficheiro de texto com **token, regra e porquê juntos**, que
qualquer agente (Claude Code, Claude Design) consegue seguir. O do Mwanga está em
`DESIGN.md` na raiz. Quando mudares um token em `src/index.css`, atualiza o `DESIGN.md` no
mesmo PR. Para criar protótipos no Claude Design (claude.ai/design), carrega esse ficheiro
em "Create new design system".

## 7. Como auditar um ecrã

1. Escreve a pergunta do ecrã e a ação mais frequente (secção 0). Confere que o maior
   bloco responde e que a ação está a um toque.
2. Corre as procuras da `ui-design-rules` e estas:
   ```bash
   grep -rnE "animate-(pulse|ping|bounce)" src         # só carregamento e microfone a ouvir
   grep -rnE "blur-\[[0-9]+px\]" src                   # orbes decorativos
   grep -rnE "hover:scale-1[0-9]{2}" src               # escala em hover espalhada
   grep -rnE "delay: ?(i|idx|index) ?\*" src           # stagger sem limite
   grep -rnE "initial=\{\{" src | wc -l                # entradas: alguma é em texto estático?
   python3 -c "import re,pathlib;p=re.compile('[\U0001F300-\U0001FAFF☀-➿]');print(sum(1 for f in pathlib.Path('src').rglob('*.jsx') for l in f.open(encoding='utf8') if p.search(l)))"  # emoji em JSX
   ```
3. No browser (como na `ui-design-rules`): 360px com toque emulado, claro e escuro, e
   uma vez com `reducedMotion: 'reduce'` no contexto do Playwright. Nada deve mexer-se
   nem ficar invisível nesse modo.
4. Para cada bloco, verifica os seis estados da tabela da secção 2.
5. Relatório: o que falha, onde (`ficheiro:linha`), gravidade (crítico / importante /
   bom ter) e a correção. Separa o que é correção clara do que é decisão de direção
   visual: essas perguntam-se ao dono.

## Créditos (todos MIT)

- taste-skill, Leonxlnx: <https://github.com/leonxlnx/taste-skill> (regras de ecrãs de app, sinais de IA)
- ui-ux-pro-max-skill, Next Level Builder: <https://github.com/nextlevelbuilder/ui-ux-pro-max-skill> (lista de UX por prioridade)
- awesome-claude-design, VoltAgent: <https://github.com/VoltAgent/awesome-claude-design> (formato DESIGN.md)
- design-motion-principles, Kyle Zantos: <https://github.com/kylezantos/design-motion-principles> (movimento)

O texto aqui é uma síntese adaptada, não uma cópia; os scripts e bases de dados dos
repositórios originais não foram incluídos.
