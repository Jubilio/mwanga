import { lazy } from 'react';
import PageTabs from '../../components/layout/PageTabs';
import ErrorBoundary from '../../components/ErrorBoundary';

const Goals = lazy(() => import('../Goals'));
const FinancialJourney = lazy(() => import('../FinancialJourney'));
const Dividas = lazy(() => import('../Dividas'));
const Credito = lazy(() => import('../Credito'));
const Budget = lazy(() => import('../Budget'));
const Habitacao = lazy(() => import('../Habitacao'));

const wrap = (context, element) => <ErrorBoundary context={context}>{element}</ErrorBoundary>;

/** Metas + Jornada (the monthly plan for each goal). */
export function GoalsHub() {
  return (
    <PageTabs
      tabs={[
        { id: 'metas', label: 'nav.tab_goals', element: wrap('Metas', <Goals />) },
        { id: 'plano', label: 'nav.tab_plan', element: wrap('Jornada', <FinancialJourney />) },
      ]}
    />
  );
}

/** Dívidas + Crédito (score, simulator, compare, consolidate). */
export function DebtsHub() {
  return (
    <PageTabs
      tabs={[
        { id: 'dividas', label: 'nav.tab_debts', element: wrap('Dívidas', <Dividas />) },
        { id: 'credito', label: 'nav.tab_credit', element: wrap('Crédito', <Credito />) },
      ]}
    />
  );
}

/** Orçamento + Habitação (rent, maintenance and own home). */
export function BudgetHub() {
  return (
    <PageTabs
      tabs={[
        { id: 'limites', label: 'nav.tab_budget', element: wrap('Orçamento', <Budget />) },
        { id: 'casa', label: 'nav.tab_home', element: wrap('Habitação', <Habitacao />) },
      ]}
    />
  );
}
