import { describe, expect, it } from 'vitest';
import pt from '../locales/pt/translation.json';
import en from '../locales/en/translation.json';
import {
  ACCOUNT_ITEMS, BOTTOM_ITEMS, LEGACY_REDIRECTS, MORE_ITEMS, PLAN_ITEMS, SIDEBAR_GROUPS,
  isBottomItemActive, pageTitleKey,
} from './navigation';

const lookup = (catalog, key) => key.split('.').reduce((node, part) => node?.[part], catalog);
const tab = (label) => BOTTOM_ITEMS.find((item) => item.label === label);

describe('navigation', () => {
  it('keeps the bottom bar to five places with the add button in the middle', () => {
    expect(BOTTOM_ITEMS.map((item) => item.label)).toEqual(['nav.home', 'nav.moves', 'nav.add', 'nav.plan', 'nav.more']);
    expect(BOTTOM_ITEMS[2].isFab).toBe(true);
  });

  it('lights up Planear and Mais for the pages they hold', () => {
    expect(isBottomItemActive(tab('nav.plan'), '/metas')).toBe(true);
    expect(isBottomItemActive(tab('nav.plan'), '/dividas')).toBe(true);
    expect(isBottomItemActive(tab('nav.more'), '/simuladores')).toBe(true);
    expect(isBottomItemActive(tab('nav.home'), '/metas')).toBe(false);
    expect(isBottomItemActive(tab('nav.home'), '/')).toBe(true);
  });

  it('sends the old URLs to the tab that replaced them', () => {
    expect(LEGACY_REDIRECTS['/jornada']).toBe('/metas?tab=plano');
    expect(LEGACY_REDIRECTS['/credito']).toBe('/dividas?tab=credito');
    expect(LEGACY_REDIRECTS['/habitacao']).toBe('/orcamento?tab=casa');
    expect(LEGACY_REDIRECTS['/time-machine']).toBe('/simuladores?tab=futuro');
  });

  it('no longer lists the hidden pages in any menu', () => {
    const listed = SIDEBAR_GROUPS.flatMap((group) => group.items.map((item) => item.to));
    for (const hidden of ['/mordomia', '/jornada', '/credito', '/habitacao', '/time-machine']) {
      expect(listed).not.toContain(hidden);
    }
  });

  it('has every label in both languages', () => {
    const items = [...BOTTOM_ITEMS, ...PLAN_ITEMS, ...MORE_ITEMS, ...ACCOUNT_ITEMS, ...SIDEBAR_GROUPS.flatMap((g) => g.items)];
    const keys = new Set([
      ...items.flatMap((item) => [item.label, item.desc].filter(Boolean)),
      ...SIDEBAR_GROUPS.map((group) => group.section),
      pageTitleKey('/planear'), pageTitleKey('/mais'),
    ]);
    for (const key of keys) {
      expect(lookup(pt, key), key).toBeTypeOf('string');
      expect(lookup(en, key), key).toBeTypeOf('string');
    }
  });
});
