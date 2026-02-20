import { useState, useRef, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFinance } from '../hooks/useFinanceStore';
import { 
  Settings as SettingsIcon, Save, User, Building, 
  Wallet, Palette, Bell, Shield, LogOut, Camera,
  Banknote, Calendar, Globe, Mail, CreditCard, Chrome,
  Sun, Moon, Calculator, Check, ChevronRight, Sparkles, Zap,
  Loader2, CloudCheck, Home as HomeIcon, Heart, TrendingUp
} from 'lucide-react';

const AVATARS = [
  'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff&size=128',
  'https://ui-avatars.com/api/?name=Fam&background=20c997&color=fff&size=128',
  'https://ui-avatars.com/api/?name=Mwanga&background=0a4d68&color=fff&size=128',
  'https://ui-avatars.com/api/?name=Admin&background=6c757d&color=fff&size=128',
];

export default function Settings() {
  const { state, dispatch } = useFinance();
  const { showToast } = useOutletContext();
  const [activeTab, setActiveTab] = useState('perfil');
  const [showAvatarGallery, setShowAvatarGallery] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const fileInputRef = useRef(null);
  
  const [form, setForm] = useState({
    user_salary: state.settings.user_salary || 50000,
    default_rent: state.settings.default_rent || 15000,
    landlord_name: state.settings.landlord_name || '',
    household_name: state.settings.household_name || 'A Minha Família',
    user_name: state.user?.name || '',
    currency: state.settings.currency || 'MT',
    cycle_start: state.settings.cycle_start || '1',
    profile_pic: state.settings.profile_pic || AVATARS[0],
  });

  const saveTimeoutRef = useRef(null);

  const handleSaveAll = useCallback(async () => {
    setIsSaving(true);
    try {
      const updates = [];
      
      // Special cases for User and Household data
      if (form.user_name !== state.user?.name) {
        updates.push(dispatch({ type: 'UPDATE_USER', payload: { name: form.user_name } }));
      }
      
      // All other settings
      const settingsToSave = { ...form };
      delete settingsToSave.user_name; // Managed by UPDATE_USER
      
      Object.entries(settingsToSave).map(([key, value]) => 
        updates.push(dispatch({ type: 'UPDATE_SETTING', payload: { key, value } }))
      );

      // Handle household table naming sync
      if (form.household_name !== state.settings.household_name) {
        updates.push(dispatch({ type: 'UPDATE_HOUSEHOLD', payload: { name: form.household_name } }));
      }

      await Promise.all(updates);
      setLastSaved(new Date());
    } catch {
      showToast('Erro ao guardar definições');
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  }, [form, state.user?.name, state.settings.household_name, dispatch, showToast]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('A imagem é muito grande (máx 2MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        setForm({ ...form, profile_pic: base64 });
        dispatch({ type: 'UPDATE_SETTING', payload: { key: 'profile_pic', value: base64 } });
        showToast('Foto actualizada! ✦');
      };
      reader.readAsDataURL(file);
    }
  };

  // Autosave Effect
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    // Don't save on initial mount
    const hasChanged = JSON.stringify(form) !== JSON.stringify({
      user_salary: state.settings.user_salary || 50000,
      default_rent: state.settings.default_rent || 15000,
      landlord_name: state.settings.landlord_name || '',
      household_name: state.settings.household_name || 'A Minha Família',
      user_name: state.user?.name || '',
      currency: state.settings.currency || 'MT',
      cycle_start: state.settings.cycle_start || '1',
      profile_pic: state.settings.profile_pic || AVATARS[0],
    });

    if (hasChanged) {
      saveTimeoutRef.current = setTimeout(() => {
        handleSaveAll();
      }, 1500);
    }
  }, [form]);

  const tabs = [
    { id: 'perfil', label: 'Perfil', icon: User, color: 'indigo' },
    { id: 'financas', label: 'Finanças', icon: Wallet, color: 'teal' },
    { id: 'pref', label: 'Preferências', icon: Palette, color: 'amber' },
  ];

  return (
    <div className="section-fade max-w-6xl mx-auto pb-24">
      
      {/* ═══ WORLD-CLASS HERO ═══ */}
      <div className="relative mb-12 animate-in fade-in slide-in-from-top-6 duration-1000">
        <div className="h-64 rounded-[2.5rem] bg-[#0a4d68] relative overflow-hidden shadow-[0_20px_50px_rgba(10,77,104,0.3)]">
          {/* Decorative Mesh Gradient */}
          <div className="absolute inset-0 opacity-40 bg-gradient-to-br from-teal-400 via-transparent to-indigo-500" />
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-gold-400/20 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#0a4d68] to-transparent" />
          
          <div className="absolute inset-0 flex items-center justify-between px-12 z-10">
            <div className="flex items-center gap-8">
               <div className="relative">
                  <div className="w-32 h-32 rounded-[2rem] border-4 border-white/20 p-1 bg-white/10 backdrop-blur-md shadow-2xl relative group ring-4 ring-white/5">
                    <img 
                      src={form.profile_pic} 
                      alt="Profile" 
                      className="w-full h-full object-cover rounded-[1.7rem]"
                    />
                    <button 
                      onClick={() => setShowAvatarGallery(!showAvatarGallery)}
                      className="absolute -bottom-2 -right-2 p-2 bg-white text-[#0a4d68] rounded-xl shadow-lg hover:scale-110 transition-transform"
                    >
                      <Camera size={16} />
                    </button>
                  </div>
                  
                  {/* Avatar Gallery Dropdown */}
                  {showAvatarGallery && (
                    <div className="absolute top-full mt-4 left-0 p-4 glass-card shadow-2xl z-50 flex gap-3 animate-in fade-in zoom-in-95 duration-200">
                      {AVATARS.map((url, i) => (
                        <button 
                          key={i}
                          onClick={() => {
                            setForm({...form, profile_pic: url});
                            setShowAvatarGallery(false);
                            dispatch({ type: 'UPDATE_SETTING', payload: { key: 'profile_pic', value: url } });
                          }}
                          className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${form.profile_pic === url ? 'border-teal-400 scale-110' : 'border-transparent hover:scale-105'}`}
                        >
                          <img src={url} className="w-full h-full object-cover" />
                        </button>
                      ))}
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-teal-400 hover:text-teal-400 transition-colors"
                      >
                         <Camera size={20} />
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </div>
                  )}
               </div>

               <div>
                  <h1 className="text-4xl font-black font-serif text-white tracking-tight drop-shadow-xl flex items-center gap-3">
                    {form.user_name || 'Explorador Financeiro'}
                    <Sparkles className="text-amber-300" size={24} />
                  </h1>
                  <p className="text-white/70 font-medium flex items-center gap-2 mt-1">
                    <Building size={16} /> {form.household_name} • <span className="opacity-60 italic text-sm">Conta Premium Nexo Vibe</span>
                  </p>
                  
                  {/* Autosave Indicator */}
                  <div className="mt-4 flex items-center gap-3">
                    {isSaving ? (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/80 text-[10px] font-black uppercase tracking-widest animate-pulse">
                        <Loader2 size={12} className="animate-spin" /> Guardando...
                      </div>
                    ) : lastSaved ? (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 backdrop-blur-md border border-teal-500/20 text-teal-300 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-left-2">
                        <Check size={12} /> Sincronizado
                      </div>
                    ) : null}
                  </div>
               </div>
            </div>

            <div className="hidden lg:flex gap-4">
               <div className="glass-card !bg-white/5 !border-white/10 p-5 backdrop-blur-xl text-white text-center min-w-[120px]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Moeda</p>
                  <p className="text-xl font-black font-serif">{form.currency}</p>
               </div>
               <div className="glass-card !bg-white/5 !border-white/10 p-5 backdrop-blur-xl text-white text-center min-w-[120px]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Ciclo</p>
                  <p className="text-xl font-black font-serif">Dia {form.cycle_start}</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TAB NAVIGATION ═══ */}
      <div className="flex p-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl backdrop-blur-md mb-8 max-w-md mx-auto sticky top-20 z-40 border border-white/20 shadow-lg">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
              activeTab === tab.id 
              ? 'bg-white dark:bg-slate-700 text-[#0a4d68] dark:text-teal-400 shadow-md scale-100' 
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <tab.icon size={18} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-2">
        
        {/* Main Form Content */}
        <div className="lg:col-span-8">
           <form onSubmit={handleSaveAll} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* TAB: PERFIL */}
              {activeTab === 'perfil' && (
                <div className="space-y-8">
                  <div className="glass-card p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                      <User size={120} />
                    </div>
                    
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <User size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black font-serif text-slate-800">Dados Pessoais</h2>
                        <p className="text-sm text-slate-500">A sua identidade no ecossistema Mwanga</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
                  {/* Personal Info Group */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                        <User size={18} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Informação Pessoal</h3>
                    </div>

                    <div className="group transition-all">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">O Seu Nome</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={form.user_name}
                          onChange={(e) => setForm({ ...form, user_name: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-slate-200 outline-none focus:border-teal-500/50 focus:bg-white/10 transition-all font-medium"
                          placeholder="Como quer ser chamado?"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                           <Sparkles size={16} className="text-teal-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Household Group */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                        <HomeIcon size={18} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">A Minha Família</h3>
                    </div>

                    <div className="group transition-all">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Nome do Agregado</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={form.household_name}
                          onChange={(e) => setForm({ ...form, household_name: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-slate-200 outline-none focus:border-sky-500/50 focus:bg-white/10 transition-all font-medium"
                          placeholder="Ex: Família Mwanga"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                           <Heart size={16} className="text-sky-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                  </div>
                </div>
              )}

              {/* TAB: FINANÇAS */}
              {activeTab === 'financas' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="glass-card p-10 border-t-4 border-teal-500">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                        <Wallet size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black font-serif text-slate-800">Parâmetros Financeiros</h2>
                        <p className="text-sm text-slate-500">Configure as bases dos seus simuladores</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      {/* Income Section */}
                      <div className="space-y-8">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-400">
                            <TrendingUp size={20} />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-800 tracking-tight">Receitas</h3>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Base mensal</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="group">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Salário Mensal Base</label>
                            <div className="relative">
                              <input 
                                type="number" 
                                value={form.user_salary}
                                onChange={(e) => setForm({ ...form, user_salary: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xl font-serif text-teal-600 outline-none focus:border-teal-500/40 transition-all shadow-inner"
                              />
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                {form.currency}
                              </div>
                            </div>
                            <p className="text-[9px] text-slate-400 mt-2 italic px-1">💡 Usado para gerar sugestões de orçamento 50/30/20.</p>
                          </div>
                        </div>
                      </div>

                      {/* Housing Section */}
                      <div className="space-y-8">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                            <HomeIcon size={20} />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-800 tracking-tight">Habitação</h3>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Custos fixos</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="group">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nome do Senhorio</label>
                            <input 
                              type="text" 
                              value={form.landlord_name}
                              onChange={(e) => setForm({ ...form, landlord_name: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-800 outline-none focus:border-amber-500/40 transition-all font-medium"
                              placeholder="Ex: Sr. Manuel"
                            />
                          </div>
                          <div className="group">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Renda Padrão</label>
                            <div className="relative">
                              <input 
                                type="number" 
                                value={form.default_rent}
                                onChange={(e) => setForm({ ...form, default_rent: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xl font-serif text-amber-600 outline-none focus:border-amber-500/40 transition-all shadow-inner"
                              />
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                {form.currency}
                              </div>
                            </div>
                            <p className="text-[9px] text-slate-400 mt-2 italic px-1">🏠 Valor pré-definido no módulo de Habitação.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: PREFERENCIAS */}
              {activeTab === 'pref' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="glass-card p-10 border-t-4 border-amber-500">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                        <Palette size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black font-serif text-slate-800">Interface e Regional</h2>
                        <p className="text-sm text-slate-500">Ajuste Mwanga ao seu contexto</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      {/* Currency & Region */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
                            <Globe size={18} />
                          </div>
                          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Moeda e Região</h3>
                        </div>

                        <div className="group">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Moeda de Exibição</label>
                          <select 
                            value={form.currency}
                            onChange={(e) => setForm({ ...form, currency: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-800 outline-none focus:border-teal-500/40 transition-all appearance-none cursor-pointer font-medium"
                          >
                            <option value="MT">MT — Metical Moçambicano</option>
                            <option value="USD">USD — Dólar Americano</option>
                            <option value="EUR">EUR — Euro</option>
                            <option value="ZAR">ZAR — Rand Sul-Africano</option>
                          </select>
                        </div>
                      </div>

                      {/* Theme & Cycle */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                            <Zap size={18} />
                          </div>
                          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Personalização</h3>
                        </div>

                        <div className="group">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Dia de Reinício</label>
                          <select 
                            value={form.cycle_start}
                            onChange={(e) => setForm({ ...form, cycle_start: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-800 outline-none focus:border-indigo-500/40 transition-all appearance-none cursor-pointer font-medium"
                          >
                            {[...Array(31)].map((_, i) => (
                              <option key={i+1} value={i+1}>Dia {i+1} de cada mês</option>
                            ))}
                          </select>
                        </div>

                        <div 
                          onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
                          className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-white transition-all group shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${state.darkMode ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                              {state.darkMode ? <Sun size={20} /> : <Moon size={20} />}
                            </div>
                            <span className="text-xs font-bold text-slate-700">Modo Escuro</span>
                          </div>
                          <div className={`w-10 h-5 rounded-full p-1 relative transition-colors ${state.darkMode ? 'bg-teal-500' : 'bg-slate-300'}`}>
                            <div className={`w-3 h-3 rounded-full bg-white transition-all ${state.darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
           </form>
        </div>

        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-right-10 duration-700">
           
           {/* Summary Tooltip Card */}
           <div className="glass-card p-8 !bg-[#0a4d68] text-white overflow-hidden relative group">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40 mb-6">Estado da Conta</h3>
              
              <div className="space-y-5 relative z-10">
                 <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Segurança Nível</span>
                    <span className="font-black text-teal-400">MILITAR</span>
                 </div>
                 <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="w-[85%] bg-teal-400 h-full rounded-full" />
                 </div>
                 
                 <div className="flex items-center gap-3 pt-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                       <Shield size={20} className="text-teal-400" />
                    </div>
                    <div>
                       <p className="text-xs font-bold">2FA Ativado</p>
                       <p className="text-[10px] text-white/50">Proteção biométrica</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Quick Actions */}
           <div className="glass-card p-8 space-y-4">
              <div className="p-4 rounded-2xl bg-teal-50/10 border border-teal-500/10 text-center mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-teal-400">Autosave Ativo</p>
                <p className="text-xs text-slate-400 mt-1">As suas alterações são gravadas instantaneamente.</p>
              </div>

              <button 
                onClick={handleSaveAll}
                disabled={isSaving}
                className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                  isSaving ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#0a4d68] hover:bg-[#088395] text-white shadow-[0_10px_30px_rgba(10,77,104,0.3)]'
                }`}
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />} 
                {isSaving ? 'Gravando...' : 'Sincronizar Agora'}
              </button>
              
              <button 
                type="button"
                onClick={() => { localStorage.removeItem('mwanga-token'); window.location.reload(); }}
                className="w-full py-5 rounded-[2rem] text-rose-500 font-black text-sm uppercase tracking-widest border-2 border-rose-50 hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={18} /> Terminar Sessão
              </button>
           </div>

           {/* Attribution */}
           <div className="text-center px-4">
              <div className="flex items-center justify-center gap-2 mb-3 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all cursor-crosshair">
                 <Zap size={14} className="text-amber-400" />
                 <span className="text-[10px] font-black uppercase tracking-[0.3em]">Nexo Vibe 2026</span>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-400 uppercase tracking-tighter">
                Sistema Operativo Mwanga v1.5.0 Premium<br/>
                Engineering by Maússe, Jubílio
              </p>
           </div>
        </div>
      </div>

      {/* FIXED BOTTOM FLOATING BAR (Mobile Only) */}
      <div className="fixed bottom-24 left-4 right-4 lg:hidden pointer-events-none z-50">
         <button 
           onClick={handleSaveAll}
           className="w-full h-16 rounded-full bg-teal-500 text-white shadow-2xl pointer-events-auto flex items-center justify-center gap-3 animate-bounce shadow-teal-500/40"
         >
           <Save size={24} /> <span className="font-black uppercase tracking-widest text-sm">Guardar Alterações</span>
         </button>
      </div>

    </div>
  );
}
