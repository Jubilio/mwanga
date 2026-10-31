import {
  Compass, ArrowRightLeft, MessageSquare, PiggyBank, Sparkles, Crown, ShieldCheck,
} from 'lucide-react';

/**
 * Help centre structure. The words live in `help.categories.*` and `help.faq.<id>.q/a`
 * in both locales; this file only says where each answer belongs and which page it opens.
 *
 * Keep every answer true to what the app does today (see src/config/features.js for
 * plans and limits). When a feature changes, update its answer here and in the locales.
 */
export const HELP_CATEGORIES = [
  { id: 'start', icon: Compass },
  { id: 'daily', icon: ArrowRightLeft },
  { id: 'sms', icon: MessageSquare },
  { id: 'plan', icon: PiggyBank },
  { id: 'binth', icon: Sparkles },
  { id: 'plans', icon: Crown },
  { id: 'account', icon: ShieldCheck },
];

/** `to` is the page the answer's button opens; `page` is the nav label shown on it. */
export const HELP_FAQS = [
  { id: 'what_is', cat: 'start' },
  { id: 'first_steps', cat: 'start', to: '/settings', page: 'nav.settings' },
  { id: 'devices', cat: 'start' },

  { id: 'add_move', cat: 'daily', to: '/transacoes', page: 'nav.moves' },
  { id: 'edit_move', cat: 'daily', to: '/transacoes', page: 'nav.moves' },
  { id: 'month_start', cat: 'daily', to: '/settings', page: 'nav.settings' },
  { id: 'report', cat: 'daily', to: '/relatorio', page: 'nav.report' },

  { id: 'sms_how', cat: 'sms', to: '/sms-import', page: 'nav.sms' },
  { id: 'sms_limit', cat: 'sms', to: '/pricing', page: 'nav.pricing' },
  { id: 'sms_privacy', cat: 'sms' },
  { id: 'sms_wrong', cat: 'sms', to: '/transacoes', page: 'nav.moves' },

  { id: 'budget', cat: 'plan', to: '/orcamento', page: 'nav.budget' },
  { id: 'goals', cat: 'plan', to: '/metas', page: 'nav.goals' },
  { id: 'xitique', cat: 'plan', to: '/xitique', page: 'nav.xitique' },
  { id: 'xitique_money', cat: 'plan', to: '/xitique', page: 'nav.xitique' },
  { id: 'debts', cat: 'plan', to: '/dividas', page: 'nav.debts' },

  { id: 'binth_what', cat: 'binth', to: '/insights', page: 'nav.binth' },
  { id: 'binth_data', cat: 'binth' },

  { id: 'plans_list', cat: 'plans', to: '/pricing', page: 'nav.pricing' },
  { id: 'pay', cat: 'plans', to: '/pricing', page: 'nav.pricing' },
  { id: 'trial', cat: 'plans' },
  { id: 'cancel', cat: 'plans' },

  { id: 'stay_signed', cat: 'account' },
  { id: 'forgot_password', cat: 'account' },
  { id: 'photo', cat: 'account', to: '/settings', page: 'nav.settings' },
  { id: 'security', cat: 'account' },
  { id: 'scams', cat: 'account' },
];

/** Lower case without accents, so "orcamento" finds "Orçamento". */
export function normalizeSearch(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** True when every word of the query appears somewhere in the haystack. */
export function matchesQuery(haystack, query) {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = normalizeSearch(haystack);
  return words.every((word) => text.includes(word));
}
