import { FileText, X, Sparkles, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SmartScanModal({ isOpen, setIsOpen, isScanning, setIsScanning, showToast }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-midnight/80 backdrop-blur-md"
          onClick={() => setIsOpen(false)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card w-full max-w-lg p-8 relative overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl" />
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Binth Smart Scan</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Análise de Extratos via IA</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-3 -mr-3 text-gray-500 hover:text-white transition-all active:scale-90">
                <X size={24} />
              </button>
            </div>

            {!isScanning ? (
              <div className="space-y-6">
                <div className="border-2 border-dashed border-indigo-500/30 rounded-3xl p-12 text-center hover:border-indigo-500/60 transition-all cursor-pointer bg-white/5 group relative">
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept=".pdf,.csv,.png,.jpg"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setIsScanning(true);
                        setTimeout(() => {
                          setIsScanning(false);
                          setIsOpen(false);
                          showToast("IA: Detectamos 12 transações no extrato! Adicionadas com sucesso.", "success");
                        }, 3500);
                      }
                    }}
                  />
                  <Sparkles size={40} className="mx-auto text-indigo-400 mb-4 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-bold text-white mb-2">Arraste o seu extrato PDF ou CSV aqui</p>
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Ou clica para escolher o ficheiro</p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-6">
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Brain size={32} className="text-indigo-400" />
                  </div>
                </div>
                <h3 className="text-lg font-black text-white animate-pulse">A Binth está a ler o teu extrato...</h3>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
