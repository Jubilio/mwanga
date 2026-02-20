import React, { useState } from 'react';
import { useFinance } from '../hooks/useFinanceStore';
import { useOutletContext } from 'react-router-dom';
import { TrendingUp, TrendingDown, Medal, Plus, Trash2, Home, Car, Smartphone, Briefcase, Star } from 'lucide-react';
import { fmt } from '../utils/calculations';

export default function Patrimony() {
  const { state, dispatch } = useFinance();
  const { showToast } = useOutletContext();
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showLiabilityModal, setShowLiabilityModal] = useState(false);

  const [assetForm, setAssetForm] = useState({ name: '', type: 'imóvel', value: '' });
  const [liabilityForm, setLiabilityForm] = useState({ name: '', totalAmount: '', remainingAmount: '', interestRate: '' });

  const totalAssets = state.activos?.reduce((s, a) => s + a.value, 0) || 0;
  const totalLiabilities = state.passivos?.reduce((s, p) => s + p.restante, 0) || 0;
  const netWorth = totalAssets - totalLiabilities;

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
        <div className="glass-card p-5" style={{ borderLeft: '4px solid var(--color-leaf)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><TrendingUp size={20} /></div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Activos</span>
          </div>
          <div className="text-2xl font-bold font-serif text-slate-800">{fmt(totalAssets)}</div>
        </div>
        
        <div className="glass-card p-5" style={{ borderLeft: '4px solid var(--color-coral)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500"><TrendingDown size={20} /></div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Passivos</span>
          </div>
          <div className="text-2xl font-bold font-serif text-slate-800">{fmt(totalLiabilities)}</div>
        </div>

        <div className="glass-card p-5" style={{ borderLeft: `4px solid ${netWorth >= 0 ? 'var(--color-ocean)' : 'var(--color-coral)'}` }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500"><Medal size={20} /></div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Líquido</span>
          </div>
          <div className={`text-2xl font-bold font-serif ${netWorth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {fmt(netWorth)}
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
                        <div className="font-bold text-emerald-600">{fmt(asset.value)}</div>
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
