import React, { useState } from 'react';
import { useFinance } from '../hooks/useFinanceStore';
import { useOutletContext } from 'react-router-dom';
import { TrendingUp, TrendingDown, Medal, Plus, Trash2, Home, Car, Smartphone, Briefcase, Star, Shield, Zap, Flame, Target, Info, ArrowRight, ShieldAlert } from 'lucide-react';
import { fmt } from '../utils/calculations';

export default function Patrimony() {
  const { state, dispatch } = useFinance();
  const currency = state.settings.currency || 'MT';
  const { showToast } = useOutletContext();
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showLiabilityModal, setShowLiabilityModal] = useState(false);

  const [assetForm, setAssetForm] = useState({ name: '', type: 'imóvel', value: '' });
  const [liabilityForm, setLiabilityForm] = useState({ name: '', totalAmount: '', remainingAmount: '', interestRate: '' });

  // Advanced Simulators State
  const [retireMonthlySavings, setRetireMonthlySavings] = useState(10000);
  const [retireReturnRate, setRetireReturnRate] = useState(10);
  const [retireTargetIncome, setRetireTargetIncome] = useState(50000);
  
  const [inflationYears, setInflationYears] = useState(10);
  const [inflationRate, setInflationRate] = useState(7);

  const totalAssets = state.activos?.reduce((s, a) => s + a.value, 0) || 0;
  const totalLiabilities = state.passivos?.reduce((s, p) => s + p.restante, 0) || 0;
  const netWorth = totalAssets - totalLiabilities;

  const getNetWorthTier = (amount) => {
    if (amount < 0) return { label: 'Em Dívida', color: 'var(--color-coral)', icon: TrendingDown };
    if (amount < 100000) return { label: 'Iniciante', color: 'var(--color-sky)', icon: Star };
    if (amount < 1000000) return { label: 'Bronze', color: '#cd7f32', icon: Shield };
    if (amount < 5000000) return { label: 'Prata', color: '#94a3b8', icon: Medal };
    if (amount < 15000000) return { label: 'Ouro', color: 'var(--color-gold)', icon: Flame };
    return { label: 'Diamante', color: '#0ea5e9', icon: Zap };
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
    showToast('Activo adicionado com sucesso!');
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
    showToast('Passivo adicionado com sucesso!');
  };

  const assetIcons = {
    'imóvel': Home,
    'veiculo': Car,
    'poupanca': Smartphone,
    'investimento': TrendingUp,
    'outro': Star
  };

  return (
    <div className="section-fade">
      <div className="sh">
        <div>
          <h1 className="section-title">Património</h1>
          <p className="ssub">Gestão de bens e dívidas</p>
        </div>
      </div>

      <div className="summary-grid mb-6 animate-fade-in-up">
        <div className="glass-card p-5 group cursor-pointer" style={{ borderLeft: '4px solid var(--color-leaf)' }}>
          <div className="flex items-center gap-3 mb-2 justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform"><TrendingUp size={20} /></div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Activos</span>
            </div>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{fmt(totalAssets, currency)}</div>
        </div>
        
        <div className="glass-card p-5 group cursor-pointer" style={{ borderLeft: '4px solid var(--color-coral)' }}>
          <div className="flex items-center gap-3 mb-2 justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 group-hover:scale-110 transition-transform"><TrendingDown size={20} /></div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Passivos</span>
            </div>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{fmt(totalLiabilities, currency)}</div>
        </div>

        <div className="glass-card p-5 group cursor-pointer" style={{ borderLeft: `4px solid ${netWorth >= 0 ? 'var(--color-ocean)' : 'var(--color-coral)'}` }}>
          <div className="flex items-center gap-3 mb-2 justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform"><Medal size={20} /></div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Líquido</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets Section */}
        <div>
          <div className="sh">
            <h2 className="st">Activos</h2>
            <button className="btn btn-secondary py-1 px-3 text-sm" onClick={() => setShowAssetModal(true)}>
              <Plus size={16} /> Adicionar
            </button>
          </div>
          
          <div className="glass-card overflow-hidden">
            {state.activos?.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {state.activos.map((asset, idx) => {
                  const Icon = assetIcons[asset.type] || Star;
                  return (
                    <div key={asset.id || `asset-${idx}`} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <Icon size={18} />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{asset.name}</div>
                          <div className="text-xs text-slate-500 capitalize">{asset.type}</div>
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
                <p>Nenhum activo registado.</p>
              </div>
            )}
          </div>
        </div>

        {/* Liabilities Section */}
        <div>
          <div className="sh">
            <h2 className="st">Passivos</h2>
            <button className="btn btn-secondary py-1 px-3 text-sm" onClick={() => setShowLiabilityModal(true)}>
              <Plus size={16} /> Adicionar
            </button>
          </div>

          <div className="glass-card overflow-hidden">
            {state.passivos?.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {state.passivos.map((p, idx) => (
                  <div key={p.id || `liab-${idx}`} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <TrendingDown size={18} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{p.name}</div>
                        <div className="text-xs text-slate-500">
                          {p.interestRate ? `${p.interestRate}% juro` : 'Sem juros'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-rose-600">{fmt(p.restante)}</div>
                        <div className="text-[10px] text-slate-400">de {fmt(p.total)}</div>
                      </div>
                      <button 
                        className="text-slate-300 hover:text-rose-500 transition-colors"
                        onClick={() => dispatch({ type: 'DELETE_LIABILITY', payload: p.id })}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <p>Nenhum passivo registado.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── ADVANCED SIMULATORS (PATRIMONY) ─── */}
      <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <div className="sh">
          <div>
            <h2 className="section-title" style={{ border: 'none', marginBottom: 0 }}>Projeções de Património <span className="premium-badge ml-3 animate-pulse" style={{ background: 'var(--color-ocean)', color: 'white' }}>PRO</span></h2>
            <p className="ssub" style={{ marginTop: '-4px' }}>Simuladores de reforma e impacto inflacionário</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Retirement / FIRE Simulator */}
          <div className="glass-card p-5" style={{ background: 'linear-gradient(135deg, rgba(201, 150, 58, 0.03), rgba(10, 77, 104, 0.03))' }}>
            <div className="flex items-center gap-2 mb-4 text-emerald-700 font-bold text-sm uppercase tracking-wide">
              <Flame size={18} /> Simulador FIRE (Reforma)
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="form-label text-[10px]">Renda Desejada na Reforma</label>
                <input type="number" className="form-input text-sm" value={retireTargetIncome} onChange={(e) => setRetireTargetIncome(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="form-label text-[10px]">Taxa de Retorno Anual (%)</label>
                <input type="number" className="form-input text-sm" value={retireReturnRate} onChange={(e) => setRetireReturnRate(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="col-span-2">
                <label className="form-label text-[10px]">Poupança Mensal</label>
                <input type="number" className="form-input text-sm" value={retireMonthlySavings} onChange={(e) => setRetireMonthlySavings(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            
            <div className="bg-white/40 dark:bg-black/20 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs text-slate-500 font-semibold uppercase">Potencial de Reforma</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{yearsToFire > 0 ? `Em ${yearsToFire} Anos` : 'Meta Atingida! 🎉'}</span>
              </div>
              <div className="progress-bar-track mb-3">
                <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.max(0, (netWorth / fireNumber) * 100))}%`, background: 'var(--color-ocean)' }} />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Atual: {fmt(Math.max(0, netWorth), currency)}</span>
                <span>Alvo FIRE: <strong className="text-amber-600">{fmt(fireNumber, currency)}</strong></span>
              </div>
            </div>
          </div>

          {/* Inflation Simulator */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4 text-rose-600 font-bold text-sm uppercase tracking-wide">
              <ShieldAlert size={18} /> Simulador de Inflação
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="form-label text-[10px]">Tempo de Projeção (Anos)</label>
                <input type="number" className="form-input text-sm" value={inflationYears} onChange={(e) => setInflationYears(parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="form-label text-[10px]">Taxa de Inflação Média (%)</label>
                <input type="number" className="form-input text-sm" value={inflationRate} onChange={(e) => setInflationRate(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            
            <div className="bg-rose-50/50 dark:bg-rose-950/10 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30">
              <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                Seu património líquido atual de <strong className="text-slate-700 dark:text-slate-300">{fmt(Math.max(0, netWorth), currency)}</strong> valerá em <strong>{inflationYears} anos</strong>:
              </p>
              <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 px-3 rounded-lg mb-2 shadow-sm">
                <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold">
                  <TrendingDown size={14} /> Se deixado parado
                </div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{fmt(purchasingPower, currency)}</div>
              </div>
              <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 px-3 rounded-lg shadow-sm">
                <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold">
                  <TrendingUp size={14} /> Se investido ({retireReturnRate}%)
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
            <h3 className="text-lg font-bold font-serif mb-4">Adicionar Activo</h3>
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
                <input 
                  type="text" className="w-full" placeholder="Ex: Terreno Pemba" required
                  value={assetForm.name} onChange={e => setAssetForm({...assetForm, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
                  <select 
                    className="w-full"
                    value={assetForm.type} onChange={e => setAssetForm({...assetForm, type: e.target.value})}
                  >
                    <option value="imóvel">Imóvel</option>
                    <option value="veiculo">Veículo</option>
                    <option value="poupanca">Poupança</option>
                    <option value="investimento">Investimento</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Valor (MT)</label>
                  <input 
                    type="number" className="w-full" placeholder="0" required
                    value={assetForm.value} onChange={e => setAssetForm({...assetForm, value: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowAssetModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary flex-1">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLiabilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="card-glass p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold font-serif mb-4">Adicionar Passivo</h3>
            <form onSubmit={handleAddLiability} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nome da Dívida</label>
                <input 
                  type="text" className="w-full" placeholder="Ex: Crédito BCI" required
                  value={liabilityForm.name} onChange={e => setLiabilityForm({...liabilityForm, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Valor Total (MT)</label>
                  <input 
                    type="number" className="w-full" placeholder="0" required
                    value={liabilityForm.totalAmount} onChange={e => setLiabilityForm({...liabilityForm, totalAmount: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Restante (MT)</label>
                  <input 
                    type="number" className="w-full" placeholder="0" required
                    value={liabilityForm.remainingAmount} onChange={e => setLiabilityForm({...liabilityForm, remainingAmount: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Taxa Juro Anual (%)</label>
                <input 
                  type="number" className="w-full" placeholder="Ex: 18"
                  value={liabilityForm.interestRate} onChange={e => setLiabilityForm({...liabilityForm, interestRate: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowLiabilityModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary flex-1">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
