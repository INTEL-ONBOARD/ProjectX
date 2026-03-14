import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutGrid,
    MessageSquare,
    CheckSquare,
    Users,
    Clock3,
    BarChart3,
    Building2,
    Settings,
    ChevronLeft,
    Plus,
    MoreHorizontal,
    Bug,
    X,
    Shield,
} from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useRolePerms } from '../../context/RolePermsContext';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    activeProject: string;
    onProjectSelect: (id: string) => void;
}

const ALL_NAV_ITEMS = [
    { id: '/', label: 'Task Board', icon: LayoutGrid },
    { id: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: '/messages', label: 'Messages', icon: MessageSquare },
    { id: '/tasks', label: 'Tasks', icon: CheckSquare },
    { id: '/teams', label: 'Projects', icon: Users },
    { id: '/members', label: 'Members', icon: Users },
    { id: '/attendance', label: 'Attendance', icon: Clock3 },
    { id: '/reports', label: 'Reports', icon: BarChart3 },
    { id: '/organization', label: 'Organization', icon: Building2 },
    { id: '/settings', label: 'Settings', icon: Settings },
    { id: '/admin', label: 'Admin', icon: Shield, adminOnly: true },
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
    const { projects, createProject } = useProjects();
    const { user } = useAuth();
    const { getAllowedRoutes } = useRolePerms();

    const allowedRoutes = getAllowedRoutes(user?.role ?? 'member');
    const navItems = ALL_NAV_ITEMS.filter(item => {
        if (item.adminOnly) return user?.role === 'admin';
        return allowedRoutes.includes(item.id);
    });

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
                                    <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
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
                                    >
                                        <button
                                            onClick={() => onProjectSelect(project.id)}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group ${activeProject === project.id
                                                ? 'bg-primary-50 text-primary-700'
                                                : 'text-gray-600 hover:bg-surface-100'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-2 h-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: project.color }}
                                                />
                                                <span className="text-sm font-medium truncate">
                                                    {project.name}
                                                </span>
                                            </div>
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{
                                                    opacity: hoveredProject === project.id || activeProject === project.id ? 1 : 0,
                                                }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                <MoreHorizontal size={16} className="text-gray-400" />
                                            </motion.div>
                                        </button>
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
        </>
    );
};

export default Sidebar;
