import React, { useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { useOutletContext, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Medal, Plus, Trash2, Home, Car, Smartphone, Briefcase, Star, Shield, Zap, Flame, Target, Info, ArrowRight, ShieldAlert, Wallet } from 'lucide-react';
import { fmt } from '../utils/calculations';

export default function Patrimony() {
  const { t } = useTranslation();
  const { state, dispatch } = useFinance();
  const currency = state.settings.currency || 'MT';
  const { showToast } = useOutletContext();
  const [showBalance] = useState(() => localStorage.getItem('mwanga-show-balance') !== 'false');

  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [errorModal, setErrorModal] = useState(null);

  const [assetForm, setAssetForm] = useState({ name: '', type: 'imóvel', value: '' });
  const [accountForm, setAccountForm] = useState({ institution: 'M-Pesa', customName: '', type: 'mobile', initial_balance: '' });

  const MOZ_INSTITUTIONS = [
    { id: 'mpesa', name: 'M-Pesa', type: 'mobile' },
    { id: 'emola', name: 'e-Mola', type: 'mobile' },
    { id: 'mkesh', name: 'mKesh', type: 'mobile' },
    { id: 'bim', name: 'Millennium BIM', type: 'bank' },
    { id: 'bci', name: 'BCI', type: 'bank' },
    { id: 'moza', name: 'Moza Banco', type: 'bank' },
    { id: 'standard', name: 'Standard Bank', type: 'bank' },
    { id: 'absa', name: 'Absa', type: 'bank' },
    { id: 'fnb', name: 'FNB Moçambique', type: 'bank' },
    { id: 'access', name: 'Access Bank', type: 'bank' },
    { id: 'cash', name: 'Dinheiro em Mão', type: 'cash' },
    { id: 'other', name: 'Outro', type: 'other' }
  ];

  const getTypeLabel = (type) => {
    const tLower = typeof type === 'string' ? type.toLowerCase() : '';
    if (tLower === 'bank' || tLower === 'banco') return 'Conta Bancária';
    if (tLower === 'mobile' || tLower === 'carteira_movel' || tLower === 'movel') return 'Carteira Móvel';
    if (tLower === 'cash' || tLower === 'dinheiro') return 'Dinheiro';
    return type || 'Conta';
  };

  const [retireMonthlySavings, setRetireMonthlySavings] = useState(10000);
  const [retireReturnRate, setRetireReturnRate] = useState(10);
  const [retireTargetIncome, setRetireTargetIncome] = useState(50000);
  const [inflationYears, setInflationYears] = useState(10);
  const [inflationRate, setInflationRate] = useState(7);

  const totalAssets = state.activos?.reduce((s, a) => s + a.value, 0) || 0;
  const activeDebts = state.dividas?.filter(d => d.status !== 'paid') || [];
  const totalLiabilities = activeDebts.reduce((s, d) => s + (d.remaining_amount || 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  const getNetWorthTier = (amount) => {
    if (amount < 0) return { label: t('patrimony.tiers.debt'), color: 'var(--color-coral)', icon: TrendingDown };
    if (amount < 100000) return { label: t('patrimony.tiers.beginner'), color: 'var(--color-sky)', icon: Star };
    if (amount < 1000000) return { label: t('patrimony.tiers.bronze'), color: '#cd7f32', icon: Shield };
    if (amount < 5000000) return { label: t('patrimony.tiers.silver'), color: '#94a3b8', icon: Medal };
    if (amount < 15000000) return { label: t('patrimony.tiers.gold'), color: 'var(--color-gold)', icon: Flame };
    return { label: t('patrimony.tiers.diamond'), color: '#0ea5e9', icon: Zap };
  };
  const tier = getNetWorthTier(netWorth);

  const fireNumber = retireTargetIncome * 12 * 25;
  let yearsToFire = 0;
  if (fireNumber > netWorth) {
    const rate = retireReturnRate / 100;
    const monthlyRate = rate / 12;
    let currentBalance = Math.max(0, netWorth);
    let months = 0;
    while (currentBalance < fireNumber && months < 1200) {
      currentBalance = currentBalance * (1 + monthlyRate) + retireMonthlySavings;
      months++;
    }
    yearsToFire = (months / 12).toFixed(1);
  }

  const purchasingPower = Math.max(0, netWorth) / Math.pow(1 + (inflationRate / 100), inflationYears);
  const investedPower = Math.max(0, netWorth) * Math.pow(1 + ((retireReturnRate - inflationRate) / 100), inflationYears);

  const handleAddAsset = (e) => {
    e.preventDefault();
    if (!assetForm.name || !assetForm.value) return;
    dispatch({ type: 'ADD_ASSET', payload: { ...assetForm, value: parseFloat(assetForm.value) } });
    setShowAssetModal(false);
    setAssetForm({ name: '', type: 'imóvel', value: '' });
    showToast(t('patrimony.toasts.asset_added'));
  };

  const handleAddAccount = (e) => {
    e.preventDefault();
    const finalName = accountForm.institution === 'Outro' ? accountForm.customName : accountForm.institution;
    if (!finalName || accountForm.initial_balance === '') return;
    dispatch({ 
      type: 'ADD_ACCOUNT', 
      payload: { 
        name: finalName, 
        type: accountForm.type, 
        initial_balance: parseFloat(accountForm.initial_balance),
        current_balance: parseFloat(accountForm.initial_balance)
      } 
    });
    setShowAccountModal(false);
    setAccountForm({ institution: 'M-Pesa', customName: '', type: 'mobile', initial_balance: '' });
    showToast(t('patrimony.toasts.account_added'));
  };

  const assetIcons = { 'imóvel': Home, 'veiculo': Car, 'poupanca': Smartphone, 'investimento': TrendingUp, 'outro': Star };
  const accountIcons = { 'bank': Briefcase, 'banco': Briefcase, 'mobile': Smartphone, 'carteira_movel': Smartphone, 'cash': Zap, 'dinheiro': Zap, 'other': Briefcase, 'outro': Briefcase };

  const getAccountCardStyle = (type, name) => {
    const n = name.toLowerCase();
    if (n.includes('m-pesa') || n.includes('mpesa')) return 'from-[#E3000F] to-[#99000a] text-white';
    if (n.includes('e-mola') || n.includes('emola')) return 'from-[#F58220] to-[#c75e0c] text-white';
    if (n.includes('bim')) return 'from-[#002f6c] to-[#001031] text-white';
    if (n.includes('bci')) return 'from-[#0070bc] to-[#003666] text-white';
    if (n.includes('moza')) return 'from-[#004e38] to-[#002e21] text-white';
    if (type === 'mobile') return 'from-rose-500 to-rose-800 text-white';
    if (type === 'cash') return 'from-emerald-500 to-emerald-800 text-white';
    return 'from-ocean to-midnight text-white';
  };

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter">{t('patrimony.title')}</h1>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('patrimony.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-5 border-l-4 border-l-leaf">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t('patrimony.total_assets')}</span>
          <div className="text-xl font-black text-white mt-1">{showBalance ? fmt(totalAssets, currency) : '••••'}</div>
        </div>
        <div className="glass-card p-5 border-l-4 border-l-coral">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t('patrimony.total_liabilities')}</span>
          <div className="text-xl font-black text-white mt-1">{showBalance ? fmt(totalLiabilities, currency) : '••••'}</div>
        </div>
        <div className="glass-card p-5 border-l-4 border-l-ocean bg-linear-to-br from-midnight to-black">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t('patrimony.net_worth')}</span>
            {showBalance && (
               <div className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border" style={{ borderColor: tier.color, color: tier.color }}>
                 {tier.label}
               </div>
            )}
          </div>
          <div className={`text-2xl font-black mt-1 ${netWorth >= 0 ? 'text-leaf' : 'text-coral'}`}>
            {showBalance ? fmt(netWorth, currency) : '••••'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ACCOUNTS */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black uppercase tracking-widest text-white">{t('patrimony.accounts.title')}</h2>
            <button className="p-2 rounded-xl bg-ocean/10 text-ocean" onClick={() => setShowAccountModal(true)}><Plus size={16} /></button>
          </div>
          <div className="flex flex-col gap-4">
             {state.settings.cash_balance !== undefined && Number(state.settings.cash_balance) > 0 && (
                <div className="glass-card p-5 bg-linear-to-br from-gold to-yellow-700 text-midnight relative overflow-hidden group">
                  <Wallet size={80} className="absolute -right-4 -bottom-4 opacity-10" />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Dinheiro em Mão</span>
                  <div className="text-2xl font-black mt-2">{showBalance ? fmt(state.settings.cash_balance, currency) : '••••'}</div>
                </div>
             )}
             {state.contas?.filter(acc => Number(acc.current_balance || 0) > 0).map(account => (
               <div key={account.id} className={`glass-card p-5 bg-linear-to-br ${getAccountCardStyle(account.type, account.name)} relative overflow-hidden group`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-2 py-1 rounded-lg bg-black/20 text-[8px] font-black uppercase tracking-widest">{getTypeLabel(account.type)}</span>
                    <button onClick={() => dispatch({ type: 'DELETE_ACCOUNT', payload: account.id })} className="p-1.5 rounded-lg bg-black/10 hover:bg-coral text-white transition-colors"><Trash2 size={12} /></button>
                  </div>
                  <span className="text-xs font-bold opacity-80">{account.name}</span>
                  <div className="text-2xl font-black mt-1">{showBalance ? fmt(account.current_balance, currency) : '••••'}</div>
               </div>
             ))}
          </div>
        </div>

        {/* ASSETS */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black uppercase tracking-widest text-white">{t('patrimony.assets.title')}</h2>
            <button className="p-2 rounded-xl bg-leaf/10 text-leaf" onClick={() => setShowAssetModal(true)}><Plus size={16} /></button>
          </div>
          <div className="glass-card divide-y divide-white/5 overflow-hidden">
            {state.activos?.map(asset => (
              <div key={asset.id} className="p-4 flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-leaf transition-colors">
                    {React.createElement(assetIcons[asset.type] || Star, { size: 18 })}
                  </div>
                  <div>
                    <p className="text-xs font-black text-white">{asset.name}</p>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{asset.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-black text-leaf">{showBalance ? fmt(asset.value, currency) : '••••'}</span>
                  <button onClick={() => dispatch({ type: 'DELETE_ASSET', payload: asset.id })} className="text-gray-600 hover:text-coral transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LIABILITIES */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black uppercase tracking-widest text-white">{t('patrimony.liabilities.title')}</h2>
            <Link to="/dividas" className="p-2 rounded-xl bg-coral/10 text-coral"><ArrowRight size={16} /></Link>
          </div>
          <div className="glass-card divide-y divide-white/5 overflow-hidden">
            {activeDebts.map(d => (
              <div key={d.id} className="p-4 flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400">
                    <TrendingDown size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white">{d.creditor_name}</p>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Dívida Ativa</p>
                  </div>
                </div>
                <span className="text-sm font-black text-coral">{showBalance ? fmt(d.remaining_amount, currency) : '••••'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SIMULATORS */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-6 border-indigo-500/10">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 mb-6 flex items-center gap-2"><Flame size={14} /> FIRE Simulator</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
             <div className="space-y-1">
               <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Renda Alvo</label>
               <input type="number" className="form-input text-xs" value={retireTargetIncome} onChange={e => setRetireTargetIncome(parseFloat(e.target.value) || 0)} />
             </div>
             <div className="space-y-1">
               <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Retorno %</label>
               <input type="number" className="form-input text-xs" value={retireReturnRate} onChange={e => setRetireReturnRate(parseFloat(e.target.value) || 0)} />
             </div>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
             <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">
               <span>Progresso FIRE</span>
               <span className="text-white">{yearsToFire} Anos</span>
             </div>
             <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (netWorth / fireNumber) * 100)}%` }} />
             </div>
             <div className="flex justify-between mt-4 text-[10px] font-bold">
               <span className="text-gray-500">Atual: {showBalance ? fmt(Math.max(0, netWorth), currency) : '••••'}</span>
               <span className="text-indigo-400">Alvo: {showBalance ? fmt(fireNumber, currency) : '••••'}</span>
             </div>
          </div>
        </div>

        <div className="glass-card p-6 border-coral/10">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-coral-light mb-6 flex items-center gap-2"><ShieldAlert size={14} /> Impacto da Inflação</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
             <div className="space-y-1">
               <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Anos</label>
               <input type="number" className="form-input text-xs" value={inflationYears} onChange={e => setInflationYears(parseInt(e.target.value) || 0)} />
             </div>
             <div className="space-y-1">
               <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Inflação %</label>
               <input type="number" className="form-input text-xs" value={inflationRate} onChange={e => setInflationRate(parseFloat(e.target.value) || 0)} />
             </div>
          </div>
          <div className="space-y-3">
             <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
               <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Poder de Compra</span>
               <span className="text-sm font-black text-coral">{showBalance ? fmt(purchasingPower, currency) : '••••'}</span>
             </div>
             <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
               <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Se Investido</span>
               <span className="text-sm font-black text-leaf">{showBalance ? fmt(investedPower, currency) : '••••'}</span>
             </div>
          </div>
        </div>
      </div>

      {/* MODALS (Simplified styling) */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-midnight/80 backdrop-blur-md">
          <div className="glass-card p-8 w-full max-w-md animate-scale-in">
            <h3 className="text-xl font-black text-white mb-6">Nova Conta</h3>
            <form onSubmit={handleAddAccount} className="space-y-4">
              <select className="form-input" value={accountForm.institution} onChange={e => setAccountForm({...accountForm, institution: e.target.value, type: MOZ_INSTITUTIONS.find(i=>i.name===e.target.value)?.type || 'other'})} required>
                {MOZ_INSTITUTIONS.map(inst => <option key={inst.id} value={inst.name} className="text-black">{inst.name}</option>)}
              </select>
              <input type="number" className="form-input" placeholder="Saldo Inicial" required value={accountForm.initial_balance} onChange={e => setAccountForm({...accountForm, initial_balance: e.target.value})} />
              <div className="flex gap-4 pt-4">
                <button type="button" className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-gray-400" onClick={() => setShowAccountModal(false)}>Cancelar</button>
                <button type="submit" className="flex-1 btn-primary py-3 rounded-xl text-xs font-black uppercase tracking-widest">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
