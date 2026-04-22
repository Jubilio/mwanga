import { Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseMobileMoneySMS } from '../../utils/smsParser';

export default function MagicPasteModal({ 
  isOpen, 
  setIsOpen, 
  magicText, 
  setMagicText, 
  form, 
  setForm, 
  showToast 
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-midnight/90 backdrop-blur-md" onClick={() => setIsOpen(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} onClick={e => e.stopPropagation()} className="glass-card w-full max-w-md p-6 border-gold/30 border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gold text-midnight"><Sparkles size={18} /></div>
                <h2 className="text-lg font-black text-white">Magic Paste</h2>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-3 -mr-3 text-gray-500 hover:text-white"><X size={24} /></button>
            </div>
            <textarea autoFocus className="form-input w-full h-32 bg-white/5 border-white/10 rounded-2xl p-4 text-xs text-gray-200 mb-6" placeholder="Cola aqui o SMS do M-Pesa ou e-Mola..." value={magicText} onChange={e => setMagicText(e.target.value)} />
            <button onClick={() => {
              const data = parseMobileMoneySMS(magicText);
              if (data) {
                setForm({ ...form, valor: data.amount, desc: data.description, tipo: data.type, data: data.formattedDate, cat: data.category });
                setIsOpen(false);
                setMagicText('');
                showToast(`Detectado: ${data.amount}MT!`, 'success');
              } else {
                showToast('Não conseguimos ler este SMS.', 'warning');
              }
            }} className="w-full h-12 rounded-2xl bg-gold text-midnight font-black uppercase tracking-widest text-xs">Processar SMS</button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
