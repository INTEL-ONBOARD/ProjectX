import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Info, AlertCircle, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

// ── Config ────────────────────────────────────────────────────────────────────
const toastConfig: Record<ToastType, { icon: React.ElementType; bg: string; border: string; iconColor: string; textColor: string }> = {
  success: { icon: CheckCircle, bg: 'bg-white', border: 'border-[#68B266]', iconColor: 'text-[#68B266]', textColor: 'text-gray-800' },
  error:   { icon: AlertCircle, bg: 'bg-white', border: 'border-[#D8727D]', iconColor: 'text-[#D8727D]', textColor: 'text-gray-800' },
  info:    { icon: Info,        bg: 'bg-white', border: 'border-primary-400', iconColor: 'text-primary-500', textColor: 'text-gray-800' },
};

// ── Toast item ────────────────────────────────────────────────────────────────
const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const cfg = toastConfig[toast.type];
  const Icon = cfg.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border-l-4 shadow-lg max-w-sm w-full ${cfg.bg} ${cfg.border}`}
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
    >
      <Icon size={16} className={`shrink-0 mt-0.5 ${cfg.iconColor}`} />
      <span className={`text-sm flex-1 leading-snug ${cfg.textColor}`}>{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
      >
        <X size={13} />
      </button>
    </motion.div>
  );
};

// ── Provider ──────────────────────────────────────────────────────────────────
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `t${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
