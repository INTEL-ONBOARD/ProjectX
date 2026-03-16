import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, FolderPlus, ChevronDown } from 'lucide-react';
import { PROJECT_COLORS } from '../../data/mockData';

export type ProjectRichFields = {
  description: string;
  status: 'active' | 'on-hold' | 'completed' | 'live' | 'support' | 'planning';
  priority: 'low' | 'medium' | 'high';
  startDate: string;
  dueDate: string;
  category: string;
};

interface Props {
  onClose: () => void;
  onSubmit: (name: string, color: string, rich: ProjectRichFields) => Promise<void> | void;
  initial?: { name: string; color: string } & Partial<ProjectRichFields>;
}

const STATUS_OPTIONS: { value: ProjectRichFields['status']; label: string; color: string }[] = [
  { value: 'active',    label: 'Active',    color: 'text-[#68B266] bg-[#83C29D22]' },
  { value: 'on-hold',  label: 'On Hold',   color: 'text-[#FFA500] bg-[#FFA50020]' },
  { value: 'completed',label: 'Completed', color: 'text-primary-500 bg-primary-50' },
  { value: 'live',     label: 'Live',      color: 'text-[#00BFFF] bg-[#00BFFF20]' },
  { value: 'support',  label: 'Support',   color: 'text-[#C084FC] bg-[#C084FC20]' },
  { value: 'planning', label: 'Planning',  color: 'text-[#94A3B8] bg-[#94A3B820]' },
];

const PRIORITY_OPTIONS: { value: ProjectRichFields['priority']; label: string; color: string }[] = [
  { value: 'low',    label: 'Low',    color: 'text-[#D58D49] bg-[#DFA87433]' },
  { value: 'medium', label: 'Medium', color: 'text-[#FFA500] bg-[#FFA50020]' },
  { value: 'high',   label: 'High',   color: 'text-[#D8727D] bg-[#D8727D22]' },
];

const inputCls = 'w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-colors';

const NewProjectModal: React.FC<Props> = ({ onClose, onSubmit, initial }) => {
  const [name, setName]               = useState(initial?.name ?? '');
  const [color, setColor]             = useState(initial?.color ?? PROJECT_COLORS[0]);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus]           = useState<ProjectRichFields['status']>(initial?.status ?? 'active');
  const [priority, setPriority]       = useState<ProjectRichFields['priority']>(initial?.priority ?? 'medium');
  const [startDate, setStartDate]     = useState(initial?.startDate ?? '');
  const [dueDate, setDueDate]         = useState(initial?.dueDate ?? '');
  const [category, setCategory]       = useState(initial?.category ?? '');
  const [loading, setLoading]         = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSubmit(name.trim(), color, {
        description,
        status,
        priority,
        startDate,
        dueDate,
        category: category.trim() || 'General',
      });
      onClose();
    } catch (err) {
      console.error('[NewProjectModal] Failed to save project:', err);
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col"
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 shrink-0">
          <div className="flex items-center gap-2">
            <FolderPlus size={16} className="text-primary-500" />
            <span className="font-bold text-gray-900 text-sm">
              {initial ? 'Edit Project' : 'New Project'}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Project Name *</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Mobile App v2"
              className={inputCls}
              required autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Status</label>
              <div className="relative">
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as ProjectRichFields['status'])}
                  className={`${inputCls} appearance-none pr-8 cursor-pointer`}
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Priority</label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as ProjectRichFields['priority'])}
                  className={`${inputCls} appearance-none pr-8 cursor-pointer`}
                >
                  {PRIORITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Start Date + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Start Date</label>
              <input
                type="date"
                value={startDate} onChange={e => setStartDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Due Date</label>
              <input
                type="date"
                value={dueDate} onChange={e => setDueDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Category</label>
            <input
              value={category} onChange={e => setCategory(e.target.value)}
              placeholder="e.g. Engineering"
              className={inputCls}
            />
          </div>

          {/* Color */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Color</label>
            <div className="flex gap-2 flex-wrap items-center">
              {PROJECT_COLORS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              {/* Custom color picker */}
              <label
                className={`w-8 h-8 rounded-full cursor-pointer flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all overflow-hidden relative hover:scale-105 ${!PROJECT_COLORS.includes(color) ? 'ring-2 ring-offset-2 ring-gray-400 scale-110 border-solid' : ''}`}
                style={!PROJECT_COLORS.includes(color) ? { backgroundColor: color, borderColor: color } : {}}
                title="Custom color"
              >
                {PROJECT_COLORS.includes(color) && <span className="text-gray-400 text-lg leading-none select-none">+</span>}
                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </label>
            </div>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-600 transition-colors mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          >
            {loading ? 'Saving...' : (initial ? 'Save Changes' : 'Create Project')}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default NewProjectModal;
