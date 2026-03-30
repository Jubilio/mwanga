import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, XCircle, Info, X } from 'lucide-react';

/**
 * Premium Toast component with multi-variant support.
 */
export default function Toast({ message, visible, variant = 'success', onClose }) {
  const themes = {
    success: { icon: CheckCircle2, color: '#00D68F', bg: 'rgba(0, 214, 143, 0.1)', border: 'rgba(0, 214, 143, 0.2)' },
    error:   { icon: XCircle,      color: '#FF4C4C', bg: 'rgba(255, 76, 76, 0.1)', border: 'rgba(255, 76, 76, 0.2)' },
    warning: { icon: AlertCircle,  color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)' },
    info:    { icon: Info,         color: '#1a8fa8', bg: 'rgba(26, 143, 168, 0.1)', border: 'rgba(26, 143, 168, 0.2)' },
  };

  const theme = themes[variant] || themes.success;
  const Icon = theme.icon;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none w-full max-w-sm px-4">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)', transition: { duration: 0.2 } }}
            className="pointer-events-auto relative bg-midnight/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-4"
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: theme.bg, color: theme.color }}
            >
              <Icon size={22} />
            </div>
            
            <div className="flex-1 pr-4">
              <div className="text-[13px] font-bold text-white/90 leading-tight">
                {message}
              </div>
            </div>

            {onClose && (
              <button 
                onClick={onClose}
                className="absolute top-2 right-2 p-1 text-white/20 hover:text-white/50 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Custom hook for managing toast state.
 */
export function useToast() {
  const [toast, setToast] = useState({ message: '', visible: false, variant: 'success' });

  function showToast(msg, variant = 'success') {
    setToast({ message: msg, visible: true, variant });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  }

  const hideToast = () => setToast(prev => ({ ...prev, visible: false }));

  return { toast, showToast, hideToast };
}
