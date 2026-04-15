import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../hooks/useFinance';
import { Sparkles, ArrowRight, Wallet, Home, Target, Check } from 'lucide-react';

export default function Onboarding() {
  const { state, apiDispatch, dispatch } = useFinance();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form State
  const [salary, setSalary] = useState(state.settings?.user_salary || 50000);
  const [rent, setRent] = useState(state.settings?.default_rent || 15000);
  const [goal, setGoal] = useState(10000); // Ex: Emergency fund

  const steps = [
    {
      id: 'welcome',
      title: 'Bem-vindo ao Mwanga!',
      subtitle: 'Vamos pôr a tua vida financeira nos eixos. Em menos de 2 minutos terás o teu plano pronto.',
      icon: <Sparkles size={48} className="text-gold" />,
    },
    {
      id: 'income',
      title: 'Qual é o teu rendimento principal?',
      subtitle: 'Salário ou renda mensal fixa (em MT). Isso ajuda-nos a prever o teu fluxo de caixa.',
      icon: <Wallet size={48} className="text-leaf" />,
      input: (
        <div className="mt-6 flex items-center gap-3">
          <input
            type="number"
            value={salary}
            onChange={(e) => setSalary(Number(e.target.value))}
            className="w-full text-center text-4xl font-black bg-transparent border-b-2 border-ocean dark:border-sky focus:outline-hidden pb-2"
          />
          <span className="text-xl font-bold text-gray-500">MT</span>
        </div>
      )
    },
    {
      id: 'rent',
      title: 'E as despesas fixas (ex: casa)?',
      subtitle: 'Quanto pagas de renda ou prestação de habitação por mês?',
      icon: <Home size={48} className="text-coral" />,
      input: (
        <div className="mt-6 flex items-center gap-3">
          <input
            type="number"
            value={rent}
            onChange={(e) => setRent(Number(e.target.value))}
            className="w-full text-center text-4xl font-black bg-transparent border-b-2 border-ocean dark:border-sky focus:outline-hidden pb-2"
          />
          <span className="text-xl font-bold text-gray-500">MT</span>
        </div>
      )
    },
    {
      id: 'goal',
      title: 'Qual é a tua primeira grande meta?',
      subtitle: 'Começa por criar um fundo de emergência. Quanto gostarias de poupar para isso?',
      icon: <Target size={48} className="text-sky" />,
      input: (
        <div className="mt-6 flex items-center gap-3">
          <input
            type="number"
            value={goal}
            onChange={(e) => setGoal(Number(e.target.value))}
            className="w-full text-center text-4xl font-black bg-transparent border-b-2 border-ocean dark:border-sky focus:outline-hidden pb-2"
          />
          <span className="text-xl font-bold text-gray-500">MT</span>
        </div>
      )
    }
  ];

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      await completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      // Setup initial data if we had API, or just dispatch to global state
      const updatePayload = { key: 'onboarding_completed', value: true };
      
      try {
        await apiDispatch({ type: 'UPDATE_SETTING', payload: updatePayload });
        await apiDispatch({ type: 'UPDATE_SETTING', payload: { key: 'user_salary', value: salary } });
        await apiDispatch({ type: 'UPDATE_SETTING', payload: { key: 'default_rent', value: rent } });
      } catch {
        dispatch({ type: 'UPDATE_SETTING', payload: updatePayload });
        dispatch({ type: 'UPDATE_SETTING', payload: { key: 'user_salary', value: salary } });
        dispatch({ type: 'UPDATE_SETTING', payload: { key: 'default_rent', value: rent } });
      }

      // Automatically create the initial goal if user doesn't have it
      try {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1); // Goal for 1 year from now
        await apiDispatch({
          type: 'ADD_META',
          payload: { 
            nome: 'Fundo de Emergência', 
            alvo: goal, 
            poupado: 0, 
            prazo: d.toISOString().split('T')[0],
            cat: 'Poupança',
            mensal: Math.ceil(goal / 12)
          }
        });
      } catch {
         // offline fallback
      }

      navigate('/'); // Go to dashboard
    } catch (e) {
      console.error(e);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const currentStep = steps[step];

  return (
    <div className="min-h-screen bg-linear-to-br from-midnight via-dark to-black text-white flex flex-col justify-center items-center p-6 relative overflow-hidden">
      
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-ocean rounded-full mix-blend-screen filter blur-[80px] opacity-20 animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-gold rounded-full mix-blend-screen filter blur-[80px] opacity-10 animate-pulse-slow delay-700"></div>

      {/* Progress Bar */}
      <div className="absolute top-10 left-10 right-10 flex gap-2">
        {steps.map((_, i) => (
           <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-gold' : 'bg-white/10'}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.1, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl"
        >
          <div className="flex justify-center mb-6">
             <div className="w-20 h-20 rounded-full bg-linear-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 shadow-inner">
               {currentStep.icon}
             </div>
          </div>
          
          <h1 className="text-3xl font-black text-center mb-3 tracking-tight">
            {currentStep.title}
          </h1>
          <p className="text-center text-gray-400 mb-8 text-sm leading-relaxed">
            {currentStep.subtitle}
          </p>

          {currentStep.input && (
            <div className="mb-8 p-4 bg-black/20 rounded-2xl border border-white/5">
              {currentStep.input}
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            disabled={loading}
            className="w-full py-4 rounded-full bg-linear-to-r from-gold to-yellow-600 font-bold text-dark flex items-center justify-center gap-2 shadow-lg shadow-gold/20"
          >
            {loading ? (
              <span className="animate-pulse">A preparar o Mwanga...</span>
            ) : step === steps.length - 1 ? (
              <>Concluir <Check size={20} /></>
            ) : (
              <>Continuar <ArrowRight size={20} /></>
            )}
          </motion.button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
