import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../hooks/useFinance';
import {
  Sparkles, ArrowRight, ArrowLeft, Wallet, Home, Target,
  Check, User, Building, Bell, Banknote, TrendingUp,
  ShieldCheck, ChevronRight, Star
} from 'lucide-react';

// ─── Steps definition ───────────────────────────────────────────────────────
const STEPS = [
  { id: 'welcome',    title: null },
  { id: 'profile',   title: 'O teu perfil' },
  { id: 'income',    title: 'Rendimento mensal' },
  { id: 'housing',   title: 'Situação de habitação' },
  { id: 'goal',      title: 'Primeira meta' },
  { id: 'ready',     title: null },
];

const CURRENCIES = [
  { code: 'MT',  label: 'Metical (MT)' },
  { code: 'USD', label: 'Dólar (USD)' },
  { code: 'ZAR', label: 'Rand (ZAR)' },
];

const HOUSING_OPTIONS = [
  { id: 'renda',    label: 'Arrendado',   desc: 'Pago renda mensal',            icon: <Home size={20} /> },
  { id: 'propria',  label: 'Casa própria', desc: 'Prestação ou sem encargos',    icon: <ShieldCheck size={20} /> },
  { id: 'familiar', label: 'Casa familiar', desc: 'Com família, sem encargos',   icon: <Building size={20} /> },
];

const GOAL_TEMPLATES = [
  { id: 'emergency', label: 'Fundo de Emergência', months: 6, icon: '🛡️' },
  { id: 'vacation',  label: 'Férias / Viagem',     months: 12, icon: '✈️' },
  { id: 'business',  label: 'Negócio próprio',     months: 18, icon: '🏪' },
  { id: 'education', label: 'Educação / Formação',  months: 12, icon: '🎓' },
  { id: 'custom',    label: 'Outra meta minha',    months: 12, icon: '🌟' },
];

