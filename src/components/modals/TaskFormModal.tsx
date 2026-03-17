import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Search, Calendar, Flag, Layers, AlignLeft, CheckSquare, Tag, RefreshCw, Link } from 'lucide-react';
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
  low:    { label: 'Low',    color: '#D58D49', bg: '#DFA87415', ring: '#D58D49' },
  medium: { label: 'Medium', color: '#A78BFA', bg: '#A78BFA15', ring: '#A78BFA' },
  high:   { label: 'High',   color: '#D8727D', bg: '#D8727D15', ring: '#D8727D' },
};

const TaskFormModal: React.FC<Props> = ({ onClose, onSubmit, initial, defaultStatus }) => {
  const { projects, allTasks } = useProjects();
  const { members, getMemberColor } = useMembersContext();

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
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showAssigneeDrop, setShowAssigneeDrop] = useState(false);
  const assigneeDropRef = useRef<HTMLDivElement>(null);

  const status: TaskStatus = initial?.status ?? defaultStatus ?? 'todo';

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

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required';
    if (title.trim().length > 200) e.title = 'Title must be under 200 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
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

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  const isEdit = !!initial?.id;

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    const tmpl = await dbApi().createTemplate({ name: templateName.trim(), priority, taskType, description, assignees, projectId: projectId || '' }) as TaskTemplate;
    setTemplates(prev => [...prev, tmpl]);
    setShowSaveTemplate(false);
    setTemplateName('');
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-surface-50 rounded-2xl w-full max-w-[460px] max-h-[90vh] flex flex-col shadow-[0_16px_48px_-8px_rgba(0,0,0,0.2)]"
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 12 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <CheckSquare size={14} className="text-primary-500" />
            <span className="text-xs font-semibold text-gray-500">{isEdit ? 'Edit Task' : 'New Task'}</span>
            {isEdit && initial?.taskNumber != null && (
              <span className="text-[11px] font-semibold text-gray-400">
                #{String(initial.taskNumber).padStart(3, '0')}
              </span>
            )}
            {templates.length > 0 && (
              <div className="relative ml-auto mr-2">
                <select
                  className="text-[10px] font-semibold border border-gray-200 rounded-lg px-2 py-1 text-gray-500 bg-surface-50 focus:outline-none focus:border-primary-400 appearance-none pr-5"
                  defaultValue=""
                  onChange={e => {
                    const tmpl = templates.find(t => t.id === e.target.value);
                    if (!tmpl) return;
                    setTitle(tmpl.name);
                    setDescription(tmpl.description);
                    setPriority(tmpl.priority as any);
                    setTaskType(tmpl.taskType as any);
                    setAssignees(tmpl.assignees);
                    if (tmpl.projectId) setProjectId(tmpl.projectId);
                    e.target.value = '';
                  }}
                >
                  <option value="" disabled>Use template…</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <ChevronDown size={9} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 flex flex-col gap-4">

            {/* Title */}
            <div>
              <label className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5 mb-1.5">
                <CheckSquare size={10} /> Title <span className="text-red-400">*</span>
              </label>
              <input
                value={title}
                onChange={e => { setTitle(e.target.value); if (errors.title) setErrors(prev => ({ ...prev, title: '' })); }}
                placeholder="What needs to be done?"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all font-medium"
                autoFocus
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>

            {/* Priority */}
            <div>
              <label className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5 mb-1.5">
                <Flag size={10} /> Priority
              </label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map(p => {
                  const cfg = priorityConfig[p];
                  const active = priority === p;
                  return (
                    <button
                      key={p} type="button"
                      onClick={() => setPriority(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all border"
                      style={active ? {
                        background: cfg.bg,
                        color: cfg.color,
                        borderColor: cfg.ring,
                      } : {
                        background: 'var(--bg-muted)',
                        color: 'var(--text-subtle)',
                        borderColor: 'var(--border-default)',
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? cfg.color : 'var(--border-strong)' }} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5 mb-1.5">
                <Tag size={10} /> Type
              </label>
              <div className="flex gap-2">
                {([
                  { value: 'task', label: 'Task', color: '#22C55E', bg: '#22C55E15', ring: '#22C55E' },
                  { value: 'issue', label: 'Issue', color: '#EF4444', bg: '#EF444415', ring: '#EF4444' },
                ] as const).map(t => {
                  const active = taskType === t.value;
                  return (
                    <button
                      key={t.value} type="button"
                      onClick={() => setTaskType(t.value)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all border"
                      style={active ? { background: t.bg, color: t.color, borderColor: t.ring } : { background: 'var(--bg-muted)', color: 'var(--text-subtle)', borderColor: 'var(--border-default)' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? t.color : 'var(--border-strong)' }} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Project */}
            <div>
              <label className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5 mb-1.5">
                <Layers size={10} /> Project
              </label>
              <div className="relative">
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary-400 bg-surface-50 text-gray-700 pr-7 font-medium"
                >
                  <option value="">No project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Start Date + Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5 mb-1.5">
                  <Calendar size={10} /> Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all bg-surface-50 text-gray-700 font-medium"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5 mb-1.5">
                  <Calendar size={10} /> Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all bg-surface-50 text-gray-700 font-medium"
                />
              </div>
            </div>

            {/* Recurrence */}
            <div>
              <label className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5 mb-1.5">
                <RefreshCw size={10} /> Recurrence
              </label>
              <div className="flex gap-2">
                {(['none', 'daily', 'weekly', 'monthly'] as const).map(r => (
                  <button
                    key={r} type="button"
                    onClick={() => setRecurrence(r)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                    style={recurrence === r ? { background: '#5030E515', color: '#5030E5', borderColor: '#5030E5' } : { background: 'var(--bg-muted)', color: 'var(--text-subtle)', borderColor: 'var(--border-default)' }}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Blocked By */}
            <div>
              <label className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5 mb-1.5">
                <Link size={10} /> Blocked By
              </label>
              {blockedBy.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {blockedBy.map(id => {
                    const t = allTasks.find(x => x.id === id);
                    return t ? (
                      <span key={id} className="flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-md font-medium">
                        #{t.taskNumber != null ? String(t.taskNumber).padStart(3,'0') : '?'} {t.title.slice(0,20)}
                        <button type="button" onClick={() => setBlockedBy(prev => prev.filter(x => x !== id))}><X size={9} /></button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary-400 bg-surface-50 text-gray-700 font-medium"
                onChange={e => { if (e.target.value && !blockedBy.includes(e.target.value)) setBlockedBy(prev => [...prev, e.target.value]); e.target.value = ''; }}
                defaultValue=""
              >
                <option value="" disabled>Select a blocking task…</option>
                {allTasks.filter(t => t.id !== initial?.id && !blockedBy.includes(t.id)).map(t => (
                  <option key={t.id} value={t.id}>
                    {t.taskNumber != null ? `#${String(t.taskNumber).padStart(3,'0')} ` : ''}{t.title.slice(0, 40)}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignees */}
            <div>
              <label className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5 mb-1.5">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-gray-400"><path d="M12 14v-1.333A2.667 2.667 0 009.333 10H6.667A2.667 2.667 0 004 12.667V14M10 4a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Assignees
              </label>
              <div ref={assigneeDropRef} className="relative">
                {/* Selected chips */}
                {assignees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {assignees.map(id => {
                      const m = members.find(x => x.id === id);
                      if (!m) return null;
                      return (
                        <div key={id} className="flex items-center gap-1 bg-gray-100 rounded-md pl-1 pr-1.5 py-0.5">
                          <Avatar name={m.name} color={getMemberColor(id)} size="sm" />
                          <span className="text-xs font-medium text-gray-700">{m.name.split(' ')[0]}</span>
                          <button
                            type="button"
                            onClick={() => toggleAssignee(id)}
                            className="ml-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <X size={9} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Trigger */}
                <button
                  type="button"
                  onClick={() => setShowAssigneeDrop(v => !v)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    showAssigneeDrop
                      ? 'border-primary-400 bg-surface-50 ring-1 ring-primary-100 text-gray-700'
                      : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <Search size={12} className="text-gray-400 shrink-0" />
                  <span className="flex-1 text-left">
                    {assignees.length > 0 ? `${assignees.length} assigned` : 'Assign members…'}
                  </span>
                  <ChevronDown size={11} className={`text-gray-400 transition-transform ${showAssigneeDrop ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showAssigneeDrop && (
                    <motion.div
                      className="absolute left-0 top-full mt-1 w-full bg-surface-50 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-gray-100 z-30 overflow-hidden"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                    >
                      <div className="px-2.5 pt-2.5 pb-1.5">
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus-within:border-primary-400 transition-all">
                          <Search size={11} className="text-gray-400 shrink-0" />
                          <input
                            type="text"
                            value={assigneeSearch}
                            onChange={e => setAssigneeSearch(e.target.value)}
                            placeholder="Search…"
                            autoFocus
                            className="flex-1 bg-transparent text-xs text-gray-700 placeholder-gray-400 focus:outline-none"
                          />
                          {assigneeSearch && (
                            <button type="button" onClick={() => setAssigneeSearch('')}>
                              <X size={10} className="text-gray-400" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-40 overflow-y-auto pb-1.5">
                        {filteredMembers.map(m => {
                          const selected = assignees.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => toggleAssignee(m.id)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                                selected ? 'bg-primary-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <Avatar name={m.name} color={getMemberColor(m.id)} size="sm" />
                              <span className="flex-1 text-xs font-medium text-gray-800 truncate">{m.name}</span>
                              <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                                selected ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
                              }`}>
                                {selected && (
                                  <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                            </button>
                          );
                        })}
                        {filteredMembers.length === 0 && (
                          <div className="px-4 py-6 text-center">
                            <p className="text-xs text-gray-400 font-medium">No members found</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5 mb-1.5">
                <AlignLeft size={10} /> Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add notes or context…"
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 resize-none transition-all leading-relaxed"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 pt-1 flex flex-col gap-2 shrink-0">
            {showSaveTemplate && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-100">
                <input
                  autoFocus
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && templateName.trim()) handleSaveTemplate(); if (e.key === 'Escape') setShowSaveTemplate(false); }}
                  placeholder="Template name..."
                  className="flex-1 text-sm bg-transparent outline-none"
                />
                <button
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim()}
                  className="text-xs px-2 py-1 rounded-lg bg-primary-500 text-white disabled:opacity-40"
                >Save</button>
                <button onClick={() => { setShowSaveTemplate(false); setTemplateName(''); }} className="text-xs text-gray-400">✕</button>
              </div>
            )}
            <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            {!isEdit && title.trim() && (
              <button
                type="button"
                onClick={() => setShowSaveTemplate(true)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Save as template
              </button>
            )}
            <motion.button
              type="submit"
              disabled={loading || !title.trim() || !!errors.title}
              className="flex-[2] py-2 rounded-lg text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: (loading || !title.trim() || !!errors.title) ? 1 : 1.01 }}
              whileTap={{ scale: (loading || !title.trim() || !!errors.title) ? 1 : 0.99 }}
            >
              {loading ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Task')}
            </motion.button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default TaskFormModal;
