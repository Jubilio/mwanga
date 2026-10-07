import { normalizeCategory } from './categories';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
import pt from '../locales/pt/translation.json';
import en from '../locales/en/translation.json';
// Resolve saved system labels again on language changes. User text outside this catalog stays unchanged.
const keys = Object.fromEntries([
  ...Object.entries(en.uiText).map(([key, value]) => [value, key]),
  ...Object.entries(pt.uiText).map(([key, value]) => [value, key]),
]);
const normalize = value => value.replace(/\s+/g, ' ').trim();
export function ui(value, parameters) {
  if (typeof value !== 'string') return value;
  const key = keys[normalize(value)];
  return key ? i18n.t('uiText.' + key, parameters) : value;
}
export function useUiLanguage() { return useTranslation().i18n.resolvedLanguage; }
export function uiLocale() { return (i18n.resolvedLanguage || i18n.language).startsWith('en') ? 'en-GB' : 'pt-MZ'; }

export function uiCategory(value) {
  if (!value) return value;
  return i18n.t(`common.categories.${normalizeCategory(value)}`, { defaultValue: value });
}
export function uiTransactionType(value) {
  return ['receita', 'despesa', 'renda', 'poupanca'].includes(value)
    ? i18n.t(`transactions.types.${value}`) : value;
}
