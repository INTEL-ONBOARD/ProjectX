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
    Pencil,
    Trash2,
    GripVertical,
    FolderKanban,
} from 'lucide-react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useRolePerms } from '../../context/RolePermsContext';
import NewProjectModal, { ProjectRichFields } from '../modals/NewProjectModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';

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
    { id: '/teams', label: 'Projects', icon: FolderKanban },
    { id: '/members', label: 'Members', icon: Users },
    { id: '/attendance', label: 'Attendance', icon: Clock3 },
    { id: '/reports', label: 'Reports', icon: BarChart3 },
    { id: '/users', label: 'Users', icon: Users2 },
    { id: '/settings', label: 'Settings', icon: Settings },
];

interface SortableNavItemProps {
    item: { id: string; label: string; icon: React.ElementType };
    isActive: boolean;
    collapsed: boolean;
    unreadMsgCount: number;
    onMessagesPage: boolean;
    onClick: () => void;
}

const SortableNavItem: React.FC<SortableNavItemProps> = ({
    item,
    isActive,
    collapsed,
    unreadMsgCount,
    onMessagesPage,
    onClick,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const Icon = item.icon;

    return (
        <li ref={setNodeRef} style={style} className="relative">
            {isActive && (
                <motion.div
                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary-500 rounded-r-full"
                    layoutId="nav-indicator"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
            )}
            <div className="flex items-center group">
                {!collapsed && (
                    <span
                        {...attributes}
                        {...listeners}
                        className="pl-1 pr-0.5 py-2.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
                        title="Drag to reorder"
                    >
                        <GripVertical size={14} />
                    </span>
                )}
                <button
                    onClick={onClick}
                    className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive
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
            </div>
        </li>
    );
};

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
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [editingProject, setEditingProject] = useState<{ id: string; name: string; color: string } & Partial<ProjectRichFields> | null>(null);
    const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const { projects, createProject, updateProject, deleteProject } = useProjects();
    const { user } = useAuth();
    const { getAllowedRoutes } = useRolePerms();
    const [unreadMsgCount, setUnreadMsgCount] = useState(0);
    const [navOrder, setNavOrder] = useState<string[]>([]);

    const allowedRoutes = getAllowedRoutes(user?.role ?? 'member');

    const allowedIds = ALL_NAV_ITEMS
        .filter(item => allowedRoutes.includes(item.id))
        .map(item => item.id);

    const orderedNavIds = [
        ...navOrder.filter(id => allowedIds.includes(id)),
        ...allowedIds.filter(id => !navOrder.includes(id)),
    ];

    const navItems = orderedNavIds
        .map(id => ALL_NAV_ITEMS.find(item => item.id === id)!);

    const onMessagesPage = location.pathname === '/messages';

    const sensors = useSensors(useSensor(PointerSensor));

    const handleDragEnd = async (event: DragEndEvent) => {
        if (!user?.id) return;
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = orderedNavIds.indexOf(active.id as string);
        const newIndex = orderedNavIds.indexOf(over.id as string);
        const newOrder = arrayMove(orderedNavIds, oldIndex, newIndex);

        setNavOrder(newOrder);

        // Fire-and-forget save: read full prefs, merge navOrder, write back
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const api = (window as any).electronAPI;
            const current = await api?.userPrefs?.get(user?.id);
            await api?.userPrefs?.set({ ...current, navOrder: newOrder });
        } catch (err) {
            console.error('[Sidebar] Failed to save navOrder:', err);
        }
    };

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpenId(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api = (window as any).electronAPI;
        api?.userPrefs?.get(user.id)
            .then((prefs: { navOrder?: string[] } | null) => {
                if (prefs?.navOrder?.length) setNavOrder(prefs.navOrder);
            })
            .catch(() => { /* fall back to default order */ });
    }, [user?.id]);

    // Unread message badge: batch-fetch counts for all peers in one IPC call.
    // 300ms delay after leaving messages page lets markMessagesRead finish before we recount.
    useEffect(() => {
        if (!user?.id) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api = (window as any).electronAPI;

        const recompute = () => {
            api?.db?.getUnreadCounts?.(user.id)
                .then((counts: Record<string, number>) => {
                    const total = Object.values(counts).reduce((sum: number, n: number) => sum + n, 0);
                    setUnreadMsgCount(total);
                })
                .catch(() => { /* ignore */ });
        };

        if (onMessagesPage) {
            // User is on messages page — hide badge immediately, no listener needed
            setUnreadMsgCount(0);
            return;
        }

        // Not on messages page: recompute from DB (300ms delay so any
        // markMessagesRead calls from the messages page have time to finish in MongoDB)
        const timer = setTimeout(recompute, 300);

        // Increment badge in real-time when a new message arrives while away from messages page
        const unsub = api?.onNewMessage?.((_: unknown, msg: { from: string; to: string }) => {
            if (msg.to !== user.id) return;
            setUnreadMsgCount(prev => prev + 1);
        });

        return () => { clearTimeout(timer); unsub?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, onMessagesPage]);

    return (
        <>
        <motion.aside
            className="h-screen flex flex-col border-r border-surface-200 shadow-sidebar relative z-20"
            style={{ background: 'var(--bg-sidebar)' }}
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
            <nav className="mt-4 px-3 flex-1 flex flex-col min-h-0">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={navItems.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                        disabled={collapsed}
                    >
                        <ul className="space-y-1">
                            {navItems.map((item) => (
                                <SortableNavItem
                                    key={item.id}
                                    item={item}
                                    isActive={location.pathname === item.id}
                                    collapsed={collapsed}
                                    unreadMsgCount={unreadMsgCount}
                                    onMessagesPage={onMessagesPage}
                                    onClick={() => navigate(item.id)}
                                />
                            ))}
                        </ul>
                    </SortableContext>
                </DndContext>

                {/* My Projects section */}
                <AnimatePresence>
                    {!collapsed && (
                        <motion.div
                            className="mt-8 flex-1 flex flex-col min-h-0 overflow-hidden"
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

                            <ul className="space-y-0.5 overflow-y-auto flex-1 pr-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--color-surface-300) transparent' }}>
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
                                                    className="absolute right-0 top-full mt-1 z-50 border border-surface-200 rounded-xl shadow-lg py-1 w-36"
                                    style={{ background: 'var(--bg-dropdown)' }}
                                                >
                                                    <button
                                                        onClick={async () => {
                                                            setMenuOpenId(null);
                                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                            const db = (window as any).electronAPI?.db;
                                                            let rich: Partial<ProjectRichFields> = {};
                                                            try { rich = await db?.getProjectRich?.(project.id) ?? {}; } catch { /* ignore */ }
                                                            setEditingProject({ id: project.id, name: project.name, color: project.color, ...rich });
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-surface-50 transition-colors"
                                                    >
                                                        <Pencil size={13} className="text-gray-400" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setMenuOpenId(null);
                                                            setConfirmDeleteProjectId(project.id);
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

            {/* Report Issue Button - hidden */}
        </motion.aside>

        {/* New Project Modal */}
        <AnimatePresence>
            {showNewProject && (
                <NewProjectModal
                    onClose={() => setShowNewProject(false)}
                    onSubmit={async (name, color, rich) => {
                        const proj = await createProject(name, color);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const db = (window as any).electronAPI?.db;
                        if (proj?.id && db?.setProjectRich) {
                            await db.setProjectRich({ projectId: proj.id, ...rich, memberIds: [], starred: false }).catch(() => {});
                        }
                    }}
                />
            )}
        </AnimatePresence>

        {/* Edit Project Modal */}
        <AnimatePresence>
            {editingProject && (
                <NewProjectModal
                    onClose={() => setEditingProject(null)}
                    initial={editingProject}
                    onSubmit={async (name, color, rich) => {
                        await updateProject(editingProject.id, { name, color });
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const db = (window as any).electronAPI?.db;
                        if (db?.setProjectRich) {
                            await db.setProjectRich({ projectId: editingProject.id, ...rich }).catch(() => {});
                        }
                    }}
                />
            )}
        </AnimatePresence>

        {/* Delete Project Confirm Dialog */}
        {(() => {
            const proj = projects.find(p => p.id === confirmDeleteProjectId);
            return (
                <ConfirmDialog
                    open={confirmDeleteProjectId !== null}
                    title="Delete Project"
                    message={`Delete "${proj?.name ?? 'this project'}"? This cannot be undone.`}
                    confirmLabel="Delete"
                    danger
                    onConfirm={async () => {
                        if (confirmDeleteProjectId) await deleteProject(confirmDeleteProjectId);
                        setConfirmDeleteProjectId(null);
                    }}
                    onCancel={() => setConfirmDeleteProjectId(null)}
                />
            );
        })()}
        </>
    );
};

export default Sidebar;
