import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../utils/motion';

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * Public pages only: the section rises 24px and fades in once when it enters the screen.
 * Content is never hidden when IntersectionObserver is missing or the person asked for
 * less motion; it just shows.
 */
export default function Reveal({ as = 'section', children, ...rest }) {
  const ref = useRef(null);
  const Tag = as;

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return undefined;
    // Already on screen at load (e.g. tall phones): leave it alone, no flash.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return undefined;
    // Styles are set on the node, not in React state, so a hover transform in CSS
    // (e.g. .glass-card) works again once the reveal is done.
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      el.style.transition = `opacity 600ms ${EASE}, transform 600ms ${EASE}`;
      el.style.opacity = '';
      el.style.transform = '';
      el.addEventListener('transitionend', () => { el.style.transition = ''; }, { once: true });
    }, { rootMargin: '0px 0px -10% 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  );
}
