import { useEffect } from 'react';

/**
 * Public address of the web app. Canonical links, Open Graph and the sitemap all
 * point here, so search engines index one address and not the preview URLs.
 * Change VITE_SITE_URL (and public/sitemap.xml, public/robots.txt, index.html)
 * when a custom domain is added.
 */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://mwanga-opal.vercel.app').replace(/\/$/, '');

export const DEFAULT_SEO = {
  title: 'Mwanga — Gestão financeira para famílias moçambicanas',
  description:
    'Registe gastos, importe SMS do M-Pesa e e-Mola, controle o xitique, metas e dívidas. A app de finanças pessoais feita para Moçambique. Grátis.',
};

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Sets the page title, meta description, canonical URL, Open Graph tags and
 * robots directive for a public page. `path` is the page's own path ("/baixar").
 */
export function applySeo({ title, description, path = '/', noindex = false } = {}) {
  const fullTitle = title ? `${title} | Mwanga` : DEFAULT_SEO.title;
  const desc = description || DEFAULT_SEO.description;
  const url = `${SITE_URL}${path}`;

  document.title = fullTitle;
  setMeta('name', 'description', desc);
  setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
  setMeta('property', 'og:title', fullTitle);
  setMeta('property', 'og:description', desc);
  setMeta('property', 'og:url', url);
  setMeta('name', 'twitter:title', fullTitle);
  setMeta('name', 'twitter:description', desc);
  setCanonical(url);
}

export function useSeo(options) {
  const { title, description, path, noindex } = options || {};
  useEffect(() => {
    applySeo({ title, description, path, noindex });
  }, [title, description, path, noindex]);
}
