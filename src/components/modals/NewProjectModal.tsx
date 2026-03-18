import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderPlus, ArrowRight, ArrowLeft, Calendar, Tag, Flag, AlignLeft } from 'lucide-react';
import { PROJECT_COLORS } from '../../data/mockData';

export type ProjectRichFields = {
  description: string;
  status: 'active' | 'on-hold' | 'completed' | 'live-and-support' | 'planning';
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

const STATUS_OPTIONS: { value: ProjectRichFields['status']; label: string; color: string; bg: string; ring: string }[] = [
  { value: 'active',           label: 'Active',           color: '#68B266', bg: '#68B26620', ring: '#68B266' },
  { value: 'planning',         label: 'Planning',         color: '#94A3B8', bg: '#94A3B820', ring: '#94A3B8' },
  { value: 'on-hold',          label: 'On Hold',          color: '#FFA500', bg: '#FFA50020', ring: '#FFA500' },
  { value: 'live-and-support', label: 'Live & Support',   color: '#00BFFF', bg: '#00BFFF20', ring: '#00BFFF' },
  { value: 'completed',        label: 'Completed',        color: '#5030E5', bg: '#5030E520', ring: '#5030E5' },
];

const PRIORITY_OPTIONS: { value: ProjectRichFields['priority']; label: string; color: string; bg: string; ring: string }[] = [
  { value: 'low',    label: 'Low',    color: '#D58D49', bg: '#D58D4920', ring: '#D58D49' },
  { value: 'medium', label: 'Medium', color: '#A78BFA', bg: '#A78BFA20', ring: '#A78BFA' },
  { value: 'high',   label: 'High',   color: '#D8727D', bg: '#D8727D20', ring: '#D8727D' },
];

const STEPS = ['Basics', 'Details'] as const;

const NewProjectModal: React.FC<Props> = ({ onClose, onSubmit, initial }) => {
  const [step, setStep]               = useState(0);
  const [name, setName]               = useState(initial?.name ?? '');
  const [nameError, setNameError]     = useState('');
  const [color, setColor]             = useState(initial?.color ?? PROJECT_COLORS[0]);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus]           = useState<ProjectRichFields['status']>(initial?.status ?? 'active');
  const [priority, setPriority]       = useState<ProjectRichFields['priority']>(initial?.priority ?? 'medium');
  const [startDate, setStartDate]     = useState(initial?.startDate ?? '');
  const [dueDate, setDueDate]         = useState(initial?.dueDate ?? '');
  const [category, setCategory]       = useState(initial?.category ?? '');
  const [loading, setLoading]         = useState(false);

  // In edit mode, start on step 1 and allow submit immediately
  const isEdit = !!initial;
  const [canSubmit, setCanSubmit] = useState(isEdit);

  const goNext = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!name.trim()) { setNameError('Project name is required'); return; }
    setNameError('');
    setCanSubmit(false);
    setStep(1);
    setTimeout(() => setCanSubmit(true), 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!name.trim()) { setStep(0); setNameError('Project name is required'); return; }
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
      className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-[460px] rounded-2xl flex flex-col overflow-hidden shadow-[0_24px_64px_-12px_rgba(0,0,0,0.4)]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
        initial={{ scale: 0.96, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 16 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#5030E520' }}>
              <FolderPlus size={13} style={{ color: '#5030E5' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {initial ? 'Edit Project' : 'New Project'}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Step {step + 1} of 2 — {STEPS[step]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Step dots */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div key={i} className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? 20 : 6,
                    background: i === step ? '#5030E5' : i < step ? '#5030E580' : 'var(--border-strong)',
                  }} />
              ))}
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-subtle)' }}>
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Steps */}
        <form onSubmit={handleSubmit}>
          <div className="overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              {step === 0 ? (
                <motion.div key="step0"
                  initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                  className="px-5 py-5 flex flex-col gap-4"
                >
                  {/* Name */}
                  <div>
                    <input
                      value={name}
                      onChange={e => { setName(e.target.value); if (nameError) setNameError(''); }}
                      placeholder="Project name…"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); goNext(); } }}
                      className="w-full text-base font-semibold rounded-xl px-4 py-3 focus:outline-none transition-all duration-150"
                      style={{
                        color: 'var(--text-primary)',
                        background: 'var(--bg-hover)',
                        border: `1.5px solid ${nameError ? '#EF4444' : name.trim() ? '#5030E5' : 'var(--border-default)'}`,
                        boxShadow: name.trim() && !nameError ? '0 0 0 3px rgba(80,48,229,0.12)' : nameError ? '0 0 0 3px rgba(239,68,68,0.10)' : 'none',
                      }}
                    />
                    {nameError && <p className="text-red-500 text-xs mt-1.5 pl-1">{nameError}</p>}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <AlignLeft size={10} /> Description
                    </label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)}
                      placeholder="What is this project about?"
                      rows={2}
                      className="w-full rounded-xl px-3 py-2.5 text-xs resize-none focus:outline-none leading-relaxed transition-all"
                      style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1.5px solid var(--border-default)' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#5030E5'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <Tag size={10} /> Status
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map(opt => {
                        const active = status === opt.value;
                        return (
                          <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                            style={active
                              ? { background: opt.bg, color: opt.color, border: `1.5px solid ${opt.ring}` }
                              : { background: 'var(--bg-muted)', color: 'var(--text-subtle)', border: '1.5px solid var(--border-default)' }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? opt.color : 'var(--text-subtle)' }} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <Flag size={10} /> Priority
                    </label>
                    <div className="flex gap-2">
                      {PRIORITY_OPTIONS.map(opt => {
                        const active = priority === opt.value;
                        return (
                          <button key={opt.value} type="button" onClick={() => setPriority(opt.value)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                            style={active
                              ? { background: opt.bg, color: opt.color, border: `1.5px solid ${opt.ring}` }
                              : { background: 'var(--bg-muted)', color: 'var(--text-subtle)', border: '1.5px solid var(--border-default)' }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? opt.color : 'var(--text-subtle)' }} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>
                      Color
                    </label>
                    <div className="flex gap-2 flex-wrap items-center">
                      {PROJECT_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setColor(c)}
                          className="w-7 h-7 rounded-full transition-all hover:scale-110"
                          style={{
                            backgroundColor: c,
                            outline: color === c ? `2.5px solid ${c}` : 'none',
                            outlineOffset: 2,
                            transform: color === c ? 'scale(1.15)' : undefined,
                          }} />
                      ))}
                      <label
                        className="w-7 h-7 rounded-full cursor-pointer flex items-center justify-center transition-all hover:scale-110 relative overflow-hidden"
                        style={{
                          border: `2px dashed var(--border-strong)`,
                          ...(!PROJECT_COLORS.includes(color) ? { backgroundColor: color, border: `2.5px solid ${color}`, transform: 'scale(1.15)' } : {}),
                        }}
                        title="Custom color"
                      >
                        {PROJECT_COLORS.includes(color) && (
                          <span className="text-xs leading-none select-none" style={{ color: 'var(--text-muted)' }}>+</span>
                        )}
                        <input type="color" value={color} onChange={e => setColor(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                      </label>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="step1"
                  initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                  className="px-5 py-5 flex flex-col gap-4"
                >
                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                        <Calendar size={10} /> Start Date
                      </label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 text-xs font-medium focus:outline-none transition-all"
                        style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1.5px solid var(--border-default)' }} />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                        <Calendar size={10} /> Due Date
                      </label>
                      <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 text-xs font-medium focus:outline-none transition-all"
                        style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1.5px solid var(--border-default)' }} />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <Tag size={10} /> Category
                    </label>
                    <input value={category} onChange={e => setCategory(e.target.value)}
                      placeholder="e.g. Engineering, Design, Marketing…"
                      className="w-full rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none transition-all"
                      style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1.5px solid var(--border-default)' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#5030E5'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                    />
                  </div>

                  {/* Summary card */}
                  <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)' }}>
                    <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name || 'Untitled Project'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(() => {
                          const s = STATUS_OPTIONS.find(o => o.value === status)!;
                          return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ color: s.color, background: s.bg }}>{s.label}</span>;
                        })()}
                        {(() => {
                          const p = PRIORITY_OPTIONS.find(o => o.value === priority)!;
                          return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ color: p.color, background: p.bg }}>{p.label}</span>;
                        })()}
                      </div>
                    </div>
                    <button type="button" onClick={() => setStep(0)} className="text-[10px] font-semibold underline" style={{ color: 'var(--text-muted)' }}>
                      Edit
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 pt-2 flex items-center gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {step === 0 ? (
              <>
                <button type="button" onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-70"
                  style={{ background: 'var(--bg-muted)', color: 'var(--text-subtle)', border: '1.5px solid var(--border-default)' }}>
                  Cancel
                </button>
                <motion.button type="button" onClick={(e) => goNext(e)}
                  className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white"
                  style={{ background: '#5030E5' }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  Next <ArrowRight size={13} />
                </motion.button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setStep(0)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-70"
                  style={{ background: 'var(--bg-muted)', color: 'var(--text-subtle)', border: '1.5px solid var(--border-default)' }}>
                  <ArrowLeft size={12} /> Back
                </button>
                <motion.button type="submit" disabled={loading}
                  className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#5030E5' }}
                  whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}>
                  {loading ? 'Saving…' : (initial ? 'Save Changes' : 'Create Project')}
                </motion.button>
              </>
            )}
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default NewProjectModal;
