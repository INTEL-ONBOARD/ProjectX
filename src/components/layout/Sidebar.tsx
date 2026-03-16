import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutGrid,
    MessageSquare,
    CheckSquare,
    Users,
    Users2,
    Clock3,
    BarChart3,
    Settings,
    ChevronLeft,
    Plus,
    MoreHorizontal,
    Bug,
    X,
    Pencil,
    Trash2,
} from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useRolePerms } from '../../context/RolePermsContext';
import { useMembersContext } from '../../context/MembersContext';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    activeProject: string;
    onProjectSelect: (id: string) => void;
}

const ALL_NAV_ITEMS = [
    { id: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: '/', label: 'Task Board', icon: LayoutGrid },
    { id: '/messages', label: 'Messages', icon: MessageSquare },
    { id: '/tasks', label: 'Tasks', icon: CheckSquare },
    { id: '/teams', label: 'Projects', icon: Users },
    { id: '/members', label: 'Members', icon: Users },
    { id: '/attendance', label: 'Attendance', icon: Clock3 },
    { id: '/reports', label: 'Reports', icon: BarChart3 },
    { id: '/users', label: 'Users', icon: Users2 },
    { id: '/settings', label: 'Settings', icon: Settings },
];

const Sidebar: React.FC<SidebarProps> = ({
    collapsed,
    onToggle,
    activeProject,
    onProjectSelect,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [hoveredProject, setHoveredProject] = useState<string | null>(null);
    const [showNewProject, setShowNewProject] = useState(false);
    const [newProjName, setNewProjName] = useState('');
    const [newProjColor, setNewProjColor] = useState('#5030E5');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [editingProject, setEditingProject] = useState<{ id: string; name: string; color: string } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const { projects, createProject, updateProject, deleteProject } = useProjects();
    const { user } = useAuth();
    const { getAllowedRoutes } = useRolePerms();
    const { members } = useMembersContext();
    const [unreadMsgCount, setUnreadMsgCount] = useState(0);

    const allowedRoutes = getAllowedRoutes(user?.role ?? 'member');
    const navItems = ALL_NAV_ITEMS.filter(item => allowedRoutes.includes(item.id));
    const onMessagesPage = location.pathname === '/messages';

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpenId(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Unread message badge: query DB on mount and whenever user leaves the messages page.
    // 520ms delay after leaving messages page lets markMessagesRead finish before we recount.
    useEffect(() => {
        if (!user?.id || members.length === 0) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = () => (window as any).electronAPI?.db;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api = (window as any).electronAPI;
        const peers = members.filter((m: { id: string }) => m.id !== user.id);

        const recompute = async () => {
            let total = 0;
            for (const peer of peers) {
                try {
                    const msgs: { from: string; read: boolean }[] = await db().getMessagesBetween(user.id, peer.id);
                    total += msgs.filter((m: { from: string; read: boolean }) => m.from !== user.id && !m.read).length;
                } catch { /* ignore */ }
            }
            setUnreadMsgCount(total);
        };

        if (onMessagesPage) {
            // User is on messages page — hide badge immediately, no listener needed
            setUnreadMsgCount(0);
            return;
        }

        // Not on messages page: recompute from DB (520ms delay on first call so any
        // markMessagesRead calls from the messages page have time to finish in MongoDB)
        const timer = setTimeout(recompute, 520);

        // Increment badge in real-time when a new message arrives while away from messages page
        const unsub = api?.onNewMessage?.((_: unknown, msg: { from: string; to: string }) => {
            if (msg.to !== user.id) return;
            setUnreadMsgCount(prev => prev + 1);
        });

        return () => { clearTimeout(timer); unsub?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, members.length, onMessagesPage]);

    return (
        <>
        <motion.aside
            className="h-screen bg-white flex flex-col border-r border-surface-200 shadow-sidebar relative z-20"
            animate={{ width: collapsed ? 72 : 252 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
            {/* Logo */}
            <div className="flex items-center justify-between px-5 h-16 shrink-0">
                <AnimatePresence>
                    {!collapsed && (
                        <motion.div
                            className="flex items-center gap-2.5"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
                                <div className="w-4 h-4 rounded-full bg-white/90" />
                            </div>
                            <span className="font-bold text-lg text-gray-900 tracking-tight">
                                Project M.
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
                <motion.button
                    onClick={onToggle}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-surface-100 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <motion.div
                        animate={{ rotate: collapsed ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <ChevronLeft size={18} />
                    </motion.div>
                </motion.button>
            </div>

            {/* Separator */}
            <div className="mx-4 h-px bg-surface-200" />

            {/* Navigation */}
            <nav className="mt-4 px-3 flex-1 overflow-hidden">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.id;
                        return (
                            <motion.li key={item.id} whileHover={{ x: 2 }} transition={{ duration: 0.15 }} className="relative">
                                {isActive && (
                                    <motion.div
                                        className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary-500 rounded-r-full"
                                        layoutId="nav-indicator"
                                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                    />
                                )}
                                <button
                                    onClick={() => navigate(item.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                        ? 'bg-primary-50 text-primary-600'
                                        : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700'
                                        }`}
                                >
                                    <div className="relative shrink-0">
                                        <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                                        {item.id === '/messages' && unreadMsgCount > 0 && !onMessagesPage && (
                                            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-full bg-primary-500 text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
                                                {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                                            </span>
                                        )}
                                    </div>
                                    <AnimatePresence>
                                        {!collapsed && (
                                            <motion.span
                                                className="text-sm font-medium whitespace-nowrap"
                                                initial={{ opacity: 0, width: 0 }}
                                                animate={{ opacity: 1, width: 'auto' }}
                                                exit={{ opacity: 0, width: 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                {item.label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </button>
                            </motion.li>
                        );
                    })}
                </ul>

                {/* My Projects section */}
                <AnimatePresence>
                    {!collapsed && (
                        <motion.div
                            className="mt-8"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="flex items-center justify-between px-3 mb-3">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                    My Projects
                                </span>
                                <motion.button
                                    onClick={() => setShowNewProject(true)}
                                    className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-primary-500 hover:bg-primary-50 transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <Plus size={14} />
                                </motion.button>
                            </div>

                            <ul className="space-y-0.5">
                                {projects.map((project, index) => (
                                    <motion.li
                                        key={project.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onHoverStart={() => setHoveredProject(project.id)}
                                        onHoverEnd={() => setHoveredProject(null)}
                                        className="relative"
                                    >
                                        <div className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 ${activeProject === project.id
                                            ? 'bg-primary-50 text-primary-700'
                                            : 'text-gray-600 hover:bg-surface-100'
                                            }`}>
                                            <button
                                                onClick={() => onProjectSelect(project.id)}
                                                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                            >
                                                <div
                                                    className="w-2 h-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: project.color }}
                                                />
                                                <span className="text-sm font-medium truncate">
                                                    {project.name}
                                                </span>
                                            </button>
                                            <motion.button
                                                initial={{ opacity: 0 }}
                                                animate={{
                                                    opacity: hoveredProject === project.id || activeProject === project.id || menuOpenId === project.id ? 1 : 0,
                                                }}
                                                transition={{ duration: 0.15 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMenuOpenId(prev => prev === project.id ? null : project.id);
                                                }}
                                                className="p-0.5 rounded hover:bg-surface-200 transition-colors shrink-0"
                                            >
                                                <MoreHorizontal size={16} className="text-gray-400" />
                                            </motion.button>
                                        </div>

                                        {/* Dropdown menu */}
                                        <AnimatePresence>
                                            {menuOpenId === project.id && (
                                                <motion.div
                                                    ref={menuRef}
                                                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                                    transition={{ duration: 0.12 }}
                                                    className="absolute right-0 top-full mt-1 z-50 bg-white border border-surface-200 rounded-xl shadow-lg py-1 w-36"
                                                >
                                                    <button
                                                        onClick={() => {
                                                            setMenuOpenId(null);
                                                            setEditingProject({ id: project.id, name: project.name, color: project.color });
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-surface-50 transition-colors"
                                                    >
                                                        <Pencil size={13} className="text-gray-400" />
                                                        Rename
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            setMenuOpenId(null);
                                                            if (confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                                                                await deleteProject(project.id);
                                                            }
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 size={13} />
                                                        Delete
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.li>
                                ))}
                            </ul>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* Report Issue Button */}
            <AnimatePresence>
                {!collapsed && (
                    <motion.div
                        className="mx-4 mb-5"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3 }}
                    >
                        <motion.button
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-surface-100 hover:bg-surface-200 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => window.dispatchEvent(new Event('open-bug-report'))}
                        >
                            <Bug size={15} />
                            Report an Issue
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.aside>

        {/* New Project Modal */}
        <AnimatePresence>
            {showNewProject && (
                <motion.div
                    className="fixed inset-0 top-16 z-50 flex items-center justify-center"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                >
                    <div className="absolute inset-0 bg-black/30" onClick={() => setShowNewProject(false)} />
                    <motion.div
                        className="relative bg-white rounded-2xl shadow-card-hover w-full max-w-sm mx-4 p-6"
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-bold text-gray-900 text-base">New Project</h2>
                            <button onClick={() => setShowNewProject(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-surface-100 hover:text-gray-600 transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1 block">Project Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter project name…"
                                    value={newProjName}
                                    onChange={e => setNewProjName(e.target.value)}
                                    className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-400 transition-colors"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Color</label>
                                <div className="flex gap-2.5">
                                    {['#5030E5', '#FFA500', '#30C5E5', '#E53070', '#68B266', '#E4CCFD'].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setNewProjColor(c)}
                                            className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                                            style={{ backgroundColor: c, outline: newProjColor === c ? `3px solid ${c}` : 'none', outlineOffset: '2px' }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-5">
                            <button
                                onClick={() => { setShowNewProject(false); setNewProjName(''); setNewProjColor('#5030E5'); }}
                                className="flex-1 py-2 rounded-xl text-sm font-semibold text-gray-500 bg-surface-100 hover:bg-surface-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <motion.button
                                onClick={() => {
                                    if (newProjName.trim()) {
                                        createProject(newProjName.trim(), newProjColor);
                                        setShowNewProject(false);
                                        setNewProjName('');
                                        setNewProjColor('#5030E5');
                                    }
                                }}
                                disabled={!newProjName.trim()}
                                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                whileHover={{ scale: newProjName.trim() ? 1.02 : 1 }}
                                whileTap={{ scale: newProjName.trim() ? 0.98 : 1 }}
                            >
                                Create
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Edit Project Modal */}
        <AnimatePresence>
            {editingProject && (
                <motion.div
                    className="fixed inset-0 top-16 z-50 flex items-center justify-center"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                >
                    <div className="absolute inset-0 bg-black/30" onClick={() => setEditingProject(null)} />
                    <motion.div
                        className="relative bg-white rounded-2xl shadow-card-hover w-full max-w-sm mx-4 p-6"
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-bold text-gray-900 text-base">Edit Project</h2>
                            <button onClick={() => setEditingProject(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-surface-100 hover:text-gray-600 transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1 block">Project Name</label>
                                <input
                                    type="text"
                                    value={editingProject.name}
                                    onChange={e => setEditingProject(p => p ? { ...p, name: e.target.value } : p)}
                                    className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-400 transition-colors"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Color</label>
                                <div className="flex gap-2.5">
                                    {['#5030E5', '#FFA500', '#30C5E5', '#E53070', '#68B266', '#E4CCFD'].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setEditingProject(p => p ? { ...p, color: c } : p)}
                                            className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                                            style={{ backgroundColor: c, outline: editingProject.color === c ? `3px solid ${c}` : 'none', outlineOffset: '2px' }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-5">
                            <button
                                onClick={() => setEditingProject(null)}
                                className="flex-1 py-2 rounded-xl text-sm font-semibold text-gray-500 bg-surface-100 hover:bg-surface-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <motion.button
                                onClick={async () => {
                                    if (editingProject.name.trim()) {
                                        await updateProject(editingProject.id, { name: editingProject.name.trim(), color: editingProject.color });
                                        setEditingProject(null);
                                    }
                                }}
                                disabled={!editingProject.name.trim()}
                                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                whileHover={{ scale: editingProject.name.trim() ? 1.02 : 1 }}
                                whileTap={{ scale: editingProject.name.trim() ? 0.98 : 1 }}
                            >
                                Save
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
        </>
    );
};

export default Sidebar;
