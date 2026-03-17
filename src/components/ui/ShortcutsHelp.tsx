import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { key: '⌘K / Ctrl+K', description: 'Open global search' },
  { key: 'N', description: 'Create new task (when not in input)' },
  { key: '⌘/', description: 'Show keyboard shortcuts' },
  { key: 'Esc', description: 'Close modal / panel' },
];

interface Props { open: boolean; onClose: () => void; }

const ShortcutsHelp: React.FC<Props> = ({ open, onClose }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Keyboard size={15} className="text-primary-500" />
              <span className="font-semibold text-sm text-gray-800">Keyboard Shortcuts</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={16} /></button>
          </div>
          <div className="p-4 space-y-1">
            {SHORTCUTS.map(s => (
              <div key={s.key} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50">
                <span className="text-sm text-gray-600">{s.description}</span>
                <kbd className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-700 rounded-lg">{s.key}</kbd>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default ShortcutsHelp;
