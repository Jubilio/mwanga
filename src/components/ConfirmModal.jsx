import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, HelpCircle, X } from 'lucide-react';

/**
 * ConfirmModal - A premium, global-standard confirmation modal.
 * @param {boolean} isOpen - Controls visibility
 * @param {string} title - Main question/title
 * @param {string} message - Secondary context
 * @param {function} onConfirm - Callback when user confirms
 * @param {function} onCancel - Callback when user cancels
 * @param {string} confirmText - Label for confirm button
 * @param {string} cancelText - Label for cancel button
 * @param {string} variant - 'danger' | 'info' | 'warning'
 */
export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  variant = 'danger'
}) {
  const themes = {
    danger:  { icon: AlertCircle, color: '#FF4C4C', bg: 'rgba(255, 76, 76, 0.1)', shadow: 'rgba(255, 76, 76, 0.2)' },
    warning: { icon: AlertCircle, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', shadow: 'rgba(245, 158, 11, 0.2)' },
    info:    { icon: HelpCircle,  color: '#1a8fa8', bg: 'rgba(26, 143, 168, 0.1)', shadow: 'rgba(26, 143, 168, 0.2)' }
  };

  const theme = themes[variant] || themes.info;
  const Icon = theme.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-midnight/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-cream dark:bg-[#0c1c2e] rounded-[28px] shadow-2xl overflow-hidden border border-white/5 p-6"
          >
            {/* Close Button */}
            <button 
              onClick={onCancel}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center">
              {/* Icon Circle */}
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: theme.bg, color: theme.color, boxShadow: `0 8px 24px ${theme.shadow}` }}
              >
                <Icon size={32} />
              </div>

              <h3 className="text-lg font-black text-midnight dark:text-white mb-2 leading-tight">
                {title}
              </h3>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
                {message}
              </p>

              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={onConfirm}
                  className="w-full py-4 rounded-2xl font-black text-sm tracking-wider uppercase transition-all active:scale-95"
                  style={{ 
                    background: variant === 'danger' ? 'linear-gradient(135deg, #FF4C4C, #e04444)' : 'linear-gradient(135deg, var(--color-ocean), var(--color-sky))',
                    color: '#fff',
                    boxShadow: variant === 'danger' ? '0 8px 20px rgba(255, 76, 76, 0.3)' : '0 8px 20px rgba(10, 77, 104, 0.3)'
                  }}
                >
                  {confirmText}
                </button>
                
                <button
                  onClick={onCancel}
                  className="w-full py-3 rounded-2xl font-bold text-sm text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  {cancelText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
