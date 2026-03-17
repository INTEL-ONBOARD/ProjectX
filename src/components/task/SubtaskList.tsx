import React, { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { Subtask } from '../../types';

interface SubtaskListProps {
  taskId: string;
  subtasks: Subtask[];
  onUpdate: (subtasks: Subtask[]) => void;
}

export function SubtaskList({ taskId, subtasks, onUpdate }: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState('');
  const completed = subtasks.filter(s => s.completed).length;
  const pct = subtasks.length > 0 ? Math.round((completed / subtasks.length) * 100) : 0;

  function handleToggle(id: string) {
    onUpdate(subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  }

  function handleAdd() {
    if (!newTitle.trim()) return;
    const newSubtask: Subtask = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: newTitle.trim(),
      completed: false,
    };
    onUpdate([...subtasks, newSubtask]);
    setNewTitle('');
  }

  function handleRemove(id: string) {
    onUpdate(subtasks.filter(s => s.id !== id));
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          Checklist
        </span>
        <span className="text-xs text-gray-400">{completed}/{subtasks.length}</span>
        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-gray-400">{pct}%</span>
      </div>

      <div className="space-y-1 mb-2">
        {subtasks.map(s => (
          <div key={s.id} className="flex items-center gap-2 group py-0.5">
            <button
              onClick={() => handleToggle(s.id)}
              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                s.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-primary-400'
              }`}
            >
              {s.completed && <Check size={10} className="text-white" />}
            </button>
            <span className={`text-sm flex-1 ${s.completed ? 'line-through text-gray-400' : ''}`} style={{ color: s.completed ? undefined : 'var(--text-primary)' }}>
              {s.title}
            </span>
            <button
              onClick={() => handleRemove(s.id)}
              className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-500 transition-opacity"
            >&#x2715;</button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add checklist item..."
          className="flex-1 text-sm outline-none bg-transparent"
          style={{ color: 'var(--text-primary)' }}
        />
        {newTitle.trim() && (
          <button onClick={handleAdd} className="text-primary-500 hover:text-primary-700">
            <Plus size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
