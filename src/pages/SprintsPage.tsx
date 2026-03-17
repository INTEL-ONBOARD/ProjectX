import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Zap, Trash2, Calendar, CheckCircle2, Circle,
  TrendingUp, Target, BarChart3, AlertCircle, ChevronDown,
  Flag, X,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { Sprint, Task } from '../types';
import { useProjects } from '../context/ProjectContext';
import { useMembersContext } from '../context/MembersContext';

const dbApi = () => (window as any).electronAPI.db;

const TODAY = new Date().toISOString().split('T')[0];

const STATUS_META = [
  { key: 'todo',               label: 'To Do',             color: '#5030E5' },
  { key: 'in-progress',        label: 'In Progress',       color: '#FFA500' },
  { key: 'ready-for-qa',       label: 'Ready for QA',      color: '#30C5E5' },
  { key: 'deployment-pending', label: 'Deploy Pending',    color: '#9C27B0' },
  { key: 'blocker',            label: 'Blocker',           color: '#D8727D' },
  { key: 'on-hold',            label: 'On Hold',           color: '#EAB308' },
  { key: 'done',               label: 'Done',              color: '#68B266' },
] as const;

const SPRINT_STATUS_CFG = {
  planned:   { label: 'Planned',   bg: 'bg-surface-200',     text: 'text-gray-500',    dot: '#9CA3AF' },
  active:    { label: 'Active',    bg: 'bg-[#68B26620]',     text: 'text-[#68B266]',   dot: '#68B266' },
  completed: { label: 'Completed', bg: 'bg-[#5030E520]',     text: 'text-[#5030E5]',   dot: '#5030E5' },
};

