import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckSquare, Clock, TrendingUp, AlertCircle, Plus, Download, X, ImagePlus, Calendar, User, Tag, ChevronDown, ChevronLeft, ChevronRight, Pencil, Trash2, ArrowRight, Flag, UserPlus, UserMinus, FileText, Search, AlignLeft, Check, Circle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { AvatarGroup } from '../components/ui/Avatar';
import { Task, TaskStatus, TaskActivityEntry } from '../types';
import { useProjects } from '../context/ProjectContext';
import { useMembersContext } from '../context/MembersContext';
import { useAuth } from '../context/AuthContext';
import TaskFormModal from '../components/modals/TaskFormModal';
import { downloadCsv } from '../utils/exportCsv';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';


// ── Activity Log helpers ────────────────────────────────────────────────────
const activityIconMap: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  created:             { icon: Plus,      color: '#68B266' },
  status_changed:      { icon: ArrowRight, color: '#6366f1' },
  priority_changed:    { icon: Flag,      color: '#FFA500' },
  assignee_added:      { icon: UserPlus,  color: '#68B266' },
  assignee_removed:    { icon: UserMinus, color: '#D8727D' },
  due_date_changed:    { icon: Calendar,  color: '#a855f7' },
  title_changed:       { icon: Pencil,    color: '#6b7280' },
  description_changed: { icon: FileText,  color: '#6b7280' },
};
const activityLabelMap: Record<string, string> = {
  created:             'created this task',
  status_changed:      'changed status',
  priority_changed:    'changed priority',
  assignee_added:      'added assignee',
  assignee_removed:    'removed assignee',
  due_date_changed:    'changed due date',
  title_changed:       'changed title',
  description_changed: 'updated description',
};
function formatActivityTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
const ActivityEntryRow: React.FC<{ entry: TaskActivityEntry; currentUserId: string }> = ({ entry, currentUserId }) => {
  const { icon: Icon, color } = activityIconMap[entry.type] ?? { icon: ArrowRight, color: '#6b7280' };
  const label = activityLabelMap[entry.type] ?? entry.type;
  const actor = entry.actorId === currentUserId ? 'You' : entry.actorName;
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: color + '20' }}>
        <Icon size={11} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-700 leading-snug">
          <span className="font-semibold">{actor}</span> {label}
          {(entry.from || entry.to) && (
            <span className="inline-flex items-center gap-1 ml-1">
              {entry.from && <span className="bg-surface-100 text-gray-500 rounded px-1 py-0.5 text-[10px]">{entry.from}</span>}
              {entry.from && entry.to && <ArrowRight size={9} className="text-gray-400" />}
              {entry.to && <span className="bg-surface-100 text-gray-500 rounded px-1 py-0.5 text-[10px]">{entry.to}</span>}
            </span>
          )}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">{formatActivityTime(entry.timestamp)}</p>
      </div>
    </div>
  );
};
// ── End Activity Log helpers ────────────────────────────────────────────────

const priorityStyles: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-[#DFA87433]', text: 'text-[#D58D49]', label: 'Low' },
  high: { bg: 'bg-[#D8727D33]', text: 'text-[#D8727D]', label: 'High' },
  completed: { bg: 'bg-[#83C29D33]', text: 'text-[#68B266]', label: 'Done' },
};
const statusStyles: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  'todo':               { bg: 'bg-[#94A3B820]',    text: 'text-[#94A3B8]',   label: 'To Do',              dot: 'bg-[#94A3B8]' },
  'in-progress':        { bg: 'bg-[#FFA50020]',    text: 'text-[#FFA500]',   label: 'In Progress',        dot: 'bg-[#FFA500]' },
  'ready-for-qa':       { bg: 'bg-[#30C5E520]',    text: 'text-[#30C5E5]',   label: 'Ready for QA',       dot: 'bg-[#30C5E5]' },
  'deployment-pending': { bg: 'bg-[#9C27B020]',    text: 'text-[#9C27B0]',   label: 'Deployment Pending', dot: 'bg-[#9C27B0]' },
  'blocker':            { bg: 'bg-[#D8727D22]',    text: 'text-[#D8727D]',   label: 'Blocker',            dot: 'bg-[#D8727D]' },
  'on-hold':            { bg: 'bg-[#EAB30820]',    text: 'text-[#EAB308]',   label: 'On Hold',            dot: 'bg-[#EAB308]' },
  'done':               { bg: 'bg-[#83C29D33]',    text: 'text-[#68B266]',   label: 'Done',               dot: 'bg-[#68B266]' },
};

