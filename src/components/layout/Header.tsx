import React, { useContext, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Calendar, HelpCircle, Bell, ChevronDown, Bug, Keyboard, LogOut, Settings, CheckSquare, Users, MessageCircle, CheckSquare2, Clock, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../context/ProjectContext';
import { useMembersContext } from '../../context/MembersContext';
import { Avatar } from '../ui/Avatar';
import CalendarDropdown from './CalendarDropdown';
import { useNotifications } from '../../context/NotificationContext';


const priorityColors: Record<string, string> = {
    high: 'text-[#D8727D] bg-[#D8727D15]',
    low: 'text-[#D58D49] bg-[#DFA87420]',
    completed: 'text-[#68B266] bg-[#83C29D20]',
};

const Header: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useContext(AppContext);
    const { logout, user: authUser } = useAuth();
    const { allTasks } = useProjects();
    const { members, getMemberColor } = useMembersContext();
    const { notifications, unreadCount, markAllRead, markRead, markAllReadOnOpen } = useNotifications();

    const [searchRaw, setSearchRaw] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isUserOpen, setIsUserOpen] = useState(false);

    const searchRef = useRef<HTMLDivElement>(null);
    const calendarRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const helpRef = useRef<HTMLDivElement>(null);
    const userRef = useRef<HTMLDivElement>(null);

    // ── Search results ─────────────────────────────────────────────────────────
    const q = searchQuery.toLowerCase().trim();
    const matchedTasks = q.length >= 2
        ? allTasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 5)
        : [];
    const matchedMembers = q.length >= 2
        ? members.filter(m => m.name.toLowerCase().includes(q)).slice(0, 3)
        : [];
    const hasResults = matchedTasks.length > 0 || matchedMembers.length > 0;

    // ── Help items ─────────────────────────────────────────────────────────────
    const helpItems = [
        {
            label: 'Keyboard Shortcuts',
            icon: <Keyboard size={15} />,
            action: () => window.dispatchEvent(new Event('open-shortcuts')),
        },
        {
            label: 'Report an Issue',
            icon: <Bug size={15} />,
            action: () => window.dispatchEvent(new Event('open-bug-report')),
        },
    ];

    // ── Outside click handler ──────────────────────────────────────────────────
    useEffect(() => {
        function handleMouseDown(e: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
            if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) setIsCalendarOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setIsNotifOpen(false);
            if (helpRef.current && !helpRef.current.contains(e.target as Node)) setIsHelpOpen(false);
            if (userRef.current && !userRef.current.contains(e.target as Node)) setIsUserOpen(false);
        }
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, []);

    function handleSearchChange(val: string) {
        setSearchRaw(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setSearchQuery(val), 200);
    }

    useEffect(() => {
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, []);

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (matchedTasks.length > 0) {
                navigate('/tasks', { state: { search: searchQuery } });
                setShowResults(false);
                setSearchRaw('');
                setSearchQuery('');
            } else if (matchedMembers.length > 0) {
                navigate('/members');
                setShowResults(false);
                setSearchRaw('');
                setSearchQuery('');
            }
        }
        if (e.key === 'Escape') {
            setShowResults(false);
        }
    };

    return (
        <motion.header
            className="h-16 border-b border-surface-200 flex items-center justify-between px-6 shrink-0 titlebar-drag"
            style={{ background: 'var(--bg-header)' }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
        >
            {/* Search */}
            <div ref={searchRef} className="relative w-[340px] titlebar-no-drag">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Search tasks, members..."
                    value={searchRaw}
                    onChange={e => { handleSearchChange(e.target.value); setShowResults(e.target.value.trim().length >= 2); }}
                    onFocus={() => { if (searchRaw.trim().length >= 2) setShowResults(true); }}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-100 rounded-xl border-none text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all"
                />

                {/* Search results dropdown */}
                <AnimatePresence>
                    {showResults && hasResults && (
                        <motion.div
                            className="absolute left-0 top-full mt-2 w-full rounded-2xl border border-surface-200 shadow-lg z-50 overflow-hidden"
                            style={{ background: 'var(--bg-dropdown)' }}
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                        >
                            {matchedTasks.length > 0 && (
                                <>
                                    <div className="px-4 py-2 border-b border-surface-100">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tasks</span>
                                    </div>
                                    {matchedTasks.map(task => (
                                        <button
                                            key={task.id}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-50 transition-colors text-left"
                                            onClick={() => { navigate('/tasks', { state: { search: task.title } }); setShowResults(false); setSearchRaw(''); setSearchQuery(''); }}
                                        >
                                            <CheckSquare size={13} className="text-gray-400 shrink-0" />
                                            <span className="text-xs text-gray-800 flex-1 truncate">{task.title}</span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 capitalize ${priorityColors[task.priority] ?? ''}`}>
                                                {task.priority}
                                            </span>
                                        </button>
                                    ))}
                                </>
                            )}
                            {matchedMembers.length > 0 && (
                                <>
                                    <div className={`px-4 py-2 border-b border-surface-100 ${matchedTasks.length > 0 ? 'border-t' : ''}`}>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Members</span>
                                    </div>
                                    {matchedMembers.map(member => (
                                        <button
                                            key={member.id}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-50 transition-colors text-left"
                                            onClick={() => { navigate('/members'); setShowResults(false); setSearchRaw(''); setSearchQuery(''); }}
                                        >
                                            <Avatar name={member.name} color={getMemberColor(member.id)} size="sm" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-semibold text-gray-800 truncate">{member.name}</div>
                                                <div className="text-[10px] text-gray-400 truncate">{member.designation ?? member.role}</div>
                                            </div>
                                            <Users size={12} className="text-gray-300 shrink-0" />
                                        </button>
                                    ))}
                                </>
                            )}
                        </motion.div>
                    )}
                    {showResults && !hasResults && q.length >= 2 && (
                        <motion.div
                            className="absolute left-0 top-full mt-2 w-full rounded-2xl border border-surface-200 shadow-lg z-50 px-4 py-4 text-center"
                            style={{ background: 'var(--bg-dropdown)' }}
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15 }}
                        >
                            <span className="text-xs text-gray-400">No results for "{searchRaw}"</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-3 titlebar-no-drag">
                {/* Calendar with dropdown */}
                <div ref={calendarRef} className="relative">
                    <motion.button
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-surface-100 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsCalendarOpen(open => !open)}
                    >
                        <Calendar size={20} />
                    </motion.button>
                    <AnimatePresence>
                        {isCalendarOpen && (
                            <CalendarDropdown onClose={() => setIsCalendarOpen(false)} />
                        )}
                    </AnimatePresence>
                </div>

                {/* Help */}
                <div ref={helpRef} className="relative">
                    <motion.button
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isHelpOpen ? 'bg-primary-50 text-primary-500' : 'text-gray-400 hover:text-gray-600 hover:bg-surface-100'}`}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => { setIsHelpOpen(o => !o); setIsNotifOpen(false); }}
                    >
                        <HelpCircle size={20} />
                    </motion.button>
                    <AnimatePresence>
                        {isHelpOpen && (
                            <motion.div
                                className="absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-card border border-surface-200 z-50 overflow-hidden"
                                style={{ background: 'var(--bg-dropdown)' }}
                                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                transition={{ duration: 0.15 }}
                            >
                                <div className="px-4 py-3 border-b border-surface-100">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Help & Support</span>
                                </div>
                                {helpItems.map(item => (
                                    <button key={item.label} onClick={() => { item.action(); setIsHelpOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-100 transition-colors text-left">
                                        <span className="w-7 h-7 rounded-lg bg-surface-100 flex items-center justify-center shrink-0 text-gray-500">
                                            {item.icon}
                                        </span>
                                        <div className="text-xs font-semibold text-gray-700">{item.label}</div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Notifications */}
                <div ref={notifRef} className="relative">
                    <motion.button
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors relative ${isNotifOpen ? 'bg-primary-50 text-primary-500' : 'text-gray-400 hover:text-gray-600 hover:bg-surface-100'}`}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => { const opening = !isNotifOpen; setIsNotifOpen(o => !o); setIsHelpOpen(false); if (opening) markAllReadOnOpen(); }}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <div className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[#D8727D] rounded-full flex items-center justify-center">
                                <span className="text-[9px] font-bold text-white leading-none">{unreadCount > 99 ? '99+' : unreadCount}</span>
                            </div>
                        )}
                    </motion.button>
                    <AnimatePresence>
                        {isNotifOpen && (
                            <motion.div
                                className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-card border border-surface-200 z-50 overflow-hidden"
                                style={{ background: 'var(--bg-dropdown)' }}
                                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                transition={{ duration: 0.15 }}
                            >
                                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
                                    <span className="text-xs font-bold text-gray-900">Notifications</span>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllRead}
                                            className="text-[10px] font-semibold text-primary-500 hover:text-primary-600 transition-colors"
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                </div>
                                {notifications.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-xs text-gray-400">No notifications</div>
                                ) : (
                                    <div className="max-h-72 overflow-y-auto">
                                        {notifications.slice(0, 15).map(notif => {
                                            const IconComp = notif.type === 'new_message' ? MessageCircle
                                                : notif.type === 'task_assigned' ? CheckSquare2
                                                : notif.type === 'permission_request' ? ShieldAlert
                                                : Clock;
                                            const iconColor = notif.type === 'new_message' ? 'text-primary-500 bg-primary-50'
                                                : notif.type === 'task_assigned' ? 'text-[#68B266] bg-[#83C29D20]'
                                                : notif.type === 'permission_request' ? 'text-[#D97706] bg-[#D9770615]'
                                                : 'text-[#D8727D] bg-[#D8727D15]';
                                            const navTarget = notif.type === 'new_message' ? '/messages'
                                                : notif.type === 'permission_request' ? '/users'
                                                : '/tasks';
                                            return (
                                                <button
                                                    key={notif.id}
                                                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-surface-50 transition-colors text-left border-b border-surface-100 last:border-0 ${!notif.read ? 'bg-primary-50/30' : ''}`}
                                                    onClick={() => { markRead(notif.id); navigate(navTarget); setIsNotifOpen(false); }}
                                                >
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconColor}`}>
                                                        <IconComp size={13} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`text-xs font-semibold truncate ${!notif.read ? 'text-gray-900' : 'text-gray-600'}`}>{notif.title}</div>
                                                        {notif.body && <div className="text-[10px] text-gray-400 mt-0.5 truncate">{notif.body}</div>}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                                                        <div className="text-[10px] text-gray-300">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                        {!notif.read && <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="w-px h-8 bg-surface-200 mx-1" />

                {/* User profile */}
                <div ref={userRef} className="relative">
                    <motion.button
                        className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-xl hover:bg-surface-100 transition-colors"
                        whileHover={{ scale: 1.01 }}
                        onClick={() => { setIsUserOpen(o => !o); setIsNotifOpen(false); setIsHelpOpen(false); setIsCalendarOpen(false); }}
                    >
                        <div className="text-right">
                            <div className="text-sm font-semibold text-gray-800 leading-tight">
                                {authUser?.name ?? currentUser?.name ?? ''}
                            </div>
                            <div className="text-[11px] text-gray-400 leading-tight capitalize">
                                {authUser?.role ?? currentUser?.designation ?? ''}
                            </div>
                        </div>
                        <Avatar name={authUser?.name ?? currentUser?.name ?? ''} color={getMemberColor(currentUser?.id ?? '')} size="md" />
                        <motion.div animate={{ rotate: isUserOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown size={14} className="text-gray-400" />
                        </motion.div>
                    </motion.button>
                    <AnimatePresence>
                        {isUserOpen && (
                            <motion.div
                                className="absolute right-0 top-full mt-2 w-52 rounded-2xl shadow-card border border-surface-200 z-50 overflow-hidden"
                                style={{ background: 'var(--bg-dropdown)' }}
                                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                transition={{ duration: 0.15 }}
                            >
                                <div className="px-4 py-3 border-b border-surface-100">
                                    <div className="text-sm font-semibold text-gray-800">{authUser?.name ?? currentUser?.name}</div>
                                    <div className="text-xs text-gray-400">{authUser?.email}</div>
                                </div>
                                <button
                                    onClick={() => { navigate('/settings'); setIsUserOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-100 transition-colors text-left"
                                >
                                    <span className="w-7 h-7 rounded-lg bg-surface-100 flex items-center justify-center shrink-0">
                                        <Settings size={14} className="text-gray-500" />
                                    </span>
                                    <span className="text-xs font-semibold text-gray-700">Settings</span>
                                </button>
                                <button
                                    onClick={() => { logout(); setIsUserOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors text-left"
                                >
                                    <span className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                                        <LogOut size={14} className="text-red-500" />
                                    </span>
                                    <span className="text-xs font-semibold text-red-500">Sign Out</span>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.header>
    );
};

export default Header;