function daysLeft(endDate?: string) {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
}
function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── New Sprint modal ─────────────────────────────────────────────────────────
function NewSprintModal({ projects, onSave, onClose }: {
  projects: { id: string; name: string; color: string }[];
  onSave: (d: { name: string; projectId: string; startDate: string; endDate: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  return (
    <motion.div
      className="fixed inset-0 top-16 z-50 flex items-center justify-center bg-black/40"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-6 p-6"
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center">
              <Zap size={15} className="text-primary-500" />
            </div>
            <span className="font-bold text-gray-900 text-base">New Sprint</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-surface-100 transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="space-y-3 mb-5">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Sprint Name *</label>
            <input
              autoFocus value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Sprint 12 — Q2 Auth"
              className="w-full pl-3 pr-3 py-2 text-sm rounded-xl border border-surface-200 bg-surface-50 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all"
              onKeyDown={e => e.key === 'Enter' && name.trim() && onSave({ name, projectId, startDate, endDate })}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Project</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)}
              className="w-full pl-3 pr-3 py-2 text-sm rounded-xl border border-surface-200 bg-surface-50 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all">
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full pl-3 pr-3 py-2 text-sm rounded-xl border border-surface-200 bg-surface-50 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full pl-3 pr-3 py-2 text-sm rounded-xl border border-surface-200 bg-surface-50 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all" />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button
            onClick={() => name.trim() && onSave({ name, projectId, startDate, endDate })}
            disabled={!name.trim()}
            className="flex-1 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-40"
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          >Create Sprint</motion.button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-surface-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-surface-200 transition-colors">Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
const SprintsPage: React.FC = () => {
  const { allTasks, projects } = useProjects();
  const { members, getMemberColor } = useMembersContext();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | Sprint['status']>('all');
  const [openSprints, setOpenSprints] = useState<Set<string>>(new Set());
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

  useEffect(() => {
    dbApi().getSprints().then((data: any) => setSprints(data as Sprint[]));
  }, []);

  useEffect(() => {
    const eApi = (window as any).electronAPI;
    const unsub = eApi.onSprintChanged((_: unknown, payload: { op: string; doc?: any; id?: string }) => {
      const { op, doc, id } = payload;
      if (op === 'insert') {
        setSprints(prev => prev.some(s => s.id === doc.id) ? prev : [...prev, doc as Sprint]);
      } else if (op === 'update' || op === 'replace') {
        setSprints(prev => prev.map(s => s.id === doc.id ? doc as Sprint : s));
      } else if (op === 'delete' && id) {
        setSprints(prev => prev.filter(s => s.id !== id));
        setSelectedSprintId(prev => prev === id ? null : prev);
      }
    });
    return unsub;
  }, []);

  const handleCreate = async (data: { name: string; projectId: string; startDate: string; endDate: string }) => {
    const sprint = await dbApi().createSprint({ ...data, status: 'planned' }) as Sprint;
    setSprints(prev => [...prev, sprint]);
    setShowNewForm(false);
    setOpenSprints(prev => new Set([...prev, sprint.id]));
  };

  const handleDelete = async (id: string) => {
    await dbApi().deleteSprint(id);
    setSprints(prev => prev.filter(s => s.id !== id));
    if (selectedSprintId === id) setSelectedSprintId(null);
  };

  const handleStatusChange = async (sprint: Sprint, status: Sprint['status']) => {
    const updated = await dbApi().updateSprint(sprint.id, { status }) as Sprint;
    setSprints(prev => prev.map(s => s.id === sprint.id ? updated : s));
  };

  const toggleOpen = (id: string) =>
    setOpenSprints(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── Metrics ──────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const active = sprints.filter(s => s.status === 'active');
    const completed = sprints.filter(s => s.status === 'completed');
    const allSprintTasks = allTasks.filter(t => t.sprintId);
    const doneTasks = allSprintTasks.filter(t => t.status === 'done');
    const completionRate = allSprintTasks.length > 0 ? Math.round((doneTasks.length / allSprintTasks.length) * 100) : 0;
    const overdue = active.filter(s => { const d = daysLeft(s.endDate); return d !== null && d < 0; }).length;

    // Velocity: avg done tasks per completed sprint
    const velocity = completed.length > 0
      ? Math.round(completed.reduce((acc, s) => acc + allTasks.filter(t => t.sprintId === s.id && t.status === 'done').length, 0) / completed.length)
      : 0;

    return [
      { label: 'Total Sprints', value: String(sprints.length), trend: `${active.length} active`, trendUp: true, color: '', accent: true, icon: Zap, barPct: 100 },
      { label: 'Completion Rate', value: `${completionRate}%`, trend: completionRate >= 70 ? '↑ On track' : '↓ Needs focus', trendUp: completionRate >= 70, color: '#68B266', accent: false, icon: Target, barPct: completionRate },
      { label: 'Avg Velocity', value: velocity > 0 ? `${velocity}` : '—', trend: 'tasks / sprint', trendUp: true, color: '#5030E5', accent: false, icon: TrendingUp, barPct: Math.min(100, velocity * 5) },
      { label: 'Overdue', value: String(overdue), trend: overdue > 0 ? 'Need attention' : 'All on time', trendUp: overdue === 0, color: '#D8727D', accent: false, icon: AlertCircle, barPct: active.length > 0 ? (overdue / active.length) * 100 : 0 },
    ];
  }, [sprints, allTasks]);

  // ── Per-sprint data ───────────────────────────────────────────────────────
  const sprintData = useMemo(() => sprints.map(sprint => {
    const tasks = allTasks.filter(t => t.sprintId === sprint.id);
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const summaryBar = STATUS_META.map(s => ({
      color: s.color,
      widthPct: total > 0 ? (tasks.filter(t => t.status === s.key).length / total) * 100 : 0,
    }));
    const statusRows = STATUS_META.map(s => ({
      ...s,
      count: tasks.filter(t => t.status === s.key).length,
      pct: total > 0 ? Math.round((tasks.filter(t => t.status === s.key).length / total) * 100) : 0,
      overdue: tasks.filter(t => t.status === s.key && t.dueDate && t.dueDate < TODAY).length,
    })).filter(r => r.count > 0);
    const highCount = tasks.filter(t => t.priority === 'high').length;
    const medCount = tasks.filter(t => t.priority === 'medium').length;
    const lowCount = tasks.filter(t => t.priority === 'low').length;
    const assigneeMap: Record<string, { name: string; color: string; done: number; total: number }> = {};
    tasks.forEach(t => {
      t.assignees.forEach(id => {
        if (!assigneeMap[id]) {
          const m = members.find(x => x.id === id);
          assigneeMap[id] = { name: m?.name ?? 'Unknown', color: getMemberColor(id), done: 0, total: 0 };
        }
        assigneeMap[id].total++;
        if (t.status === 'done') assigneeMap[id].done++;
      });
    });
    const days = daysLeft(sprint.endDate);
    const isOverdue = sprint.status === 'active' && days !== null && days < 0;
    const isUrgent = sprint.status === 'active' && days !== null && days >= 0 && days <= 3;
    const proj = projects.find(p => p.id === sprint.projectId);
    return { sprint, tasks, total, done, pct, summaryBar, statusRows, highCount, medCount, lowCount, assigneeMap, days, isOverdue, isUrgent, proj };
  }), [sprints, allTasks, members, projects, getMemberColor]);

  const filtered = useMemo(() =>
    filterStatus === 'all' ? sprintData : sprintData.filter(d => d.sprint.status === filterStatus),
    [sprintData, filterStatus]);

  const selectedData = selectedSprintId ? sprintData.find(d => d.sprint.id === selectedSprintId) : null;

  return (
    <motion.div
      className="flex-1 flex flex-col overflow-hidden px-8 bg-white"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="pt-8 pb-5 shrink-0">
          <PageHeader
            eyebrow="Home / Sprints"
            title="Sprints"
            description={`${sprints.length} sprints · ${sprints.filter(s => s.status === 'active').length} active`}
            actions={
              <motion.button
                onClick={() => setShowNewForm(true)}
                className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors"
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              >
                <Plus size={16} /> New Sprint
              </motion.button>
            }
          />
        </div>

        {/* 4-metric strip */}
        <div className="grid grid-cols-4 gap-5 mb-4 shrink-0">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.label}
                className={`rounded-2xl p-5 ${m.accent ? 'bg-gradient-to-br from-primary-500 to-primary-400 text-white' : 'bg-white border border-surface-200'}`}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.accent ? 'bg-white/15' : ''}`} style={!m.accent ? { background: m.color + '20' } : {}}>
                    <Icon size={16} className={m.accent ? 'text-white' : ''} style={!m.accent ? { color: m.color } : {}} />
                  </div>
                  <span className={`text-xs font-semibold ${m.accent ? 'text-white/70' : m.trendUp ? 'text-[#68B266]' : 'text-[#D8727D]'}`}>{m.trend}</span>
                </div>
                <div className={`text-3xl font-extrabold tracking-tight ${m.accent ? 'text-white' : ''}`} style={!m.accent ? { color: m.color } : {}}>{m.value}</div>
                <div className={`text-xs mt-1 ${m.accent ? 'text-white/70' : 'text-gray-400'}`}>{m.label}</div>
                <div className={`mt-3 h-1 rounded-full overflow-hidden ${m.accent ? 'bg-white/20' : 'bg-surface-200'}`}>
                  <div className="h-full rounded-full" style={{ width: `${m.barPct}%`, background: m.accent ? 'rgba(255,255,255,0.6)' : m.color }} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-[1fr_300px] gap-5 flex-1 min-h-0 pb-6">

          {/* Main: Sprint list */}
          <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden flex flex-col min-h-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
              <h2 className="font-bold text-gray-900 text-sm">All Sprints</h2>
              <div className="flex bg-surface-100 rounded-xl p-1 gap-0.5">
                {(['all', 'active', 'planned', 'completed'] as const).map(f => (
                  <button key={f} onClick={() => setFilterStatus(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${filterStatus === f ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {f === 'all' ? `All (${sprints.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${sprints.filter(s => s.status === f).length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Column header */}
            <div className="grid grid-cols-[1fr_auto] px-5 pt-3 pb-1 shrink-0">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sprint</span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right">Progress</span>
            </div>

            {/* Sprint rows */}
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center">
                    <Zap size={22} className="text-gray-300" />
                  </div>
                  <p className="font-semibold text-gray-500 text-sm">
                    {filterStatus === 'all' ? 'No sprints yet' : `No ${filterStatus} sprints`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {filterStatus === 'all' ? 'Create your first sprint to track progress' : 'Try a different filter'}
                  </p>
                  {filterStatus === 'all' && (
                    <button onClick={() => setShowNewForm(true)}
                      className="flex items-center gap-2 bg-primary-500 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors mt-1">
                      <Plus size={13} /> New Sprint
                    </button>
                  )}
                </div>
              )}

              {filtered.map((d, i) => {
                const { sprint, total, done, pct, summaryBar, statusRows, highCount, medCount, lowCount, assigneeMap, days, isOverdue, isUrgent, proj } = d;
                const isOpen = openSprints.has(sprint.id);
                const isSelected = selectedSprintId === sprint.id;
                const cfg = SPRINT_STATUS_CFG[sprint.status];

                return (
                  <motion.div
                    key={sprint.id}
                    className="mb-1 rounded-xl overflow-hidden border border-transparent hover:border-surface-200 transition-colors"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                  >
                    {/* Row header */}
                    <div
                      className={`w-full flex items-center gap-3 px-3 py-3 cursor-pointer rounded-xl transition-colors text-left ${isSelected ? 'bg-primary-50' : 'hover:bg-surface-50'}`}
                    >
                      {/* Expand toggle */}
                      <button
                        onClick={e => { e.stopPropagation(); toggleOpen(sprint.id); }}
                        className="shrink-0"
                      >
                        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronDown size={14} className="text-gray-400" />
                        </motion.div>
                      </button>

                      {/* Status dot */}
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />

                      {/* Name + badges */}
                      <button
                        onClick={() => setSelectedSprintId(prev => prev === sprint.id ? null : sprint.id)}
                        className="flex-1 flex items-center gap-2 min-w-0 text-left"
                      >
                        <span className="text-xs font-semibold text-gray-700 truncate">{sprint.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                        {proj && (
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: proj.color }} />
                            <span className="text-[10px] text-gray-400 truncate max-w-[60px]">{proj.name}</span>
                          </div>
                        )}
                        {isOverdue && <span className="text-[10px] font-bold text-[#D8727D] shrink-0">{Math.abs(days!)}d over</span>}
                        {isUrgent && <span className="text-[10px] font-bold text-[#FFA500] shrink-0">{days}d left</span>}
                      </button>

                      {/* Stacked bar + pct + total */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex h-1.5 w-20 rounded-full overflow-hidden bg-surface-200">
                          {summaryBar.map((seg, si) =>
                            seg.widthPct > 0 ? (
                              <div key={si} className="h-full" style={{ width: `${seg.widthPct}%`, backgroundColor: seg.color }} />
                            ) : null
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-gray-400 w-8 text-right">{pct}%</span>
                        <span className="text-xs font-semibold text-gray-600 w-6 text-right">{total}</span>
                      </div>
                    </div>

                    {/* Expanded breakdown */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="expanded"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="mx-3 mb-3 rounded-xl border border-surface-100 overflow-hidden">
                            {/* Dates + actions row */}
                            <div className="flex items-center justify-between px-4 py-2.5 bg-surface-50 border-b border-surface-100">
                              <div className="flex items-center gap-4 text-[10px] text-gray-400">
                                {sprint.startDate && (
                                  <div className="flex items-center gap-1">
                                    <Calendar size={10} />
                                    <span>{fmtDate(sprint.startDate)} → {fmtDate(sprint.endDate)}</span>
                                  </div>
                                )}
                                {sprint.status === 'active' && days !== null && (
                                  <span className={`font-bold ${isOverdue ? 'text-[#D8727D]' : isUrgent ? 'text-[#FFA500]' : 'text-gray-500'}`}>
                                    {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={sprint.status}
                                  onChange={e => handleStatusChange(sprint, e.target.value as Sprint['status'])}
                                  onClick={e => e.stopPropagation()}
                                  className="text-[10px] font-semibold border border-surface-200 rounded-lg px-2 py-1 bg-white text-gray-600 focus:outline-none"
                                >
                                  <option value="planned">Planned</option>
                                  <option value="active">Active</option>
                                  <option value="completed">Completed</option>
                                </select>
                                <button
                                  onClick={e => { e.stopPropagation(); handleDelete(sprint.id); }}
                                  className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-300 hover:text-[#D8727D] hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>

                            {/* Status table header */}
                            {statusRows.length > 0 && (
                              <>
                                <div className="grid grid-cols-[1fr_36px_36px_44px] px-4 py-2 bg-surface-50 border-b border-surface-100">
                                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Status</span>
                                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right">#</span>
                                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right">%</span>
                                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right">Overdue</span>
                                </div>
                                {statusRows.map((s, si) => (
                                  <div key={s.key} className={`grid grid-cols-[1fr_36px_36px_44px] px-4 py-2 text-xs ${si < statusRows.length - 1 ? 'border-b border-surface-100' : ''}`}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                      <span className="text-gray-600 truncate">{s.label}</span>
                                    </div>
                                    <span className="text-right font-semibold text-gray-800">{s.count}</span>
                                    <span className="text-right text-gray-400">{s.pct}%</span>
                                    <div className="text-right">
                                      {s.overdue > 0
                                        ? <span className="inline-block bg-red-50 text-[#D8727D] font-semibold px-1.5 py-0.5 rounded text-[10px]">{s.overdue}</span>
                                        : <span className="text-gray-300">—</span>}
                                    </div>
                                  </div>
                                ))}
                              </>
                            )}

                            {/* Priority + assignees summary */}
                            {total > 0 && (
                              <div className="grid grid-cols-2 gap-0 border-t border-surface-100">
                                {/* Priority */}
                                <div className="px-4 py-3 border-r border-surface-100">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Priority</p>
                                  <div className="space-y-1.5">
                                    {[
                                      { label: 'High', count: highCount, color: '#D8727D' },
                                      { label: 'Med', count: medCount, color: '#FFA500' },
                                      { label: 'Low', count: lowCount, color: '#D58D49' },
                                    ].filter(x => x.count > 0).map(p => (
                                      <div key={p.label} className="flex items-center gap-2 text-xs">
                                        <Flag size={9} style={{ color: p.color }} />
                                        <span className="text-gray-500 flex-1">{p.label}</span>
                                        <span className="font-bold text-gray-800">{p.count}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                {/* Assignees */}
                                <div className="px-4 py-3">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Team</p>
                                  <div className="space-y-1.5">
                                    {Object.entries(assigneeMap).slice(0, 4).map(([id, w]) => (
                                      <div key={id} className="flex items-center gap-2 text-xs">
                                        <Avatar name={w.name} color={w.color} size="sm" />
                                        <span className="text-gray-500 flex-1 truncate">{w.name.split(' ')[0]}</span>
                                        <div className="w-10 h-1.5 bg-surface-200 rounded-full overflow-hidden shrink-0">
                                          <div className="h-full rounded-full bg-primary-400" style={{ width: `${w.total > 0 ? (w.done / w.total) * 100 : 0}%` }} />
                                        </div>
                                        <span className="font-bold text-gray-800 w-4 text-right">{w.total}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {total === 0 && (
                              <p className="text-xs text-gray-400 text-center py-4">No tasks assigned to this sprint yet</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-4 overflow-y-auto min-h-0">

            {/* Sprint detail or summary */}
            {selectedData ? (
              <>
                {/* Selected sprint detail */}
                <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900 text-sm truncate pr-2">{selectedData.sprint.name}</h3>
                    <button onClick={() => setSelectedSprintId(null)} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:bg-surface-100 transition-colors shrink-0">
                      <X size={12} />
                    </button>
                  </div>
                  {/* Donut */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full shrink-0" style={{
                      background: selectedData.total > 0
                        ? (() => {
                            let cursor = 0;
                            const segs = STATUS_META.map(s => {
                              const pct = (selectedData.tasks.filter(t => t.status === s.key).length / selectedData.total) * 100;
                              const seg = `${s.color} ${cursor}% ${cursor + pct}%`;
                              cursor += pct;
                              return pct > 0 ? seg : null;
                            }).filter(Boolean);
                            return `conic-gradient(${segs.join(', ')})`;
                          })()
                        : '#EBEBEB'
                    }} />
                    <div className="flex flex-col gap-1">
                      <p className="text-3xl font-extrabold tracking-tight text-primary-500">{selectedData.pct}%</p>
                      <p className="text-xs text-gray-400">{selectedData.done}/{selectedData.total} done</p>
                    </div>
                  </div>
                  <div className="h-2 bg-surface-200 rounded-full overflow-hidden mb-3">
                    <motion.div className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
                      initial={{ width: 0 }} animate={{ width: `${selectedData.pct}%` }}
                      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }} />
                  </div>
                  {[
                    ['Total Tasks', selectedData.total],
                    ['Done', selectedData.done],
                    ['Remaining', selectedData.total - selectedData.done],
                  ].map(([label, val]) => (
                    <div key={String(label)} className="flex justify-between py-2 border-b border-surface-100 last:border-0 text-xs">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-bold text-gray-900">{val}</span>
                    </div>
                  ))}
                </motion.div>

                {/* Status breakdown donut */}
                {selectedData.statusRows.length > 0 && (
                  <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: 0.06, ease: [0.4, 0, 0.2, 1] }}>
                    <h3 className="font-bold text-gray-900 text-sm mb-3">Status Breakdown</h3>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-14 h-14 rounded-full shrink-0" style={{
                        background: (() => {
                          let cursor = 0;
                          const segs = selectedData.statusRows.map(s => {
                            const seg = `${s.color} ${cursor}% ${cursor + s.pct}%`;
                            cursor += s.pct;
                            return seg;
                          });
                          return segs.length ? `conic-gradient(${segs.join(', ')})` : '#EBEBEB';
                        })()
                      }} />
                      <div className="flex flex-col gap-1.5 flex-1">
                        {selectedData.statusRows.map(s => (
                          <div key={s.key} className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                            <span className="text-gray-500 flex-1 truncate">{s.label}</span>
                            <span className="font-bold text-gray-900">{s.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Member contributions */}
                {Object.keys(selectedData.assigneeMap).length > 0 && (
                  <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: 0.12, ease: [0.4, 0, 0.2, 1] }}>
                    <h3 className="font-bold text-gray-900 text-sm mb-3">Member Contributions</h3>
                    {Object.entries(selectedData.assigneeMap).sort((a, b) => b[1].total - a[1].total).map(([id, w]) => (
                      <div key={id} className="flex items-center gap-2 py-2 border-b border-surface-100 last:border-0 text-xs">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: w.color }} />
                        <span className="text-gray-500 flex-1 truncate">{w.name.split(' ')[0]}</span>
                        <div className="w-14 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${w.total > 0 ? (w.done / w.total) * 100 : 0}%`, background: w.color }} />
                        </div>
                        <span className="font-bold text-gray-900 w-4 text-right">{w.total}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </>
            ) : (
              <>
                {/* Default: overall summary panels */}
                <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0, ease: [0.4, 0, 0.2, 1] }}>
                  <h3 className="font-bold text-gray-900 text-sm mb-3">Sprint Summary</h3>
                  {[
                    ['Total Sprints', sprints.length],
                    ['Active', sprints.filter(s => s.status === 'active').length],
                    ['Planned', sprints.filter(s => s.status === 'planned').length],
                    ['Completed', sprints.filter(s => s.status === 'completed').length],
                  ].map(([label, val]) => (
                    <div key={String(label)} className="flex justify-between py-2 border-b border-surface-100 last:border-0 text-xs">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-bold text-gray-900">{val}</span>
                    </div>
                  ))}
                </motion.div>

                {/* Task distribution across sprints */}
                <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}>
                  <h3 className="font-bold text-gray-900 text-sm mb-3">Task Distribution</h3>
                  {(() => {
                    const sprintTasks = allTasks.filter(t => t.sprintId);
                    const total = sprintTasks.length;
                    const donutGradient = (() => {
                      if (total === 0) return '#e5e7eb';
                      const todo = (sprintTasks.filter(t => t.status === 'todo').length / total) * 100;
                      const inProg = (sprintTasks.filter(t => t.status === 'in-progress').length / total) * 100;
                      return `conic-gradient(#5030E5 0% ${todo}%, #FFA500 ${todo}% ${todo + inProg}%, #68B266 ${todo + inProg}% 100%)`;
                    })();
                    const items = [
                      { label: 'To Do', count: sprintTasks.filter(t => t.status === 'todo').length, color: '#5030E5' },
                      { label: 'In Progress', count: sprintTasks.filter(t => t.status === 'in-progress').length, color: '#FFA500' },
                      { label: 'Done', count: sprintTasks.filter(t => t.status === 'done').length, color: '#68B266' },
                    ];
                    return (
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full shrink-0" style={{ background: donutGradient }} />
                        <div className="flex flex-col gap-1.5">
                          {items.map(d => (
                            <div key={d.label} className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                              <span className="text-gray-500 flex-1">{d.label}</span>
                              <span className="font-bold text-gray-900">{d.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>

                {/* Velocity panel */}
                <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.16, ease: [0.4, 0, 0.2, 1] }}>
                  <h3 className="font-bold text-gray-900 text-sm mb-3">Velocity</h3>
                  {sprints.filter(s => s.status === 'completed').length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">Complete a sprint to see velocity</p>
                  ) : (
                    sprints.filter(s => s.status === 'completed').slice(-4).map(s => {
                      const done = allTasks.filter(t => t.sprintId === s.id && t.status === 'done').length;
                      const maxDone = Math.max(1, ...sprints.filter(x => x.status === 'completed').map(x => allTasks.filter(t => t.sprintId === x.id && t.status === 'done').length));
                      return (
                        <div key={s.id} className="flex items-center gap-2 py-2 border-b border-surface-100 last:border-0 text-xs">
                          <span className="text-gray-500 flex-1 truncate">{s.name.length > 16 ? s.name.slice(0, 16) + '…' : s.name}</span>
                          <div className="w-14 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-primary-400" style={{ width: `${(done / maxDone) * 100}%` }} />
                          </div>
                          <span className="font-bold text-gray-900 w-4 text-right">{done}</span>
                        </div>
                      );
                    })
                  )}
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* New sprint modal */}
      <AnimatePresence>
        {showNewForm && (
          <NewSprintModal
            projects={projects}
            onSave={handleCreate}
            onClose={() => setShowNewForm(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SprintsPage;
