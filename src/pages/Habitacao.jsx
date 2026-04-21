import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, CalendarClock, Home, Key, Wallet } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import { fmt, getMonthKey } from '../utils/calculations';

import HousingChart from '../components/housing/HousingChart';
import HousingForm from '../components/housing/HousingForm';
import HousingHistoryTable from '../components/housing/HousingHistoryTable';
import HousingInsights from '../components/housing/HousingInsights';
import HousingSummaryCard from '../components/housing/HousingSummaryCard';

export default function Habitacao() {
  const { t } = useTranslation();
  const { state, dispatch } = useFinance();
  const currency = state.settings.currency || 'MT';
  const { showToast } = useOutletContext();
  const monthKey = getMonthKey();

  const type = state.settings.housing_type || 'renda';

  const [form, setForm] = useState({
    mes: monthKey,
    proprietario: state.settings.landlord_name || '',
    valor: state.settings.default_rent || '',
    estado: 'pago',
    obs: ''
  });

  function saveDefaults() {
    if (!form.proprietario || !form.valor) {
      showToast(t('housing.toasts.save_defaults_error'));
      return;
    }

    dispatch({ type: 'UPDATE_SETTING', payload: { key: 'landlord_name', value: form.proprietario } });
    dispatch({ type: 'UPDATE_SETTING', payload: { key: 'default_rent', value: parseFloat(form.valor) } });
    showToast(t('housing.toasts.save_defaults_success'));
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (type === 'renda' && (!form.proprietario || !form.valor)) {
      showToast(t('housing.toasts.rent_missing_fields'));
      return;
    }

    if (type === 'propria' && (!form.proprietario || !form.valor)) {
      showToast(t('housing.toasts.own_missing_fields'));
      return;
    }

    dispatch({
      type: 'ADD_RENDA',
      payload: {
        ...form,
        proprietario: form.proprietario,
        valor: parseFloat(form.valor)
      }
    });

    setForm({ ...form, proprietario: '', valor: '', obs: '' });
    showToast(type === 'renda' ? t('housing.toasts.rent_registered') : t('housing.toasts.maintenance_registered'));
  }

  function handleDelete(id) {
    dispatch({ type: 'DELETE_RENDA', payload: id });
  }

  function toggleType(newType) {
    dispatch({ type: 'UPDATE_SETTING', payload: { key: 'housing_type', value: newType } });
    showToast(t('housing.toasts.profile_changed', { type: newType === 'renda' ? t('housing.types.rent') : t('housing.types.own') }));
  }

  const propriaCategories = [
    'own_home',
    'condo',
    'electricity',
    'water',
    'taxes',
    'maintenance',
    'insurance',
    'other'
  ];

  // For backward compatibility with old hardcoded strings in DB
  const legacyPropriaNames = [
    'Casa Própria', 'Condomínio', 'Energia (Credelec)', 'Água (FIPAG)',
    'Impostos (IMI / IPRA)', 'Obras e Manutenção', 'Seguro Habitação', 'Outras Despesas'
  ];

  const filteredRendas = useMemo(() => {
    return state.rendas.filter(r => {
      const ownLabel = t('housing.labels.own_home');
      const isPropria = propriaCategories.includes(r.proprietario) || 
                        legacyPropriaNames.includes(r.proprietario) || 
                        r.proprietario === ownLabel;
      return type === 'propria' ? isPropria : !isPropria;
    });
  }, [state.rendas, type, t]);

  const totalPago = filteredRendas.filter(r => r.estado === 'pago').reduce((sum, r) => sum + r.valor, 0);
  const totalMesAtual = filteredRendas.filter(r => r.mes === monthKey).reduce((sum, r) => sum + r.valor, 0);
  const registosPendentes = filteredRendas.filter(r => r.estado === 'pendente').length;
  const latestRecord = [...filteredRendas].sort((a, b) => b.mes.localeCompare(a.mes))[0];

  const chartData = useMemo(() => {
    const monthlyMap = filteredRendas.reduce((acc, rental) => {
      acc[rental.mes] = (acc[rental.mes] || 0) + rental.valor;
      return acc;
    }, {});

    return Object.entries(monthlyMap)
      .map(([mes, valor]) => ({ mes, valor }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [filteredRendas]);

  const committedIncome = useMemo(() => {
    const rendasMes = filteredRendas.filter(r => r.mes === monthKey).reduce((sum, r) => sum + r.valor, 0);
    const receitasMes = state.transacoes
      .filter(t => t.tipo === 'receita' && t.data.startsWith(monthKey))
      .reduce((sum, t) => sum + t.valor, 0);

    if (!receitasMes) {
      return rendasMes > 0 ? 100 : 0;
    }

    return Math.min(100, Math.round((rendasMes / receitasMes) * 100));
  }, [filteredRendas, state.transacoes, monthKey]);

  const momComparison = useMemo(() => {
    const [y, m] = monthKey.split('-');
    const lastMonthDate = new Date(y, m - 2);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const curVal = filteredRendas.filter(r => r.mes === monthKey).reduce((sum, r) => sum + r.valor, 0);
    const lastVal = filteredRendas.filter(r => r.mes === lastMonthKey).reduce((sum, r) => sum + r.valor, 0);

    if (lastVal === 0) {
      return curVal > 0 ? 100 : 0;
    }

    return Math.round(((curVal - lastVal) / lastVal) * 100);
  }, [filteredRendas, monthKey]);

  return (
    <div className="animate-fade-in pb-20 w-full max-w-none space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-black/5 bg-linear-to-br from-white via-sky-50 to-cyan-50 p-6 shadow-sm dark:border-white/10 dark:from-[#11141d] dark:via-[#121827] dark:to-[#0d2230]">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-ocean/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-24 w-24 rounded-full bg-gold/10 blur-2xl" />

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('housing.title')}</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white md:text-3xl">{t('housing.main_title')}</h2>
              <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                {t('housing.description')}
              </p>
            </div>

            <div className="self-start rounded-xl border border-black/5 bg-black/5 p-1 shadow-inner dark:border-white/5 dark:bg-white/5">
              <button
                onClick={() => toggleType('renda')}
                className={`flex items-center justify-center gap-2 rounded-lg px-6 py-2 text-sm font-semibold transition-all duration-300 ${
                  type === 'renda'
                    ? 'border border-black/5 bg-white text-ocean shadow-sm dark:border-white/10 dark:bg-[#2a2a2a]'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Key size={16} /> {t('housing.types.rent')}
              </button>
              <button
                onClick={() => toggleType('propria')}
                className={`flex items-center justify-center gap-2 rounded-lg px-6 py-2 text-sm font-semibold transition-all duration-300 ${
                  type === 'propria'
                    ? 'border border-black/5 bg-white text-ocean shadow-sm dark:border-white/10 dark:bg-[#2a2a2a]'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Home size={16} /> {t('housing.types.own')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MiniStat icon={<Wallet size={16} />} label={t('housing.stats.current_month')} value={fmt(totalMesAtual, currency)} tone="ocean" />
            <MiniStat icon={<CalendarClock size={16} />} label={t('housing.stats.pending')} value={String(registosPendentes)} tone={registosPendentes > 0 ? 'gold' : 'leaf'} />
            <MiniStat icon={<Building2 size={16} />} label={t('housing.stats.last_record')} value={latestRecord?.mes || t('housing.stats.no_history')} tone="slate" />
          </div>
        </div>
      </div>

      <HousingSummaryCard totalInvested={totalPago} currency={currency} type={type} />
      <HousingInsights committedIncome={committedIncome} momComparison={momComparison} />
      <HousingChart data={chartData} currency={currency} />
      <HousingForm
        form={form}
        setForm={setForm}
        handleSubmit={handleSubmit}
        type={type}
        currency={currency}
        saveDefaults={saveDefaults}
      />
      <HousingHistoryTable
        rendas={filteredRendas}
        currency={currency}
        handleDelete={handleDelete}
        showToast={showToast}
      />
    </div>
  );
}

function MiniStat({ icon, label, value, tone }) {
  const tones = {
    ocean: 'bg-ocean/10 text-ocean border-ocean/20',
    gold: 'bg-gold/10 text-gold border-gold/20',
    leaf: 'bg-leaf/10 text-leaf border-leaf/20',
    slate: 'bg-black/5 text-gray-700 border-black/5 dark:bg-white/5 dark:text-gray-200 dark:border-white/10'
  };

  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      <div className={`inline-flex items-center justify-center rounded-xl border px-2.5 py-2 ${tones[tone] || tones.slate}`}>
        {icon}
      </div>
      <div className="mt-3 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-gray-800 dark:text-white">{value}</div>
    </div>
  );
}
