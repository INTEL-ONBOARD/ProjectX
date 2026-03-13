import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, FolderPlus } from 'lucide-react';
import { PROJECT_COLORS } from '../../data/mockData';

interface Props {
  onClose: () => void;
  onSubmit: (name: string, color: string) => void;
  initial?: { name: string; color: string };
}

const NewProjectModal: React.FC<Props> = ({ onClose, onSubmit, initial }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? PROJECT_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), color);
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden"
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2">
            <FolderPlus size={16} className="text-primary-500" />
            <span className="font-bold text-gray-900 text-sm">
              {initial ? 'Edit Project' : 'New Project'}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Project Name *</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Mobile App v2"
              className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              required autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Color</label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <motion.button
            type="submit"
            className="w-full bg-primary-500 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-600 transition-colors mt-1"
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          >
            {initial ? 'Save Changes' : 'Create Project'}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default NewProjectModal;
