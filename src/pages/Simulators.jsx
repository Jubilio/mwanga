import { lazy, Suspense, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { Banknote, Flame, Info, RefreshCcw, TrendingUp } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useFinance } from '../hooks/useFinance';

// Cada simulador é carregado apenas quando o utilizador navega para o respectivo tab.
const SimulatorBudget  = lazy(() => import('../components/simulators/SimulatorBudget'));
const SimulatorInvest  = lazy(() => import('../components/simulators/SimulatorInvest'));
const SimulatorFire    = lazy(() => import('../components/simulators/SimulatorFire'));
const SimulatorXitique = lazy(() => import('../components/simulators/SimulatorXitique'));

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '12px 18px',
        borderRadius: 16,
        border: 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        fontSize: 13,
        fontWeight: 800,
        background: active ? 'var(--color-ocean)' : 'transparent',
        color: active ? '#fff' : 'var(--color-muted)',
        boxShadow: active ? '0 8px 20px rgba(10, 77, 104, 0.35)' : 'none',
      }}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function TabFallback() {
  return (
    <div className="glass-card p-10 rounded-[28px] flex items-center justify-center" style={{ minHeight: 300 }}>
      <div className="w-8 h-8 border-2 border-ocean border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function Simulators() {
  const { t } = useTranslation();
  const { state, dispatch } = useFinance();
  const { showToast } = useOutletContext();

  const currency = state.settings?.currency || 'MT';
  const isPro    = state.settings?.subscription_tier === 'pro';

  const [activeTab, setActiveTab] = useState('budget');

  return (
    <div className="w-full flex-1 flex flex-col pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-midnight dark:text-white mb-2 font-display">{t('simulators.title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('simulators.description')}</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 mb-8 overflow-x-auto p-1.5 rounded-[20px] bg-white/5 border border-white/5">
        <TabButton active={activeTab === 'budget'}  icon={Banknote}   label={t('simulators.tabs.budget')}  onClick={() => setActiveTab('budget')}  />
        <TabButton active={activeTab === 'invest'}  icon={TrendingUp} label={t('simulators.tabs.invest')}  onClick={() => setActiveTab('invest')}  />
        <TabButton active={activeTab === 'fire'}    icon={Flame}      label={t('simulators.tabs.fire')}    onClick={() => setActiveTab('fire')}    />
        <TabButton active={activeTab === 'xitique'} icon={RefreshCcw} label={t('simulators.tabs.xitique')} onClick={() => setActiveTab('xitique')} />
      </div>

      {/* Tab content — each simulator is lazy-loaded */}
      <AnimatePresence mode="wait">
        <Suspense fallback={<TabFallback />}>
          {activeTab === 'budget' && (
            <SimulatorBudget
              salary={state.settings?.user_salary}
              currency={currency}
              dispatch={dispatch}
              showToast={showToast}
            />
          )}
          {activeTab === 'invest' && (
            <SimulatorInvest currency={currency} />
          )}
          {activeTab === 'fire' && (
            <SimulatorFire currency={currency} isPro={isPro} />
          )}
          {activeTab === 'xitique' && (
            <SimulatorXitique currency={currency} />
          )}
        </Suspense>
      </AnimatePresence>

      {/* Disclaimer */}
      <div className="mt-8 p-6 rounded-[28px] bg-amber-500/5 border border-amber-500/10 flex gap-4">
        <Info className="text-amber-500 shrink-0" size={24} />
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <Trans i18nKey="simulators.disclaimer" components={{ strong: <strong className="text-amber-500/80" /> }} />
        </div>
      </div>
    </div>
  );
}
