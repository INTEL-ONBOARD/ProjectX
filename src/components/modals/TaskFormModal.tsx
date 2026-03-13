import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Task, TaskStatus } from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { useMembersContext } from '../../context/MembersContext';
import { Avatar } from '../ui/Avatar';

interface Props {
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id'>) => void;
  initial?: Partial<Task>;
  defaultStatus?: TaskStatus;
}

const TaskFormModal: React.FC<Props> = ({ onClose, onSubmit, initial, defaultStatus }) => {
  const { projects } = useProjects();
  const { members, getMemberColor } = useMembersContext();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [priority, setPriority] = useState<'low' | 'high'>(
    (initial?.priority === 'high' ? 'high' : 'low')
  );
  const [assignees, setAssignees] = useState<string[]>(initial?.assignees ?? []);
  const [projectId, setProjectId] = useState(initial?.projectId ?? '');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const status: TaskStatus = initial?.status ?? defaultStatus ?? 'todo';

  const toggleAssignee = (id: string) =>
    setAssignees(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      assignees,
      projectId: projectId || undefined,
      dueDate: dueDate || undefined,
      comments: initial?.comments ?? 0,
      files: initial?.files ?? 0,
      images: initial?.images ?? [],
    });
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <span className="font-bold text-gray-900 text-sm">
            {initial?.id ? 'Edit Task' : 'New Task'}
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Title *</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Task title"
              className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              required autoFocus
            />
          </div>
          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What needs to be done?"
              rows={3}
              className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 resize-none"
            />
          </div>
          {/* Priority */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Priority</label>
            <div className="flex gap-2">
              {(['low', 'high'] as const).map(p => (
                <button
                  key={p} type="button"
                  onClick={() => setPriority(p)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    priority === p
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
          {/* Project */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Project</label>
            <select
              value={projectId} onChange={e => setProjectId(e.target.value)}
              className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 bg-white"
            >
              <option value="">No project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {/* Due date */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Due Date</label>
            <input
              type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          {/* Assignees */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Assignees</label>
            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
              {members.map(m => (
                <label key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignees.includes(m.id)}
                    onChange={() => toggleAssignee(m.id)}
                    className="rounded text-primary-500"
                  />
                  <Avatar name={m.name} color={getMemberColor(m.id)} size="sm" />
                  <span className="text-sm text-gray-700">{m.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">{m.designation}</span>
                </label>
              ))}
            </div>
          </div>
          <motion.button
            type="submit"
            className="w-full bg-primary-500 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-600 transition-colors mt-1"
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          >
            {initial?.id ? 'Save Changes' : 'Create Task'}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default TaskFormModal;
