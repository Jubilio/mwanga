import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, PiggyBank, Target, ArrowRight } from 'lucide-react';
import { fmtShort } from '../../utils/calculations';
import { G } from '../../theme/tokens';

export default function AutoAllocateModal({ 
  isOpen, 
  onClose, 
  salaryAmount, 
  onAllocate,
  currency = 'MT'
}) {
  // Suggested 50/30/20 breakdown
  const savingsAmount = salaryAmount * 0.20;
  const essentialsAmount = salaryAmount * 0.50;
  const lifestyleAmount = salaryAmount * 0.30;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-0">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-midnight/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            className="relative w-full max-w-md bg-cream dark:bg-[#0c1c2e] rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl border border-white/10"
          >
            <button onClick={onClose} className="absolute top-5 right-5 p-2 text-gray-400 hover:text-white transition-colors bg-white/5 rounded-full">
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center mt-2 mb-6">
              <div className="w-16 h-16 rounded-full bg-ocean/10 text-ocean flex items-center justify-center mb-4 shadow-lg shadow-ocean/20">
                <Sparkles size={32} />
              </div>
              <h3 className="text-xl font-black text-midnight dark:text-white mb-2">Alocação Inteligente</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Detetámos a entrada de um salário de <strong className="text-ocean">MT {fmtShort(salaryAmount)}</strong>. Deseja distribuir automaticamente com a regra 50/30/20?
              </p>
            </div>

            <div className="flex flex-col gap-3 mb-6">
              <div className="p-4 rounded-2xl bg-leaf/10 border border-leaf/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PiggyBank size={20} className="text-leaf" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-leaf uppercase tracking-wider">Poupança (20%)</span>
                    <span className="text-[10px] text-gray-500">Registar como transação de poupança</span>
                  </div>
                </div>
                <span className="font-black text-leaf">MT {fmtShort(savingsAmount)}</span>
              </div>
              
              <div className="p-4 rounded-2xl bg-midnight/5 dark:bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target size={20} className="text-ocean" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-midnight dark:text-white uppercase tracking-wider">Essencial (50%)</span>
                    <span className="text-[10px] text-gray-500">Fica disponível para despesas base</span>
                  </div>
                </div>
                <span className="font-black text-midnight dark:text-white">MT {fmtShort(essentialsAmount)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => onAllocate(savingsAmount)}
                className="w-full h-12 bg-gradient-to-r from-ocean to-sky text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-ocean/30 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
              >
                Sim, Alocar Poupança <ArrowRight size={16} />
              </button>
              <button
                onClick={onClose}
                className="w-full h-12 bg-white/5 text-gray-500 hover:text-midnight dark:hover:text-white rounded-2xl font-bold text-sm transition-colors"
              >
                Não, manter tudo disponível
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
