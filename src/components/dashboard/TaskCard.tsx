import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, MessageSquare, Paperclip, Edit3, Trash2, ArrowRight, Lock } from 'lucide-react';
import { Task, TaskStatus } from '../../types';
import { useMembersContext } from '../../context/MembersContext';
import { AvatarGroup } from '../ui/Avatar';
const TODAY = new Date().toISOString().split('T')[0];

const priorityStyles: Record<string, { bg: string; text: string; label: string }> = {
  low:       { bg: 'bg-[#DFA87433]', text: 'text-[#D58D49]', label: 'Low' },
  medium:    { bg: 'bg-[#A78BFA33]', text: 'text-[#A78BFA]', label: 'Medium' },
  high:      { bg: 'bg-[#D8727D33]', text: 'text-[#D8727D]', label: 'High' },
  completed: { bg: 'bg-[#83C29D33]', text: 'text-[#68B266]', label: 'Completed' },
};

const statusLabels: Record<TaskStatus, string> = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'ready-for-qa': 'Ready for QA',
  'deployment-pending': 'Deployment Pending',
  'blocker': 'Blocker',
  'on-hold': 'On Hold',
  'done': 'Done',
};

interface TaskCardProps {
  task: Task;
  index: number;
  onClick: () => void;
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
  onDeleteTask?: (taskId: string) => void;
  todayMode?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index, onClick, onMoveTask, onDeleteTask, todayMode }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { members, getMemberColor } = useMembersContext();
  const priority = priorityStyles[task.priority] ?? priorityStyles.low;

  const assigneeNames = task.assignees.map(id => members.find(m => m.id === id)?.name ?? 'Unknown');
  const assigneeColors = task.assignees.map(id => getMemberColor(id));

  const isToday = todayMode && task.dueDate === TODAY;
  const isOverdue = !!(task.dueDate && task.dueDate < TODAY && task.status !== 'done');

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const otherStatuses = (['todo', 'in-progress', 'ready-for-qa', 'deployment-pending', 'blocker', 'on-hold', 'done'] as TaskStatus[]).filter(s => s !== task.status);

  return (
    <motion.div
      className={`bg-surface-50 rounded-2xl p-4 border cursor-pointer group relative transition-all ${isToday ? 'border-l-4 border-l-primary-500 border-surface-200' : isOverdue ? 'border-l-4 border-l-red-400 border-surface-200' : 'border-surface-200'} ${isDragging ? 'opacity-50' : ''}`}
      draggable
      onDragStart={e => { (e as unknown as React.DragEvent).dataTransfer.setData('taskId', task.id); setIsDragging(true); }}
      onDragEnd={() => setIsDragging(false)}
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      layout
      onClick={onClick}
    >
      {/* Priority badge, type tag & menu */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${priority.bg} ${priority.text}`}>
            {priority.label}
          </span>
          {task.taskType === 'issue' && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#EF444420] text-[#EF4444]">Issue</span>
          )}
          {(!task.taskType || task.taskType === 'task') && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#22C55E20] text-[#22C55E]">Task</span>
          )}
          {isOverdue && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-500">Overdue</span>
          )}
          {task.recurrence && task.recurrence !== 'none' && (
            <span title={`Repeats ${task.recurrence}`} className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary-50 text-primary-500">↻</span>
          )}
          {task.blockedBy && task.blockedBy.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
              <Lock size={10} /> Blocked
            </span>
          )}
        </div>
        <div ref={menuRef} className="relative flex items-center" onClick={e => e.stopPropagation()}>
          {task.taskNumber != null && (
              <span className="text-[10px] font-semibold text-gray-400 mr-1 select-none">
                  #{String(task.taskNumber).padStart(3, '0')}
              </span>
          )}
          <motion.button
            className="text-gray-300 hover:text-gray-500 transition-colors"
            initial={{ opacity: 0 }}
            animate={{ opacity: showMenu ? 1 : undefined }}
            whileHover={{ opacity: 1 }}
            onClick={e => { e.stopPropagation(); setShowMenu(v => !v); setConfirmDelete(false); }}
          >
            <MoreHorizontal size={18} />
          </motion.button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                className="absolute right-0 top-full mt-1 w-44 bg-surface-50 rounded-xl border border-surface-200 shadow-lg z-20 overflow-hidden"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
              >
                {!confirmDelete ? (
                  <>
                    <button
                      onClick={() => { setShowMenu(false); onClick(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-surface-50 transition-colors"
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                    {otherStatuses.map(s => (
                      <button
                        key={s}
                        onClick={() => { onMoveTask(task.id, s); setShowMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-surface-50 transition-colors"
                      >
                        <ArrowRight size={13} /> Move to {statusLabels[s]}
                      </button>
                    ))}
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#D8727D] hover:bg-[#D8727D0A] transition-colors border-t border-surface-100"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </>
                ) : (
                  <div className="px-4 py-3">
                    <p className="text-xs text-gray-600 mb-2 font-medium">Delete this task?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowMenu(false); setConfirmDelete(false); onDeleteTask?.(task.id); }}
                        className="flex-1 text-xs font-semibold bg-[#D8727D] text-white py-1.5 rounded-lg hover:bg-[#c5616b] transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 text-xs font-semibold bg-surface-100 text-gray-600 py-1.5 rounded-lg hover:bg-surface-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 text-[15px] mb-1 leading-snug">{task.title}</h3>
      {task.description && (
        <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">{task.description}</p>
      )}
      {task.images && task.images.length > 0 && (
        <div className="flex gap-2 mb-3">
          {task.images.map((img, i) => (
            <motion.div key={i} className="flex-1 h-[110px] rounded-xl overflow-hidden bg-surface-100"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.08 + i * 0.1 + 0.15 }}
            >
              <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
            </motion.div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <AvatarGroup names={assigneeNames} colors={assigneeColors} size="sm" max={3} />
        <div className="flex items-center gap-3 text-gray-400">
          <motion.div className="flex items-center gap-1 text-xs" whileHover={{ color: '#5030E5' }}>
            <MessageSquare size={14} /><span>{task.comments} comments</span>
          </motion.div>
          <motion.div className="flex items-center gap-1 text-xs" whileHover={{ color: '#5030E5' }}>
            <Paperclip size={14} /><span>{task.files} files</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default TaskCard;
