import { useEffect } from 'react';

/**
 * Brings an element into view when it opens.
 *
 * On a phone, a form that opens at the top of a long page (for example after tapping
 * "edit" on a row far down a list) stays off-screen, so the tap looks like it did
 * nothing. `window.scrollTo` is not enough: the form grows above the viewport while
 * the page scrolls, and the browser's scroll anchoring cancels the scroll.
 * Waiting a frame and scrolling to the element itself works in both cases.
 *
 * Give the element a `scroll-margin-top` (e.g. Tailwind `scroll-mt-24`) so it is not
 * hidden under the sticky header.
 */
export function useRevealOnOpen(ref, open, key) {
  useEffect(() => {
    if (!open) return undefined;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const viewport = window.innerHeight || document.documentElement.clientHeight;
        // Already fully visible: leave the page where it is.
        if (rect.top >= 0 && rect.top < viewport * 0.5) return;
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [ref, open, key]);
}
