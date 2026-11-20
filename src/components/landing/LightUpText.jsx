import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../utils/motion';

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * "Mwanga" means light: the words of a sentence light up one by one, in reading order,
 * as the reader scrolls. A word lights when it crosses a line at 65% of the screen height.
 * One word (`highlight`, matched without punctuation) lights in gold.
 * With reduced motion, or without scroll support, the text shows in full colour at once.
 */
export default function LightUpText({ text, highlight, as = 'p', style, ...rest }) {
  const ref = useRef(null);
  const Tag = as;
  const words = text.split(/\s+/).filter(Boolean);
  const [lit, setLit] = useState(words.length);
  const [animate] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    const el = ref.current;
    if (!el || !animate) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.65;
      const spans = el.querySelectorAll('[data-word]');
      let count = 0;
      spans.forEach((span) => {
        if (span.getBoundingClientRect().top < line) count += 1;
      });
      setLit(count);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [text, animate]);

  const clean = (word) => word.replace(/[.,;:!?]/g, '').toLowerCase();
  const target = highlight ? clean(highlight) : null;

  return (
    <Tag ref={ref} style={{ textWrap: 'balance', ...style }} {...rest}>
      {words.map((word, index) => {
        const on = !animate || index < lit;
        const gold = target && clean(word) === target;
        const full = gold ? 'var(--color-gold-text)' : 'var(--color-text)';
        return (
          <span
            key={`${word}-${index}`}
            data-word
            style={{
              color: on ? full : 'color-mix(in srgb, var(--color-text) 28%, transparent)',
              transition: animate ? `color 500ms ${EASE}` : undefined,
            }}
          >
            {word}{index < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </Tag>
  );
}
