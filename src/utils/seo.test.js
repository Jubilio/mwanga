// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { applySeo, SITE_URL, DEFAULT_SEO } from './seo';

const meta = (sel) => document.head.querySelector(sel)?.getAttribute('content');

describe('applySeo', () => {
  beforeEach(() => { document.head.innerHTML = ''; });

  it('sets title, description, canonical and Open Graph for a page', () => {
    applySeo({ title: 'Descarregar a app Android', description: 'Baixe o APK.', path: '/baixar' });
    expect(document.title).toBe('Descarregar a app Android | Mwanga');
    expect(meta('meta[name="description"]')).toBe('Baixe o APK.');
    expect(meta('meta[property="og:url"]')).toBe(`${SITE_URL}/baixar`);
    expect(document.head.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(`${SITE_URL}/baixar`);
    expect(meta('meta[name="robots"]')).toBe('index, follow');
  });

  it('falls back to the default title and marks noindex pages', () => {
    applySeo({ path: '/404', noindex: true });
    expect(document.title).toBe(DEFAULT_SEO.title);
    expect(meta('meta[name="robots"]')).toBe('noindex, nofollow');
  });

  it('reuses existing tags instead of adding duplicates', () => {
    applySeo({ path: '/a' });
    applySeo({ path: '/b' });
    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(document.head.querySelectorAll('meta[name="description"]').length).toBe(1);
  });
});
