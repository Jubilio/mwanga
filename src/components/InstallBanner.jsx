import { Plus, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallBanner({ installPrompt, onClose }) {
  if (!installPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-24 left-4 right-4 z-70 md:hidden"
      >
        <div className="glass-card flex items-center justify-between bg-ocean/95 p-4 text-white shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <Download className="text-white" size={24} />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider">Instalar Mwanga</h4>
              <p className="text-xs text-white/70">Acesso rápido e offline no teu ecrã.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                installPrompt.prompt();
                const { outcome } = await installPrompt.userChoice;
                if (outcome === 'accepted') onClose();
              }}
              className="rounded-xl bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-ocean transition active:scale-95"
            >
              Instalar
            </button>
            <button
              onClick={onClose}
              className="rounded-xl bg-white/10 p-2 text-white/60 hover:bg-white/20"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
