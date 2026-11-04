// True when the person asked the system for less motion (Android: "Remove animations",
// iOS: "Reduce Motion"). GSAP and Lenis do not read this on their own, so check it first.
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
