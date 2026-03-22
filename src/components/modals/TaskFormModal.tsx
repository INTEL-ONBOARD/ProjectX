import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Search, Calendar, Flag, Layers, AlignLeft, CheckSquare, Tag, RefreshCw, Link, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Task, TaskStatus, TaskType, TaskTemplate } from '../../types';

const dbApi = () => (window as any).electronAPI.db;
import { useProjects } from '../../context/ProjectContext';
import { useMembersContext } from '../../context/MembersContext';
import { Avatar } from '../ui/Avatar';

interface Props {
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id'>) => Promise<void> | void;
  initial?: Partial<Task>;
  defaultStatus?: TaskStatus;
}

const priorityConfig = {
  low:    { label: 'Low',    color: '#D58D49', bg: '#DFA87420', ring: '#D58D49' },
  medium: { label: 'Medium', color: '#A78BFA', bg: '#A78BFA20', ring: '#A78BFA' },
  high:   { label: 'High',   color: '#D8727D', bg: '#D8727D20', ring: '#D8727D' },
};

const typeConfig = [
  { value: 'task' as TaskType,  label: 'Task',  color: '#22C55E', bg: '#22C55E20', ring: '#22C55E' },
  { value: 'issue' as TaskType, label: 'Issue', color: '#EF4444', bg: '#EF444420', ring: '#EF4444' },
];

const STEPS = ['Basics', 'Details'] as const;

