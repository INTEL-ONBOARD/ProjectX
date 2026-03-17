import React, { useState, useRef, useEffect } from 'react';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Tag, User, Calendar, ChevronDown, ImagePlus,
  Check, Edit3, Trash2, MessageSquare, Send,
  ArrowRight, Flag, UserPlus, UserMinus, FileText, Plus, Pencil, FolderPlus,
  Download, Paperclip,
} from 'lucide-react';
import { Task, TaskStatus, TaskActivityEntry, Comment, Attachment } from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { useMembersContext } from '../../context/MembersContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar, AvatarGroup } from '../ui/Avatar';
import KanbanColumn from './KanbanColumn';
import TaskFormModal from '../modals/TaskFormModal';
import NewProjectModal from '../modals/NewProjectModal';
const TODAY = new Date().toISOString().split('T')[0];
const WEEK_START = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split('T')[0]; })();
const WEEK_END   = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 7); return d.toISOString().split('T')[0]; })();

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

const statusStyles: Record<TaskStatus, { bg: string; text: string; label: string; dot: string }> = {
  'todo':               { bg: 'bg-primary-50',     text: 'text-primary-600',  label: 'To Do',              dot: 'bg-primary-500' },
  'in-progress':        { bg: 'bg-[#FFA50020]',    text: 'text-[#FFA500]',   label: 'In Progress',        dot: 'bg-[#FFA500]' },
  'ready-for-qa':       { bg: 'bg-[#30C5E520]',    text: 'text-[#30C5E5]',   label: 'Ready for QA',       dot: 'bg-[#30C5E5]' },
  'deployment-pending': { bg: 'bg-[#9C27B020]',    text: 'text-[#9C27B0]',   label: 'Deployment Pending', dot: 'bg-[#9C27B0]' },
  'blocker':            { bg: 'bg-[#D8727D22]',    text: 'text-[#D8727D]',   label: 'Blocker',            dot: 'bg-[#D8727D]' },
  'on-hold':            { bg: 'bg-[#EAB30820]',    text: 'text-[#EAB308]',   label: 'On Hold',            dot: 'bg-[#EAB308]' },
  'done':               { bg: 'bg-[#83C29D33]',    text: 'text-[#68B266]',   label: 'Done',               dot: 'bg-[#68B266]' },
};
const priorityStyles: Record<string, { bg: string; text: string; label: string }> = {
  low:       { bg: 'bg-[#DFA87433]', text: 'text-[#D58D49]', label: 'Low' },
  high:      { bg: 'bg-[#D8727D33]', text: 'text-[#D8727D]', label: 'High' },
  completed: { bg: 'bg-[#83C29D33]', text: 'text-[#68B266]', label: 'Completed' },
};

const dbApi = () => (window as any).electronAPI.db;

function fmtSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

interface Filters {
  priority: string;
  assignees: string[];
  dueDateFilter: string;
}

