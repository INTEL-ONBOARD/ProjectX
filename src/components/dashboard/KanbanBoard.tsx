import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Tag, User, Calendar, ChevronDown, ImagePlus,
  Check, Edit3, Trash2, MessageSquare, Send,
} from 'lucide-react';
import { Task, TaskStatus } from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { useMembersContext } from '../../context/MembersContext';
import { Avatar, AvatarGroup } from '../ui/Avatar';
import KanbanColumn from './KanbanColumn';
import TaskFormModal from '../modals/TaskFormModal';
const TODAY = new Date().toISOString().split('T')[0];
const WEEK_START = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split('T')[0]; })();
const WEEK_END   = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 7); return d.toISOString().split('T')[0]; })();

const statusStyles: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  'todo':        { bg: 'bg-primary-50',     text: 'text-primary-600',  label: 'To Do' },
  'in-progress': { bg: 'bg-[#FFA50020]',    text: 'text-[#FFA500]',   label: 'In Progress' },
  'done':        { bg: 'bg-[#83C29D33]',    text: 'text-[#68B266]',   label: 'Done' },
};
const priorityStyles: Record<string, { bg: string; text: string; label: string }> = {
  low:       { bg: 'bg-[#DFA87433]', text: 'text-[#D58D49]', label: 'Low' },
  high:      { bg: 'bg-[#D8727D33]', text: 'text-[#D8727D]', label: 'High' },
  completed: { bg: 'bg-[#83C29D33]', text: 'text-[#68B266]', label: 'Completed' },
};

type Comment = { id: string; author: string; text: string; time: string };


interface Filters {
  priority: string;
  assignees: string[];
  dueDateFilter: string;
}

interface KanbanBoardProps {
  filters?: Filters;
  todayMode?: boolean;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ filters, todayMode }) => {
  const { allTasks, moveTask, updateTask, deleteTask, createTask, projects } = useProjects();
  const { members, getMemberColor } = useMembersContext();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [formDefaultStatus, setFormDefaultStatus] = useState<TaskStatus>('todo');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [detailImage, setDetailImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'high'>('low');
  const [editAssignees, setEditAssignees] = useState<string[]>([]);
  const [editDueDate, setEditDueDate] = useState('');

  const openTask = (task: Task) => {
    setSelectedTask(task);
    setEditMode(false);
    setConfirmDelete(false);
    setShowStatusDrop(false);
    setComments([]);
    setCommentInput('');
    setDetailImage(null);
  };

  const startEdit = (task: Task) => {
    setEditTitle(task.title);
    setEditDesc(task.description ?? '');
    setEditPriority(task.priority === 'high' ? 'high' : 'low');
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
      assignees: editAssignees,
      dueDate: editDueDate || undefined,
    }).catch(console.error);
    setSelectedTask(prev => prev ? { ...prev, title: editTitle, description: editDesc, priority: editPriority, assignees: editAssignees, dueDate: editDueDate || undefined } : prev);
    setEditMode(false);
  };

  const handleDelete = () => {
    if (!selectedTask) return;
    deleteTask(selectedTask.id).catch(console.error);
    setSelectedTask(null);
    setConfirmDelete(false);
  };

  const handleAddComment = () => {
    if (!commentInput.trim()) return;
    setComments(prev => [...prev, { id: String(Date.now()), author: 'You', text: commentInput.trim(), time: 'Now' }]);
    setCommentInput('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;
    const url = URL.createObjectURL(file);
    setDetailImage(url);
    updateTask(selectedTask.id, { images: [...(selectedTask.images ?? []), url] }).catch(console.error);
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
    { title: 'To Do',       status: 'todo',        dotColor: '#5030E5', lineColor: '#5030E5' },
    { title: 'On Progress', status: 'in-progress', dotColor: '#FFA500', lineColor: '#FFA500' },
    { title: 'Done',        status: 'done',         dotColor: '#8BC34A', lineColor: '#8BC34A' },
  ];

  const currentStatus = selectedTask ? (selectedTask.status) : 'todo';
  const currentStatusStyle = statusStyles[currentStatus];
  const proj = selectedTask ? projects.find(p => p.id === selectedTask.projectId) : null;

  return (
    <>
      <motion.div
        className="flex-1 overflow-x-auto overflow-y-hidden px-8 pb-6"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <div className="flex gap-6 h-full">
          {columns.map((col, index) => (
            <KanbanColumn
              key={col.status}
              title={col.title}
              status={col.status}
              tasks={applyFilters(allTasks.filter(t => t.status === col.status))}
              dotColor={col.dotColor}
              lineColor={col.lineColor}
              index={index}
              onTaskClick={openTask}
              onAddTask={(status) => { setFormDefaultStatus(status); setShowTaskForm(true); }}
              onMoveTask={(taskId, newStatus) => moveTask(taskId, newStatus).catch(console.error)}
            />
          ))}
        </div>
      </motion.div>

      {/* Task Form Modal */}
      <AnimatePresence>
        {showTaskForm && (
          <TaskFormModal
            onClose={() => setShowTaskForm(false)}
            onSubmit={task => createTask(task).catch(console.error)}
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
                          className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-surface-100 overflow-hidden z-10 w-40"
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                        >
                          {(['todo', 'in-progress', 'done'] as TaskStatus[]).map(s => {
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
                                <span className={`w-2 h-2 rounded-full ${s === 'todo' ? 'bg-primary-500' : s === 'in-progress' ? 'bg-[#FFA500]' : 'bg-[#68B266]'}`} />
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
                      {(['low', 'high'] as const).map(p => (
                        <button key={p} onClick={() => setEditPriority(p)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${editPriority === p ? (p === 'high' ? 'bg-[#D8727D22] text-[#D8727D] ring-1 ring-[#D8727D]' : 'bg-[#DFA87433] text-[#D58D49] ring-1 ring-[#D58D49]') : 'bg-surface-100 text-gray-500'}`}
                        >
                          {p.charAt(0).toUpperCase() + p.slice(1)}
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

                {/* Comments */}
                {!editMode && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1"><MessageSquare size={11} /> Comments ({comments.length})</div>
                    <div className="flex flex-col gap-3 mb-3 max-h-40 overflow-y-auto">
                      {comments.map(c => (
                        <div key={c.id} className="flex gap-2.5">
                          <Avatar name={c.author} color="#5030E5" size="sm" />
                          <div>
                            <div className="text-[11px] font-semibold text-gray-900">{c.author} <span className="text-gray-400 font-normal">{c.time}</span></div>
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default KanbanBoard;
