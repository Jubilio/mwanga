/**
 * useMwangaAnimations.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Hook centralizado de animações GSAP para o Mwanga.
 * Fornece animações reutilizáveis e otimizadas para os componentes da aplicação.
 *
 * Uso:
 *   const { animateIn, animateCards, animateCounter } = useMwangaAnimations();
 *
 *   // Animar uma secção ao entrar:
 *   animateIn('.dashboard-header');
 *
 *   // Animar cartões financeiros em sequência:
 *   animateCards('.metric-card');
 *
 *   // Animar um valor numérico (ex: saldo do mês):
 *   animateCounter(ref, 0, 50000, 1.5);
 */
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export function useMwangaAnimations() {
  /**
   * Animação de entrada suave (fade-in + slide-up).
   * Ideal para cabeçalhos e secções principais de cada página.
   *
   * @param {string} selector - Seletor CSS dos elementos a animar.
   * @param {Object} options - Opções adicionais de animação.
   */
  const animateIn = (selector, options = {}) => {
    const elements = document.querySelectorAll(selector);
    if (!elements.length) return;

    gsap.from(elements, {
      y: 24,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out',
      stagger: 0.08,
      clearProps: 'all',
      ...options,
    });
  };

  /**
   * Animação sequencial para cartões financeiros do dashboard.
   * Gera um efeito cascata (stagger) elegante ao carregar a página.
   *
   * @param {string} selector - Seletor CSS dos cartões (ex: '.metric-card').
   */
  const animateCards = (selector) => {
    const cards = document.querySelectorAll(selector);
    if (!cards.length) return;

    gsap.from(cards, {
      y: 40,
      opacity: 0,
      scale: 0.97,
      duration: 0.65,
      ease: 'back.out(1.4)',
      stagger: {
        each: 0.07,
        from: 'start',
      },
      clearProps: 'transform,opacity',
    });
  };

  /**
   * Animação de contador numérico para saldos e métricas financeiras.
   * Anima um número de 'from' até 'to' num prazo definido.
   *
   * @param {React.RefObject} ref - Ref do elemento que exibe o número.
   * @param {number} from - Valor inicial da animação.
   * @param {number} to - Valor final da animação.
   * @param {number} duration - Duração em segundos (padrão: 1.5s).
   * @param {function} formatter - Função de formatação (ex: valor => `MT ${valor}`).
   */
  const animateCounter = (ref, from, to, duration = 1.5, formatter = null) => {
    if (!ref?.current) return;

    const obj = { val: from };
    gsap.to(obj, {
      val: to,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        if (ref.current) {
          const rounded = Math.round(obj.val);
          ref.current.textContent = formatter
            ? formatter(rounded)
            : rounded.toLocaleString('pt-MZ');
        }
      },
    });
  };

  /**
   * Animação de pulso para alertas e notificações urgentes.
   * Aplica um efeito de destaque que chama atenção do utilizador.
   *
   * @param {string} selector - Seletor CSS do elemento de alerta.
   */
  const animatePulse = (selector) => {
    gsap.to(selector, {
      scale: 1.03,
      duration: 0.5,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 3,
      onComplete: () => gsap.set(selector, { scale: 1 }),
    });
  };

  /**
   * Animação de entrada para a Binth (assistente de IA).
   * Aplica um efeito de typewriter delay + slide-in de baixo.
   *
   * @param {string} selector - Seletor CSS da bolha de chat.
   */
  const animateBinthMessage = (selector) => {
    gsap.from(selector, {
      y: 20,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
      delay: 0.1,
      clearProps: 'all',
    });
  };

  return {
    animateIn,
    animateCards,
    animateCounter,
    animatePulse,
    animateBinthMessage,
  };
}

/**
 * Hook de animação de página.
 * Aplica automaticamente uma animação de entrada ao montar um componente de página.
 *
 * Uso (no topo de qualquer página):
 *   usePageAnimation();
 */
export function usePageAnimation(selector = '.page-content') {
  const { animateIn } = useMwangaAnimations();

  useEffect(() => {
    // Pequeno delay para garantir que o DOM está renderizado
    const timer = setTimeout(() => {
      animateIn(selector);
    }, 50);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
