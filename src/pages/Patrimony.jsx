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
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showLiabilityModal, setShowLiabilityModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [errorModal, setErrorModal] = useState(null);

  const [assetForm, setAssetForm] = useState({ name: '', type: 'imóvel', value: '' });
  const [liabilityForm, setLiabilityForm] = useState({ name: '', totalAmount: '', remainingAmount: '', interestRate: '' });
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
    if (tLower === 'other' || tLower === 'outro') return 'Outro';
    return type || 'Conta';
  };

  // Advanced Simulators State
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

  // Retirement Logic
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

  // Inflation Logic
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

  const handleAddLiability = (e) => {
    e.preventDefault();
    if (!liabilityForm.name || !liabilityForm.totalAmount || !liabilityForm.remainingAmount) return;
    dispatch({ 
      type: 'ADD_LIABILITY', 
      payload: { 
        ...liabilityForm, 
        totalAmount: parseFloat(liabilityForm.totalAmount), 
        remainingAmount: parseFloat(liabilityForm.remainingAmount),
        interestRate: parseFloat(liabilityForm.interestRate || 0)
      } 
    });
    setShowLiabilityModal(false);
    setLiabilityForm({ name: '', totalAmount: '', remainingAmount: '', interestRate: '' });
    showToast(t('patrimony.toasts.liability_added'));
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

  const assetIcons = {
    'imóvel': Home,
    'veiculo': Car,
    'poupanca': Smartphone,
    'investimento': TrendingUp,
    'outro': Star
  };

  const accountIcons = {
    'bank': Briefcase,
    'banco': Briefcase,
    'mobile': Smartphone,
    'carteira_movel': Smartphone,
    'cash': Zap,
    'dinheiro': Zap,
    'other': Briefcase,
    'outro': Briefcase
  };

  const getAccountCardStyle = (type, name) => {
    const n = name.toLowerCase();
    if (n.includes('m-pesa') || n.includes('mpesa') || n.includes('vodacom')) return 'from-[#E3000F] to-[#99000a] text-white'; // M-Pesa red
    if (n.includes('e-mola') || n.includes('emola') || n.includes('movitel')) return 'from-[#F58220] to-[#c75e0c] text-white'; // e-mola orange
    if (n.includes('bim') || n.includes('millennium')) return 'from-[#002f6c] to-[#001031] text-white'; // BIM
    if (n.includes('bci')) return 'from-[#0070bc] to-[#003666] text-white'; // BCI
    if (n.includes('moza')) return 'from-[#004e38] to-[#002e21] text-white'; // Moza
    if (n.includes('standard')) return 'from-[#0033a1] to-[#00226a] text-white'; // Standard Bank
    if (type === 'mobile') return 'from-rose-500 to-rose-800 text-white';
    if (type === 'cash') return 'from-emerald-500 to-emerald-800 text-white';
    return 'from-ocean to-midnight text-white'; // Default
  };

  return (
    <div className="section-fade">
      <div className="sh">
        <div>
          <h1 className="section-title">{t('patrimony.title')}</h1>
          <p className="ssub">{t('patrimony.subtitle')}</p>
        </div>
      </div>

      <div className="summary-grid mb-6 animate-fade-in-up">
        <div className="glass-card p-5 group cursor-pointer" style={{ borderLeft: '4px solid var(--color-leaf)' }}>
          <div className="flex items-center gap-3 mb-2 justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform"><TrendingUp size={20} /></div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('patrimony.total_assets')}</span>
            </div>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{fmt(totalAssets, currency)}</div>
        </div>
        
        <div className="glass-card p-5 group cursor-pointer" style={{ borderLeft: '4px solid var(--color-coral)' }}>
          <div className="flex items-center gap-3 mb-2 justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 group-hover:scale-110 transition-transform"><TrendingDown size={20} /></div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('patrimony.total_liabilities')}</span>
            </div>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{fmt(totalLiabilities, currency)}</div>
        </div>

        <div className="glass-card p-5 group cursor-pointer" style={{ borderLeft: `4px solid ${netWorth >= 0 ? 'var(--color-ocean)' : 'var(--color-coral)'}` }}>
          <div className="flex items-center gap-3 mb-2 justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform"><Medal size={20} /></div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('patrimony.net_worth')}</span>
            </div>
            {netWorth >= 0 && (
              <div className="premium-badge animate-float" style={{ background: `linear-gradient(135deg, ${tier.color}, #333)`, color: 'white', border: `1px solid ${tier.color}` }}>
                <tier.icon size={12} /> {tier.label}
              </div>
            )}
          </div>
          <div className={`text-2xl font-bold font-serif ${netWorth >= 0 ? 'text-emerald-600' : 'text-rose-600'} transition-colors`}>
            {fmt(netWorth, currency)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contas Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold font-serif dark:text-white flex items-center gap-2">
              <Wallet size={18} className="text-ocean" /> {t('patrimony.accounts.title')}
            </h2>
            <button className="text-xs bg-ocean/10 text-ocean hover:bg-ocean/20 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 transition-colors" onClick={() => setShowAccountModal(true)}>
              <Plus size={14} /> {t('patrimony.accounts.add')}
            </button>
          </div>
          
          <div className="flex flex-col gap-4">
            {/* Dinheiro Físico (Global Setting - if exists) */}
            {state.settings.cash_balance !== undefined && Number(state.settings.cash_balance) > 0 && (
               <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-gold to-yellow-600 text-white p-5 shadow-lg flex items-end justify-between cursor-pointer hover:scale-[1.02] transition-transform">
                 <div className="absolute top-[-20%] right-[-10%] opacity-20"><Zap size={120} /></div>
                 <div className="relative z-10 w-full">
                    <div className="flex items-center gap-2 mb-4 opacity-80 text-xs font-bold uppercase tracking-widest">
                      <Wallet size={14} /> Dinheiro em Mão
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-black font-serif tracking-tight">{fmt(state.settings.cash_balance, currency)}</div>
                    </div>
                 </div>
               </div>
            )}

            {/* Contas List */}
            {state.contas?.filter(a => Number(a.current_balance || 0) > 0).length > 0 ? (
              state.contas
                .filter(a => Number(a.current_balance || 0) > 0)
                .sort((a, b) => Number(b.current_balance || 0) - Number(a.current_balance || 0))
                .map((account, idx) => {
                const Icon = accountIcons[account.type] || Briefcase;
                const styleClass = getAccountCardStyle(account.type, account.name);
                return (
                  <div key={account.id || `account-${idx}`} className={`relative overflow-hidden rounded-2xl bg-linear-to-br ${styleClass} p-5 shadow-lg group hover:shadow-xl transition-all hover:scale-[1.02]`}>
                    {/* Background Pattern */}
                    <div className="absolute top-[-30%] right-[-10%] opacity-10 group-hover:opacity-20 transition-opacity">
                      <Icon size={140} />
                    </div>
                    
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-2 bg-black/10 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest">
                          <Icon size={12} /> {getTypeLabel(account.type)}
                        </div>
                        <button 
                          className="p-2 bg-black/20 text-white/80 hover:bg-rose-500 hover:text-white rounded-full transition-colors"
                          onClick={() => {
                            dispatch({ type: 'DELETE_ACCOUNT', payload: account.id })
                              .catch(err => setErrorModal(err.message));
                          }}
                          title="Eliminar Conta"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      
                      <div className="mt-2">
                        <div className="text-xs font-medium opacity-80 mb-1">{account.name}</div>
                        <div className="text-2xl font-black font-serif tracking-tight">{fmt(account.current_balance, currency)}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center text-slate-400">
                <Wallet size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm font-semibold">{t('patrimony.accounts.empty')}</p>
                <p className="text-xs mt-1 opacity-70">Adiciona a tua primeira conta bancária ou carteira móvel.</p>
              </div>
            )}
          </div>
        </div>

        {/* Assets Section */}
        <div>
          <div className="sh">
            <h2 className="st">{t('patrimony.assets.title')}</h2>
            <button className="btn btn-secondary py-1 px-3 text-sm" onClick={() => setShowAssetModal(true)}>
              <Plus size={16} /> {t('patrimony.assets.add')}
            </button>
          </div>
          
          <div className="glass-card overflow-hidden">
            {state.activos?.filter(a => a.value > 0).length > 0 ? (
              <div className="divide-y divide-slate-100">
                {state.activos
                  .filter(a => a.value > 0)
                  .sort((a, b) => b.value - a.value)
                  .map((asset, idx) => {
                  const Icon = assetIcons[asset.type] || Star;
                  return (
                    <div key={asset.id || `asset-${idx}`} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <Icon size={18} />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{asset.name}</div>
                          <div className="text-xs text-slate-500 capitalize">{t(`patrimony.assets.types.${asset.type}`)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="font-bold text-emerald-600">{fmt(asset.value, currency)}</div>
                        <button 
                          className="text-slate-300 hover:text-rose-500 transition-colors"
                          onClick={() => dispatch({ type: 'DELETE_ASSET', payload: asset.id })}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <p>{t('patrimony.assets.empty')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Liabilities Section */}
        <div>
          <div className="sh">
            <h2 className="st">{t('patrimony.liabilities.title')}</h2>
            <Link to="/dividas" className="btn btn-secondary py-1 px-3 text-sm flex items-center gap-1">
              <span>Gerir Dívidas</span> <ArrowRight size={14} />
            </Link>
          </div>

          <div className="glass-card overflow-hidden">
            {activeDebts.filter(d => (d.remaining_amount || 0) > 0).length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeDebts
                  .filter(d => (d.remaining_amount || 0) > 0)
                  .sort((a, b) => (b.remaining_amount || 0) - (a.remaining_amount || 0))
                  .map((d, idx) => (
                  <div key={d.id || `debt-${idx}`} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        <TrendingDown size={18} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{d.creditor_name}</div>
                        <div className="text-xs text-slate-500">
                           Dívida Ativa
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-rose-600">{fmt(d.remaining_amount, currency)}</div>
                        <div className="text-[10px] text-slate-400">Total: {fmt(d.total_amount, currency)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center text-slate-400 m-4">
                <ShieldAlert size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm font-semibold">Sem Dívidas Ativas</p>
                <p className="text-xs mt-1 opacity-70">Excelente trabalho!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── ADVANCED SIMULATORS (PATRIMONY) ─── */}
      <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <div className="sh">
          <div>
            <h2 className="section-title" style={{ border: 'none', marginBottom: 0 }}>{t('patrimony.projections.title')} <span className="premium-badge ml-3 animate-pulse" style={{ background: 'var(--color-ocean)', color: 'white' }}>PRO</span></h2>
            <p className="ssub" style={{ marginTop: '-4px' }}>{t('patrimony.projections.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Retirement / FIRE Simulator */}
          <div className="glass-card p-5" style={{ background: 'linear-gradient(135deg, rgba(201, 150, 58, 0.03), rgba(10, 77, 104, 0.03))' }}>
            <div className="flex items-center gap-2 mb-4 text-emerald-700 font-bold text-sm uppercase tracking-wide">
              <Flame size={18} /> {t('patrimony.projections.fire.title')}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="form-label text-[10px]">{t('patrimony.projections.fire.target_income')}</label>
                <input type="number" className="form-input text-sm" value={retireTargetIncome} onChange={(e) => setRetireTargetIncome(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="form-label text-[10px]">{t('patrimony.projections.fire.return_rate')}</label>
                <input type="number" className="form-input text-sm" value={retireReturnRate} onChange={(e) => setRetireReturnRate(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="col-span-2">
                <label className="form-label text-[10px]">{t('patrimony.projections.fire.monthly_savings')}</label>
                <input type="number" className="form-input text-sm" value={retireMonthlySavings} onChange={(e) => setRetireMonthlySavings(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            
            <div className="bg-white/40 dark:bg-black/20 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs text-slate-500 font-semibold uppercase">{t('patrimony.projections.fire.potential')}</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{yearsToFire > 0 ? t('patrimony.projections.fire.in_years', { years: yearsToFire }) : t('patrimony.projections.fire.goal_met')}</span>
              </div>
              <div className="progress-bar-track mb-3">
                <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.max(0, (netWorth / fireNumber) * 100))}%`, background: 'var(--color-ocean)' }} />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{t('patrimony.projections.fire.current', { amount: fmt(Math.max(0, netWorth), currency) })}</span>
                <span>{t('patrimony.projections.fire.target', { amount: fmt(fireNumber, currency) })}</span>
              </div>
            </div>
          </div>

          {/* Inflation Simulator */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4 text-rose-600 font-bold text-sm uppercase tracking-wide">
              <ShieldAlert size={18} /> {t('patrimony.projections.inflation.title')}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="form-label text-[10px]">{t('patrimony.projections.inflation.years')}</label>
                <input type="number" className="form-input text-sm" value={inflationYears} onChange={(e) => setInflationYears(parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="form-label text-[10px]">{t('patrimony.projections.inflation.rate')}</label>
                <input type="number" className="form-input text-sm" value={inflationRate} onChange={(e) => setInflationRate(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            
            <div className="bg-rose-50/50 dark:bg-rose-950/10 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30">
              <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                {t('patrimony.projections.inflation.description', { amount: fmt(Math.max(0, netWorth), currency), years: inflationYears })}
              </p>
              <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 px-3 rounded-lg mb-2 shadow-sm">
                <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold">
                  <TrendingDown size={14} /> {t('patrimony.projections.inflation.left_idle')}
                </div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{fmt(purchasingPower, currency)}</div>
              </div>
              <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 px-3 rounded-lg shadow-sm">
                <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold">
                  <TrendingUp size={14} /> {t('patrimony.projections.inflation.if_invested', { rate: retireReturnRate })}
                </div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{fmt(investedPower, currency)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="card-glass p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold font-serif mb-4">{t('patrimony.modals.add_asset')}</h3>
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('patrimony.modals.name_label')}</label>
                <input 
                  type="text" className="w-full" placeholder={t('patrimony.modals.name_placeholder')} required
                  value={assetForm.name} onChange={e => setAssetForm({...assetForm, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('patrimony.modals.type_label')}</label>
                  <select 
                    className="w-full"
                    value={assetForm.type} onChange={e => setAssetForm({...assetForm, type: e.target.value})}
                  >
                    <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="imóvel">{t('patrimony.assets.types.imóvel')}</option>
                    <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="veiculo">{t('patrimony.assets.types.veiculo')}</option>
                    <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="poupanca">{t('patrimony.assets.types.poupanca')}</option>
                    <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="investimento">{t('patrimony.assets.types.investimento')}</option>
                    <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="outro">{t('patrimony.assets.types.outro')}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('patrimony.modals.value_label')}</label>
                  <input 
                    type="number" className="w-full" placeholder="0" required
                    value={assetForm.value} onChange={e => setAssetForm({...assetForm, value: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowAssetModal(false)}>{t('patrimony.modals.cancel')}</button>
                <button type="submit" className="btn btn-primary flex-1">{t('patrimony.modals.add')}</button>
              </div>
            </form>
          </div>
        </div>
      )}



      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="card-glass p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold font-serif mb-4">{t('patrimony.modals.add_account')}</h3>
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Instituição</label>
                <select 
                  className="w-full"
                  value={accountForm.institution} 
                  onChange={e => {
                    const inst = MOZ_INSTITUTIONS.find(i => i.name === e.target.value);
                    setAccountForm({ ...accountForm, institution: e.target.value, type: inst ? inst.type : 'other' });
                  }}
                  required
                >
                  {MOZ_INSTITUTIONS.map(inst => (
                    <option key={inst.id} value={inst.name} className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white text-slate-900 bg-white dark:bg-slate-800 dark:text-white">
                      {inst.name}
                    </option>
                  ))}
                </select>
              </div>

              {accountForm.institution === 'Outro' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nome da Conta / Banco</label>
                  <input 
                    type="text" className="w-full" placeholder="Ex: Conta Conjunta" required
                    value={accountForm.customName} onChange={e => setAccountForm({...accountForm, customName: e.target.value})}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('patrimony.modals.initial_balance_label')}</label>
                <input 
                  type="number" className="w-full" placeholder="0" required
                  value={accountForm.initial_balance} onChange={e => setAccountForm({...accountForm, initial_balance: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowAccountModal(false)}>{t('patrimony.modals.cancel')}</button>
                <button type="submit" className="btn btn-primary flex-1">{t('patrimony.modals.add')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {errorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="card-glass p-6 w-full max-w-sm border-t-4 border-rose-500 animate-in fade-in zoom-in cursor-default text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-[-20%] right-[-10%] opacity-5 text-rose-500">
               <ShieldAlert size={150} />
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center mb-4 ring-4 ring-rose-500/10">
                <ShieldAlert size={32} />
              </div>
              <h3 className="text-xl font-bold font-serif mb-2 text-slate-800 dark:text-slate-100 uppercase tracking-tight">Operação Recusada</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                {errorModal}
              </p>
              <button 
                className="btn w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 text-sm shadow-md shadow-rose-500/20 active:scale-95 transition-all" 
                onClick={() => setErrorModal(null)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
