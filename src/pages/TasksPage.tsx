import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckSquare, Clock, TrendingUp, AlertCircle, Plus, Download, X, ImagePlus, Calendar, User, Tag, ChevronDown, Pencil, Trash2, ArrowRight, Flag, UserPlus, UserMinus, FileText } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { AvatarGroup } from '../components/ui/Avatar';
import { Task, TaskStatus, TaskActivityEntry } from '../types';
import { useProjects } from '../context/ProjectContext';
import { useMembersContext } from '../context/MembersContext';
import { useAuth } from '../context/AuthContext';
import TaskFormModal from '../components/modals/TaskFormModal';
import { downloadCsv } from '../utils/exportCsv';


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
  'todo':               { bg: 'bg-primary-50',     text: 'text-primary-600',  label: 'To Do',              dot: 'bg-primary-500' },
  'in-progress':        { bg: 'bg-[#FFA50020]',    text: 'text-[#FFA500]',   label: 'In Progress',        dot: 'bg-[#FFA500]' },
  'ready-for-qa':       { bg: 'bg-[#30C5E520]',    text: 'text-[#30C5E5]',   label: 'Ready for QA',       dot: 'bg-[#30C5E5]' },
  'deployment-pending': { bg: 'bg-[#9C27B020]',    text: 'text-[#9C27B0]',   label: 'Deployment Pending', dot: 'bg-[#9C27B0]' },
  'blocker':            { bg: 'bg-[#D8727D22]',    text: 'text-[#D8727D]',   label: 'Blocker',            dot: 'bg-[#D8727D]' },
  'done':               { bg: 'bg-[#83C29D33]',    text: 'text-[#68B266]',   label: 'Done',               dot: 'bg-[#68B266]' },
};

const tabs = ['All', 'To Do', 'In Progress', 'Ready for QA', 'Deployment Pending', 'Blocker', 'Done'];

const TasksPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projects: contextProjects, allTasks, createTask, updateTask, deleteTask } = useProjects();
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
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const detailFileRef = useRef<HTMLInputElement>(null);
  const [detailImage, setDetailImage] = useState<string | null>(null);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'high'>('low');
  const [editAssignees, setEditAssignees] = useState<string[]>([]);
  const [editDueDate, setEditDueDate] = useState('');

  // Delete confirmation state
  const [confirmDelete, setConfirmDelete] = useState(false);

  const totalTasks = allTasks.length;

  const tabStatusMap: (TaskStatus | null)[] = [null, 'todo', 'in-progress', 'ready-for-qa', 'deployment-pending', 'blocker', 'done'];
  const tabTasks = activeTab === 0 ? allTasks : allTasks.filter(t => t.status === tabStatusMap[activeTab]);

  const filteredTasks = searchQuery.trim()
    ? tabTasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : tabTasks;

  const doneCount = allTasks.filter(t => t.status === 'done').length;
  const todoCount = allTasks.filter(t => t.status === 'todo').length;
  const inProgCount = allTasks.filter(t => t.status === 'in-progress').length;

  const TODAY_STR = new Date().toISOString().split('T')[0];
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

  const startEdit = (task: Task) => {
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditPriority(task.priority === 'high' ? 'high' : 'low');
    setEditAssignees([...task.assignees]);
    setEditDueDate(task.dueDate ?? '');
    setEditMode(true);
  };

  const saveEdit = () => {
    if (!selectedTask) return;
    const changes = {
      title: editTitle.trim() || selectedTask.title,
      description: editDesc,
      priority: editPriority as Task['priority'],
      assignees: editAssignees,
      dueDate: editDueDate || undefined,
    };
    updateTask(selectedTask.id, changes).catch(console.error);
    setSelectedTask(prev => prev ? { ...prev, ...changes } : prev);
    setEditMode(false);
  };

  const selectedStatus = selectedTask ? selectedTask.status : 'todo';
  const selectedStatusStyle = statusStyles[selectedStatus];

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
                <motion.button onClick={handleExport} className="flex items-center gap-2 bg-white text-gray-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-surface-100 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Download size={16} /> Export
                </motion.button>
                <motion.button onClick={() => setShowTaskForm(true)} className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
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
                    <button key={t} onClick={() => setActiveTab(i)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === i ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      {t} ({count})
                    </button>
                  );
                })}
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
            <div className="flex-1 overflow-y-auto min-h-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100">
                  {['Task', 'Project', 'Priority', 'Assignees', 'Due', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
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
                      onClick={() => { setSelectedTask(task); setDetailImage(null); setShowStatusDrop(false); setEditMode(false); setConfirmDelete(false); }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 text-xs">{task.title}</div>
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
                        <span className={`text-xs font-semibold text-gray-400`}>{task.dueDate ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>{status.label}</span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Task Detail Panel ── */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            className="fixed inset-0 top-16 z-50 flex"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="flex-1 bg-black/30" onClick={() => { setSelectedTask(null); setEditMode(false); setConfirmDelete(false); }} />
            <motion.div
              className="w-[420px] bg-white h-full overflow-y-auto border-l border-surface-200 flex flex-col"
              initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Task Detail</span>
                <div className="flex items-center gap-2">
                  {!editMode && (
                    <button
                      onClick={() => startEdit(selectedTask)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-surface-100 hover:text-gray-600 transition-colors"
                      title="Edit task"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  <button onClick={() => { setSelectedTask(null); setEditMode(false); setConfirmDelete(false); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-surface-100 hover:text-gray-600 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex border-b border-surface-100 shrink-0">
                {(['details', 'activity'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                      detailTab === tab
                        ? 'text-primary-600 border-b-2 border-primary-500'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {detailTab === 'details' && (
              <div className="flex-1 px-5 py-4 flex flex-col gap-4">
                {/* Title + priority */}
                <div>
                  {editMode ? (
                    <div className="flex flex-col gap-2 mb-1.5">
                      <input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="font-bold text-gray-900 text-base leading-snug border border-surface-200 rounded-xl px-3 py-2 focus:outline-none focus:border-primary-400"
                        placeholder="Task title"
                      />
                      <div className="flex gap-2">
                        {(['low', 'high'] as const).map(p => (
                          <button
                            key={p} type="button"
                            onClick={() => setEditPriority(p)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                              editPriority === p
                                ? p === 'high'
                                  ? 'bg-[#D8727D22] text-[#D8727D] ring-1 ring-[#D8727D]'
                                  : 'bg-[#DFA87433] text-[#D58D49] ring-1 ring-[#D58D49]'
                                : 'bg-surface-100 text-gray-500 hover:bg-surface-200'
                            }`}
                          >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h2 className="font-bold text-gray-900 text-base leading-snug">{selectedTask.title}</h2>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md shrink-0 ${(priorityStyles[selectedTask.priority] ?? priorityStyles.low).bg} ${(priorityStyles[selectedTask.priority] ?? priorityStyles.low).text}`}>
                        {(priorityStyles[selectedTask.priority] ?? priorityStyles.low).label}
                      </span>
                    </div>
                  )}
                  {/* Project */}
                  {(() => {
                    const proj = contextProjects.find(p => p.id === selectedTask.projectId);
                    return proj ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color }} />
                        <span className="text-xs text-gray-400">{proj.name}</span>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Status updater */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1"><Tag size={11} /> Status</div>
                  <div className="relative">
                    <button
                      onClick={() => setShowStatusDrop(v => !v)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border ${selectedStatusStyle.bg} ${selectedStatusStyle.text} border-transparent hover:opacity-80 transition-opacity`}
                    >
                      {selectedStatusStyle.label}
                      <ChevronDown size={12} className={`transition-transform ${showStatusDrop ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showStatusDrop && (
                        <motion.div
                          className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-card-hover border border-surface-100 overflow-hidden z-10 w-52"
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                        >
                          {(Object.keys(statusStyles) as TaskStatus[]).map(s => {
                            const st = statusStyles[s];
                            return (
                              <button
                                key={s}
                                onClick={() => {
                                  updateTask(selectedTask.id, { status: s }).catch(console.error);
                                  setSelectedTask(prev => prev ? { ...prev, status: s } : prev);
                                  setShowStatusDrop(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold hover:bg-surface-50 transition-colors"
                              >
                                <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                                <span className={st.text}>{st.label}</span>
                                {selectedTask.status === s && <span className="ml-auto text-primary-500">✓</span>}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Assignees */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1"><User size={11} /> Assignees</div>
                  {editMode ? (
                    <div className="flex flex-col gap-1 max-h-36 overflow-y-auto border border-surface-200 rounded-xl p-2">
                      {members.map(m => (
                        <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editAssignees.includes(m.id)}
                            onChange={() => setEditAssignees(prev => prev.includes(m.id) ? prev.filter(a => a !== m.id) : [...prev, m.id])}
                            className="rounded text-primary-500"
                          />
                          <Avatar name={m.name} color={getMemberColor(m.id)} size="sm" />
                          <span className="text-xs text-gray-700">{m.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedTask.assignees.map(id => {
                        const member = members.find(m => m.id === id);
                        if (!member) return null;
                        const color = getMemberColor(id);
                        return (
                          <div key={id} className="flex items-center gap-1.5 bg-surface-100 rounded-full px-2.5 py-1">
                            <Avatar name={member.name} color={color} size="sm" />
                            <span className="text-xs font-semibold text-gray-700">{member.name.split(' ')[0]}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Due date */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-1 flex items-center gap-1"><Calendar size={11} /> Due Date</div>
                  {editMode ? (
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={e => setEditDueDate(e.target.value)}
                      className="border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
                    />
                  ) : (
                    selectedTask.dueDate ? (
                      <span className="text-sm font-semibold text-gray-700">{selectedTask.dueDate}</span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )
                  )}
                </div>

                {/* Description */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-1.5">Description</div>
                  {editMode ? (
                    <textarea
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      rows={4}
                      className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-400 resize-none"
                      placeholder="Describe the task…"
                    />
                  ) : (
                    <p className="text-sm text-gray-600 leading-relaxed">{selectedTask.description || 'No description provided.'}</p>
                  )}
                </div>

                {/* Edit save/cancel buttons */}
                {editMode && (
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold text-gray-500 bg-surface-100 hover:bg-surface-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Attachment */}
                {!editMode && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 mb-1.5">Attachment</div>
                    {detailImage ? (
                      <div className="relative rounded-xl overflow-hidden">
                        <img src={detailImage} alt="attachment" className="w-full h-40 object-cover rounded-xl" />
                        <button
                          onClick={() => setDetailImage(null)}
                          className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => detailFileRef.current?.click()}
                        className="w-full h-24 border-2 border-dashed border-surface-300 rounded-xl flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-primary-300 hover:text-primary-400 transition-colors"
                      >
                        <ImagePlus size={20} />
                        <span className="text-xs font-medium">Upload image</span>
                      </button>
                    )}
                    <input ref={detailFileRef} type="file" accept="image/*" className="hidden" onChange={e => handleImagePick(e, (url) => {
                      setDetailImage(url);
                      if (selectedTask) updateTask(selectedTask.id, { images: [...(selectedTask.images ?? []), url] }).catch(console.error);
                    })} />
                  </div>
                )}

                {/* Stats */}
                {!editMode && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-surface-50 rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-gray-900">{selectedTask.comments}</div>
                      <div className="text-[10px] text-gray-400">Comments</div>
                    </div>
                    <div className="bg-surface-50 rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-gray-900">{selectedTask.files}</div>
                      <div className="text-[10px] text-gray-400">Files</div>
                    </div>
                  </div>
                )}

                {/* Delete section */}
                {!editMode && (
                  <div className="pt-2 border-t border-surface-100">
                    {confirmDelete ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-gray-500 text-center">Are you sure you want to delete this task?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              deleteTask(selectedTask.id).catch(console.error);
                              setSelectedTask(null);
                              setConfirmDelete(false);
                            }}
                            className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-[#D8727D] hover:bg-[#c4636d] transition-colors"
                          >
                            Confirm delete
                          </button>
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="flex-1 py-2 rounded-xl text-sm font-semibold text-gray-500 bg-surface-100 hover:bg-surface-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-[#D8727D] hover:bg-[#D8727D11] transition-colors"
                      >
                        <Trash2 size={14} /> Delete task
                      </button>
                    )}
                  </div>
                )}
              </div>
              )}

              {detailTab === 'activity' && (
                <div className="flex-1 overflow-y-auto p-4">
                  {(selectedTask.activity ?? []).length === 0 ? (
                    <p className="text-xs text-gray-400 text-center mt-8">No activity yet.</p>
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
          </motion.div>
        )}
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
    </motion.div>
  );
};

export default TasksPage;
