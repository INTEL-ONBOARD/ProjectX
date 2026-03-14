import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, LayoutGrid, List, Calendar,
  CheckSquare, Users, TrendingUp, X, ChevronRight, Folder,
  Clock, CheckCircle2, Circle, Star,
  ArrowUpRight, Pencil, Trash2, ArrowRight, MoreVertical,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import { Avatar, AvatarGroup } from '../components/ui/Avatar';
import { useProjects } from '../context/ProjectContext';
import { useMembersContext } from '../context/MembersContext';
import NewProjectModal from '../components/modals/NewProjectModal';
import { Project } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProjectData {
  id: string;
  name: string;
  description: string;
  color: string;
  status: 'active' | 'on-hold' | 'completed';
  priority: 'low' | 'medium' | 'high';
  memberIds: string[];
  taskTotal: number;
  taskDone: number;
  dueDate: string;
  starred: boolean;
  category: string;
}

// ─── Static configs ────────────────────────────────────────────────────────────
const statusConfig = {
  active:    { label: 'Active',    bg: 'bg-[#7AC55520]', text: 'text-[#7AC555]', dot: '#7AC555' },
  'on-hold': { label: 'On Hold',   bg: 'bg-[#FFA50020]', text: 'text-[#FFA500]', dot: '#FFA500' },
  completed: { label: 'Completed', bg: 'bg-[#5030E520]', text: 'text-[#5030E5]', dot: '#5030E5' },
};

const priorityConfig = {
  high:   { label: 'High',   color: '#F06292' },
  medium: { label: 'Medium', color: '#FFA500' },
  low:    { label: 'Low',    color: '#76A5EA' },
};

// ─── Initial rich data for display (description, status, priority, etc.) ──────
const initialRichData: Record<string, Partial<ProjectData>> = {};

