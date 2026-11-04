# DESIGN.md — Mwanga

Linguagem visual do Mwanga, com o token, a regra e o porquê no mesmo sítio. Os agentes de
código (Claude Code) e de design (Claude Design) seguem este ficheiro. A fonte da verdade
dos valores é `src/index.css`; quando mudares um token lá, muda aqui no mesmo PR.

Regras detalhadas: `.claude/skills/ui-design-rules/SKILL.md` (seis regras duras) e
`.claude/skills/mwanga-design/SKILL.md` (ecrãs, UX e movimento).

## Ideia

**Mwanga quer dizer "luz".** Uma app de finanças pessoais para famílias moçambicanas:
meticais, M-Pesa e e-Mola por SMS, xitique, dívidas a familiares, dízimo, a assistente
Binth. A luz (dourado) cai sobre noite e oceano. Usada com parcimónia: num número, numa
meta cumprida, no próximo passo. Não é uma cópia de nenhuma outra app (nem do My M-Pesa).

## Cor

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `--color-cream` | `#faf7f0` | `#0a1926` | Fundo da página |
| `--color-surface` | `#ffffff` | `#121c26` | Cartões opacos |
| `--color-text` | `#12232e` | `#f8fafc` | Texto principal |
| `--color-muted` | `#475569` | `#94a3b8` | Texto secundário (4.5:1 nos dois temas) |
| `--color-ocean` | `#0a4d68` | | Marca; botão principal; seleção |
| `--color-sky` | `#1a8fa8` | | Ligações, realces frios |
| `--color-midnight` | `#0a1926` | | Superfícies sempre escuras (cartão do saldo) |
| `--color-gold` | `#c9963a` | | A "luz": só em fundo escuro |
| `--color-gold-text` | `#7a5818` | `#ddb05c` | Dourado legível em texto |
| `--color-leaf` | `#3d6b45` | | Bom: receita, poupança, meta cumprida |
| `--color-coral` | `#e07a5f` | | Mau: despesa acima, atraso, erro |
| `--color-sand` | `#f0dbb5` | | Fundos quentes pontuais |

Regras:

- Cor nos dados, não na moldura. Navegação e cartões neutros.
- `leaf` e `coral` dizem bom ou mau, não sobe ou desce.
- No máximo quatro tons num ecrã; um tom por gráfico.
- Texto em gradiente proibido. Gradiente só no `.btn-primary` (oceano).

## Tipo

| Papel | Fonte | Tamanho | Peso |
| --- | --- | --- | --- |
| Número-resposta (saldo) | DM Sans, `tabular-nums` | 30-36px | 700 |
| Título de ecrã | Playfair Display | 20-24px | 700 |
| Título de cartão | DM Sans | 16px | 700 |
| Texto | DM Sans | 14-16px (16px em campos) | 400 |
| Rótulo | DM Sans | 12-14px, mínimo 11px | 400 ou 700 |

- Só pesos 400 e 700 (são os únicos que `index.html` carrega).
- Números sempre com `fmt()` e `tabular-nums`; alinhados à direita em listas.

## Espaço, forma e profundidade

- Escala de 8px: 8, 16, 24, 32, 40, 48. 4 e 12 só dentro de componentes.
- Margem lateral de 16px no telemóvel; padding de cartão 24px (16px em listas densas).
- Raio: cartões `rounded-2xl` (16px) a `28px` no `.glass-card`; botões `rounded-xl`.
- Cartões de vidro (`.glass-card`: fundo translúcido, desfoque 12px, borda fina) são a
  assinatura da marca e ficam. Não empilhar vidro sobre vidro; sombras fortes só no que flutua.

## Componentes

- **Botão principal** `.btn-primary`: um por ecrã, 48px de altura, nome da ação.
- **Botão secundário** `.btn-secondary`: oceano a 8%, texto oceano.
- **Alvos de toque**: 44x44px mínimo, 8px entre eles.
- **Ícones**: `lucide-react`, contorno, 14-20px, cinzentos. Nunca emoji como ícone.
- **Pills**: fundo pálido do tom, texto escuro do mesmo tom, sem borda.
- **Estados**: zero real ("0 MT"), sem valor ("—"), vazio com ação, a carregar com o
  layout final, erro dentro do bloco com "Tentar de novo".

## Movimento

- Entrar: opacidade + 8px para cima, 200-250ms, `cubic-bezier(0.22, 1, 0.36, 1)`.
- Sair: mais curto que entrar. Pressionar: `scale(0.97)`.
- Ações frequentes (separadores, filtros, digitar) não animam.
- Nada a pulsar em loop para chamar a atenção.
- `prefers-reduced-motion` respeitado em CSS, Framer Motion, GSAP, Lenis e confetti.

## Voz

Português de Moçambique, por "tu". Rótulos com o verbo da ação ("Importar SMS",
"Pagar renda"). Estados vazios dizem o próximo passo. Sem "desbloqueia", "potencia",
"sem esforço".
