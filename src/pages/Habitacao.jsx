import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFinance } from '../hooks/useFinanceStore';
import { Key, Home } from 'lucide-react';
import { getMonthKey } from '../utils/calculations';

import HousingSummaryCard from '../components/housing/HousingSummaryCard';
import HousingInsights from '../components/housing/HousingInsights';
import HousingChart from '../components/housing/HousingChart';
import HousingForm from '../components/housing/HousingForm';
import HousingHistoryTable from '../components/housing/HousingHistoryTable';

export default function Habitacao() {
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
    obs: '',
  });

  function saveDefaults() {
    if (!form.proprietario || !form.valor) {
      showToast('⚠️ Preencha nome e valor para guardar como padrão');
      return;
    }
    dispatch({ type: 'UPDATE_SETTING', payload: { key: 'landlord_name', value: form.proprietario } });
    dispatch({ type: 'UPDATE_SETTING', payload: { key: 'default_rent', value: parseFloat(form.valor) } });
    showToast('💾 Definições guardadas como padrão!');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (type === 'renda' && (!form.proprietario || !form.valor)) {
      showToast('⚠️ Preencha proprietário e valor');
      return;
    }
    if (type === 'propria' && !form.valor) {
      showToast('⚠️ Preencha o valor da manutenção/prestação');
      return;
    }

    dispatch({ 
      type: 'ADD_RENDA', 
      payload: { 
        ...form, 
        proprietario: type === 'propria' ? 'Casa Própria' : form.proprietario,
        valor: parseFloat(form.valor) 
      } 
    });

    if (form.estado === 'pago') {
      dispatch({
        type: 'ADD_TRANSACTION',
        payload: {
          data: form.mes + '-01',
          tipo: 'renda',
          desc: `${type === 'renda' ? 'Aluguer' : 'Prestação'}: ${type === 'propria' ? 'Casa Própria' : form.proprietario}`,
          valor: parseFloat(form.valor),
          cat: 'Habitação',
          nota: form.obs
        }
      });
    }

    setForm({ ...form, proprietario: '', valor: '', obs: '' });
    showToast(type === 'renda' ? '🏠 Aluguer registado!' : '🏠 Manutenção registada!');
  }

  const handleDelete = (id) => {
    dispatch({ type: 'DELETE_RENDA', payload: id });
  };

  const toggleType = (newType) => {
    dispatch({ type: 'UPDATE_SETTING', payload: { key: 'housing_type', value: newType } });
    showToast(`Perfil alterado para: ${newType === 'renda' ? 'Arrendamento' : 'Casa Própria'}`);
  };

  const totalPago = state.rendas.filter(r => r.estado === 'pago').reduce((s, r) => s + r.valor, 0);

  // Advanced calculations
  const chartData = useMemo(() => {
    const monthlyMap = state.rendas.reduce((acc, r) => {
      acc[r.mes] = (acc[r.mes] || 0) + r.valor;
      return acc;
    }, {});
    return Object.entries(monthlyMap).map(([mes, valor]) => ({ mes, valor })).sort((a,b) => a.mes.localeCompare(b.mes));
  }, [state.rendas]);

  const committedIncome = useMemo(() => {
    const rendasMes = state.rendas.filter(r => r.mes === monthKey).reduce((s, r) => s + r.valor, 0);
    const receitasMes = state.transacoes.filter(t => t.tipo === 'receita' && t.data.startsWith(monthKey)).reduce((s, t) => s + t.valor, 0);
    if (!receitasMes || receitasMes === 0) return rendasMes > 0 ? 100 : 0; 
    return Math.min(100, Math.round((rendasMes / receitasMes) * 100));
  }, [state.rendas, state.transacoes, monthKey]);

  const momComparison = useMemo(() => {
    const curMonth = monthKey;
    const [y, m] = monthKey.split('-');
    const lastMonthDate = new Date(y, m - 2); 
    const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
    
    const curVal = state.rendas.filter(r => r.mes === curMonth).reduce((s, r) => s + r.valor, 0);
    const lastVal = state.rendas.filter(r => r.mes === lastMonthStr).reduce((s, r) => s + r.valor, 0);
    
    if (lastVal === 0) return curVal > 0 ? 100 : 0;
    return Math.round(((curVal - lastVal) / lastVal) * 100);
  }, [state.rendas, monthKey]);

  return (
    <div className="animate-fade-in pb-20 max-w-5xl mx-auto space-y-6">
      {/* Header with Breadcrumb and Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Visão Geral</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            Gestão de Habitação
          </h2>
        </div>
        
        {/* Toggle Elegante */}
        <div className="bg-black/5 dark:bg-white/5 p-1 rounded-xl flex items-center border border-black/5 dark:border-white/5 shadow-inner">
          <button 
            onClick={() => toggleType('renda')}
            className={`flex flex-1 md:flex-none items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              type === 'renda' 
                ? 'bg-white dark:bg-[#2a2a2a] text-ocean shadow-sm border border-black/5 dark:border-white/10' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Key size={16} /> Arrendamento
          </button>
          <button 
            onClick={() => toggleType('propria')}
             className={`flex flex-1 md:flex-none items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              type === 'propria' 
                ? 'bg-white dark:bg-[#2a2a2a] text-ocean shadow-sm border border-black/5 dark:border-white/10' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Home size={16} /> Casa Própria
          </button>
        </div>
      </div>

      {/* 2. Resumo Inteligente */}
      <HousingSummaryCard totalInvested={totalPago} currency={currency} type={type} />

      {/* 3. Indicadores Financeiros */}
      <HousingInsights committedIncome={committedIncome} momComparison={momComparison} />

      {/* 4. Gráfico Evolução */}
      <HousingChart data={chartData} currency={currency} />

      {/* 5. Formulário Compacto */}
      <HousingForm 
        form={form} 
        setForm={setForm} 
        handleSubmit={handleSubmit} 
        type={type} 
        currency={currency} 
        saveDefaults={saveDefaults} 
      />

      {/* 6. Histórico */}
      <HousingHistoryTable 
        rendas={state.rendas} 
        currency={currency} 
        handleDelete={handleDelete} 
        showToast={showToast} 
      />
    </div>
  );
}
