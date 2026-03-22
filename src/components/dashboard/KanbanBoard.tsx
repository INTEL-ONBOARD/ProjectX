import React, { useState, useRef, useEffect } from 'react';
import { DndContext, rectIntersection, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Tag, User, Calendar, ChevronDown, ChevronLeft, ChevronRight, ImagePlus,
  Check, Trash2, MessageSquare, Send,
  ArrowRight, Flag, UserPlus, UserMinus, FileText, Plus, Pencil, FolderPlus,
  Download, Paperclip, Lock, Clock, Play, MoreHorizontal, AlignLeft,
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

const statusStyles: Record<TaskStatus, { bgColor: string; color: string; label: string }> = {
  'todo':               { bgColor: 'rgba(148,163,184,0.15)', color: '#94A3B8', label: 'To Do'              },
  'in-progress':        { bgColor: 'rgba(255,165,0,0.12)',  color: '#FFA500', label: 'In Progress'        },
  'ready-for-qa':       { bgColor: 'rgba(48,197,229,0.12)', color: '#30C5E5', label: 'Ready for QA'       },
  'deployment-pending': { bgColor: 'rgba(156,39,176,0.12)', color: '#9C27B0', label: 'Deployment Pending' },
  'blocker':            { bgColor: 'rgba(216,114,125,0.13)',color: '#D8727D', label: 'Blocker'            },
  'on-hold':            { bgColor: 'rgba(234,179,8,0.12)',  color: '#EAB308', label: 'On Hold'            },
  'done':               { bgColor: 'rgba(104,178,102,0.15)',color: '#68B266', label: 'Done'               },
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
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [editingTimeEst, setEditingTimeEst] = useState(false);
  const [timeEstDraft, setTimeEstDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [formDefaultStatus, setFormDefaultStatus] = useState<TaskStatus>('todo');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | 'saved' | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (lightboxIndex !== null) lightboxRef.current?.focus();
  }, [lightboxIndex]);
  useEffect(() => {
    setLightboxIndex(null);
  }, [selectedTask?.id]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [showNewProject, setShowNewProject] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    const handler = () => setShowTaskForm(true);
    window.addEventListener('open-new-task', handler);
    return () => window.removeEventListener('open-new-task', handler);
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = allTasks.find(t => t.id === active.id);
    if (!activeTask) return;

    // over.id can be:
    //   "col-{status}"  — dropped on the column droppable (empty column or column bg)
    //   a task id       — dropped on top of another task
    const overId = String(over.id);
    const targetCol =
      overId.startsWith('col-')
        ? columns.find(c => `col-${c.status}` === overId)
        : columns.find(c => allTasks.some(t => t.id === overId && t.status === c.status));

    if (!targetCol) return;
    if (active.id === over.id) return;

    const targetStatus = targetCol.status;

    // If the task is moving to a different column, update its status first
    if (activeTask.status !== targetStatus) {
      await moveTask(activeTask.id, targetStatus).catch(console.error);
    }

    // Reorder within the target column using ALL tasks (not filtered) to preserve order of hidden tasks
    const targetColTasks = allTasks
      .map(t => t.id === activeTask.id ? { ...t, status: targetStatus } : t)
      .filter(t => t.status === targetStatus && t.projectId === activeProject)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const oldIndex = targetColTasks.findIndex(t => t.id === active.id);
    const overIndex = targetColTasks.findIndex(t => t.id === over.id);

    if (oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex) {
      const reordered = arrayMove(targetColTasks, oldIndex, overIndex);
      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].order !== i) {
          await updateTask(reordered[i].id, { order: i });
        }
      }
    } else if (oldIndex !== -1 && overIndex === -1) {
      // Dropped onto the column droppable itself — place at end
      const newOrder = targetColTasks.length - 1;
      if (activeTask.order !== newOrder) {
        await updateTask(activeTask.id, { order: newOrder });
      }
    }
  };

  useEffect(() => {
    if (!selectedTask) return;
    const taskId = selectedTask.id;
    let cancelled = false;
    setLoadingComments(true);
    dbApi().getComments(taskId).then((data: any) => {
      if (!cancelled) {
        setComments(data as Comment[]);
        setLoadingComments(false);
      }
    });
    return () => { cancelled = true; };
  }, [selectedTask?.id]);

  useEffect(() => {
    if (!selectedTask) return;
    const taskId = selectedTask.id;
    let cancelled = false;
    dbApi().getAttachments(taskId).then((data: any) => {
      if (!cancelled) setAttachments(data as Attachment[]);
    });
    return () => { cancelled = true; };
  }, [selectedTask?.id]);

  useEffect(() => {
    if (!selectedTask) return;
    const eApi = (window as any).electronAPI;
    const unsubComment = eApi.onCommentChanged((_: unknown, payload: { op: string; doc?: any; id?: string }) => {
      const { op, doc, id } = payload;
      if (op === 'insert' && doc?.taskId === selectedTask.id) {
        setComments(prev => prev.some(c => c.id === doc.id) ? prev : [...prev, doc as Comment]);
      } else if (op === 'delete' && id) {
        setComments(prev => prev.filter(c => c.id !== id));
      }
    });
    const unsubAttachment = eApi.onAttachmentChanged((_: unknown, payload: { op: string; doc?: any; id?: string }) => {
      const { op, doc, id } = payload;
      if (op === 'insert' && doc?.taskId === selectedTask.id) {
        setAttachments(prev => prev.some(a => a.id === doc.id) ? prev : [...prev, doc as Attachment]);
      } else if (op === 'delete' && id) {
        setAttachments(prev => prev.filter(a => a.id !== id));
      }
    });
    return () => { unsubComment(); unsubAttachment(); };
  }, [selectedTask?.id]);

  const openTask = (task: Task) => {
    setSelectedTask(task);
    setConfirmDelete(false);
    setShowStatusDrop(false);
    setShowPriorityPicker(false);
    setShowAssigneePicker(false);
    setEditingTitle(false);
    setEditingDesc(false);
    setEditingDueDate(false);
    setEditingTimeEst(false);
    setComments([]);
    setCommentInput('');
    setDetailTab('details');
  };

  // Keep selectedTask in sync when allTasks updates (real-time changes from other clients)
  useEffect(() => {
    if (!selectedTask) return;
    const fresh = allTasks.find(t => t.id === selectedTask.id);
    if (fresh) setSelectedTask(fresh);
  }, [allTasks, selectedTask?.id]);

  const patchTask = (patch: Partial<Task>) => {
    if (!selectedTask) return;
    updateTask(selectedTask.id, patch).catch(console.error);
    setSelectedTask(prev => prev ? { ...prev, ...patch } : prev);
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
    setComments(prev => prev.some(c => c.id === newComment.id) ? prev : [...prev, newComment]);
    setCommentInput('');
  };

  const uploadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;
    e.target.value = '';
    const reader = new FileReader();

    // Animate progress from 0 → 90 while reading (local file has no real progress events)
    setUploadProgress(0);
    let simulated = 0;
    uploadTimerRef.current = setInterval(() => {
      simulated = Math.min(simulated + Math.random() * 18, 90);
      setUploadProgress(Math.round(simulated));
    }, 80);

    reader.onload = ev => {
      // Stop simulation, jump to 100
      if (uploadTimerRef.current) { clearInterval(uploadTimerRef.current); uploadTimerRef.current = null; }
      setUploadProgress(100);
      const dataUrl = ev.target?.result as string;
      patchTask({ images: [...(selectedTask.images ?? []), dataUrl] });
      // Show "Saved" after a short pause, then clear the tile
      setTimeout(() => setUploadProgress('saved'), 400);
      setTimeout(() => setUploadProgress(null), 1800);
    };

    reader.onerror = () => {
      if (uploadTimerRef.current) { clearInterval(uploadTimerRef.current); uploadTimerRef.current = null; }
      setUploadProgress(null);
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
    { title: 'To Do',               status: 'todo',               dotColor: '#94A3B8', lineColor: '#94A3B8' },
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
                          {task.blockedBy && task.blockedBy.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full mt-0.5">
                              <Lock size={10} /> Blocked
                            </span>
                          )}
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
        <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragEnd={handleDragEnd}>
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

      {/* Task Detail Slide-over — ClickUp Style */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            className="fixed inset-0 top-16 z-50 flex"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => {
              setShowStatusDrop(false);
              setShowPriorityPicker(false);
              setShowAssigneePicker(false);
            }}
          >
            <div className="flex-1" onClick={() => setSelectedTask(null)} />
            <motion.div
              className="w-[460px] h-full overflow-y-auto flex flex-col border-l shrink-0 relative"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
              initial={{ x: 460 }} animate={{ x: 0 }} exit={{ x: 460 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              onClick={e => e.stopPropagation()}
            >
              {/* ── Top toolbar ── */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  {/* Task type badge */}
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
                  {/* Project */}
                  {proj && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: proj.color }} />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{proj.name}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {/* Tabs inline in header */}
                  {(['details', 'activity'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setDetailTab(tab)}
                      className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
                      style={{
                        background: detailTab === tab ? 'var(--bg-active)' : 'transparent',
                        color: detailTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="w-7 h-7 rounded-md flex items-center justify-center transition-colors ml-1"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {detailTab === 'details' && (
                <div className="flex-1 px-5 py-5 flex flex-col">

                  {/* ── Title ── */}
                  <div className="mb-5">
                    {editingTitle ? (
                      <input
                        autoFocus
                        value={titleDraft}
                        onChange={e => setTitleDraft(e.target.value)}
                        onBlur={() => {
                          if (titleDraft.trim()) patchTask({ title: titleDraft.trim() });
                          setEditingTitle(false);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { if (titleDraft.trim()) patchTask({ title: titleDraft.trim() }); setEditingTitle(false); }
                          if (e.key === 'Escape') setEditingTitle(false);
                        }}
                        className="w-full text-xl font-bold leading-snug bg-transparent focus:outline-none"
                        style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--color-primary-400)' }}
                      />
                    ) : (
                      <h2
                        className="text-xl font-bold leading-snug cursor-text hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--text-primary)' }}
                        onClick={() => { setTitleDraft(selectedTask.title); setEditingTitle(true); }}
                      >
                        {selectedTask.title}
                      </h2>
                    )}
                    {selectedTask.taskNumber && (
                      <span className="text-xs mt-1 block" style={{ color: 'var(--text-subtle)' }}>#{selectedTask.taskNumber}</span>
                    )}
                  </div>

                  {/* ── Metadata rows ── */}
                  <div className="flex flex-col mb-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>

                    {/* Status */}
                    <div className="flex items-center py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-center gap-2 w-[130px] shrink-0">
                        <Tag size={13} style={{ color: 'var(--text-subtle)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Status</span>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => { setShowStatusDrop(v => !v); setShowPriorityPicker(false); setShowAssigneePicker(false); }}
                          className="flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold hover:opacity-80 transition-opacity"
                          style={{ background: currentStatusStyle.bgColor, color: currentStatusStyle.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: currentStatusStyle.color }} />
                          {currentStatusStyle.label}
                          <ChevronDown size={11} className={`transition-transform ${showStatusDrop ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {showStatusDrop && (
                            <motion.div
                              className="absolute left-0 top-full mt-1 rounded-xl shadow-xl overflow-hidden z-20 w-52"
                              style={{ background: 'var(--bg-dropdown)', border: '1px solid var(--border-default)' }}
                              initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }}
                              transition={{ duration: 0.13 }}
                            >
                              {(Object.keys(statusStyles) as TaskStatus[]).map(s => {
                                const st = statusStyles[s];
                                const isActive = selectedTask.status === s;
                                return (
                                  <button key={s}
                                    onClick={() => {
                                      moveTask(selectedTask.id, s).catch(console.error);
                                      setSelectedTask(prev => prev ? { ...prev, status: s } : prev);
                                      setShowStatusDrop(false);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold transition-colors"
                                    style={{ color: st.color, background: isActive ? st.bgColor : 'transparent' }}
                                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = isActive ? st.bgColor : 'transparent'; }}
                                  >
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: st.color }} />
                                    <span>{st.label}</span>
                                    {isActive && <Check size={11} className="ml-auto" />}
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Assignees */}
                    <div className="flex items-center py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-center gap-2 w-[130px] shrink-0">
                        <User size={13} style={{ color: 'var(--text-subtle)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Assignees</span>
                      </div>
                      <div className="relative flex-1">
                        <button
                          onClick={() => { setShowAssigneePicker(v => !v); setShowStatusDrop(false); setShowPriorityPicker(false); }}
                          className="flex items-center gap-2 flex-wrap"
                        >
                          {selectedTask.assignees.length === 0 ? (
                            <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>+ Add assignee</span>
                          ) : (
                            selectedTask.assignees.map(id => {
                              const member = members.find(m => m.id === id);
                              if (!member) return null;
                              return (
                                <div key={id} className="flex items-center gap-1.5">
                                  <Avatar name={member.name} color={getMemberColor(id)} size="sm" />
                                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{member.name.split(' ')[0]}</span>
                                </div>
                              );
                            })
                          )}
                        </button>
                        <AnimatePresence>
                          {showAssigneePicker && (
                            <motion.div
                              className="absolute left-0 top-full mt-1 rounded-xl shadow-xl overflow-hidden z-20 w-52"
                              style={{ background: 'var(--bg-dropdown)', border: '1px solid var(--border-default)' }}
                              initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }}
                              transition={{ duration: 0.13 }}
                            >
                              {members.map(m => {
                                const isAssigned = selectedTask.assignees.includes(m.id);
                                return (
                                  <button key={m.id}
                                    onClick={() => {
                                      const newAssignees = isAssigned
                                        ? selectedTask.assignees.filter(a => a !== m.id)
                                        : [...selectedTask.assignees, m.id];
                                      patchTask({ assignees: newAssignees });
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors"
                                    style={{ color: 'var(--text-secondary)', background: isAssigned ? 'var(--bg-active)' : 'transparent' }}
                                    onMouseEnter={e => { if (!isAssigned) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = isAssigned ? 'var(--bg-active)' : 'transparent'; }}
                                  >
                                    <Avatar name={m.name} color={getMemberColor(m.id)} size="sm" />
                                    <span className="flex-1 text-left font-medium">{m.name}</span>
                                    {isAssigned && <Check size={11} style={{ color: 'var(--color-primary-500)' }} />}
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
                      <div className="flex items-center gap-2 w-[130px] shrink-0">
                        <Calendar size={13} style={{ color: 'var(--text-subtle)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Due date</span>
                      </div>
                      {editingDueDate ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            type="date"
                            defaultValue={selectedTask.dueDate ?? ''}
                            onChange={e => { patchTask({ dueDate: e.target.value || undefined }); setEditingDueDate(false); }}
                            onKeyDown={e => { if (e.key === 'Escape') setEditingDueDate(false); }}
                            className="text-xs rounded-md px-2 py-1 focus:outline-none"
                            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--color-primary-400)' }}
                          />
                          {selectedTask.dueDate && (
                            <button onClick={() => { patchTask({ dueDate: null as any }); setEditingDueDate(false); }}
                              className="text-gray-400 hover:text-red-400 transition-colors" title="Clear due date">
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 group">
                          <button
                            onClick={() => setEditingDueDate(true)}
                            className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
                            style={{ color: selectedTask.dueDate && selectedTask.dueDate < TODAY && selectedTask.status !== 'done' ? '#D8727D' : 'var(--text-secondary)' }}
                          >
                            <Calendar size={12} style={{ color: 'var(--text-subtle)' }} />
                            {selectedTask.dueDate ?? <span style={{ color: 'var(--text-subtle)' }}>Set due date</span>}
                          </button>
                          {selectedTask.dueDate && (
                            <button onClick={() => patchTask({ dueDate: null as any })}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all" title="Clear due date">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Priority */}
                    <div className="flex items-center py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-center gap-2 w-[130px] shrink-0">
                        <Flag size={13} style={{ color: 'var(--text-subtle)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Priority</span>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => { setShowPriorityPicker(v => !v); setShowStatusDrop(false); setShowAssigneePicker(false); }}
                          className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-70"
                        >
                          {(() => {
                            const p = selectedTask.priority;
                            const colors: Record<string, string> = { low: '#D58D49', medium: '#A78BFA', high: '#D8727D' };
                            const labels: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High' };
                            return (
                              <>
                                <Flag size={13} style={{ color: colors[p] ?? 'var(--text-subtle)' }} />
                                <span style={{ color: colors[p] ?? 'var(--text-secondary)' }}>{labels[p] ?? 'Normal'}</span>
                              </>
                            );
                          })()}
                          <ChevronDown size={11} style={{ color: 'var(--text-subtle)' }} className={`transition-transform ${showPriorityPicker ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {showPriorityPicker && (
                            <motion.div
                              className="absolute left-0 top-full mt-1 rounded-xl shadow-xl overflow-hidden z-20 w-44"
                              style={{ background: 'var(--bg-dropdown)', border: '1px solid var(--border-default)' }}
                              initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }}
                              transition={{ duration: 0.13 }}
                            >
                              {([
                                { value: 'low', label: 'Low', color: '#D58D49' },
                                { value: 'medium', label: 'Medium', color: '#A78BFA' },
                                { value: 'high', label: 'High', color: '#D8727D' },
                              ] as const).map(p => (
                                <button key={p.value}
                                  onClick={() => { patchTask({ priority: p.value }); setShowPriorityPicker(false); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors"
                                  style={{ color: p.color, background: selectedTask.priority === p.value ? 'var(--bg-active)' : 'transparent' }}
                                  onMouseEnter={e => { if (selectedTask.priority !== p.value) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = selectedTask.priority === p.value ? 'var(--bg-active)' : 'transparent'; }}
                                >
                                  <Flag size={12} style={{ color: p.color }} />
                                  {p.label}
                                  {selectedTask.priority === p.value && <Check size={11} className="ml-auto" />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Time estimate */}
                    <div className="flex items-center py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-center gap-2 w-[130px] shrink-0">
                        <Clock size={13} style={{ color: 'var(--text-subtle)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Time estimate</span>
                      </div>
                      {editingTimeEst ? (
                        <input
                          autoFocus
                          value={timeEstDraft}
                          onChange={e => setTimeEstDraft(e.target.value)}
                          onBlur={() => {
                            const hrs = parseFloat(timeEstDraft);
                            if (!isNaN(hrs) && hrs > 0) patchTask({ estimatedMinutes: Math.round(hrs * 60) });
                            setEditingTimeEst(false);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { const hrs = parseFloat(timeEstDraft); if (!isNaN(hrs) && hrs > 0) patchTask({ estimatedMinutes: Math.round(hrs * 60) }); setEditingTimeEst(false); }
                            if (e.key === 'Escape') setEditingTimeEst(false);
                          }}
                          placeholder="hours"
                          className="text-xs rounded-md px-2 py-1 w-24 focus:outline-none"
                          style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--color-primary-400)' }}
                        />
                      ) : (
                        <button
                          onClick={() => { setTimeEstDraft(selectedTask.estimatedMinutes ? String(+(selectedTask.estimatedMinutes / 60).toFixed(2)) : ''); setEditingTimeEst(true); }}
                          className="text-xs transition-opacity hover:opacity-70"
                          style={{ color: selectedTask.estimatedMinutes ? 'var(--text-secondary)' : 'var(--text-subtle)' }}
                        >
                          {selectedTask.estimatedMinutes
                            ? selectedTask.estimatedMinutes >= 60
                              ? `${Math.floor(selectedTask.estimatedMinutes / 60)}h${selectedTask.estimatedMinutes % 60 ? ` ${selectedTask.estimatedMinutes % 60}m` : ''}`
                              : `${selectedTask.estimatedMinutes}m`
                            : 'Set estimate'}
                        </button>
                      )}
                    </div>

                    {/* Track time */}
                    <div className="flex items-center py-2.5">
                      <div className="flex items-center gap-2 w-[130px] shrink-0">
                        <Clock size={13} style={{ color: 'var(--text-subtle)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Track time</span>
                      </div>
                      <button
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-active)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      >
                        <Play size={11} style={{ color: 'var(--text-muted)' }} />
                        Start
                      </button>
                    </div>
                  </div>

                  {/* ── Description ── */}
                  <div className="mb-4" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                    {editingDesc ? (
                      <textarea
                        autoFocus
                        value={descDraft}
                        onChange={e => setDescDraft(e.target.value)}
                        onBlur={() => { patchTask({ description: descDraft }); setEditingDesc(false); }}
                        rows={5}
                        placeholder="Add description…"
                        className="w-full text-sm leading-relaxed bg-transparent focus:outline-none resize-none"
                        style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)' }}
                      />
                    ) : (
                      <div
                        onClick={() => { setDescDraft(selectedTask.description ?? ''); setEditingDesc(true); }}
                        className="cursor-text min-h-[40px]"
                      >
                        {selectedTask.description ? (
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{selectedTask.description}</p>
                        ) : (
                          <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
                            <AlignLeft size={14} />
                            Add description…
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Action rows ── */}
                  <div className="flex flex-col gap-0 mb-4" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                    {/* Attach file action */}
                    <button
                      onClick={async () => {
                        const added = await dbApi().pickAttachments(selectedTask!.id) as Attachment[];
                        setAttachments(prev => {
                          const newOnes = added.filter(a => !prev.some(x => x.id === a.id));
                          return newOnes.length ? [...prev, ...newOnes] : prev;
                        });
                      }}
                      className="flex items-center gap-3 px-1 py-2.5 rounded-lg text-sm transition-colors w-full text-left"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Paperclip size={14} />
                      Attach file
                    </button>

                    {/* Image upload action */}
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-3 px-1 py-2.5 rounded-lg text-sm transition-colors w-full text-left"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <ImagePlus size={14} />
                      Upload image
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </div>

                  {/* Image gallery */}
                  {((selectedTask.images ?? []).length > 0 || uploadProgress !== null) && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {(selectedTask.images ?? []).map((img, i) => (
                        <div
                          key={i}
                          className="relative h-20"
                          onMouseEnter={e => { const btn = e.currentTarget.querySelector<HTMLElement>('[data-del]'); if (btn) btn.style.opacity = '1'; }}
                          onMouseLeave={e => { const btn = e.currentTarget.querySelector<HTMLElement>('[data-del]'); if (btn) btn.style.opacity = '0'; }}
                        >
                          <button
                            onClick={() => setLightboxIndex(i)}
                            className="w-full h-full rounded-lg overflow-hidden border border-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-400"
                          >
                            <img src={img} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                          </button>
                          <button
                            data-del
                            onClick={e => {
                              e.stopPropagation();
                              const updated = (selectedTask.images ?? []).filter((_, idx) => idx !== i);
                              patchTask({ images: updated });
                            }}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center transition-opacity"
                            style={{ background: 'rgba(0,0,0,0.6)', opacity: 0 }}
                            title="Delete image"
                          >
                            <Trash2 size={11} color="white" />
                          </button>
                        </div>
                      ))}
                      {uploadProgress !== null && (
                        <div className="relative h-20 rounded-lg flex flex-col items-center justify-center gap-1.5 border"
                          style={{ background: 'var(--bg-muted)', borderColor: 'var(--border-default)' }}>
                          {uploadProgress === 'saved' ? (
                            <>
                              <Check size={18} style={{ color: '#68B266' }} />
                              <span className="text-[11px] font-semibold" style={{ color: '#68B266' }}>Saved</span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{uploadProgress}%</span>
                              <div className="w-3/4 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
                                <div className="h-full rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%`, background: '#5030E5' }} />
                              </div>
                              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Uploading…</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── File attachments list ── */}
                  {attachments.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                        Attachments ({attachments.length})
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {attachments.map(a => (
                          <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}>
                            <Paperclip size={13} style={{ color: 'var(--text-subtle)' }} className="shrink-0" />
                            <span className="flex-1 text-xs truncate font-medium" style={{ color: 'var(--text-secondary)' }}>{a.name}</span>
                            <span className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>{fmtSize(a.size)}</span>
                            <button onClick={() => dbApi().openAttachment(a.filePath)} style={{ color: 'var(--text-subtle)' }} className="hover:text-primary-500 transition-colors">
                              <Download size={13} />
                            </button>
                            <button onClick={async () => { await dbApi().deleteAttachment(a.id); setAttachments(prev => prev.filter(x => x.id !== a.id)); }} style={{ color: 'var(--text-subtle)' }} className="hover:text-red-500 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Comments ── */}
                  <div className="mb-4" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare size={13} style={{ color: 'var(--text-subtle)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Comments {comments.length > 0 && `(${comments.length})`}</span>
                    </div>
                    <div className="flex flex-col gap-3 mb-3">
                      {loadingComments ? (
                        <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>Loading...</p>
                      ) : comments.map(c => (
                        <div key={c.id} className="flex gap-2.5">
                          <Avatar name={c.authorName} color="#5030E5" size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {c.authorName}
                              <span className="font-normal ml-1.5" style={{ color: 'var(--text-subtle)' }}>{new Date(c.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {authUser && <Avatar name={authUser.name} color="#5030E5" size="sm" />}
                      <div className="flex-1 flex gap-2">
                        <input
                          value={commentInput}
                          onChange={e => setCommentInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                          placeholder="Write a comment…"
                          className="flex-1 text-xs px-3 py-2 rounded-xl focus:outline-none transition-colors"
                          style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                          onFocus={e => e.target.style.borderColor = 'var(--color-primary-400)'}
                          onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
                        />
                        <button
                          onClick={handleAddComment}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white transition-colors bg-primary-500 hover:bg-primary-600 shrink-0"
                        >
                          <Send size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Delete ── */}
                  <div className="pt-4 mt-auto" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    {!confirmDelete ? (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-xl transition-colors"
                        style={{ color: '#D8727D', background: 'rgba(216,114,125,0.06)', border: '1px solid rgba(216,114,125,0.2)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(216,114,125,0.12)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(216,114,125,0.06)'}
                      >
                        <Trash2 size={13} /> Delete task
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleDelete}
                          className="flex-1 text-xs font-semibold py-2.5 rounded-xl text-white transition-colors"
                          style={{ background: '#D8727D' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#c5616b'}
                          onMouseLeave={e => e.currentTarget.style.background = '#D8727D'}
                        >
                          Confirm delete
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="flex-1 text-xs font-semibold py-2.5 rounded-xl transition-colors"
                          style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-active)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* ── Activity tab ── */}
              {detailTab === 'activity' && (
                <div className="flex-1 overflow-y-auto px-5 py-5">
                  {(selectedTask.activity ?? []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-hover)' }}>
                        <MoreHorizontal size={18} style={{ color: 'var(--text-subtle)' }} />
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>No activity yet</p>
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
                      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80"
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
                      <button
                        onClick={() => setLightboxIndex(null)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                      >
                        <X size={16} />
                      </button>
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default KanbanBoard;
