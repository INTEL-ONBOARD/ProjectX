import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CheckSquare, Layers, Users } from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { useMembersContext } from '../../context/MembersContext';
import { useNavigate } from 'react-router-dom';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const { allTasks, projects } = useProjects();
  const { members } = useMembersContext();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQuery(''); setSelectedIndex(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const q = query.toLowerCase().trim();
  const results: { type: 'task' | 'project' | 'member'; id: string; label: string; sub?: string }[] = q
    ? [
        ...allTasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 5).map(t => ({
          type: 'task' as const, id: t.id, label: t.title,
          sub: projects.find(p => p.id === t.projectId)?.name,
        })),
        ...projects.filter(p => p.name.toLowerCase().includes(q)).slice(0, 3).map(p => ({
          type: 'project' as const, id: p.id, label: p.name, sub: 'Project',
        })),
        ...members.filter(m => m.name.toLowerCase().includes(q)).slice(0, 3).map(m => ({
          type: 'member' as const, id: m.id, label: m.name, sub: m.designation || m.role,
        })),
      ]
    : [];

  const handleSelect = useCallback((item: typeof results[0]) => {
    if (item.type === 'task') navigate('/tasks');
    else if (item.type === 'project') navigate('/teams');
    else navigate('/members');
    onClose();
  }, [navigate, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && results[selectedIndex]) handleSelect(results[selectedIndex]);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, selectedIndex, handleSelect, onClose]);

  const iconFor = (type: string) => {
    if (type === 'task') return <CheckSquare size={14} className="text-primary-500" />;
    if (type === 'project') return <Layers size={14} className="text-amber-500" />;
    return <Users size={14} className="text-emerald-500" />;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] flex items-start justify-center pt-[15vh]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.95, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search tasks, projects, members…"
                className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
              />
              <div className="flex items-center gap-1">
                <kbd className="text-[10px] font-semibold px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">ESC</kbd>
              </div>
            </div>
            {/* Results */}
            {results.length > 0 ? (
              <div className="py-2 max-h-80 overflow-y-auto">
                {results.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === selectedIndex ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
                  >
                    {iconFor(item.type)}
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">{item.label}</span>
                    {item.sub && <span className="text-xs text-gray-400 shrink-0">{item.sub}</span>}
                  </button>
                ))}
              </div>
            ) : query ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-400">No results for "<span className="font-medium text-gray-600">{query}</span>"</p>
              </div>
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-gray-400">Type to search tasks, projects, and members</p>
              </div>
            )}
            {/* Footer */}
            <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4">
              <div className="flex items-center gap-1 text-[10px] text-gray-400"><kbd className="px-1 py-0.5 bg-gray-100 rounded">↑↓</kbd> navigate</div>
              <div className="flex items-center gap-1 text-[10px] text-gray-400"><kbd className="px-1 py-0.5 bg-gray-100 rounded">↵</kbd> select</div>
              <div className="flex items-center gap-1 text-[10px] text-gray-400"><kbd className="px-1 py-0.5 bg-gray-100 rounded">ESC</kbd> close</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
