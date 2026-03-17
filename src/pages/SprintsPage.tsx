import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calendar, CheckCircle2, Circle, Zap, Trash2, ChevronDown } from 'lucide-react';
import { Sprint, Task } from '../types';
import { useProjects } from '../context/ProjectContext';

const dbApi = () => (window as any).electronAPI.db;

const statusConfig = {
  planned:   { label: 'Planned',   bg: 'bg-gray-100',    text: 'text-gray-600',   dot: '#9CA3AF' },
  active:    { label: 'Active',    bg: 'bg-green-100',   text: 'text-green-700',  dot: '#22C55E' },
  completed: { label: 'Completed', bg: 'bg-blue-100',    text: 'text-blue-700',   dot: '#3B82F6' },
};

export default function SprintsPage() {
  const { allTasks, projects, updateTask } = useProjects();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  useEffect(() => {
    dbApi().getSprints().then((data: any) => setSprints(data as Sprint[]));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const sprint = await dbApi().createSprint({ name: newName.trim(), projectId: newProjectId, startDate: newStart, endDate: newEnd, status: 'planned' }) as Sprint;
    setSprints(prev => [...prev, sprint]);
    setNewName(''); setNewProjectId(''); setNewStart(''); setNewEnd('');
    setShowNewForm(false);
  };

  const handleDelete = async (id: string) => {
    await dbApi().deleteSprint(id);
    setSprints(prev => prev.filter(s => s.id !== id));
  };

  const handleStatusChange = async (sprint: Sprint, status: Sprint['status']) => {
    const updated = await dbApi().updateSprint(sprint.id, { status }) as Sprint;
    setSprints(prev => prev.map(s => s.id === sprint.id ? updated : s));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sprints</h1>
          <p className="text-xs text-gray-400 mt-0.5">{sprints.length} sprints total</p>
        </div>
        <motion.button
          onClick={() => setShowNewForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-xs font-semibold hover:bg-primary-600 transition-colors"
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        >
          <Plus size={14} /> New Sprint
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* New sprint form */}
        {showNewForm && (
          <motion.div
            className="bg-white rounded-2xl border border-surface-200 p-4 shadow-sm"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm font-semibold text-gray-800 mb-3">New Sprint</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Sprint name *"
                className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400" />
              <select value={newProjectId} onChange={e => setNewProjectId(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none bg-white text-gray-700">
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none" placeholder="Start date" />
              <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none" placeholder="End date" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="flex-1 py-2 bg-primary-500 text-white rounded-lg text-xs font-semibold hover:bg-primary-600 transition-colors">Create</button>
              <button onClick={() => setShowNewForm(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors">Cancel</button>
            </div>
          </motion.div>
        )}

        {/* Sprint cards */}
        {sprints.length === 0 && !showNewForm && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Zap size={32} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No sprints yet</p>
            <p className="text-xs">Create your first sprint to get started</p>
          </div>
        )}
        {sprints.map(sprint => {
          const sprintTasks = allTasks.filter(t => t.sprintId === sprint.id);
          const doneTasks = sprintTasks.filter(t => t.status === 'done');
          const pct = sprintTasks.length > 0 ? Math.round((doneTasks.length / sprintTasks.length) * 100) : 0;
          const cfg = statusConfig[sprint.status];
          const proj = projects.find(p => p.id === sprint.projectId);
          return (
            <motion.div key={sprint.id} className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm">{sprint.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400">
                    {proj && <span>📁 {proj.name}</span>}
                    {sprint.startDate && <span>📅 {sprint.startDate} → {sprint.endDate || '?'}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={sprint.status} onChange={e => handleStatusChange(sprint, e.target.value as Sprint['status'])}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none bg-white text-gray-600">
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button onClick={() => handleDelete(sprint.id)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
              {/* Progress */}
              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>{doneTasks.length}/{sprintTasks.length} tasks done</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {/* Task list */}
              {sprintTasks.length > 0 && (
                <div className="space-y-1.5 mt-3 border-t border-surface-100 pt-3">
                  {sprintTasks.slice(0, 5).map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-xs text-gray-600">
                      {t.status === 'done' ? <CheckCircle2 size={12} className="text-green-500 shrink-0" /> : <Circle size={12} className="text-gray-300 shrink-0" />}
                      <span className="truncate">{t.taskNumber != null ? `#${String(t.taskNumber).padStart(3,'0')} ` : ''}{t.title}</span>
                    </div>
                  ))}
                  {sprintTasks.length > 5 && <p className="text-[10px] text-gray-400">+{sprintTasks.length - 5} more</p>}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
