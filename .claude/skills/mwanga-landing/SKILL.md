---
name: mwanga-landing
description: Use when building, changing, reviewing or writing copy for a Mwanga public page (/bem-vindo, /baixar, /pricing, campaign pages). One offer, one audience, one action; section order, FAQ from real answers, tagline reveal, scroll reveals and ship checklist, on Mwanga's own tokens.
---

# Páginas públicas do Mwanga (landing)

Adaptado de `landing-page-design` de [elayadesign/ai-design-skills](https://github.com/elayadesign/ai-design-skills)
(MIT, 2026 Elaya; partes vêm de taste-skill de Leon Lin, MIT). Ficou a estratégia, a estrutura,
as regras de conversão e de conteúdo. Os valores visuais da skill original (fontes Geist/Manrope,
ícones Phosphor, sem gradientes, título em gradiente, pesos 500/600) **não** se aplicam: o Mwanga
tem identidade própria. Valores vêm sempre de:

1. [`ui-design-rules`](../ui-design-rules/SKILL.md) (ganha em qualquer conflito)
2. [`DESIGN.md`](../../../DESIGN.md) e `src/index.css`
3. [`mwanga-design`](../mwanga-design/SKILL.md) (ecrãs da app, estados, movimento)

Esta skill só cobre o que é próprio de uma página pública que tem de convencer alguém que ainda
não usa o Mwanga.

## 1. Antes de desenhar

Uma página pública ganha **uma** intenção: **uma oferta → um público → uma ação**.

Responde (ou assume numa linha e segue):

- Ação principal: quase sempre "Começar grátis" (`/login?modo=registo`). Em `/baixar`, descarregar o APK.
- Público: famílias e pessoas em Moçambique que gerem dinheiro em meticais, M-Pesa, e-Mola e banco.
- Objeções habituais: "lê os meus SMS?", "é seguro?", "é pago?", "guarda o dinheiro do xitique?",
  "funciona no iPhone?".
- De onde vem o tráfego: WhatsApp Status, partilhas, pesquisa. Se for anúncio, o título repete a promessa do anúncio.

## 2. Ordem das secções

Primeiro ecrã (390px de largura, sem rolar):

1. Título: resultado + público ("Saiba para onde vai o seu dinheiro, em meticais.")
2. Subtítulo: como, em uma ou duas frases.
3. **Um** `.btn-primary` com verbo + o que recebe. Nada de segundo botão ou link concorrente aqui.
   "Entrar" fica no cabeçalho; "Descarregar a app" vai para mais abaixo.
4. Um sinal de confiança curto (feito em Moçambique, ligação encriptada, WhatsApp).

Meio (o argumento):

5. Vídeo ou ecrã real do produto.
6. Frase-luz (secção 5 abaixo).
7. Benefícios: 3 a 5, cada um com o resultado para a pessoa.
8. Como funciona: 3 passos.
9. Prova: só prova real. Sem testemunhos, números de utilizadores ou logótipos inventados.
   Se não houver, salta a secção; nunca uses marcadores falsos.

Fim (objeções):

10. Perguntas frequentes: 6 a 9, **tiradas de `help.faq.*`** (`src/pages/help/helpTopics.js`),
    para a resposta ser sempre a mesma que a Ajuda dá. Nunca escrevas uma resposta nova com factos
    (preços, limites, prazos) fora de `src/config/features.js`.
11. Redução de risco: grátis para começar, sem cartão, sem contrato.
12. CTA final: igual ao do topo, com a mesma nota de risco.

Constrói secção a secção e revê cada uma; não reescrevas a página inteira de cada vez.

## 3. Texto

- Benefício primeiro, específico. ❌ "Simplifique as suas finanças" ✅ "Veja num só ecrã quanto entrou e quanto saiu este mês".
- Botões: verbo + o que recebe ("Começar grátis", "Descarregar a app Android"). Nunca "Saber mais" ou "Enviar".
- Proibido: "revolucionar", "potenciar", "sem esforço", "de outro nível", "de classe mundial", "desbloqueia".
- Sem travessões a ligar frases (`—`, ` - `). Reescreve com ponto ou vírgula. Hífens dentro das palavras portuguesas ("Enganei-me") estão certos.
- Uma só forma de tratamento na página inteira. As respostas da Ajuda tratam por "tu", por isso a página também.
- Títulos: `text-wrap: balance`. Texto corrido: `text-wrap: pretty`. Sem palavra sozinha na última linha.
- Título e subtítulo do primeiro ecrã com `max-width: 680px`; quebra onde o pensamento quebra.
- Mensagens calmas e concretas, sem pontos de exclamação.

## 4. Visual (valores do Mwanga)

- Fundo `--color-cream`, cartões `.glass-card`, um `.btn-primary` (gradiente oceano) por página. O gradiente fica no botão; fundos lisos.
- Título do primeiro ecrã em Playfair (`font-display`) com cor sólida. **Nunca** texto em gradiente.
- Tamanhos da escala do Tailwind (`text-xs` … `text-5xl`); pesos só 400 e 700.
- Espaços da escala de 8px. Entre secções: 64px (`gap-16`). Dentro de uma secção: 24px. Cartões: 24px de padding.
- Raio aninhado: raio de dentro = raio de fora − espaço entre eles, quando o espaço é menor que 32px e o resultado maior que 2px.
- Bordas à volta toda ou nenhuma; nunca só de um lado num cartão.
- Ícones `lucide-react` (14 a 24px). Nunca emoji como ícone.

## 5. Frase-luz (obrigatória)

Mwanga quer dizer luz. Cada página pública tem uma frase grande, de duas linhas ou mais, longe do
primeiro ecrã, em que as palavras **acendem** uma a uma ao rolar:

- Começa a ~30% da cor do texto e passa à cor cheia palavra a palavra, por ordem de leitura.
- Uma palavra-chave pode acender em `--color-gold-text` (a "luz"). Só uma.
- `IntersectionObserver` ou um listener de scroll passado por `requestAnimationFrame`. Nunca scroll sem limite.
- Curva `cubic-bezier(0.22, 1, 0.36, 1)`, nunca linear.
- Com `prefersReducedMotion()` (`src/utils/motion.js`) mostra o texto todo em cor cheia, sem animação.
- Componente pronto: `src/components/landing/LightUpText.jsx`.

## 6. Movimento da página pública

As páginas públicas podem ter um pouco mais de movimento do que a app (que segue `DESIGN.md`: 8px, 200-250ms):

- Secções sobem 24px e aparecem em 600ms ao entrar no ecrã, **uma vez**. Componente: `src/components/landing/Reveal.jsx`.
- Só `transform` e `opacity`. Curva `cubic-bezier(0.22, 1, 0.36, 1)`.
- Hover/cor: 200-300ms. Pressionar: `scale(0.97)`.
- Reduzir movimento: tudo aparece logo, sem deslocação.
- Sem `IntersectionObserver` no navegador, o conteúdo aparece logo (nunca fica escondido).

## 7. Antes de entregar

- [ ] Uma oferta, um público, um `.btn-primary` no primeiro ecrã
- [ ] Nenhum facto inventado (preço, número, testemunho); FAQ vem de `help.faq.*`
- [ ] Frase-luz presente, com duas linhas ou mais, e respeita reduzir movimento
- [ ] Ligação "Saltar para o conteúdo", `<header>`, `<main>`, `<section>` com título, `<footer>`
- [ ] Privacidade e Termos no rodapé; caminho de volta em cada página
- [ ] `useSeo` com título e descrição; FAQ em JSON-LD `FAQPage` quando a página é indexada
- [ ] Texto alternativo / `aria-label` em imagens e vídeos
- [ ] Contraste 4.5:1 nos dois temas (regra 1 de `ui-design-rules`)
- [ ] A 390px: sem scroll horizontal, botões com o texto dentro, ação principal visível no primeiro ecrã
- [ ] `npm run check:i18n` passa (PT e EN com as mesmas chaves)
