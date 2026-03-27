import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

export default function Toast({ message, visible }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-[#0a1926] dark:bg-white text-white dark:text-[#0a1926] px-5 py-4 rounded-2xl shadow-2xl flex items-start gap-4 min-w-[320px] max-w-[90vw] -ml-2"
          >
            <CheckCircle2 className="text-leaf shrink-0 mt-0.5" size={20} />
            <div className="text-sm font-medium leading-relaxed whitespace-pre-line tracking-wide">
              {message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState({ message: '', visible: false });

  function showToast(msg) {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
  }

  return { toast, showToast };
}