// ─── Project Detail Panel ──────────────────────────────────────────────────────
const ProjectDetail: React.FC<{
  project: ProjectData;
  onClose: () => void;
  onOpenProject: () => void;
  onEdit: () => void;
  getMemberColor: (id: string) => string;
  membersById: Record<string, { id: string; name: string; designation?: string; role: string }>;
  taskItems: { title: string; done: boolean }[];
}> = ({ project, onClose, onOpenProject, onEdit, getMemberColor, membersById, taskItems }) => {
  const pct = project.taskTotal > 0 ? Math.round((project.taskDone / project.taskTotal) * 100) : 0;
  const sc = statusConfig[project.status];
  const pc = priorityConfig[project.priority];

  const detailMembers = project.memberIds.map(id => {
    const member = membersById[id];
    return member ? { member, color: getMemberColor(id) } : null;
  }).filter(Boolean) as { member: { id: string; name: string; designation?: string; role: string }; color: string }[];

  const displayTasks = taskItems.length > 0 ? taskItems : [];

  return (
    <motion.div
      className="flex flex-col h-full overflow-y-auto"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Detail header */}
      <div className="px-5 pt-5 pb-4 border-b border-surface-100">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: project.color + '20' }}>
            <Folder size={18} style={{ color: project.color }} />
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-surface-100 flex items-center justify-center hover:bg-surface-200 transition-colors">
            <X size={13} className="text-gray-500" />
          </button>
        </div>
        <h2 className="font-bold text-gray-900 text-base leading-snug">{project.name}</h2>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{project.description || 'No description provided.'}</p>
        <div className="flex items-center gap-2 mt-3">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: sc.dot }} />
            {sc.label}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: pc.color + '18', color: pc.color }}>
            {pc.label} priority
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-100 text-gray-500">{project.category}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="px-5 py-4 border-b border-surface-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-gray-700">Overall Progress</span>
          <span className="text-xs font-bold" style={{ color: project.color }}>{pct}%</span>
        </div>
        <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: project.color }}
            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, delay: 0.1 }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: 'Total', value: project.taskTotal, icon: Circle },
            { label: 'Done', value: project.taskDone, icon: CheckCircle2 },
            { label: 'Left', value: project.taskTotal - project.taskDone, icon: Clock },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex flex-col items-center gap-0.5 bg-surface-50 rounded-xl py-2.5">
                <Icon size={12} className="text-gray-400 mb-0.5" />
                <span className="text-sm font-bold text-gray-900">{s.value}</span>
                <span className="text-[9px] text-gray-400 font-medium">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Due date */}
      <div className="px-5 py-3 border-b border-surface-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center shrink-0">
          <Calendar size={13} className="text-gray-400" />
        </div>
        <div>
          <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Due Date</div>
          <div className="text-xs font-semibold text-gray-900">{project.dueDate}</div>
        </div>
      </div>

      {/* Members */}
      <div className="px-5 py-4 border-b border-surface-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-700">Team Members</span>
          <span className="text-[10px] text-gray-400">{detailMembers.length} people</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {detailMembers.map(({ member, color }) => (
            <div key={member.id} className="flex items-center gap-2.5">
              <Avatar name={member.name} color={color} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-900 truncate">{member.name}</div>
                <div className="text-[10px] text-gray-400 truncate">{member.designation}</div>
              </div>
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${member.role === 'admin' ? 'bg-primary-50 text-primary-500' : 'bg-surface-100 text-gray-400'}`}>
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent tasks */}
      <div className="px-5 py-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-700">Tasks</span>
          <button className="text-[10px] text-primary-500 font-semibold hover:text-primary-700 flex items-center gap-0.5">
            View all <ChevronRight size={10} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {displayTasks.map((t, i) => (
            <div key={i} className="flex items-center gap-2.5 py-2 border-b border-surface-50 last:border-0">
              {t.done
                ? <CheckCircle2 size={14} className="text-[#7AC555] shrink-0" />
                : <Circle size={14} className="text-gray-300 shrink-0" />
              }
              <span className={`text-xs ${t.done ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>{t.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-5 flex gap-2">
        <button onClick={onOpenProject} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary-500 text-white text-xs font-semibold hover:bg-primary-600 transition-colors">
          <ArrowUpRight size={13} /> Open Project
        </button>
        <button onClick={onEdit} className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center hover:bg-surface-200 transition-colors">
          <Pencil size={13} className="text-gray-500" />
        </button>
      </div>
    </motion.div>
  );
};

// ─── Project Card (grid view) ─────────────────────────────────────────────────
const ProjectCard: React.FC<{
  project: ProjectData;
  selected: boolean;
  onSelect: () => void;
  onStar: () => void;
  onDelete: () => void;
  onEdit: () => void;
  index: number;
  confirmDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  getMemberColor: (id: string) => string;
  membersById: Record<string, { name: string }>;
}> = ({ project, selected, onSelect, onStar, onDelete, onEdit, index, confirmDelete, onConfirmDelete, onCancelDelete, getMemberColor, membersById }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const pct = project.taskTotal > 0 ? Math.round((project.taskDone / project.taskTotal) * 100) : 0;
  const sc = statusConfig[project.status];
  const pc = priorityConfig[project.priority];
  const ids = project.memberIds;
  const names = ids.map(id => membersById[id]?.name ?? '');
  const colors = ids.map(id => getMemberColor(id));

  return (
    <motion.div
      onClick={onSelect}
      className={`bg-white rounded-2xl border-2 transition-all cursor-pointer group overflow-hidden ${selected ? 'border-primary-400 shadow-lg shadow-primary-100' : 'border-surface-200 hover:border-surface-300 hover:shadow-md'}`}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -2 }}
    >
      {/* Top color bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: project.color }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: project.color + '20' }}>
              <Folder size={15} style={{ color: project.color }} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-gray-900 text-sm truncate">{project.name}</div>
              <div className="text-[10px] text-gray-400 font-medium">{project.category}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              onClick={e => { e.stopPropagation(); onStar(); }}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${project.starred ? 'text-[#FFA500]' : 'text-gray-300 hover:text-gray-400 opacity-0 group-hover:opacity-100'}`}
            >
              <Star size={13} fill={project.starred ? '#FFA500' : 'none'} />
            </button>
            {/* Context menu */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <MoreVertical size={13} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    className="absolute right-0 top-8 bg-white border border-surface-200 rounded-xl shadow-lg z-20 w-32 py-1 overflow-hidden"
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    <button
                      onClick={() => { setMenuOpen(false); onEdit(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-surface-50 transition-colors"
                    >
                      <Pencil size={12} className="text-gray-400" /> Edit
                    </button>
                    {confirmDelete ? (
                      <div className="px-3 py-2">
                        <div className="text-[10px] text-gray-500 mb-1.5">Delete?</div>
                        <div className="flex gap-1">
                          <button onClick={onConfirmDelete} className="flex-1 text-[10px] bg-red-500 text-white rounded-lg py-1 font-semibold hover:bg-red-600 transition-colors">Yes</button>
                          <button onClick={() => { setMenuOpen(false); onCancelDelete(); }} className="flex-1 text-[10px] bg-surface-100 text-gray-500 rounded-lg py-1 font-semibold hover:bg-surface-200 transition-colors">No</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { onDelete(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-400 leading-relaxed mb-4 line-clamp-2 min-h-[2.5rem]">{project.description}</p>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] text-gray-400 font-medium">Progress</span>
            <span className="text-[10px] font-bold" style={{ color: project.color }}>{pct}%</span>
          </div>
          <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: project.color }}
              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.05 }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-4 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><CheckSquare size={11} /> {project.taskDone}/{project.taskTotal} tasks</span>
          <span className="flex items-center gap-1"><Calendar size={11} /> {project.dueDate}</span>
          <span className="flex items-center gap-1"><Users size={11} /> {ids.length}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-surface-100">
          <AvatarGroup names={names} colors={colors} size="sm" max={4} />
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: pc.color + '18', color: pc.color }}>
              {pc.label}
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
              {sc.label}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Project Row (list view) ──────────────────────────────────────────────────
const ProjectRow: React.FC<{
  project: ProjectData;
  selected: boolean;
  onSelect: () => void;
  onStar: () => void;
  onDelete: () => void;
  confirmDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  index: number;
  getMemberColor: (id: string) => string;
  membersById: Record<string, { name: string }>;
}> = ({ project, selected, onSelect, onStar, onDelete, confirmDelete, onConfirmDelete, onCancelDelete, index, getMemberColor, membersById }) => {
  const pct = project.taskTotal > 0 ? Math.round((project.taskDone / project.taskTotal) * 100) : 0;
  const sc = statusConfig[project.status];
  const pc = priorityConfig[project.priority];
  const ids = project.memberIds;
  const names = ids.map(id => membersById[id]?.name ?? '');
  const colors = ids.map(id => getMemberColor(id));

  return (
    <motion.tr
      onClick={onSelect}
      className={`border-b border-surface-100 cursor-pointer group transition-colors ${selected ? 'bg-primary-50' : 'hover:bg-surface-50'}`}
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
          <div>
            <div className="font-semibold text-xs text-gray-900">{project.name}</div>
            <div className="text-[10px] text-gray-400 truncate max-w-[200px]">{project.description}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <AvatarGroup names={names} colors={colors} size="sm" max={3} />
      </td>
      <td className="px-4 py-3.5">
        <span className="text-xs font-semibold text-gray-700">{project.taskDone}/{project.taskTotal}</span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-surface-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: project.color }} />
          </div>
          <span className="text-[10px] text-gray-400">{pct}%</span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: pc.color + '18', color: pc.color }}>
          {pc.label}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
          {sc.label}
        </span>
      </td>
      <td className="px-4 py-3.5 text-xs text-gray-400">{project.dueDate}</td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={onConfirmDelete} className="text-[10px] bg-red-500 text-white rounded-lg px-2 py-0.5 font-semibold hover:bg-red-600">Yes</button>
              <button onClick={onCancelDelete} className="text-[10px] bg-surface-100 text-gray-500 rounded-lg px-2 py-0.5 font-semibold hover:bg-surface-200">No</button>
            </div>
          ) : (
            <>
              <button onClick={e => { e.stopPropagation(); onStar(); }} className={`w-6 h-6 rounded-lg flex items-center justify-center ${project.starred ? 'text-[#FFA500]' : 'text-gray-300 hover:text-gray-400'}`}>
                <Star size={11} fill={project.starred ? '#FFA500' : 'none'} />
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(); }} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-300 hover:text-[#D8727D]">
                <Trash2 size={11} />
              </button>
            </>
          )}
        </div>
      </td>
    </motion.tr>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const TeamsPage: React.FC = () => {
  const { projects: contextProjects, allTasks, createProject, updateProject, deleteProject, setActiveProject } = useProjects();
  const { members, getMemberColor } = useMembersContext();
  const navigate = useNavigate();

  // Merge context projects with local rich display data
  const [localRichData, setLocalRichData] = useState<Record<string, Partial<ProjectData>>>(initialRichData);

  // Build membersById lookup for child components
  const membersById = Object.fromEntries(members.map(m => [m.id, m]));

  // Derived: combine context projects with local rich data + real task counts
  const projects: ProjectData[] = contextProjects.map(cp => {
    const projectTasks = allTasks.filter(t => t.projectId === cp.id);
    return {
      id: cp.id,
      name: cp.name,
      color: cp.color,
      description: localRichData[cp.id]?.description ?? '',
      status: localRichData[cp.id]?.status ?? 'active',
      priority: localRichData[cp.id]?.priority ?? 'medium',
      memberIds: localRichData[cp.id]?.memberIds ?? [],
      taskTotal: projectTasks.length,
      taskDone: projectTasks.filter(t => t.status === 'done').length,
      dueDate: localRichData[cp.id]?.dueDate ?? 'TBD',
      starred: localRichData[cp.id]?.starred ?? false,
      category: localRichData[cp.id]?.category ?? 'General',
    };
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'active' | 'on-hold' | 'completed'>('all');
  const [search, setSearch] = useState('');

  // New context-driven state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const selected = projects.find(p => p.id === selectedId) ?? null;

  const filtered = projects.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleStar = (id: string) =>
    setLocalRichData(prev => ({
      ...prev,
      [id]: { ...prev[id], starred: !prev[id]?.starred },
    }));

  const handleDeleteProject = (id: string) => {
    deleteProject(id).catch(console.error);
    setLocalRichData(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (selectedId === id) setSelectedId(null);
    setConfirmDeleteId(null);
  };

  // Derive metrics from context
  const totalTasks = allTasks.length;
  const totalCompleted = allTasks.filter(t => t.status === 'done').length;
  const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const activeCount = projects.filter(p => p.status === 'active').length;

  return (
    <motion.div
      className="flex-1 flex flex-col overflow-hidden px-8 bg-white"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="pt-8 pb-5 shrink-0">
          <PageHeader
            eyebrow="Home / Projects"
            title="Projects"
            description="Create and manage your team's projects"
            actions={
              <motion.button
                onClick={() => { setEditingProject(null); setShowProjectModal(true); }}
                className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors"
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              >
                <Plus size={16} /> New Project
              </motion.button>
            }
          />
        </div>

        {/* Metric strip */}
        <div className="grid grid-cols-4 gap-4 mb-5 shrink-0">
          {[
            { label: 'Total Projects', value: projects.length, color: '#5030E5', icon: Folder, sub: `${activeCount} active` },
            { label: 'Total Tasks',    value: totalTasks,      color: '#76A5EA', icon: CheckSquare, sub: 'across all projects' },
            { label: 'Completed',      value: totalCompleted,  color: '#7AC555', icon: CheckCircle2, sub: `${completionRate}% done` },
            { label: 'Team Members',   value: members.length,  color: '#FFA500', icon: Users, sub: 'collaborators' },
          ].map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.label}
                className="bg-white border border-surface-200 rounded-2xl p-4 flex items-center gap-4"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: m.color + '18' }}>
                  <Icon size={18} style={{ color: m.color }} />
                </div>
                <div>
                  <div className="text-xl font-extrabold text-gray-900 leading-none">{m.value}</div>
                  <div className="text-xs font-semibold text-gray-700 mt-0.5">{m.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{m.sub}</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex gap-5 flex-1 min-h-0 pb-6 overflow-hidden">
          {/* Project list / grid */}
          <div className="flex-1 flex flex-col min-w-0 bg-white border border-surface-200 rounded-2xl overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-surface-100 shrink-0">
              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search projects…"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-surface-200 bg-surface-50 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all"
                />
              </div>

              {/* Filter tabs */}
              <div className="flex items-center bg-surface-100 rounded-xl p-1 gap-0.5">
                {(['all', 'active', 'on-hold', 'completed'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${filter === f ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {f === 'on-hold' ? 'On Hold' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 ml-auto">
                <button
                  onClick={() => setView('grid')}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${view === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:bg-surface-100'}`}
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${view === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:bg-surface-100'}`}
                >
                  <List size={14} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <AnimatePresence mode="wait">
                {filtered.length === 0 ? (
                  <motion.div
                    key="empty"
                    className="flex flex-col items-center justify-center h-full gap-3 text-center py-16"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center">
                      <Folder size={24} className="text-gray-300" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-500 text-sm">No projects found</div>
                      <div className="text-xs text-gray-400 mt-0.5">Try adjusting your filters or create a new project</div>
                    </div>
                    <button
                      onClick={() => { setEditingProject(null); setShowProjectModal(true); }}
                      className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-primary-500 hover:text-primary-700 bg-primary-50 px-3 py-2 rounded-lg"
                    >
                      <Plus size={13} /> New Project
                    </button>
                  </motion.div>
                ) : view === 'grid' ? (
                  <motion.div
                    key="grid"
                    className="p-5 grid grid-cols-2 gap-4"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    {filtered.map((p, i) => (
                      <ProjectCard
                        key={p.id} project={p} index={i}
                        selected={selectedId === p.id}
                        onSelect={() => {
                          setSelectedId(selectedId === p.id ? null : p.id);
                        }}
                        onStar={() => toggleStar(p.id)}
                        onDelete={() => setConfirmDeleteId(p.id)}
                        onEdit={() => {
                          const ctxP = contextProjects.find(cp => cp.id === p.id) ?? null;
                          setEditingProject(ctxP);
                          setShowProjectModal(true);
                        }}
                        confirmDelete={confirmDeleteId === p.id}
                        onConfirmDelete={() => handleDeleteProject(p.id)}
                        onCancelDelete={() => setConfirmDeleteId(null)}
                        getMemberColor={getMemberColor}
                        membersById={membersById}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-surface-100 bg-surface-50">
                          {['Project', 'Members', 'Tasks', 'Progress', 'Priority', 'Status', 'Due Date', ''].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider first:pl-5">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((p, i) => (
                          <ProjectRow
                            key={p.id} project={p} index={i}
                            selected={selectedId === p.id}
                            onSelect={() => setSelectedId(selectedId === p.id ? null : p.id)}
                            onStar={() => toggleStar(p.id)}
                            onDelete={() => setConfirmDeleteId(p.id)}
                            confirmDelete={confirmDeleteId === p.id}
                            onConfirmDelete={() => handleDeleteProject(p.id)}
                            onCancelDelete={() => setConfirmDeleteId(null)}
                            getMemberColor={getMemberColor}
                            membersById={membersById}
                          />
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Detail panel — always visible */}
          <div className="w-80 shrink-0 flex flex-col bg-white border border-surface-200 rounded-2xl overflow-hidden">
            <AnimatePresence mode="wait">
              {selected ? (
                <ProjectDetail
                  key={selected.id}
                  project={selected}
                  onClose={() => setSelectedId(null)}
                  onOpenProject={() => { setActiveProject(selected.id); navigate('/'); }}
                  onEdit={() => {
                    const ctxP = contextProjects.find(cp => cp.id === selected.id) ?? null;
                    setEditingProject(ctxP);
                    setShowProjectModal(true);
                  }}
                  getMemberColor={getMemberColor}
                  membersById={membersById}
                  taskItems={allTasks.filter(t => t.projectId === selected.id).map(t => ({ title: t.title, done: t.status === 'done' }))}
                />
              ) : (
                <motion.div
                  key="empty"
                  className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8 h-full"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center">
                    <Folder size={24} className="text-gray-300" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-500 text-sm">No project selected</div>
                    <div className="text-xs text-gray-400 mt-1 leading-relaxed">Select a project from the list to view its details here</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* New / Edit Project Modal */}
      <AnimatePresence>
        {showProjectModal && (
          <NewProjectModal
            onClose={() => setShowProjectModal(false)}
            onSubmit={(name, color) => {
              if (editingProject) updateProject(editingProject.id, { name, color }).catch(console.error);
              else createProject(name, color).catch(console.error);
            }}
            initial={editingProject ? { name: editingProject.name, color: editingProject.color } : undefined}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TeamsPage;
