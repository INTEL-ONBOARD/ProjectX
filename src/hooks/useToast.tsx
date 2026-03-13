import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function useToast(): {
  show: (msg: string) => void;
  ToastEl: React.ReactNode;
} {
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(id);
  }, [toast]);

  const show = (msg: string) => setToast({ msg, key: Date.now() });

  const ToastEl = (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.key}
          className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
        >
          {toast.msg}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return { show, ToastEl };
}
