---
name: ui-design-rules
description: Use when building, changing or reviewing any Mwanga screen or component (React + Tailwind v4). Enforces 4.5:1 contrast, the 8px spacing scale, two font weights, 48px buttons with 44px touch targets, one primary button per screen, and no gradient text or bordered badges.
---

# Regras de design UI (Mwanga)

Seis regras que toda a interface do Mwanga segue. Vieram do checklist
"Antes de entregar a sua próxima interface" (WCAG 2.2, Material 8dp, Apple HIG, NN/g).
Aplica-as em código novo e corrige-as quando tocares num ecrã antigo.

## 1. Contraste mínimo 4.5:1

- Texto normal: 4.5:1 ou mais. Títulos grandes (24px+, ou 18.66px+ bold): 3:1.
- O app tem modo claro e escuro. Testa os dois. O fundo claro é creme `#faf7f0`, não branco.
- Texto secundário no modo claro: `text-slate-600 dark:text-slate-400`.
  Nunca `text-gray-400`, `text-slate-400` ou `text-gray-500` sozinhos: falham no creme.
- Tokens prontos em `src/index.css`:
  `--color-text`, `--color-muted` (#475569 claro), `--color-gold-text` (dourado legível),
  `--ins-*` (página da Binth).
- Dourado (`text-gold`, `#c9963a`) só passa em fundos escuros. Em fundo claro usa
  `text-(--color-gold-text)`.
- `text-white` só em superfícies que são escuras nos dois temas (botão, cartão `bg-midnight`).
  Em `glass-card` ou no fundo da página usa `text-dark dark:text-white`.
  Atenção: `.glass-card` é CSS sem layer e ganha a `bg-*` do Tailwind, por isso um
  `glass-card bg-midnight` fica branco no modo claro.
- Superfícies que são sempre escuras (cartão da Binth no Início, Mordomia) mantêm
  `text-slate-400` para texto secundário.
- Não baixes contraste com `opacity-50/60/70` em texto.

## 2. Espaços só da escala

- Usa 8, 16, 24, 32 (e 40, 48...). 4 e 12 só para ajustes apertados dentro de um
  componente (ícone e texto, entre botões).
- Tailwind: `1, 2, 3, 4, 6, 8, 10, 12`. Proibido: `0.5, 1.5, 2.5, 3.5, 5, 7, 9, 11`
  e valores arbitrários como `p-[13px]`.
- Estilos inline: `gap: 8`, `padding: '16px 24px'`. Nada de 5, 6, 10, 14, 20, 27.
- Mais perto quer dizer mesmo grupo: título e texto 8, ícone e título 16,
  texto e botões 24, padding do cartão 24.

## 3. No máximo 2 pesos de fonte

- Só 400 (`font-normal`) e 700 (`font-bold`). As fontes só carregam esses pesos
  (`index.html`: DM Sans e Playfair Display `wght@400;700`).
- Proibido: `font-black`, `font-extrabold`, `font-semibold`, `font-medium`, `font-light`,
  `fontWeight: 500/600/800/900`.
- Hierarquia faz-se com tamanho, cor e maiúsculas pequenas (`text-[11px] uppercase tracking-widest`),
  não com mais pesos. Escala sugerida: 32 / 16 / 14.

## 4. Botões de 48px, toque de 44px

- `.btn` já tem `min-height: 48px` e padding 12/24. Usa `.btn` em vez de botões soltos.
- Em ecrãs de toque, `src/index.css` dá `min-height` e `min-width` de 44px a `button`,
  `select`, `[role=button|tab|switch]` e `a.flex / a.inline-flex`. Não o anules com `min-h-0`
  sem motivo.
- Um `<Link>` com só um ícone precisa de `flex min-h-11 min-w-11 items-center justify-center`
  e `aria-label`.
- Links dentro de uma frase podem ser menores; links soltos ("Ver tudo", "Voltar") não.
- Entre alvos de toque, pelo menos 8px.

## 5. Um botão principal por ecrã

- Um só `.btn-primary` visível por ecrã (o gradiente oceano). Fora do menu e de modais.
- O resto é `.btn-secondary` (fundo oceano 8%, texto oceano) ou `.btn-ghost`.
- Em cartões escuros, o secundário é `bg-white/10 text-white`.
- Separadores e filtros selecionados (`bg-ocean` num grupo de opções) não contam como botão principal.
- Na página de Planos só o plano recomendado tem botão principal.

## 6. Sem texto em gradiente e sem badge com borda

- Nada de `bg-clip-text text-transparent`, `background-clip: text` ou `WebkitBackgroundClip`.
  Usa uma cor sólida (ex. `text-indigo-300` em fundo escuro).
- Badges e pills (texto pequeno, `rounded-full`, maiúsculas): só fundo tingido,
  sem `border`. Ex.: `bg-leaf/10 text-leaf`, ou inline `background: \`${cor}24\``.
- Bordas ficam para campos, cartões e botões de filtro, não para etiquetas.

## Como verificar

1. Procura regressões no código:
   ```bash
   grep -rnE "font-(black|extrabold|semibold|medium|light)\b" src
   grep -rnE "fontWeight: ?(500|600|800|900)" src
   grep -rnE "\b(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space-[xy])-(0\.5|1\.5|2\.5|3\.5|5|7|9|11)\b" src
   grep -rnE "bg-clip-text|ackgroundClip" src
   grep -rnE "(^|[\" '\`])text-(gray|slate)-(400|500)([\" '\`]|$)" src | grep -v "dark:text"
   ```
2. Mede no browser. Corre o app (`npx vite --port 5199`), abre cada ecrã a 360px com
   toque emulado (`hasTouch: true, isMobile: true`), nos modos claro e escuro
   (`localStorage['mwanga-dark']`), e injeta `axe-core` com `runOnly: ['color-contrast']`.
   Conta também elementos tocáveis menores que 44x44 e `.btn-primary` visíveis.
   Mede antes de tirar o screenshot de página inteira: o `fullPage` desliga a emulação
   de toque e falseia a medição.
3. `npm run lint`, `npm test`, `npm run build`, `npm run check:i18n`.
4. Traduções podem trazer classes (`<strong className=...>` em `src/locales`). Procura lá também.
