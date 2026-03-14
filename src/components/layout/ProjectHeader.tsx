import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pencil, Link2, UserPlus, SlidersHorizontal, Calendar,
  Share2, LayoutGrid, List, X, Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarGroup } from '../ui/Avatar';
import { useProjects } from '../../context/ProjectContext';
import { useMembersContext } from '../../context/MembersContext';
import InviteMemberModal from '../modals/InviteMemberModal';
import { useToast } from '../../hooks/useToast';

interface ProjectHeaderProps {
  onFilterChange?: (filters: { priority: string; assignees: string[]; dueDateFilter: string }) => void;
  onTodayToggle?: (active: boolean) => void;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({ onFilterChange, onTodayToggle }) => {
  const navigate = useNavigate();
  const { projects, activeProject, updateProject } = useProjects();
  const { members, addMember, getMemberColor } = useMembersContext();
  const { show, ToastEl } = useToast();

  const currentProject = projects.find(p => p.id === activeProject);
  const projectName = currentProject?.name ?? 'Untitled';

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(projectName);
  const [showFilter, setShowFilter] = useState(false);
  const [todayActive, setTodayActive] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showInvite, setShowInvite] = useState(false);

  // Filter state
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignees, setFilterAssignees] = useState<string[]>([]);
  const [filterDueDate, setFilterDueDate] = useState('all');

  const commitName = () => {
    if (activeProject && nameValue.trim()) {
      updateProject(activeProject, { name: nameValue.trim() || 'Untitled' }).catch(console.error);
    }
    setEditingName(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    show('Link copied to clipboard!');
  };

  const handleTodayToggle = () => {
    const next = !todayActive;
    setTodayActive(next);
    onTodayToggle?.(next);
  };

  const handleFilterChange = (priority: string, assignees: string[], dueDateFilter: string) => {
    setFilterPriority(priority);
    setFilterAssignees(assignees);
    setFilterDueDate(dueDateFilter);
    onFilterChange?.({ priority, assignees, dueDateFilter });
  };

  const toggleAssigneeFilter = (id: string) => {
    const next = filterAssignees.includes(id)
      ? filterAssignees.filter(a => a !== id)
      : [...filterAssignees, id];
    handleFilterChange(filterPriority, next, filterDueDate);
  };

  return (
    <motion.div
      className="px-8 pt-6 pb-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      {ToastEl}
      {/* Title row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {editingName ? (
            <input
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => {
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') { setNameValue(projectName); setEditingName(false); }
              }}
              className="text-[42px] font-bold text-gray-900 tracking-tight leading-none border-b-2 border-primary-400 focus:outline-none bg-transparent w-auto"
              autoFocus
            />
          ) : (
            <motion.h1
              className="text-[42px] font-bold text-gray-900 tracking-tight leading-none"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              {projectName}
            </motion.h1>
          )}
          {activeProject && (
            <div className="flex items-center gap-1.5 mt-2">
              <motion.button
                onClick={() => { setNameValue(projectName); setEditingName(true); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              >
                <Pencil size={16} />
              </motion.button>
              <motion.button
                onClick={handleShare}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              >
                <Link2 size={16} />
              </motion.button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors text-sm font-semibold"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          >
            <UserPlus size={18} /> Invite
          </motion.button>
          <AvatarGroup names={members.map(m => m.name)} colors={members.map(m => getMemberColor(m.id))} size="md" max={4} />
        </div>
      </div>

      {/* Filter row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setShowFilter(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilter ? 'border-primary-400 bg-primary-50 text-primary-600' : 'border-surface-300 text-gray-600 hover:bg-surface-100'}`}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          >
            <SlidersHorizontal size={16} /> Filter
          </motion.button>
          <motion.button
            onClick={handleTodayToggle}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${todayActive ? 'border-primary-400 bg-primary-50 text-primary-600' : 'border-surface-300 text-gray-600 hover:bg-surface-100'}`}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          >
            <Calendar size={16} /> Today
            {todayActive && <Check size={12} />}
          </motion.button>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 border border-surface-300 rounded-lg text-gray-600 text-sm font-medium hover:bg-surface-100 transition-colors"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          >
            <Share2 size={16} /> Share
          </motion.button>
          <div className="flex items-center bg-surface-100 rounded-lg p-1">
            <motion.button
              onClick={() => { setViewMode('grid'); }}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-gray-600'}`}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            >
              <LayoutGrid size={16} />
            </motion.button>
            <motion.button
              onClick={() => { setViewMode('list'); navigate('/tasks'); }}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-gray-600'}`}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            >
              <List size={16} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            className="mt-3 p-4 bg-surface-50 rounded-xl border border-surface-200 flex flex-wrap gap-4 items-start"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
          >
            {/* Priority */}
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Priority</div>
              <div className="flex gap-1.5">
                {['all', 'low', 'high'].map(p => (
                  <button
                    key={p}
                    onClick={() => handleFilterChange(p, filterAssignees, filterDueDate)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filterPriority === p ? 'bg-primary-500 text-white' : 'bg-white text-gray-500 border border-surface-200 hover:border-primary-300'}`}
                  >
                    {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {/* Due date */}
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Due Date</div>
              <div className="flex gap-1.5">
                {['all', 'today', 'week', 'overdue'].map(d => (
                  <button
                    key={d}
                    onClick={() => handleFilterChange(filterPriority, filterAssignees, d)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors capitalize ${filterDueDate === d ? 'bg-primary-500 text-white' : 'bg-white text-gray-500 border border-surface-200 hover:border-primary-300'}`}
                  >
                    {d === 'all' ? 'All' : d === 'week' ? 'This Week' : d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {/* Assignees */}
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Assignees</div>
              <div className="flex gap-1.5">
                {members.map((m) => {
                  const color = getMemberColor(m.id);
                  const active = filterAssignees.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleAssigneeFilter(m.id)}
                      className={`transition-all ${active ? 'ring-2 ring-primary-400 ring-offset-1 rounded-full' : 'opacity-60 hover:opacity-100'}`}
                      title={m.name}
                    >
                      <Avatar name={m.name} color={color} size="sm" />
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Clear */}
            {(filterPriority !== 'all' || filterAssignees.length > 0 || filterDueDate !== 'all') && (
              <button
                onClick={() => handleFilterChange('all', [], 'all')}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-auto ml-auto"
              >
                <X size={12} /> Clear filters
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite modal */}
      <AnimatePresence>
        {showInvite && (
          <InviteMemberModal
            onClose={() => setShowInvite(false)}
            onSubmit={member => addMember(member).catch(console.error)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProjectHeader;