interface KanbanBoardProps {
  filters?: Filters;
  todayMode?: boolean;
  viewMode?: 'grid' | 'list';
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ filters, todayMode, viewMode = 'grid' }) => {
  const { allTasks, moveTask, updateTask, deleteTask, createTask, createProject, projects, activeProject } = useProjects();
  const { members, getMemberColor } = useMembersContext();
  const { user: authUser } = useAuth() ?? { user: null };

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailTab, setDetailTab] = useState<'details' | 'activity'>('details');
  const [editMode, setEditMode] = useState(false);
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [formDefaultStatus, setFormDefaultStatus] = useState<TaskStatus>('todo');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [detailImage, setDetailImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Edit state
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('low');
  const [editTaskType, setEditTaskType] = useState<'task' | 'issue'>('task');
  const [editAssignees, setEditAssignees] = useState<string[]>([]);
  const [editDueDate, setEditDueDate] = useState('');

  const [showNewProject, setShowNewProject] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    for (const col of columns) {
      const colTasks = applyFilters(allTasks.filter(t => t.status === col.status && t.projectId === activeProject));
      const oldIndex = colTasks.findIndex(t => t.id === active.id);
      const newIndex = colTasks.findIndex(t => t.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(colTasks, oldIndex, newIndex);
        for (let i = 0; i < reordered.length; i++) {
          if (reordered[i].order !== i) {
            await updateTask(reordered[i].id, { order: i });
          }
        }
        break;
      }
    }
  };

  useEffect(() => {
    if (!selectedTask) return;
    setLoadingComments(true);
    dbApi().getComments(selectedTask.id).then((data: any) => {
      setComments(data as Comment[]);
      setLoadingComments(false);
    });
  }, [selectedTask?.id]);

  useEffect(() => {
    if (!selectedTask) return;
    dbApi().getAttachments(selectedTask.id).then((data: any) => setAttachments(data as Attachment[]));
  }, [selectedTask?.id]);

  const openTask = (task: Task) => {
    setSelectedTask(task);
    setEditMode(false);
    setConfirmDelete(false);
    setShowStatusDrop(false);
    setComments([]);
    setCommentInput('');
    setDetailImage(null);
    setDetailTab('details');
  };

  const startEdit = (task: Task) => {
    setEditTitle(task.title);
    setEditDesc(task.description ?? '');
    setEditPriority(task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low');
    setEditTaskType(task.taskType === 'issue' ? 'issue' : 'task');
    setEditAssignees([...task.assignees]);
    setEditDueDate(task.dueDate ?? '');
    setEditMode(true);
  };

  const saveEdit = () => {
    if (!selectedTask) return;
    updateTask(selectedTask.id, {
      title: editTitle,
      description: editDesc,
      priority: editPriority,
      taskType: editTaskType,
      assignees: editAssignees,
      dueDate: editDueDate || undefined,
    }).catch(console.error);
    setSelectedTask(prev => prev ? { ...prev, title: editTitle, description: editDesc, priority: editPriority, taskType: editTaskType, assignees: editAssignees, dueDate: editDueDate || undefined } : prev);
    setEditMode(false);
  };

  const handleDelete = () => {
    if (!selectedTask) return;
    deleteTask(selectedTask.id).catch(console.error);
    setSelectedTask(null);
    setConfirmDelete(false);
  };

  const handleAddComment = async () => {
    if (!commentInput.trim() || !selectedTask || !authUser) return;
    const newComment = await dbApi().addComment({
      taskId: selectedTask.id,
      authorId: authUser.id,
      authorName: authUser.name,
      text: commentInput.trim(),
    }) as Comment;
    setComments(prev => [...prev, newComment]);
    setCommentInput('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setDetailImage(dataUrl);
      updateTask(selectedTask.id, { images: [...(selectedTask.images ?? []), dataUrl] }).catch(console.error);
    };
    reader.readAsDataURL(file);
  };

  const applyFilters = (tasks: Task[]): Task[] => {
    if (!filters) return tasks;
    return tasks.filter(t => {
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
      if (filters.assignees.length > 0 && !filters.assignees.some(id => t.assignees.includes(id))) return false;
      if (filters.dueDateFilter === 'today' && t.dueDate !== TODAY) return false;
      if (filters.dueDateFilter === 'week' && (!t.dueDate || t.dueDate < WEEK_START || t.dueDate > WEEK_END)) return false;
      if (filters.dueDateFilter === 'overdue' && (t.dueDate === undefined || t.dueDate >= TODAY || t.status === 'done')) return false;
      return true;
    });
  };

  const columns: { title: string; status: TaskStatus; dotColor: string; lineColor: string }[] = [
    { title: 'To Do',               status: 'todo',               dotColor: '#5030E5', lineColor: '#5030E5' },
    { title: 'In Progress',         status: 'in-progress',        dotColor: '#FFA500', lineColor: '#FFA500' },
    { title: 'Ready for QA',        status: 'ready-for-qa',       dotColor: '#30C5E5', lineColor: '#30C5E5' },
    { title: 'Deployment Pending',  status: 'deployment-pending', dotColor: '#9C27B0', lineColor: '#9C27B0' },
    { title: 'Blocker',             status: 'blocker',            dotColor: '#D8727D', lineColor: '#D8727D' },
    { title: 'On Hold',             status: 'on-hold',            dotColor: '#EAB308', lineColor: '#EAB308' },
    { title: 'Done',                status: 'done',               dotColor: '#8BC34A', lineColor: '#8BC34A' },
  ];

  const currentStatus = selectedTask ? (selectedTask.status) : 'todo';
  const currentStatusStyle = statusStyles[currentStatus];
  const proj = selectedTask ? projects.find(p => p.id === selectedTask.projectId) : null;

  const projectTasks = applyFilters(allTasks.filter(t => t.projectId === activeProject));


  if (projects.length === 0) {
    return (
      <>
        <div className="flex-1 min-h-0 flex items-center justify-center -mt-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center gap-6 max-w-sm w-full"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center">
              <FolderPlus size={28} className="text-primary-500" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900">No projects yet</h2>
              <p className="text-sm text-gray-400 mt-1">Create your first project to start organizing tasks</p>
            </div>
            <button
              onClick={() => setShowNewProject(true)}
              className="px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors"
            >
              + Create Project
            </button>
          </motion.div>
        </div>
        <AnimatePresence>
          {showNewProject && (
            <NewProjectModal
              onClose={() => setShowNewProject(false)}
              onSubmit={async (name, color, rich) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const db = (window as any).electronAPI.db;
                const proj = await createProject(name, color);
                if (proj?.id) {
                  await db.setProjectRich({ projectId: proj.id, description: rich.description, status: rich.status, priority: rich.priority, dueDate: rich.dueDate, category: rich.category, memberIds: [], starred: false }).catch(() => {});
                }
              }}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      {viewMode === 'list' ? (
        <motion.div
          className="flex-1 overflow-y-auto px-8 pb-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {columns.map(col => {
            const colTasks = projectTasks.filter(t => t.status === col.status);
            if (colTasks.length === 0) return null;
            return (
              <div key={col.status} className="mb-6">
                <div className="flex items-center gap-2 mb-2 pt-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.dotColor }} />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{col.title}</span>
                  <span className="text-xs text-gray-400">({colTasks.length})</span>
                </div>
                <div className="rounded-xl border border-surface-200 overflow-hidden">
                  {colTasks.map((task, i) => {
                    const taskMembers = members.filter(m => task.assignees.includes(m.id));
                    const isOverdue = task.dueDate && task.dueDate < TODAY && task.status !== 'done';
                    return (
                      <button
                        key={task.id}
                        onClick={() => openTask(task)}
                        className={`w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-surface-50 transition-colors ${i > 0 ? 'border-t border-surface-100' : ''}`}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-800 truncate block">{task.title}</span>
                        </div>
                        {task.priority && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${priorityStyles[task.priority]?.bg ?? ''} ${priorityStyles[task.priority]?.text ?? ''}`}>
                            {priorityStyles[task.priority]?.label ?? task.priority}
                          </span>
                        )}
                        {taskMembers.length > 0 && (
                          <div className="shrink-0">
                            <AvatarGroup names={taskMembers.map(m => m.name)} colors={taskMembers.map(m => getMemberColor(m.id))} size="sm" max={3} />
                          </div>
                        )}
                        {task.dueDate && (
                          <span className={`text-[11px] shrink-0 ${isOverdue ? 'text-[#D8727D] font-semibold' : 'text-gray-400'}`}>
                            {task.dueDate}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </motion.div>
      ) : (
      <motion.div
        className="flex-1 overflow-x-auto overflow-y-hidden px-8 pb-6"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex gap-6 h-full">
            {columns.map((col, index) => {
              const colTasks = applyFilters(allTasks.filter(t => t.status === col.status && t.projectId === activeProject));
              const sortedTasks = [...colTasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
              return (
                <KanbanColumn
                  key={col.status}
                  title={col.title}
                  status={col.status}
                  tasks={sortedTasks}
                  dotColor={col.dotColor}
                  lineColor={col.lineColor}
                  index={index}
                  onTaskClick={openTask}
                  onAddTask={(status) => { if (!activeProject) return; setFormDefaultStatus(status); setShowTaskForm(true); }}
                  onMoveTask={(taskId, newStatus) => moveTask(taskId, newStatus).catch(console.error)}
                  onDeleteTask={(taskId) => deleteTask(taskId).catch(console.error)}
                />
              );
            })}
            {/* Right-edge spacer so last column has breathing room */}
            <div className="shrink-0 w-8 h-full" />
          </div>
        </DndContext>
      </motion.div>
      )}

      {/* Task Form Modal */}
      <AnimatePresence>
        {showTaskForm && (
          <TaskFormModal
            onClose={() => setShowTaskForm(false)}
            onSubmit={task => createTask(task)}
            defaultStatus={formDefaultStatus}
          />
        )}
      </AnimatePresence>

      {/* Task Detail Slide-over */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            className="fixed inset-0 top-16 z-50 flex"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="flex-1 bg-black/30" onClick={() => setSelectedTask(null)} />
            <motion.div
              className="w-[420px] bg-white h-full overflow-y-auto border-l border-surface-200 flex flex-col"
              initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Task Detail</span>
                <div className="flex items-center gap-2">
                  {!editMode && (
                    <button
                      onClick={() => startEdit(selectedTask)}
                      className="flex items-center gap-1 text-xs font-semibold text-primary-500 hover:text-primary-700 bg-primary-50 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                  )}
                  <button onClick={() => setSelectedTask(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-surface-100 hover:text-gray-600 transition-colors">
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
                {/* Title */}
                <div>
                  {editMode ? (
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full text-base font-bold text-gray-900 border-b-2 border-primary-400 focus:outline-none bg-transparent pb-1"
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h2 className="font-bold text-gray-900 text-base leading-snug">{selectedTask.title}</h2>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md shrink-0 ${(priorityStyles[selectedTask.priority] ?? priorityStyles.low).bg} ${(priorityStyles[selectedTask.priority] ?? priorityStyles.low).text}`}>
                        {(priorityStyles[selectedTask.priority] ?? priorityStyles.low).label}
                      </span>
                    </div>
                  )}
                  {proj && !editMode && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color }} />
                      <span className="text-xs text-gray-400">{proj.name}</span>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1"><Tag size={11} /> Status</div>
                  <div className="relative">
                    <button
                      onClick={() => setShowStatusDrop(v => !v)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${currentStatusStyle.bg} ${currentStatusStyle.text} hover:opacity-80 transition-opacity`}
                    >
                      {currentStatusStyle.label}
                      <ChevronDown size={12} className={`transition-transform ${showStatusDrop ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showStatusDrop && (
                        <motion.div
                          className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-surface-100 overflow-hidden z-10 w-52"
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                        >
                          {(Object.keys(statusStyles) as TaskStatus[]).map(s => {
                            const st = statusStyles[s];
                            return (
                              <button key={s}
                                onClick={() => {
                                  moveTask(selectedTask.id, s).catch(console.error);
                                  setSelectedTask(prev => prev ? { ...prev, status: s } : prev);
                                  setShowStatusDrop(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold hover:bg-surface-50 transition-colors"
                              >
                                <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                                <span className={st.text}>{st.label}</span>
                                {selectedTask.status === s && <Check size={11} className="ml-auto text-primary-500" />}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Priority edit */}
                {editMode && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 mb-1.5">Priority</div>
                    <div className="flex gap-2">
                      {([
                        { value: 'low',    color: '#D58D49', bg: 'bg-[#DFA87433]', ring: 'ring-[#D58D49]', text: 'text-[#D58D49]' },
                        { value: 'medium', color: '#A78BFA', bg: 'bg-[#A78BFA22]', ring: 'ring-[#A78BFA]', text: 'text-[#A78BFA]' },
                        { value: 'high',   color: '#D8727D', bg: 'bg-[#D8727D22]', ring: 'ring-[#D8727D]', text: 'text-[#D8727D]' },
                      ] as const).map(p => (
                        <button key={p.value} onClick={() => setEditPriority(p.value)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${editPriority === p.value ? `${p.bg} ${p.text} ring-1 ${p.ring}` : 'bg-surface-100 text-gray-500'}`}
                        >
                          {p.value.charAt(0).toUpperCase() + p.value.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Type edit */}
                {editMode && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 mb-1.5">Type</div>
                    <div className="flex gap-2">
                      {([
                        { value: 'task',  label: 'Task',  bg: 'bg-[#22C55E20]', ring: 'ring-[#22C55E]', text: 'text-[#22C55E]' },
                        { value: 'issue', label: 'Issue', bg: 'bg-[#EF444420]', ring: 'ring-[#EF4444]', text: 'text-[#EF4444]' },
                      ] as const).map(t => (
                        <button key={t.value} onClick={() => setEditTaskType(t.value)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${editTaskType === t.value ? `${t.bg} ${t.text} ring-1 ${t.ring}` : 'bg-surface-100 text-gray-500'}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assignees */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1"><User size={11} /> Assignees</div>
                  {editMode ? (
                    <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                      {members.map(m => (
                        <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-50 cursor-pointer">
                          <input type="checkbox" checked={editAssignees.includes(m.id)}
                            onChange={() => setEditAssignees(prev => prev.includes(m.id) ? prev.filter(a => a !== m.id) : [...prev, m.id])}
                            className="rounded text-primary-500" />
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
                        return (
                          <div key={id} className="flex items-center gap-1.5 bg-surface-100 rounded-full px-2.5 py-1">
                            <Avatar name={member.name} color={getMemberColor(id)} size="sm" />
                            <span className="text-xs font-semibold text-gray-700">{member.name.split(' ')[0]}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Due Date */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-1 flex items-center gap-1"><Calendar size={11} /> Due Date</div>
                  {editMode ? (
                    <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)}
                      className="border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400" />
                  ) : (
                    <span className="text-sm font-semibold text-gray-700">{selectedTask.dueDate ?? '—'}</span>
                  )}
                </div>

                {/* Description */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-1.5">Description</div>
                  {editMode ? (
                    <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3}
                      className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 resize-none" />
                  ) : (
                    <p className="text-sm text-gray-600 leading-relaxed">{selectedTask.description || 'No description.'}</p>
                  )}
                </div>

                {/* Image attachment */}
                {!editMode && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 mb-1.5">Attachment</div>
                    {detailImage ? (
                      <div className="relative rounded-xl overflow-hidden">
                        <img src={detailImage} alt="attachment" className="w-full h-40 object-cover rounded-xl" />
                        <button onClick={() => setDetailImage(null)} className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => fileRef.current?.click()}
                        className="w-full h-24 border-2 border-dashed border-surface-300 rounded-xl flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-primary-300 hover:text-primary-400 transition-colors">
                        <ImagePlus size={20} /><span className="text-xs font-medium">Upload image</span>
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </div>
                )}

                {/* Edit mode save/cancel */}
                {editMode && (
                  <div className="flex gap-2">
                    <motion.button onClick={saveEdit} className="flex-1 bg-primary-500 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-primary-600 transition-colors" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      Save
                    </motion.button>
                    <button onClick={() => setEditMode(false)} className="flex-1 bg-surface-100 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-surface-200 transition-colors">
                      Cancel
                    </button>
                  </div>
                )}

                {/* File Attachments */}
                {!editMode && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold text-gray-400 flex items-center gap-1"><Paperclip size={11} /> Attachments ({attachments.length})</div>
                      <button
                        onClick={async () => {
                          const added = await dbApi().pickAttachments(selectedTask!.id) as Attachment[];
                          setAttachments(prev => [...prev, ...added]);
                        }}
                        className="text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors"
                      >
                        + Attach File
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {attachments.map(a => (
                        <div key={a.id} className="flex items-center gap-2 p-2 bg-surface-50 rounded-lg border border-surface-200">
                          <Paperclip size={13} className="text-gray-400 shrink-0" />
                          <span className="flex-1 text-xs text-gray-700 truncate font-medium">{a.name}</span>
                          <span className="text-[10px] text-gray-400">{fmtSize(a.size)}</span>
                          <button onClick={() => dbApi().openAttachment(a.filePath)} className="text-gray-400 hover:text-primary-500 transition-colors">
                            <Download size={13} />
                          </button>
                          <button onClick={async () => { await dbApi().deleteAttachment(a.id); setAttachments(prev => prev.filter(x => x.id !== a.id)); }} className="text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments */}
                {!editMode && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1"><MessageSquare size={11} /> Comments ({comments.length})</div>
                    <div className="flex flex-col gap-3 mb-3 max-h-40 overflow-y-auto">
                      {loadingComments ? (
                        <p className="text-xs text-gray-400">Loading...</p>
                      ) : comments.map(c => (
                        <div key={c.id} className="flex gap-2.5">
                          <Avatar name={c.authorName} color="#5030E5" size="sm" />
                          <div>
                            <div className="text-[11px] font-semibold text-gray-900">{c.authorName} <span className="text-gray-400 font-normal">{new Date(c.createdAt).toLocaleString()}</span></div>
                            <div className="text-xs text-gray-600 mt-0.5">{c.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={commentInput} onChange={e => setCommentInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                        placeholder="Add a comment..." className="flex-1 border border-surface-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary-400" />
                      <button onClick={handleAddComment} className="w-8 h-8 bg-primary-500 rounded-xl flex items-center justify-center text-white hover:bg-primary-600 transition-colors shrink-0">
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Delete */}
                {!editMode && (
                  <div className="mt-auto pt-4 border-t border-surface-100">
                    {!confirmDelete ? (
                      <button onClick={() => setConfirmDelete(true)} className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-[#D8727D] bg-[#D8727D0A] border border-[#D8727D33] py-2.5 rounded-xl hover:bg-[#D8727D15] transition-colors">
                        <Trash2 size={13} /> Delete task
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={handleDelete} className="flex-1 text-xs font-semibold bg-[#D8727D] text-white py-2.5 rounded-xl hover:bg-[#c5616b] transition-colors">
                          Confirm delete
                        </button>
                        <button onClick={() => setConfirmDelete(false)} className="flex-1 text-xs font-semibold bg-surface-100 text-gray-600 py-2.5 rounded-xl hover:bg-surface-200 transition-colors">
                          Cancel
                        </button>
                      </div>
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
    </>
  );
};

export default KanbanBoard;
