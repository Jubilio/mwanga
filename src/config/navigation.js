import {
  LayoutDashboard,
  ArrowRightLeft,
  PieChart,
  Target,
  Wallet,
  CreditCard,
  Brain,
  MessageSquare,
  Landmark,
  Calculator,
  BarChart3,
  Crown,
  HelpCircle,
  Settings,
  Info,
  Shield,
  LayoutGrid,
  Compass,
} from 'lucide-react';

/**
 * Single source of truth for the app's navigation.
 *
 * The bottom bar (mobile), the sidebar (desktop) and the "Planear" and "Mais"
 * hub screens all read from here, so a page lives in the same place everywhere.
 *
 * Pages that used to have their own menu entry now live inside another page as
 * a tab (see LEGACY_REDIRECTS). Their old URLs still work.
 */

export const PLAN_ITEMS = [
  { to: '/orcamento', icon: PieChart, label: 'nav.budget', desc: 'nav.desc_budget', feature: 'orcamento' },
  { to: '/metas', icon: Target, label: 'nav.goals', desc: 'nav.desc_goals', feature: 'metas' },
  { to: '/xitique', icon: Wallet, label: 'nav.xitique', desc: 'nav.desc_xitique', feature: 'xitique' },
  { to: '/dividas', icon: CreditCard, label: 'nav.debts', desc: 'nav.desc_debts', feature: 'dividas' },
];

export const MORE_ITEMS = [
  { to: '/insights', icon: Brain, label: 'nav.binth', desc: 'nav.desc_binth', feature: 'insights' },
  { to: '/sms-import', icon: MessageSquare, label: 'nav.sms', desc: 'nav.desc_sms', feature: 'sms-import' },
  { to: '/patrimonio', icon: Landmark, label: 'nav.patrimony', desc: 'nav.desc_patrimony', feature: 'patrimonio' },
  { to: '/simuladores', icon: Calculator, label: 'nav.simulators', desc: 'nav.desc_simulators', feature: 'simuladores' },
  { to: '/relatorio', icon: BarChart3, label: 'nav.report', desc: 'nav.desc_report', feature: 'relatorio' },
];

export const ACCOUNT_ITEMS = [
  { to: '/pricing', icon: Crown, label: 'nav.pricing', desc: 'nav.desc_pricing' },
  { to: '/help', icon: HelpCircle, label: 'nav.help', desc: 'nav.desc_help' },
  { to: '/settings', icon: Settings, label: 'nav.settings', desc: 'nav.desc_settings' },
  { to: '/nexovibe', icon: Info, label: 'nav.about', desc: 'nav.desc_about' },
];

export const ADMIN_ITEM = { to: '/admin', icon: Shield, label: 'nav.admin' };

/** Sidebar groups (desktop). Mirrors the bottom bar. */
export const SIDEBAR_GROUPS = [
  {
    section: 'nav.section_daily',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'nav.home', end: true },
      { to: '/transacoes', icon: ArrowRightLeft, label: 'nav.moves', feature: 'transacoes' },
    ],
  },
  { section: 'nav.section_plan', items: PLAN_ITEMS },
  { section: 'nav.section_more', items: MORE_ITEMS },
  { section: 'nav.section_account', items: ACCOUNT_ITEMS },
];

/** Old URLs that are now a tab of another page. */
export const LEGACY_REDIRECTS = {
  '/jornada': '/metas?tab=plano',
  '/credito': '/dividas?tab=credito',
  '/habitacao': '/orcamento?tab=casa',
  '/time-machine': '/simuladores?tab=futuro',
};

const PLAN_PATHS = ['/planear', ...PLAN_ITEMS.map((item) => item.to)];
const MORE_PATHS = ['/mais', ...MORE_ITEMS.map((item) => item.to), ...ACCOUNT_ITEMS.map((item) => item.to), '/mordomia', '/rever-realidade'];

/** Mobile bottom bar: Início, Movimentos, +, Planear, Mais. */
export const BOTTOM_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'nav.home', match: ['/'] },
  { to: '/transacoes', icon: ArrowRightLeft, label: 'nav.moves', match: ['/transacoes'] },
  { isFab: true, label: 'nav.add' },
  { to: '/planear', icon: Compass, label: 'nav.plan', match: PLAN_PATHS },
  { to: '/mais', icon: LayoutGrid, label: 'nav.more', match: MORE_PATHS },
];

export function isBottomItemActive(item, pathname) {
  if (!item.match) return false;
  if (item.to === '/') return pathname === '/';
  return item.match.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

const ALL_ITEMS = [
  ...SIDEBAR_GROUPS.flatMap((group) => group.items),
  ...ACCOUNT_ITEMS,
  ADMIN_ITEM,
  { to: '/planear', label: 'nav.plan_title' },
  { to: '/mais', label: 'nav.more_title' },
];

/** Translation key for the header title of the current page. */
export function pageTitleKey(pathname) {
  return ALL_ITEMS.find((item) => item.to === pathname)?.label || 'nav.home';
}