// ─── Animated number formatter ───────────────────────────────────────────────
function formatMT(val) {
  return Number(val || 0).toLocaleString('pt-MZ');
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function Onboarding() {
  const { dispatch } = useFinance();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  // Form state
  const [name, setName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [salary, setSalary] = useState('');
  const [currency, setCurrency] = useState('MT');
  const [housing, setHousing] = useState('renda');
  const [rent, setRent] = useState('');
  const [goalTemplate, setGoalTemplate] = useState('emergency');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalName, setGoalName] = useState('Fundo de Emergência');
  const [notifOk, setNotifOk] = useState(true);

  // Sync goal name from template
  useEffect(() => {
    const tpl = GOAL_TEMPLATES.find(g => g.id === goalTemplate);
    if (tpl && goalTemplate !== 'custom') setGoalName(tpl.label);
  }, [goalTemplate]);

  // Auto-suggest goal amount based on salary (3–6 months of salary)
  useEffect(() => {
    if (salary && goalTemplate === 'emergency') {
      setGoalAmount(String(Math.round(Number(salary) * 3)));
    }
  }, [salary, goalTemplate]);

  const canNext = () => {
    if (step === 1) return name.trim().length >= 2;
    if (step === 2) return Number(salary) > 0;
    if (step === 3) return housing === 'familiar' || Number(rent) > 0;
    if (step === 4) return goalName.trim().length > 0 && Number(goalAmount) > 0;
    return true;
  };

  const go = (dir) => {
    setDirection(dir);
    setStep(s => s + dir);
  };

  const finish = async () => {
    setSaving(true);
    try {
      // dispatch = apiDispatch from context: updates local state + persists to API
      await Promise.allSettled([
        dispatch({ type: 'UPDATE_SETTING', payload: { key: 'household_name', value: householdName.trim() || `Família ${name.split(' ')[0]}` } }),
        dispatch({ type: 'UPDATE_SETTING', payload: { key: 'user_salary', value: Number(salary) } }),
        dispatch({ type: 'UPDATE_SETTING', payload: { key: 'default_rent', value: housing === 'familiar' ? 0 : Number(rent) } }),
        dispatch({ type: 'UPDATE_SETTING', payload: { key: 'housing_type', value: housing } }),
        dispatch({ type: 'UPDATE_SETTING', payload: { key: 'currency', value: currency } }),
        dispatch({ type: 'UPDATE_SETTING', payload: { key: 'onboarding_completed', value: true } }),
        dispatch({ type: 'UPDATE_SETTING', payload: { key: 'daily_entry_reminder_enabled', value: notifOk } }),
        dispatch({ type: 'UPDATE_SETTING', payload: { key: 'monthly_due_reminder_enabled', value: notifOk } }),
        dispatch({ type: 'UPDATE_USER', payload: { name: name.trim() } }),
      ]);

      // Create initial goal (best effort)
      const tpl = GOAL_TEMPLATES.find(g => g.id === goalTemplate);
      const deadline = new Date(Date.now() + (tpl?.months || 12) * 30 * 24 * 36e5).toISOString().split('T')[0];
      dispatch({
        type: 'ADD_META',
        payload: {
          nome: goalName,
          alvo: Number(goalAmount),
          poupado: 0,
          prazo: deadline,
          cat: 'Poupança',
          mensal: Math.ceil(Number(goalAmount) / (tpl?.months || 12)),
        }
      }).catch(() => {}); // non-blocking

      localStorage.setItem('mwanga-onboarded', 'true');
      navigate('/');
    } catch (e) {
      console.error(e);
      localStorage.setItem('mwanga-onboarded', 'true');
      navigate('/');
    } finally {
      setSaving(false);
    }
  };

  const progress = step / (STEPS.length - 1);

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a1926 0%, #0a4d68 40%, #088395 100%)' }}>

      {/* ── Ambient blobs ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[120px] opacity-20"
          style={{ background: 'radial-gradient(circle, #c9963a, transparent)' }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-[120px] opacity-15"
          style={{ background: 'radial-gradient(circle, #1a8fa8, transparent)' }} />
      </div>

      {/* ── Header progress ── */}
      {step > 0 && step < STEPS.length - 1 && (
        <div className="relative z-10 px-6 pt-10 pb-2">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => go(-1)}
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all">
              <ArrowLeft size={20} />
            </button>
            <span className="text-xs font-bold text-white/50 uppercase tracking-widest">
              {step} / {STEPS.length - 2}
            </span>
            <div className="w-8" />
          </div>
          {/* Progress pill bar */}
          <div className="flex gap-1.5">
            {STEPS.slice(1, -1).map((_, i) => (
              <div key={i} className="h-1 flex-1 rounded-full overflow-hidden bg-white/10">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: i < step ? '100%' : i === step ? '30%' : '0%',
                    background: 'linear-gradient(90deg, #c9963a, #ddb05c)'
                  }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Card ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div key={step}
          className="w-full max-w-md animate-in fade-in slide-in-from-right-4 duration-400">

          {/* ––– STEP 0: Welcome ––– */}
          {step === 0 && (
            <div className="text-center">
              <div className="mx-auto mb-8 w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl text-5xl font-black font-serif text-white"
                style={{ background: 'linear-gradient(135deg, #0a4d68, #088395)' }}>
                M
              </div>
              <h1 className="text-4xl font-black font-serif text-white mb-4 tracking-tight leading-tight">
                Bem-vindo ao<br />
                <span style={{ background: 'linear-gradient(90deg, #c9963a, #ddb05c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Mwanga
                </span>
              </h1>
              <p className="text-white/60 text-base mb-2 leading-relaxed max-w-xs mx-auto">
                O teu assistente financeiro pessoal. Em 2 minutos configuramos tudo.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mt-6 mb-10">
                {[
                  { icon: <Wallet size={14} />, label: 'Controla despesas' },
                  { icon: <Target size={14} />, label: 'Define metas' },
                  { icon: <TrendingUp size={14} />, label: 'Analisa finanças' },
                  { icon: <Star size={14} />, label: 'Relatórios inteligentes' },
                ].map((f, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white/80"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {f.icon} {f.label}
                  </span>
                ))}
              </div>
              <button onClick={() => go(1)}
                className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-dark flex items-center justify-center gap-3 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #c9963a, #ddb05c)', color: '#12232e' }}>
                Vamos começar <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* ––– STEP 1: Profile ––– */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(201,150,58,0.15)', border: '1px solid rgba(201,150,58,0.3)' }}>
                  <User size={22} className="text-gold" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gold uppercase tracking-widest">Passo 1</p>
                  <h2 className="text-2xl font-black text-white font-serif">O teu perfil</h2>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                    O teu nome *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Jubílio Maússe"
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-lg font-bold outline-none focus:border-gold/50 focus:bg-white/8 transition-all placeholder:text-white/20"
                  />
                  <p className="text-xs text-white/30 mt-1.5 ml-1">Pelo menos 2 caracteres</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                    Nome da família / agregado <span className="normal-case font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={householdName}
                    onChange={e => setHouseholdName(e.target.value)}
                    placeholder={name ? `Família ${name.split(' ')[0]}` : 'Ex: Família Maússe'}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-gold/50 focus:bg-white/8 transition-all placeholder:text-white/20 font-medium"
                  />
                  <p className="text-xs text-white/30 mt-1.5 ml-1">Aparece nos relatórios e no topo do app</p>
                </div>
              </div>

              <NextBtn disabled={!canNext()} onClick={() => go(1)} />
            </div>
          )}

          {/* ––– STEP 2: Income ––– */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(61,107,69,0.2)', border: '1px solid rgba(61,107,69,0.3)' }}>
                  <Banknote size={22} className="text-leaf-light" />
                </div>
                <div>
                  <p className="text-xs font-bold text-leaf-light uppercase tracking-widest">Passo 2</p>
                  <h2 className="text-2xl font-black text-white font-serif">Rendimento mensal</h2>
                </div>
              </div>

              <p className="text-white/50 text-sm mb-6 leading-relaxed">
                Usado para calcular o teu orçamento 50/30/20 e mostrar o quanto tens disponível cada mês.
              </p>

              <div className="mb-5">
                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                  Salário / Renda fixa mensal *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={salary}
                    onChange={e => setSalary(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-3xl font-black outline-none focus:border-teal-500/50 transition-all pr-20 font-serif"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 font-bold text-sm">
                    {currency}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                  Moeda
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CURRENCIES.map(c => (
                    <button key={c.code} onClick={() => setCurrency(c.code)}
                      className="py-3 rounded-xl font-bold text-sm transition-all"
                      style={{
                        background: currency === c.code ? 'rgba(26,143,168,0.25)' : 'rgba(255,255,255,0.05)',
                        border: currency === c.code ? '1.5px solid rgba(26,143,168,0.6)' : '1px solid rgba(255,255,255,0.08)',
                        color: currency === c.code ? '#23b5d4' : 'rgba(255,255,255,0.5)',
                      }}>
                      {c.code}
                    </button>
                  ))}
                </div>
              </div>

              {salary && Number(salary) > 0 && (
                <div className="mt-5 p-4 rounded-2xl" style={{ background: 'rgba(201,150,58,0.08)', border: '1px solid rgba(201,150,58,0.15)' }}>
                  <p className="text-xs font-bold text-gold/70 uppercase tracking-widest mb-2">Previsão mensal (regra 50/30/20)</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: 'Necessidades', pct: 0.5 },
                      { label: 'Lazer', pct: 0.3 },
                      { label: 'Poupança', pct: 0.2 },
                    ].map(b => (
                      <div key={b.label}>
                        <p className="text-lg font-black text-white">{formatMT(salary * b.pct)}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">{b.label} ({b.pct * 100}%)</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <NextBtn disabled={!canNext()} onClick={() => go(1)} />
            </div>
          )}

          {/* ––– STEP 3: Housing ––– */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(224,122,95,0.15)', border: '1px solid rgba(224,122,95,0.25)' }}>
                  <Home size={22} className="text-coral-light" />
                </div>
                <div>
                  <p className="text-xs font-bold text-coral-light uppercase tracking-widest">Passo 3</p>
                  <h2 className="text-2xl font-black text-white font-serif">Habitação</h2>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {HOUSING_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => setHousing(opt.id)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left"
                    style={{
                      background: housing === opt.id ? 'rgba(26,143,168,0.15)' : 'rgba(255,255,255,0.04)',
                      border: housing === opt.id ? '1.5px solid rgba(26,143,168,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: housing === opt.id ? 'rgba(26,143,168,0.2)' : 'rgba(255,255,255,0.05)', color: housing === opt.id ? '#23b5d4' : 'rgba(255,255,255,0.4)' }}>
                      {opt.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white text-sm">{opt.label}</p>
                      <p className="text-xs text-white/40">{opt.desc}</p>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                      style={{ borderColor: housing === opt.id ? '#23b5d4' : 'rgba(255,255,255,0.2)', background: housing === opt.id ? '#23b5d4' : 'transparent' }}>
                      {housing === opt.id && <Check size={11} className="text-white" />}
                    </div>
                  </button>
                ))}
              </div>

              {housing !== 'familiar' && (
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                    {housing === 'renda' ? 'Valor da renda mensal' : 'Valor da prestação mensal'} *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={rent}
                      onChange={e => setRent(e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-2xl font-black outline-none focus:border-coral/40 transition-all pr-20 font-serif"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 font-bold text-sm">{currency}</span>
                  </div>
                  {salary && Number(rent) > 0 && (
                    <p className="text-xs mt-2 ml-1" style={{ color: (Number(rent) / Number(salary)) > 0.4 ? '#e07a5f' : 'rgba(255,255,255,0.35)' }}>
                      {Math.round((Number(rent) / Number(salary)) * 100)}% do teu rendimento
                      {(Number(rent) / Number(salary)) > 0.4 ? ' — acima do recomendado (40%)' : ' — dentro do recomendado'}
                    </p>
                  )}
                </div>
              )}

              <NextBtn disabled={!canNext()} onClick={() => go(1)} />
            </div>
          )}

          {/* ––– STEP 4: First Goal ––– */}
          {step === 4 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(10,77,104,0.3)', border: '1px solid rgba(26,143,168,0.3)' }}>
                  <Target size={22} className="text-sky-light" />
                </div>
                <div>
                  <p className="text-xs font-bold text-sky-light uppercase tracking-widest">Passo 4</p>
                  <h2 className="text-2xl font-black text-white font-serif">Primeira meta</h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-5">
                {GOAL_TEMPLATES.map(g => (
                  <button key={g.id} onClick={() => setGoalTemplate(g.id)}
                    className="p-3 rounded-2xl text-left transition-all"
                    style={{
                      background: goalTemplate === g.id ? 'rgba(201,150,58,0.15)' : 'rgba(255,255,255,0.04)',
                      border: goalTemplate === g.id ? '1.5px solid rgba(201,150,58,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    }}>
                    <span className="text-xl">{g.icon}</span>
                    <p className="text-xs font-bold text-white mt-1 leading-tight">{g.label}</p>
                    {goalTemplate === g.id && g.id !== 'custom' && (
                      <p className="text-[10px] text-gold/70 mt-0.5">{g.months} meses</p>
                    )}
                  </button>
                ))}
              </div>

              {goalTemplate === 'custom' && (
                <div className="mb-4">
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Nome da meta</label>
                  <input
                    type="text"
                    value={goalName}
                    onChange={e => setGoalName(e.target.value)}
                    placeholder="Ex: Comprar carro, Férias..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none focus:border-gold/40 transition-all placeholder:text-white/20 font-medium"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                  Valor alvo *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={goalAmount}
                    onChange={e => setGoalAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-2xl font-black outline-none focus:border-gold/40 transition-all pr-20 font-serif"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 font-bold text-sm">{currency}</span>
                </div>
                {salary && goalAmount && Number(goalAmount) > 0 && (
                  <p className="text-xs text-white/30 mt-2 ml-1">
                    Poupando 20% do salário → concluído em ~{Math.ceil(Number(goalAmount) / (Number(salary) * 0.2))} meses
                  </p>
                )}
              </div>

              <NextBtn disabled={!canNext()} onClick={() => go(1)} label="Continuar" />
            </div>
          )}

          {/* ––– STEP 5: Ready / Summary ––– */}
          {step === 5 && (
            <div className="text-center">
              <div className="mx-auto mb-6 w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl"
                style={{ background: 'linear-gradient(135deg, rgba(201,150,58,0.3), rgba(201,150,58,0.1))', border: '1px solid rgba(201,150,58,0.3)' }}>
                <Sparkles size={36} className="text-gold" />
              </div>

              <h1 className="text-3xl font-black text-white font-serif mb-2">
                Pronto, {name.split(' ')[0]}! 🎉
              </h1>
              <p className="text-white/50 text-sm mb-8">Aqui está o teu resumo financeiro de arranque:</p>

              <div className="space-y-3 text-left mb-8">
                <SummaryRow icon={<User size={16} />} label="Utilizador" value={name} />
                <SummaryRow icon={<Building size={16} />} label="Agregado" value={householdName || `Família ${name.split(' ')[0]}`} />
                <SummaryRow icon={<Banknote size={16} />} label="Rendimento" value={`${formatMT(salary)} ${currency}/mês`} color="#3d6b45" />
                {housing !== 'familiar' && (
                  <SummaryRow icon={<Home size={16} />} label={housing === 'renda' ? 'Renda' : 'Prestação'} value={`${formatMT(rent)} ${currency}/mês`} />
                )}
                <SummaryRow icon={<Target size={16} />} label="Meta" value={`${goalName} • ${formatMT(goalAmount)} ${currency}`} color="#c9963a" />
              </div>

              {/* Notification opt-in */}
              <button onClick={() => setNotifOk(v => !v)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl mb-6 transition-all text-left"
                style={{
                  background: notifOk ? 'rgba(26,143,168,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${notifOk ? 'rgba(26,143,168,0.4)' : 'rgba(255,255,255,0.1)'}`,
                }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: notifOk ? 'rgba(26,143,168,0.2)' : 'rgba(255,255,255,0.05)' }}>
                  <Bell size={18} style={{ color: notifOk ? '#23b5d4' : 'rgba(255,255,255,0.3)' }} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">Lembretes diários</p>
                  <p className="text-xs text-white/40">Notificação às 20h para registar despesas</p>
                </div>
                <div className="w-10 h-5 rounded-full relative transition-colors"
                  style={{ background: notifOk ? '#1a8fa8' : 'rgba(255,255,255,0.15)' }}>
                  <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
                    style={{ left: notifOk ? '1.35rem' : '0.125rem' }} />
                </div>
              </button>

              <button
                onClick={finish}
                disabled={saving}
                className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #0a4d68, #088395)', color: 'white' }}>
                {saving ? (
                  <span className="animate-pulse">A configurar o Mwanga...</span>
                ) : (
                  <><ShieldCheck size={18} /> Entrar no Mwanga</>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function NextBtn({ disabled, onClick, label = 'Continuar' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full mt-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
      style={{
        background: disabled ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #c9963a, #ddb05c)',
        color: disabled ? 'rgba(255,255,255,0.3)' : '#12232e',
      }}>
      {label} <ChevronRight size={18} />
    </button>
  );
}

function SummaryRow({ icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.06)', color: color || 'rgba(255,255,255,0.5)' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-white truncate" style={{ color: color || 'white' }}>{value}</p>
      </div>
    </div>
  );
}
