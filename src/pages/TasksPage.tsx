import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckSquare, Clock, TrendingUp, AlertCircle, Plus, Download, X, ImagePlus, Calendar, User, Tag, ChevronDown, Pencil, Trash2, ArrowRight, Flag, UserPlus, UserMinus, FileText, Search, Layers, AlignLeft } from 'lucide-react';
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
  'on-hold':            { bg: 'bg-[#EAB30820]',    text: 'text-[#EAB308]',   label: 'On Hold',            dot: 'bg-[#EAB308]' },
  'done':               { bg: 'bg-[#83C29D33]',    text: 'text-[#68B266]',   label: 'Done',               dot: 'bg-[#68B266]' },
};

const tabs = ['All', 'To Do', 'In Progress', 'Ready for QA', 'Deployment Pending', 'Blocker', 'On Hold', 'Done'];

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assigneeDropRef.current && !assigneeDropRef.current.contains(e.target as Node)) {
        setShowAssigneeDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const detailFileRef = useRef<HTMLInputElement>(null);
  const [detailImage, setDetailImage] = useState<string | null>(null);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('low');
  const [editTaskType, setEditTaskType] = useState<'task' | 'issue'>('task');
  const [editAssignees, setEditAssignees] = useState<string[]>([]);
  const [editDueDate, setEditDueDate] = useState('');
  const [editProjectId, setEditProjectId] = useState('');
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showAssigneeDrop, setShowAssigneeDrop] = useState(false);
  const assigneeDropRef = useRef<HTMLDivElement>(null);

  // Delete confirmation state
  const [confirmDelete, setConfirmDelete] = useState(false);

  const totalTasks = allTasks.length;

  const tabStatusMap: (TaskStatus | null)[] = [null, 'todo', 'in-progress', 'ready-for-qa', 'deployment-pending', 'blocker', 'on-hold', 'done'];
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
    setEditPriority(task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low');
    setEditTaskType(task.taskType === 'issue' ? 'issue' : 'task');
    setEditAssignees([...task.assignees]);
    setEditDueDate(task.dueDate ?? '');
    setEditProjectId(task.projectId ?? '');
    setAssigneeSearch('');
    setShowAssigneeDrop(false);
    setEditMode(true);
  };

  const saveEdit = () => {
    if (!selectedTask) return;
    const changes = {
      title: editTitle.trim() || selectedTask.title,
      description: editDesc,
      priority: editPriority as Task['priority'],
      taskType: editTaskType,
      assignees: editAssignees,
      dueDate: editDueDate || undefined,
      projectId: editProjectId || undefined,
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
                    <th key={h} className={`px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50${h === 'Task' ? ' w-[35%]' : ''}`}>{h}</th>
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
            <div className="flex-1 bg-black/30" onClick={() => { setSelectedTask(null); setEditMode(false); setConfirmDelete(false); setShowAssigneeDrop(false); }} />
            <motion.div
              className="w-[400px] bg-white h-full flex flex-col border-l border-gray-200"
              initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  <CheckSquare size={14} className="text-primary-500" />
                  <span className="text-xs font-semibold text-gray-500">{editMode ? 'Edit Task' : 'Task Detail'}</span>
                </div>
                <div className="flex items-center gap-1">
                  {!editMode && (
                    <button onClick={() => startEdit(selectedTask)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors">
                      <Pencil size={11} /> Edit
                    </button>
                  )}
                  <button onClick={() => { setSelectedTask(null); setEditMode(false); setConfirmDelete(false); setShowAssigneeDrop(false); }}
                    className="ml-1 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex border-b border-gray-100 shrink-0">
                {(['details', 'activity'] as const).map(tab => (
                  <button key={tab} onClick={() => setDetailTab(tab)}
                    className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-all relative ${
                      detailTab === tab ? 'text-primary-600' : 'text-gray-400 hover:text-gray-500'
                    }`}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {detailTab === tab && (
                      <motion.div layoutId="detail-tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary-500"
                        transition={{ duration: 0.2 }} />
                    )}
                  </button>
                ))}
              </div>

              {detailTab === 'details' && (
                <div className="flex-1 overflow-y-auto">

                  {/* Title + project */}
                  <div className="px-5 py-4 border-b border-gray-100">
                    {editMode ? (
                      <input
                        value={editTitle} onChange={e => setEditTitle(e.target.value)}
                        className="w-full font-semibold text-gray-900 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                        placeholder="Task title"
                      />
                    ) : (
                      <>
                        <h2 className="font-semibold text-gray-900 text-sm leading-snug">{selectedTask.title}</h2>
                        {(() => {
                          const proj = contextProjects.find(p => p.id === selectedTask.projectId);
                          return proj ? (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: proj.color }} />
                              <span className="text-xs text-gray-400">{proj.name}</span>
                            </div>
                          ) : null;
                        })()}
                      </>
                    )}
                  </div>

                  {/* Metadata rows */}
                  <div className="px-5 py-3 border-b border-gray-100 flex flex-col gap-3">

                    {/* Priority */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5"><Flag size={10} /> Priority</span>
                      {editMode ? (
                        <div className="flex gap-1.5">
                          {([
                            { value: 'low',    color: '#D58D49', activeCls: 'bg-[#DFA87415] text-[#D58D49] border-[#D58D4940]' },
                            { value: 'medium', color: '#A78BFA', activeCls: 'bg-[#A78BFA15] text-[#A78BFA] border-[#A78BFA40]' },
                            { value: 'high',   color: '#D8727D', activeCls: 'bg-[#D8727D15] text-[#D8727D] border-[#D8727D40]' },
                          ] as const).map(p => {
                            const active = editPriority === p.value;
                            return (
                              <button key={p.value} type="button" onClick={() => setEditPriority(p.value)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${active ? p.activeCls : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? p.color : 'var(--border-strong)' }} />
                                {p.value.charAt(0).toUpperCase() + p.value.slice(1)}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${(priorityStyles[selectedTask.priority] ?? priorityStyles.low).bg} ${(priorityStyles[selectedTask.priority] ?? priorityStyles.low).text}`}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
                          {(priorityStyles[selectedTask.priority] ?? priorityStyles.low).label}
                        </span>
                      )}
                    </div>

                    {/* Type */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5"><Tag size={10} /> Type</span>
                      {editMode ? (
                        <div className="flex gap-1.5">
                          {([
                            { value: 'task',  label: 'Task',  activeCls: 'bg-[#22C55E15] text-[#22C55E] border-[#22C55E40]', color: '#22C55E' },
                            { value: 'issue', label: 'Issue', activeCls: 'bg-[#EF444415] text-[#EF4444] border-[#EF444440]', color: '#EF4444' },
                          ] as const).map(t => {
                            const active = editTaskType === t.value;
                            return (
                              <button key={t.value} type="button" onClick={() => setEditTaskType(t.value)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${active ? t.activeCls : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? t.color : 'var(--border-strong)' }} />
                                {t.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${selectedTask.taskType === 'issue' ? 'bg-[#EF444420] text-[#EF4444]' : 'bg-[#22C55E20] text-[#22C55E]'}`}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
                          {selectedTask.taskType === 'issue' ? 'Issue' : 'Task'}
                        </span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5"><Tag size={10} /> Status</span>
                      <div className="relative">
                        <button onClick={() => setShowStatusDrop(v => !v)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all hover:opacity-80 ${selectedStatusStyle.bg} ${selectedStatusStyle.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusStyles[selectedStatus]?.dot}`} />
                          {selectedStatusStyle.label}
                          <ChevronDown size={10} className={`ml-0.5 transition-transform ${showStatusDrop ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {showStatusDrop && (
                            <motion.div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden z-20 w-44"
                              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}>
                              <div className="py-1">
                                {(Object.keys(statusStyles) as TaskStatus[]).map(s => {
                                  const st = statusStyles[s];
                                  const isSelected = selectedTask.status === s;
                                  return (
                                    <button key={s}
                                      onClick={() => { updateTask(selectedTask.id, { status: s }).catch(console.error); setSelectedTask(prev => prev ? { ...prev, status: s } : prev); setShowStatusDrop(false); }}
                                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-colors ${isSelected ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
                                      <span className={st.text}>{st.label}</span>
                                      {isSelected && <span className="ml-auto text-primary-500 text-[10px]">✓</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5"><Calendar size={10} /> Due Date</span>
                      {editMode ? (
                        <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)}
                          className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-primary-400 bg-white font-medium text-gray-700" />
                      ) : (
                        <span className={`text-xs font-medium ${selectedTask.dueDate ? 'text-gray-700' : 'text-gray-400'}`}>
                          {selectedTask.dueDate ?? '—'}
                        </span>
                      )}
                    </div>

                    {/* Project (edit mode) */}
                    {editMode && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5"><Layers size={10} /> Project</span>
                        <div className="relative">
                          <select value={editProjectId} onChange={e => setEditProjectId(e.target.value)}
                            className="appearance-none border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-primary-400 bg-white pr-5 font-medium text-gray-700">
                            <option value="">No project</option>
                            {contextProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assignees */}
                  <div className="px-5 py-3 border-b border-gray-100">
                    <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5 mb-2.5"><User size={10} /> Assignees</span>
                    {editMode ? (
                      <div ref={assigneeDropRef} className="relative">
                        {editAssignees.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {editAssignees.map(id => {
                              const m = members.find(x => x.id === id);
                              if (!m) return null;
                              return (
                                <div key={id} className="flex items-center gap-1 bg-gray-100 rounded-md pl-1 pr-1.5 py-0.5">
                                  <Avatar name={m.name} color={getMemberColor(id)} size="sm" />
                                  <span className="text-xs font-medium text-gray-700">{m.name.split(' ')[0]}</span>
                                  <button onClick={() => setEditAssignees(prev => prev.filter(a => a !== id))}
                                    className="ml-0.5 text-gray-400 hover:text-gray-600 transition-colors">
                                    <X size={9} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <button onClick={() => setShowAssigneeDrop(v => !v)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                            showAssigneeDrop ? 'border-primary-400 bg-white ring-1 ring-primary-100 text-gray-700' : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300'
                          }`}>
                          <Search size={12} className="text-gray-400 shrink-0" />
                          <span className="flex-1 text-left">{editAssignees.length > 0 ? `${editAssignees.length} assigned` : 'Assign members…'}</span>
                          <ChevronDown size={11} className={`text-gray-400 transition-transform ${showAssigneeDrop ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {showAssigneeDrop && (
                            <motion.div className="absolute left-0 top-full mt-1 w-full bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-gray-100 z-30 overflow-hidden"
                              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}>
                              <div className="px-2.5 pt-2.5 pb-1.5">
                                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus-within:border-primary-400 transition-all">
                                  <Search size={11} className="text-gray-400 shrink-0" />
                                  <input type="text" value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)}
                                    placeholder="Search…" autoFocus
                                    className="flex-1 bg-transparent text-xs text-gray-700 placeholder-gray-400 focus:outline-none" />
                                  {assigneeSearch && <button onClick={() => setAssigneeSearch('')}><X size={10} className="text-gray-400" /></button>}
                                </div>
                              </div>
                              <div className="max-h-40 overflow-y-auto pb-1.5">
                                {members.filter(m => m.name.toLowerCase().includes(assigneeSearch.toLowerCase())).map(m => {
                                  const selected = editAssignees.includes(m.id);
                                  return (
                                    <button key={m.id}
                                      onClick={() => setEditAssignees(prev => selected ? prev.filter(a => a !== m.id) : [...prev, m.id])}
                                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${selected ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                                      <Avatar name={m.name} color={getMemberColor(m.id)} size="sm" />
                                      <span className="flex-1 text-xs font-medium text-gray-800 truncate">{m.name}</span>
                                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${selected ? 'bg-primary-500 border-primary-500' : 'border-gray-300'}`}>
                                        {selected && (
                                          <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                                            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                                {members.filter(m => m.name.toLowerCase().includes(assigneeSearch.toLowerCase())).length === 0 && (
                                  <p className="px-3 py-4 text-center text-xs text-gray-400">No members found</p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTask.assignees.length === 0 && <span className="text-xs text-gray-400">—</span>}
                        {selectedTask.assignees.map(id => {
                          const member = members.find(m => m.id === id);
                          if (!member) return null;
                          return (
                            <div key={id} className="flex items-center gap-1.5 bg-gray-100 rounded-md px-2 py-1">
                              <Avatar name={member.name} color={getMemberColor(id)} size="sm" />
                              <span className="text-xs font-medium text-gray-700">{member.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="px-5 py-3 border-b border-gray-100">
                    <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5 mb-2"><AlignLeft size={10} /> Description</span>
                    {editMode ? (
                      <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 resize-none transition-all leading-relaxed"
                        placeholder="Add notes or context…" />
                    ) : (
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {selectedTask.description || <span className="text-gray-400 italic">No description.</span>}
                      </p>
                    )}
                  </div>

                  {/* Edit save/cancel */}
                  {editMode && (
                    <div className="px-5 py-3 border-b border-gray-100 flex gap-2">
                      <button onClick={() => { setEditMode(false); setShowAssigneeDrop(false); }}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                        Cancel
                      </button>
                      <button onClick={saveEdit}
                        className="flex-[2] py-2 rounded-lg text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors">
                        Save Changes
                      </button>
                    </div>
                  )}

                  {/* Attachment */}
                  {!editMode && (
                    <div className="px-5 py-3 border-b border-gray-100">
                      <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5 mb-2"><ImagePlus size={10} /> Attachment</span>
                      {detailImage ? (
                        <div className="relative rounded-lg overflow-hidden">
                          <img src={detailImage} alt="attachment" className="w-full h-36 object-cover" />
                          <button onClick={() => setDetailImage(null)}
                            className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors">
                            <X size={11} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => detailFileRef.current?.click()}
                          className="w-full h-16 border border-dashed border-gray-200 rounded-lg flex items-center justify-center gap-2 text-gray-400 hover:border-primary-300 hover:text-primary-400 hover:bg-primary-50/20 transition-all text-xs font-medium">
                          <ImagePlus size={14} /> Upload image
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
                    <div className="px-5 py-3 border-b border-gray-100 flex gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-gray-800">{selectedTask.comments}</span>
                        <span className="text-[11px] text-gray-400">Comments</span>
                      </div>
                      <div className="w-px bg-gray-100" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-gray-800">{selectedTask.files}</span>
                        <span className="text-[11px] text-gray-400">Files</span>
                      </div>
                    </div>
                  )}

                  {/* Delete */}
                  {!editMode && (
                    <div className="px-5 py-3">
                      {confirmDelete ? (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex flex-col gap-2.5">
                          <p className="text-xs font-semibold text-gray-700 text-center">Delete this task?</p>
                          <div className="flex gap-2">
                            <button onClick={() => setConfirmDelete(false)}
                              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
                              Keep it
                            </button>
                            <button onClick={() => { deleteTask(selectedTask.id).catch(console.error); setSelectedTask(null); setConfirmDelete(false); }}
                              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#D8727D] hover:bg-[#c4636d] transition-colors">
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(true)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-[#D8727D] border border-[#D8727D20] hover:bg-red-50 transition-all">
                          <Trash2 size={12} /> Delete Task
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'activity' && (
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {(selectedTask.activity ?? []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 mt-12 text-gray-400">
                      <Clock size={18} className="opacity-30" />
                      <p className="text-xs font-medium text-gray-400">No activity yet</p>
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