const tabs = ['All', 'To Do', 'In Progress', 'Ready for QA', 'Deployment Pending', 'Blocker', 'On Hold', 'Done'];

// ── Dependency Graph ────────────────────────────────────────────────────────
function DependencyGraph({ tasks, onTaskClick }: { tasks: Task[]; onTaskClick: (t: Task) => void }) {
  const relevantTasks = tasks.filter(t =>
    (t.blockedBy && t.blockedBy.length > 0) || tasks.some(other => other.blockedBy?.includes(t.id))
  );

  if (relevantTasks.length === 0) {
    return <div className="flex items-center justify-center py-16 text-sm text-gray-400">No task dependencies found. Use the "Blocked By" field on tasks to create dependencies.</div>;
  }

  const CARD_W = 160, CARD_H = 60, GAP_X = 40, GAP_Y = 40, COLS = 4;
  const posMap: Record<string, { x: number; y: number }> = {};
  relevantTasks.forEach((t, i) => {
    posMap[t.id] = {
      x: (i % COLS) * (CARD_W + GAP_X) + 20,
      y: Math.floor(i / COLS) * (CARD_H + GAP_Y) + 20,
    };
  });

  const svgWidth = COLS * (CARD_W + GAP_X) + 40;
  const svgHeight = Math.ceil(relevantTasks.length / COLS) * (CARD_H + GAP_Y) + 40;

  return (
    <div className="overflow-auto p-4">
      <svg width={svgWidth} height={svgHeight}>
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#EF4444" />
          </marker>
        </defs>
        {/* Draw arrows for blockedBy relationships */}
        {relevantTasks.map(task =>
          (task.blockedBy ?? []).map(blockerId => {
            const from = posMap[blockerId];
            const to = posMap[task.id];
            if (!from || !to) return null;
            return (
              <line
                key={`${blockerId}-${task.id}`}
                x1={from.x + CARD_W} y1={from.y + CARD_H / 2}
                x2={to.x} y2={to.y + CARD_H / 2}
                stroke="#EF4444" strokeWidth={1.5} markerEnd="url(#arrowhead)"
              />
            );
          })
        )}
        {/* Draw task nodes */}
        {relevantTasks.map(task => {
          const pos = posMap[task.id];
          const isBlocked = task.blockedBy && task.blockedBy.length > 0;
          return (
            <g key={task.id} onClick={() => onTaskClick(task)} style={{ cursor: 'pointer' }}>
              <rect
                x={pos.x} y={pos.y} width={CARD_W} height={CARD_H}
                rx={8} ry={8}
                fill="white" stroke={isBlocked ? '#EF4444' : '#E5E7EB'} strokeWidth={isBlocked ? 2 : 1}
              />
              <text x={pos.x + 8} y={pos.y + 18} fontSize={10} fill="#6B7280">#{task.taskNumber}</text>
              <foreignObject x={pos.x + 8} y={pos.y + 24} width={CARD_W - 16} height={30}>
                <div style={{ fontSize: 12, lineHeight: '15px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                  {task.title}
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
// ── End Dependency Graph ─────────────────────────────────────────────────────

const TasksPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projects: contextProjects, allTasks, createTask, updateTask, deleteTask, moveTask } = useProjects();
  const { members, getMemberColor } = useMembersContext();
  const { user: authUser } = useAuth() ?? { user: null };
  const [activeTab, setActiveTab] = useState(0);
  const [detailTab, setDetailTab] = useState<'details' | 'activity'>('details');
  const [searchQuery, setSearchQuery] = useState('');

  // Pre-populate search from header search navigation
  useEffect(() => {
    const s = (location.state as any)?.search;
    if (s) setSearchQuery(s);
  }, [location.state]);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Reset detail tab when selected task changes
  useEffect(() => {
    setDetailTab('details');
  }, [selectedTask?.id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assigneeDropRef.current && !assigneeDropRef.current.contains(e.target as Node)) {
        setShowAssigneePicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const detailFileRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (lightboxIndex !== null) lightboxRef.current?.focus();
  }, [lightboxIndex]);
  useEffect(() => {
    setLightboxIndex(null);
  }, [selectedTask?.id]);

  // Inline edit state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const assigneeDropRef = useRef<HTMLDivElement>(null);

  // View mode (list vs deps graph)
  const [viewMode, setViewMode] = useState<'list' | 'deps'>('list');

  // Delete confirmation state
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusDrop, setBulkStatusDrop] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const totalTasks = allTasks.length;

  const tabStatusMap: (TaskStatus | null)[] = [null, 'todo', 'in-progress', 'ready-for-qa', 'deployment-pending', 'blocker', 'on-hold', 'done'];
  const tabTasks = activeTab === 0 ? allTasks : allTasks.filter(t => t.status === tabStatusMap[activeTab]);

  const filteredTasks = searchQuery.trim()
    ? tabTasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : tabTasks;

  const doneCount = allTasks.filter(t => t.status === 'done').length;
  const todoCount = allTasks.filter(t => t.status === 'todo').length;
  const inProgCount = allTasks.filter(t => t.status === 'in-progress').length;

  const TODAY = new Date().toISOString().split('T')[0];
  const TODAY_STR = TODAY;
  const overdueCount = allTasks.filter(t => t.dueDate && t.dueDate < TODAY_STR && t.status !== 'done').length;
  const completionPct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  const metrics = [
    { label: 'Total Tasks', value: String(totalTasks), trend: `${contextProjects.length} project${contextProjects.length !== 1 ? 's' : ''}`, trendUp: true, color: '', accent: true, icon: CheckSquare, barPct: 100 },
    { label: 'In Progress', value: String(inProgCount), trend: 'Active now', trendUp: true, color: '#FFA500', accent: false, icon: Clock, barPct: totalTasks > 0 ? (inProgCount / totalTasks) * 100 : 0 },
    { label: 'Completed', value: String(doneCount), trend: `${completionPct}% done`, trendUp: true, color: '#68B266', accent: false, icon: TrendingUp, barPct: totalTasks > 0 ? (doneCount / totalTasks) * 100 : 0 },
    { label: 'Pending', value: String(todoCount), trend: overdueCount > 0 ? `${overdueCount} overdue` : 'On track', trendUp: overdueCount === 0, color: '#D8727D', accent: false, icon: AlertCircle, barPct: totalTasks > 0 ? (todoCount / totalTasks) * 100 : 0 },
  ];

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>, cb: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => cb(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleExport = () => {
    const header = ['Title', 'Project', 'Priority', 'Status', 'Assignees', 'Due Date'];
    const rows = allTasks.map(t => {
      const proj = contextProjects.find(p => p.id === t.projectId)?.name ?? '';
      const assigneeNames = t.assignees.map(id => members.find(m => m.id === id)?.name ?? '').filter(Boolean).join(', ');
      return [t.title, proj, t.priority, t.status, assigneeNames, t.dueDate ?? ''];
    });
    downloadCsv('tasks.csv', [header, ...rows]);
  };

  const handleExportCSV = () => {
    const rows = [
      ['Task #', 'Title', 'Status', 'Priority', 'Type', 'Project', 'Due Date'],
      ...filteredTasks.map(t => [
        t.taskNumber != null ? `#${String(t.taskNumber).padStart(3, '0')}` : '—',
        t.title,
        t.status,
        t.priority,
        t.taskType ?? 'task',
        contextProjects.find(p => p.id === t.projectId)?.name ?? '—',
        t.dueDate ?? '—',
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tasks.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const patchTask = (patch: Partial<Task>) => {
    if (!selectedTask) return;
    updateTask(selectedTask.id, patch).catch(console.error);
    setSelectedTask(prev => prev ? { ...prev, ...patch } : prev);
  };

  const handleOpenTask = (task: Task) => {
    setSelectedTask(task);
    setShowStatusDrop(false);
    setShowPriorityPicker(false);
    setShowAssigneePicker(false);
    setEditingTitle(false);
    setEditingDesc(false);
    setEditingDueDate(false);
    setConfirmDelete(false);
  };

  return (
    <motion.div
      className="flex-1 flex flex-col overflow-hidden px-8 bg-white"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="flex flex-col h-full">
        <div className="pt-8 pb-5 shrink-0">
          <PageHeader
            eyebrow="Home / Tasks"
            title="Tasks"
            description={`${totalTasks} tasks across ${contextProjects.length} projects`}
            actions={
              <>
                <motion.button
                  onClick={() => contextProjects.length > 0 && setShowTaskForm(true)}
                  className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${contextProjects.length > 0 ? 'bg-primary-500 text-white hover:bg-primary-600' : 'bg-surface-200 text-gray-400 cursor-not-allowed'}`}
                  whileHover={{ scale: contextProjects.length > 0 ? 1.02 : 1 }}
                  whileTap={{ scale: contextProjects.length > 0 ? 0.98 : 1 }}
                  title={contextProjects.length === 0 ? 'Create a project first' : undefined}
                >
                  <Plus size={16} /> New Task
                </motion.button>
              </>
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

        {/* Full-width table body */}
        <div className="flex-1 min-h-0 pb-6">
          {/* Main: Tasks table */}
          <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <h2 className="font-bold text-gray-900 text-sm">All Tasks</h2>
              <button onClick={() => navigate('/')} className="text-xs text-primary-500 font-semibold hover:text-primary-700 transition-colors">Board view →</button>
            </div>
            {/* Tabs */}
            <div className="px-5 pt-3 flex items-center justify-between gap-3">
              <div className="flex gap-1 bg-surface-100 rounded-lg p-1 mb-3 w-fit">
                {tabs.map((t, i) => {
                  const s = tabStatusMap[i];
                  const count = s === null ? totalTasks : allTasks.filter(task => task.status === s).length;
                  return (
                    <button key={t} onClick={() => { setActiveTab(i); setViewMode('list'); }} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === i && viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      {t} ({count})
                    </button>
                  );
                })}
                <button
                  onClick={() => setViewMode('deps')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${viewMode === 'deps' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Dependencies
                </button>
              </div>
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-3 pr-7 py-1.5 text-xs rounded-lg border border-surface-200 bg-surface-50 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-100 transition-all w-44"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
            {viewMode === 'deps' && (
              <div className="flex-1 overflow-y-auto min-h-0">
                <DependencyGraph tasks={filteredTasks} onTaskClick={handleOpenTask} />
              </div>
            )}
            {viewMode === 'list' && <div className="flex-1 overflow-y-auto min-h-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="px-4 py-3 w-8 bg-surface-50">
                    <input type="checkbox"
                      checked={selectedIds.size === filteredTasks.length && filteredTasks.length > 0}
                      onChange={e => setSelectedIds(e.target.checked ? new Set(filteredTasks.map(t => t.id)) : new Set())}
                      className="rounded border-gray-300"
                    />
                  </th>
                  {['Task', 'Project', 'Priority', 'Assignees', 'Due', 'Status'].map(h => (
                    <th key={h} className={`px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50${h === 'Task' ? ' w-[35%]' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={<CheckSquare size={48} />}
                        title="No tasks found"
                        description="Try adjusting your filters or create a new task."
                        action={{ label: 'New Task', onClick: () => setShowTaskForm(true) }}
                      />
                    </td>
                  </tr>
                )}
                {filteredTasks.map((task, i) => {
                  const priority = priorityStyles[task.priority] ?? priorityStyles.low;
                  const status = statusStyles[task.status] ?? statusStyles.todo;
                  const project = contextProjects.find(p => p.id === task.projectId);
                  const names = task.assignees.map(id => members.find(m => m.id === id)?.name ?? 'Unknown');
                  const colors = task.assignees.map(id => getMemberColor(id));
                  return (
                    <motion.tr
                      key={task.id}
                      className="border-b border-surface-100 hover:bg-surface-50 transition-colors cursor-pointer"
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                      onClick={() => { setSelectedTask(task); setShowStatusDrop(false); setConfirmDelete(false); }}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox"
                          checked={selectedIds.has(task.id)}
                          onChange={e => {
                            const next = new Set(selectedIds);
                            e.target.checked ? next.add(task.id) : next.delete(task.id);
                            setSelectedIds(next);
                          }}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3 w-[35%]">
                        <div className="flex items-center">
                          <span className="text-[11px] font-semibold text-gray-400 mr-1.5 shrink-0">
                            {task.taskNumber != null ? `#${String(task.taskNumber).padStart(3, '0')}` : '—'}
                          </span>
                          <div className="font-semibold text-gray-900 text-xs line-clamp-2">{task.title}</div>
                        </div>
                        <div className="text-[10px] text-gray-400">{task.comments} comments · {task.files} files</div>
                      </td>
                      <td className="px-4 py-3">
                        {project && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                            <span className="text-xs text-gray-500 truncate max-w-[80px]">{project.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${priority.bg} ${priority.text}`}>{priority.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <AvatarGroup names={names} colors={colors} size="sm" max={3} />
                      </td>
                      <td className="px-4 py-3">
                        {task.dueDate ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-xs ${task.dueDate < TODAY && task.status !== 'done' ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                              {task.dueDate}
                            </span>
                            {task.dueDate < TODAY && task.status !== 'done' && (
                              <span className="text-[10px] font-bold text-red-400">Overdue</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>{status.label}</span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            </div>}
          </div>
        </div>
      </div>

      {/* ── Task Detail Panel — ClickUp style ── */}
      <AnimatePresence>
        {selectedTask && (() => {
          const proj = contextProjects.find(p => p.id === selectedTask.projectId);
          const selStatus = selectedTask.status as TaskStatus;
          const selStatusStyle = statusStyles[selStatus] ?? statusStyles['todo'];
          const TODAY_VAL = new Date().toISOString().split('T')[0];
          return (
            <motion.div
              className="fixed inset-0 top-16 z-50 flex"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowStatusDrop(false); setShowPriorityPicker(false); setShowAssigneePicker(false); }}
            >
              <div className="flex-1" onClick={() => { setSelectedTask(null); setConfirmDelete(false); }} />
              <motion.div
                className="w-[420px] h-full overflow-y-auto flex flex-col border-l shrink-0 relative"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
                initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                onClick={e => e.stopPropagation()}
              >
                {/* Top toolbar */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => patchTask({ taskType: selectedTask.taskType === 'issue' ? 'task' : 'issue' })}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors"
                      style={{
                        background: selectedTask.taskType === 'issue' ? 'rgba(216,114,125,0.12)' : 'rgba(34,197,94,0.10)',
                        color: selectedTask.taskType === 'issue' ? '#D8727D' : '#22C55E',
                        border: `1px solid ${selectedTask.taskType === 'issue' ? 'rgba(216,114,125,0.25)' : 'rgba(34,197,94,0.2)'}`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
                      {selectedTask.taskType === 'issue' ? 'Issue' : 'Task'}
                      <ChevronDown size={10} />
                    </button>
                    {proj && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: proj.color }} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{proj.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {(['details', 'activity'] as const).map(tab => (
                      <button key={tab} onClick={() => setDetailTab(tab)}
                        className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
                        style={{ background: detailTab === tab ? 'var(--bg-active)' : 'transparent', color: detailTab === tab ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                    <button onClick={() => { setSelectedTask(null); setConfirmDelete(false); }}
                      className="w-7 h-7 rounded-md flex items-center justify-center ml-1 transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {detailTab === 'details' && (
                  <div className="flex-1 px-5 py-5 flex flex-col">

                    {/* Title */}
                    <div className="mb-5">
                      {editingTitle ? (
                        <input autoFocus value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                          onBlur={() => { if (titleDraft.trim()) patchTask({ title: titleDraft.trim() }); setEditingTitle(false); }}
                          onKeyDown={e => { if (e.key === 'Enter') { if (titleDraft.trim()) patchTask({ title: titleDraft.trim() }); setEditingTitle(false); } if (e.key === 'Escape') setEditingTitle(false); }}
                          className="w-full text-xl font-bold leading-snug bg-transparent focus:outline-none"
                          style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--color-primary-400)' }} />
                      ) : (
                        <h2 className="text-xl font-bold leading-snug cursor-text hover:opacity-80 transition-opacity"
                          style={{ color: 'var(--text-primary)' }}
                          onClick={() => { setTitleDraft(selectedTask.title); setEditingTitle(true); }}>
                          {selectedTask.title}
                        </h2>
                      )}
                      {selectedTask.taskNumber != null && (
                        <span className="text-xs mt-1 block" style={{ color: 'var(--text-subtle)' }}>#{String(selectedTask.taskNumber).padStart(3, '0')}</span>
                      )}
                    </div>

                    {/* Metadata rows */}
                    <div className="flex flex-col mb-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>

                      {/* Priority */}
                      <div className="flex items-center py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-center gap-2 w-[110px] shrink-0">
                          <Flag size={13} style={{ color: 'var(--text-subtle)' }} />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Priority</span>
                        </div>
                        <div className="relative">
                          <button onClick={() => { setShowPriorityPicker(v => !v); setShowStatusDrop(false); setShowAssigneePicker(false); }}
                            className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70">
                            {(() => {
                              const colors: Record<string, string> = { low: '#D58D49', medium: '#A78BFA', high: '#D8727D' };
                              const labels: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High' };
                              const p = selectedTask.priority;
                              return (<><Flag size={13} style={{ color: colors[p] ?? 'var(--text-subtle)' }} /><span style={{ color: colors[p] ?? 'var(--text-secondary)' }}>{labels[p] ?? 'Normal'}</span></>);
                            })()}
                            <ChevronDown size={11} style={{ color: 'var(--text-subtle)' }} className={`transition-transform ${showPriorityPicker ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {showPriorityPicker && (
                              <motion.div className="absolute left-0 top-full mt-1 rounded-xl shadow-xl overflow-hidden z-20 w-40"
                                style={{ background: 'var(--bg-dropdown)', border: '1px solid var(--border-default)' }}
                                initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.13 }}>
                                {([{ value: 'low', label: 'Low', color: '#D58D49' }, { value: 'medium', label: 'Medium', color: '#A78BFA' }, { value: 'high', label: 'High', color: '#D8727D' }] as const).map(p => (
                                  <button key={p.value} onClick={() => { patchTask({ priority: p.value }); setShowPriorityPicker(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors"
                                    style={{ color: p.color, background: selectedTask.priority === p.value ? 'var(--bg-active)' : 'transparent' }}
                                    onMouseEnter={e => { if (selectedTask.priority !== p.value) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = selectedTask.priority === p.value ? 'var(--bg-active)' : 'transparent'; }}>
                                    <Flag size={12} style={{ color: p.color }} />{p.label}
                                    {selectedTask.priority === p.value && <Check size={11} className="ml-auto" />}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Type */}
                      <div className="flex items-center py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-center gap-2 w-[110px] shrink-0">
                          <Tag size={13} style={{ color: 'var(--text-subtle)' }} />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Type</span>
                        </div>
                        <button onClick={() => patchTask({ taskType: selectedTask.taskType === 'issue' ? 'task' : 'issue' })}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold transition-opacity hover:opacity-70"
                          style={{ background: selectedTask.taskType === 'issue' ? 'rgba(216,114,125,0.12)' : 'rgba(34,197,94,0.10)', color: selectedTask.taskType === 'issue' ? '#D8727D' : '#22C55E' }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
                          {selectedTask.taskType === 'issue' ? 'Issue' : 'Task'}
                        </button>
                      </div>

                      {/* Status */}
                      <div className="flex items-center py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-center gap-2 w-[110px] shrink-0">
                          <Circle size={13} style={{ color: 'var(--text-subtle)' }} />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Status</span>
                        </div>
                        <div className="relative">
                          <button onClick={() => { setShowStatusDrop(v => !v); setShowPriorityPicker(false); setShowAssigneePicker(false); }}
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md hover:opacity-80 transition-opacity ${selStatusStyle.bg} ${selStatusStyle.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selStatusStyle.dot}`} />
                            {selStatusStyle.label}
                            <ChevronDown size={11} className={`transition-transform ${showStatusDrop ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {showStatusDrop && (
                              <motion.div className="absolute left-0 top-full mt-1 rounded-xl shadow-xl overflow-hidden z-20 w-52"
                                style={{ background: 'var(--bg-dropdown)', border: '1px solid var(--border-default)' }}
                                initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.13 }}>
                                {(Object.keys(statusStyles) as TaskStatus[]).map(s => {
                                  const st = statusStyles[s];
                                  const isActive = selectedTask.status === s;
                                  return (
                                    <button key={s}
                                      onClick={() => { patchTask({ status: s }); setShowStatusDrop(false); }}
                                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold transition-colors ${st.text}`}
                                      style={{ background: isActive ? 'var(--bg-active)' : 'transparent' }}
                                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'var(--bg-active)' : 'transparent'; }}>
                                      <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                                      {st.label}
                                      {isActive && <Check size={11} className="ml-auto text-primary-500" />}
                                    </button>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Due Date */}
                      <div className="flex items-center py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-center gap-2 w-[110px] shrink-0">
                          <Calendar size={13} style={{ color: 'var(--text-subtle)' }} />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Due Date</span>
                        </div>
                        {editingDueDate ? (
                          <input autoFocus type="date" defaultValue={selectedTask.dueDate ?? ''}
                            onBlur={e => { patchTask({ dueDate: e.target.value || undefined }); setEditingDueDate(false); }}
                            onKeyDown={e => { if (e.key === 'Escape') setEditingDueDate(false); }}
                            className="text-xs rounded-md px-2 py-1 focus:outline-none"
                            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--color-primary-400)' }} />
                        ) : (
                          <button onClick={() => setEditingDueDate(true)}
                            className="text-xs transition-opacity hover:opacity-70"
                            style={{ color: selectedTask.dueDate && selectedTask.dueDate < TODAY_VAL && selectedTask.status !== 'done' ? '#D8727D' : selectedTask.dueDate ? 'var(--text-secondary)' : 'var(--text-subtle)' }}>
                            {selectedTask.dueDate ?? 'Set due date'}
                          </button>
                        )}
                      </div>

                      {/* Assignees */}
                      <div className="flex items-start py-2.5">
                        <div className="flex items-center gap-2 w-[110px] shrink-0 mt-0.5">
                          <User size={13} style={{ color: 'var(--text-subtle)' }} />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Assignees</span>
                        </div>
                        <div className="relative flex-1" ref={assigneeDropRef}>
                          <button onClick={() => { setShowAssigneePicker(v => !v); setShowStatusDrop(false); setShowPriorityPicker(false); }}
                            className="flex items-center gap-2 flex-wrap">
                            {selectedTask.assignees.length === 0 ? (
                              <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>+ Add assignee</span>
                            ) : selectedTask.assignees.map(id => {
                              const member = members.find(m => m.id === id);
                              if (!member) return null;
                              return (
                                <div key={id} className="flex items-center gap-1.5">
                                  <Avatar name={member.name} color={getMemberColor(id)} size="sm" />
                                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{member.name.split(' ')[0]}</span>
                                </div>
                              );
                            })}
                          </button>
                          <AnimatePresence>
                            {showAssigneePicker && (
                              <motion.div className="absolute left-0 top-full mt-1 rounded-xl shadow-xl z-20 w-56 overflow-hidden"
                                style={{ background: 'var(--bg-dropdown)', border: '1px solid var(--border-default)' }}
                                initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.13 }}>
                                <div className="px-2.5 pt-2.5 pb-1.5">
                                  <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)' }}>
                                    <Search size={11} style={{ color: 'var(--text-subtle)' }} className="shrink-0" />
                                    <input type="text" value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)}
                                      placeholder="Search…" autoFocus
                                      className="flex-1 bg-transparent text-xs focus:outline-none"
                                      style={{ color: 'var(--text-primary)' }} />
                                    {assigneeSearch && <button onClick={() => setAssigneeSearch('')}><X size={10} style={{ color: 'var(--text-subtle)' }} /></button>}
                                  </div>
                                </div>
                                <div className="max-h-48 overflow-y-auto pb-1.5">
                                  {members.filter(m => m.name.toLowerCase().includes(assigneeSearch.toLowerCase())).map(m => {
                                    const isAssigned = selectedTask.assignees.includes(m.id);
                                    return (
                                      <button key={m.id}
                                        onClick={() => patchTask({ assignees: isAssigned ? selectedTask.assignees.filter(a => a !== m.id) : [...selectedTask.assignees, m.id] })}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                                        style={{ background: isAssigned ? 'var(--bg-active)' : 'transparent', color: 'var(--text-secondary)' }}
                                        onMouseEnter={e => { if (!isAssigned) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = isAssigned ? 'var(--bg-active)' : 'transparent'; }}>
                                        <Avatar name={m.name} color={getMemberColor(m.id)} size="sm" />
                                        <span className="flex-1 text-xs font-medium truncate">{m.name}</span>
                                        {isAssigned && <Check size={11} style={{ color: 'var(--color-primary-500)' }} />}
                                      </button>
                                    );
                                  })}
                                  {members.filter(m => m.name.toLowerCase().includes(assigneeSearch.toLowerCase())).length === 0 && (
                                    <p className="px-3 py-4 text-center text-xs" style={{ color: 'var(--text-subtle)' }}>No members found</p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mb-4" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                      {editingDesc ? (
                        <textarea autoFocus value={descDraft} onChange={e => setDescDraft(e.target.value)}
                          onBlur={() => { patchTask({ description: descDraft }); setEditingDesc(false); }}
                          rows={5} placeholder="Add description…"
                          className="w-full text-sm leading-relaxed bg-transparent focus:outline-none resize-none"
                          style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)' }} />
                      ) : (
                        <div onClick={() => { setDescDraft(selectedTask.description ?? ''); setEditingDesc(true); }}
                          className="cursor-text min-h-[40px]">
                          {selectedTask.description ? (
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{selectedTask.description}</p>
                          ) : (
                            <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
                              <AlignLeft size={14} /> Add description…
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Image gallery */}
                    <div className="mb-4" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                      {(selectedTask.images ?? []).length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {(selectedTask.images ?? []).map((img, i) => (
                            <button
                              key={i}
                              onClick={() => setLightboxIndex(i)}
                              className="h-20 rounded-lg overflow-hidden border border-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-400"
                            >
                              <img src={img} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                      <button onClick={() => detailFileRef.current?.click()}
                        className="flex items-center gap-3 px-1 py-2.5 text-sm w-full text-left transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                        <ImagePlus size={14} /> Upload image
                      </button>
                      <input ref={detailFileRef} type="file" accept="image/*" className="hidden" onChange={e => handleImagePick(e, url => {
                        if (selectedTask) updateTask(selectedTask.id, { images: [...(selectedTask.images ?? []), url] }).catch(console.error);
                      })} />
                    </div>

                    {/* Stats row */}
                    <div className="flex gap-5 mb-5" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{selectedTask.comments ?? 0}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Comments</span>
                      </div>
                      <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{selectedTask.files ?? 0}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Files</span>
                      </div>
                    </div>

                    {/* Delete */}
                    <div className="mt-auto pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      {confirmDelete ? (
                        <div className="flex gap-2">
                          <button onClick={() => { deleteTask(selectedTask.id).catch(console.error); setSelectedTask(null); setConfirmDelete(false); }}
                            className="flex-1 text-xs font-semibold py-2.5 rounded-xl text-white transition-colors"
                            style={{ background: '#D8727D' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#c5616b'}
                            onMouseLeave={e => e.currentTarget.style.background = '#D8727D'}>
                            Confirm delete
                          </button>
                          <button onClick={() => setConfirmDelete(false)}
                            className="flex-1 text-xs font-semibold py-2.5 rounded-xl transition-colors"
                            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-active)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-hover)'}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(true)}
                          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-xl transition-colors"
                          style={{ color: '#D8727D', background: 'rgba(216,114,125,0.06)', border: '1px solid rgba(216,114,125,0.2)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(216,114,125,0.12)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(216,114,125,0.06)'}>
                          <Trash2 size={13} /> Delete Task
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {detailTab === 'activity' && (
                  <div className="flex-1 overflow-y-auto px-5 py-5">
                    {(selectedTask.activity ?? []).length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 mt-12">
                        <Clock size={18} style={{ color: 'var(--text-subtle)', opacity: 0.4 }} />
                        <p className="text-xs font-medium" style={{ color: 'var(--text-subtle)' }}>No activity yet</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {[...(selectedTask.activity ?? [])].reverse().map(entry => (
                          <ActivityEntryRow key={entry.id} entry={entry} currentUserId={authUser?.id ?? ''} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Lightbox overlay */}
              <AnimatePresence>
                {lightboxIndex !== null && (selectedTask.images ?? []).length > 0 && (() => {
                  const imgs = selectedTask.images ?? [];
                  const total = imgs.length;
                  const prev = () => setLightboxIndex(i => i !== null ? (i - 1 + total) % total : 0);
                  const next = () => setLightboxIndex(i => i !== null ? (i + 1) % total : 0);
                  return (
                    <motion.div
                      ref={lightboxRef}
                      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setLightboxIndex(null)}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Escape') setLightboxIndex(null);
                        if (e.key === 'ArrowLeft') prev();
                        if (e.key === 'ArrowRight') next();
                      }}
                      tabIndex={0}
                      style={{ outline: 'none' }}
                    >
                      <img
                        src={imgs[lightboxIndex]}
                        alt={`Image ${lightboxIndex + 1}`}
                        className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain"
                        onClick={e => e.stopPropagation()}
                      />
                      {/* Close */}
                      <button
                        onClick={() => setLightboxIndex(null)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                      >
                        <X size={16} />
                      </button>
                      {/* Arrows */}
                      {total > 1 && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); prev(); }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); next(); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </>
                      )}
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Task Form Modal ── */}
      <AnimatePresence>
        {showTaskForm && (
          <TaskFormModal
            onClose={() => setShowTaskForm(false)}
            onSubmit={task => createTask(task)}
            defaultStatus="todo"
          />
        )}
      </AnimatePresence>

      {/* ── Bulk Action Bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center gap-4 shadow-2xl z-40">
          <span className="text-sm font-semibold">{selectedIds.size} selected</span>
          <div className="w-px h-4 bg-white/20" />
          <select
            className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1 focus:outline-none"
            defaultValue=""
            onChange={async e => {
              if (!e.target.value) return;
              const status = e.target.value;
              for (const id of selectedIds) {
                await moveTask(id, status as any);
              }
              setSelectedIds(new Set());
              e.target.value = '';
            }}
          >
            <option value="" disabled>Move to…</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="ready-for-qa">Ready for QA</option>
            <option value="deployment-pending">Deployment Pending</option>
            <option value="blocker">Blocker</option>
            <option value="on-hold">On Hold</option>
            <option value="done">Done</option>
          </select>
          <button
            onClick={() => setConfirmBulkDelete(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 size={13} /> Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Bulk Delete Confirm Dialog ── */}
      <ConfirmDialog
        open={confirmBulkDelete}
        title="Delete Tasks"
        message={`Delete ${selectedIds.size} task(s)? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          for (const id of selectedIds) await deleteTask(id);
          setSelectedIds(new Set());
          setConfirmBulkDelete(false);
        }}
        onCancel={() => setConfirmBulkDelete(false)}
      />
    </motion.div>
  );
};

export default TasksPage;