const TaskFormModal: React.FC<Props> = ({ onClose, onSubmit, initial, defaultStatus }) => {
  const { projects, allTasks } = useProjects();
  const { members, getMemberColor } = useMembersContext();

  const [step, setStep]             = useState(0);
  const [title, setTitle]           = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [priority, setPriority]     = useState<'low' | 'medium' | 'high'>(
    initial?.priority === 'high' ? 'high' : initial?.priority === 'medium' ? 'medium' : 'low'
  );
  const [taskType, setTaskType]     = useState<TaskType>(initial?.taskType ?? 'task');
  const [assignees, setAssignees]   = useState<string[]>(initial?.assignees ?? []);
  const [projectId, setProjectId]   = useState(initial?.projectId ?? '');
  const [startDate, setStartDate]   = useState(initial?.startDate ?? new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate]       = useState(initial?.dueDate ?? '');
  const [recurrence, setRecurrence] = useState<'none'|'daily'|'weekly'|'monthly'>(initial?.recurrence ?? 'none');
  const [blockedBy, setBlockedBy]   = useState<string[]>(initial?.blockedBy ?? []);
  const [templates, setTemplates]   = useState<TaskTemplate[]>([]);
  const [loading, setLoading]       = useState(false);
  const [titleError, setTitleError] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showAssigneeDrop, setShowAssigneeDrop] = useState(false);
  const assigneeDropRef = useRef<HTMLDivElement>(null);

  const status: TaskStatus = initial?.status ?? defaultStatus ?? 'todo';
  const isEdit = !!initial?.id;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assigneeDropRef.current && !assigneeDropRef.current.contains(e.target as Node))
        setShowAssigneeDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { dbApi().getTemplates().then((data: any) => setTemplates(data as TaskTemplate[])); }, []);

  const toggleAssignee = (id: string) =>
    setAssignees(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  const [canSubmit, setCanSubmit] = useState(false);

  const goNext = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!title.trim()) { setTitleError('Title is required'); return; }
    if (title.trim().length > 200) { setTitleError('Title must be under 200 characters'); return; }
    if (startDate && dueDate && startDate > dueDate) { setTitleError('Start date cannot be after due date'); return; }
    setTitleError('');
    setCanSubmit(false);
    setStep(1);
    setTimeout(() => setCanSubmit(true), 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!title.trim()) { setStep(0); setTitleError('Title is required'); return; }
    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        taskType,
        assignees,
        projectId: projectId || undefined,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        recurrence,
        blockedBy,
        comments: initial?.comments ?? 0,
        files: initial?.files ?? 0,
        images: initial?.images ?? [],
      });
      onClose();
    } catch (err) {
      console.error('[TaskFormModal] Failed to save task:', err);
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    const tmpl = await dbApi().createTemplate({ name: templateName.trim(), priority, taskType, description, assignees, projectId: projectId || '' }) as TaskTemplate;
    setTemplates(prev => [...prev, tmpl]);
    setShowSaveTemplate(false);
    setTemplateName('');
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-[480px] rounded-2xl flex flex-col overflow-hidden shadow-[0_24px_64px_-12px_rgba(0,0,0,0.4)]"
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
              <CheckSquare size={13} style={{ color: '#5030E5' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {isEdit ? 'Edit Task' : 'Create Task'}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Step {step + 1} of 2 — {STEPS[step]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Step dots */}
            <div className="flex gap-1.5 mr-2">
              {STEPS.map((_, i) => (
                <div key={i} className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? 20 : 6,
                    background: i === step ? '#5030E5' : i < step ? '#5030E580' : 'var(--border-strong)',
                  }} />
              ))}
            </div>
            {/* Template picker */}
            {templates.length > 0 && (
              <div className="relative">
                <select
                  className="text-[10px] font-semibold rounded-lg px-2 py-1 pr-5 focus:outline-none appearance-none cursor-pointer"
                  style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
                  defaultValue=""
                  onChange={e => {
                    const tmpl = templates.find(t => t.id === e.target.value);
                    if (!tmpl) return;
                    setTitle(tmpl.name);
                    setDescription(tmpl.description);
                    if (tmpl.priority === 'low' || tmpl.priority === 'medium' || tmpl.priority === 'high') setPriority(tmpl.priority);
                    if (tmpl.taskType === 'task' || tmpl.taskType === 'issue') setTaskType(tmpl.taskType);
                    setAssignees(tmpl.assignees);
                    if (tmpl.projectId) setProjectId(tmpl.projectId);
                    e.target.value = '';
                  }}
                >
                  <option value="" disabled>Template…</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <ChevronDown size={9} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              </div>
            )}
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-70" style={{ background: 'var(--bg-muted)', color: 'var(--text-subtle)' }}>
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Steps */}
        <form onSubmit={handleSubmit}>
          <div className="overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              {step === 0 ? (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                  className="px-5 py-5 flex flex-col gap-4"
                >
                  {/* Title */}
                  <div>
                    <input
                      value={title}
                      onChange={e => { setTitle(e.target.value); if (titleError) setTitleError(''); }}
                      placeholder="What needs to be done?"
                      autoFocus
                      className="w-full text-base font-semibold rounded-xl px-4 py-3 focus:outline-none transition-all duration-150"
                      style={{
                        color: 'var(--text-primary)',
                        background: 'var(--bg-hover)',
                        border: `1.5px solid ${titleError ? '#EF4444' : title.trim() ? '#5030E5' : 'var(--border-default)'}`,
                        boxShadow: title.trim() && !titleError ? '0 0 0 3px rgba(80,48,229,0.12)' : titleError ? '0 0 0 3px rgba(239,68,68,0.10)' : 'none',
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); goNext(e); } }}
                    />
                    {titleError && <p className="text-red-500 text-xs mt-1.5 pl-1">{titleError}</p>}
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <Flag size={10} /> Priority
                    </label>
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high'] as const).map(p => {
                        const cfg = priorityConfig[p];
                        const active = priority === p;
                        return (
                          <button key={p} type="button" onClick={() => setPriority(p)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                            style={active ? { background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.ring}` }
                              : { background: 'var(--bg-muted)', color: 'var(--text-subtle)', border: '1.5px solid var(--border-default)' }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? cfg.color : 'var(--text-subtle)' }} />
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <Tag size={10} /> Type
                    </label>
                    <div className="flex gap-2">
                      {typeConfig.map(t => {
                        const active = taskType === t.value;
                        return (
                          <button key={t.value} type="button" onClick={() => setTaskType(t.value)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                            style={active ? { background: t.bg, color: t.color, border: `1.5px solid ${t.ring}` }
                              : { background: 'var(--bg-muted)', color: 'var(--text-subtle)', border: '1.5px solid var(--border-default)' }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? t.color : 'var(--text-subtle)' }} />
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Project */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <Layers size={10} /> Project
                    </label>
                    <div className="relative">
                      <select value={projectId} onChange={e => setProjectId(e.target.value)}
                        className="w-full appearance-none rounded-xl px-3 py-2 text-xs font-medium focus:outline-none pr-7 transition-all"
                        style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1.5px solid var(--border-default)' }}>
                        <option value="">No project</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>

                  {/* Assignees */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M12 14v-1.333A2.667 2.667 0 009.333 10H6.667A2.667 2.667 0 004 12.667V14M10 4a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Assignees
                    </label>
                    <div ref={assigneeDropRef} className="relative">
                      {assignees.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {assignees.map(id => {
                            const m = members.find(x => x.id === id);
                            if (!m) return null;
                            return (
                              <div key={id} className="flex items-center gap-1 rounded-lg pl-1 pr-1.5 py-0.5"
                                style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-default)' }}>
                                <Avatar name={m.name} color={getMemberColor(id)} size="sm" />
                                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{m.name.split(' ')[0]}</span>
                                <button type="button" onClick={() => toggleAssignee(id)} className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity">
                                  <X size={9} style={{ color: 'var(--text-muted)' }} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <button type="button" onClick={() => setShowAssigneeDrop(v => !v)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                        style={{
                          background: 'var(--bg-muted)',
                          color: 'var(--text-subtle)',
                          border: `1.5px solid ${showAssigneeDrop ? '#5030E5' : 'var(--border-default)'}`,
                        }}>
                        <Search size={12} style={{ color: 'var(--text-muted)' }} />
                        <span className="flex-1 text-left">{assignees.length > 0 ? `${assignees.length} member${assignees.length > 1 ? 's' : ''} assigned` : 'Assign members…'}</span>
                        <ChevronDown size={11} style={{ color: 'var(--text-muted)' }} className={`transition-transform ${showAssigneeDrop ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {showAssigneeDrop && (
                          <motion.div className="absolute left-0 bottom-full mb-1 w-full rounded-xl shadow-xl overflow-hidden z-30"
                            style={{ background: 'var(--bg-dropdown)', border: '1px solid var(--border-default)' }}
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}>
                            <div className="px-2.5 pt-2.5 pb-1.5">
                              <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-all"
                                style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-default)' }}>
                                <Search size={11} style={{ color: 'var(--text-muted)' }} />
                                <input type="text" value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)}
                                  placeholder="Search…" autoFocus
                                  className="flex-1 bg-transparent text-xs focus:outline-none"
                                  style={{ color: 'var(--text-primary)' }} />
                                {assigneeSearch && <button type="button" onClick={() => setAssigneeSearch('')}><X size={10} style={{ color: 'var(--text-muted)' }} /></button>}
                              </div>
                            </div>
                            <div className="max-h-36 overflow-y-auto pb-1.5">
                              {filteredMembers.map(m => {
                                const selected = assignees.includes(m.id);
                                return (
                                  <button key={m.id} type="button" onClick={() => toggleAssignee(m.id)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                                    style={{ background: selected ? '#5030E510' : 'transparent' }}
                                    onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                    onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}>
                                    <Avatar name={m.name} color={getMemberColor(m.id)} size="sm" />
                                    <span className="flex-1 text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                                    <div className="w-4 h-4 rounded flex items-center justify-center transition-all shrink-0"
                                      style={{ background: selected ? '#5030E5' : 'transparent', border: `1.5px solid ${selected ? '#5030E5' : 'var(--border-strong)'}` }}>
                                      {selected && <Check size={9} color="white" strokeWidth={2.5} />}
                                    </div>
                                  </button>
                                );
                              })}
                              {filteredMembers.length === 0 && (
                                <div className="px-4 py-5 text-center">
                                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No members found</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
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

                  {/* Recurrence */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <RefreshCw size={10} /> Recurrence
                    </label>
                    <div className="flex gap-2">
                      {(['none', 'daily', 'weekly', 'monthly'] as const).map(r => (
                        <button key={r} type="button" onClick={() => setRecurrence(r)}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all capitalize"
                          style={recurrence === r
                            ? { background: '#5030E520', color: '#5030E5', border: '1.5px solid #5030E5' }
                            : { background: 'var(--bg-muted)', color: 'var(--text-subtle)', border: '1.5px solid var(--border-default)' }}>
                          {r === 'none' ? 'None' : r.charAt(0).toUpperCase() + r.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Blocked By */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <Link size={10} /> Blocked By
                    </label>
                    {blockedBy.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {blockedBy.map(id => {
                          const t = allTasks.find(x => x.id === id);
                          return t ? (
                            <span key={id} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg font-medium"
                              style={{ background: '#EF444420', color: '#EF4444', border: '1px solid #EF444440' }}>
                              #{t.taskNumber != null ? String(t.taskNumber).padStart(3, '0') : '?'} {t.title.slice(0, 18)}
                              <button type="button" onClick={() => setBlockedBy(prev => prev.filter(x => x !== id))}><X size={9} /></button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    <div className="relative">
                      <select
                        className="w-full appearance-none rounded-xl px-3 py-2 text-xs font-medium focus:outline-none pr-7"
                        style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1.5px solid var(--border-default)' }}
                        onChange={e => { if (e.target.value && !blockedBy.includes(e.target.value)) setBlockedBy(prev => [...prev, e.target.value]); e.target.value = ''; }}
                        defaultValue="">
                        <option value="" disabled>Select a blocking task…</option>
                        {allTasks.filter(t => (initial?.id ? t.id !== initial.id : true) && !blockedBy.includes(t.id)).map(t => (
                          <option key={t.id} value={t.id}>
                            {t.taskNumber != null ? `#${String(t.taskNumber).padStart(3, '0')} ` : ''}{t.title.slice(0, 40)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <AlignLeft size={10} /> Description
                    </label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)}
                      placeholder="Add notes or context…"
                      rows={4}
                      className="w-full rounded-xl px-3 py-2.5 text-xs resize-none focus:outline-none leading-relaxed transition-all"
                      style={{
                        background: 'var(--bg-muted)',
                        color: 'var(--text-primary)',
                        border: '1.5px solid var(--border-default)',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = '#5030E5'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Save template row */}
          <AnimatePresence>
            {showSaveTemplate && (
              <motion.div className="px-5 pb-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-default)' }}>
                  <input autoFocus value={templateName} onChange={e => setTemplateName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && templateName.trim()) handleSaveTemplate(); if (e.key === 'Escape') setShowSaveTemplate(false); }}
                    placeholder="Template name…"
                    className="flex-1 text-xs bg-transparent focus:outline-none"
                    style={{ color: 'var(--text-primary)' }} />
                  <button type="button" onClick={handleSaveTemplate} disabled={!templateName.trim()}
                    className="text-xs px-2 py-1 rounded-lg text-white disabled:opacity-40"
                    style={{ background: '#5030E5' }}>Save</button>
                  <button type="button" onClick={() => { setShowSaveTemplate(false); setTemplateName(''); }}
                    className="text-xs opacity-50 hover:opacity-100">
                    <X size={11} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="px-5 pb-5 pt-2 flex items-center gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {step === 0 ? (
              <>
                <button type="button" onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                  style={{ background: 'var(--bg-muted)', color: 'var(--text-subtle)', border: '1.5px solid var(--border-default)' }}>
                  Cancel
                </button>
                {!isEdit && title.trim() && (
                  <button type="button" onClick={() => setShowSaveTemplate(true)}
                    className="px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                    style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1.5px solid var(--border-default)' }}>
                    Save template
                  </button>
                )}
                <motion.button type="button" onClick={(e) => goNext(e)}
                  className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition-colors"
                  style={{ background: '#5030E5' }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  Next <ArrowRight size={13} />
                </motion.button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setStep(0)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors"
                  style={{ background: 'var(--bg-muted)', color: 'var(--text-subtle)', border: '1.5px solid var(--border-default)' }}>
                  <ArrowLeft size={12} /> Back
                </button>
                <motion.button type="submit" disabled={loading || !title.trim()}
                  className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#5030E5' }}
                  whileHover={{ scale: (!loading && title.trim()) ? 1.02 : 1 }}
                  whileTap={{ scale: (!loading && title.trim()) ? 0.98 : 1 }}>
                  {loading ? 'Saving…' : (isEdit ? 'Save Changes' : taskType === 'issue' ? 'Create Issue' : 'Create Task')}
                </motion.button>
              </>
            )}
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default TaskFormModal;
