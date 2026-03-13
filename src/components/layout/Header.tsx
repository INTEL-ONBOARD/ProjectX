import React, { useContext, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Calendar, HelpCircle, Bell, ChevronDown, CalendarClock, CheckCircle2, MessageCircle, AlertTriangle, BookOpen, PlayCircle, Headphones, Bug, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { memberColors } from '../../data/mockData';
import { Avatar } from '../ui/Avatar';
import CalendarDropdown from './CalendarDropdown';

type NotifIcon = 'calendar' | 'check' | 'message' | 'alert';
type HelpIcon = 'book' | 'play' | 'headphones' | 'bug';

const NOTIFICATIONS: { id: string; icon: NotifIcon; iconColor: string; iconBg: string; title: string; desc: string; time: string; unread: boolean }[] = [
    { id: 'n1', icon: 'calendar', iconColor: 'text-primary-500', iconBg: 'bg-primary-50', title: 'Sprint review today', desc: 'Dec 3 at 3:00 PM', time: '10m ago', unread: true },
    { id: 'n2', icon: 'check', iconColor: 'text-[#68B266]', iconBg: 'bg-[#83C29D22]', title: 'Task "Moodboard" marked done', desc: 'by Priya Singh', time: '1h ago', unread: true },
    { id: 'n3', icon: 'message', iconColor: 'text-[#30C5E5]', iconBg: 'bg-[#30C5E515]', title: 'New comment on "Auth Flow"', desc: 'Rohan: "Left a review"', time: '2h ago', unread: false },
    { id: 'n4', icon: 'alert', iconColor: 'text-[#D8727D]', iconBg: 'bg-[#D8727D15]', title: '"API Integration" is overdue', desc: 'Due Dec 1, 2020', time: 'Yesterday', unread: false },
];

const HELP_ITEMS: { icon: HelpIcon; label: string; desc: string; action: () => void }[] = [
    { icon: 'book', label: 'Documentation', desc: 'Guides & references', action: () => window.alert('Documentation coming soon.') },
    { icon: 'play', label: 'Video Tutorials', desc: 'Learn by watching', action: () => window.alert('Video tutorials coming soon.') },
    { icon: 'headphones', label: 'Live Chat Support', desc: 'Talk to the team', action: () => window.alert('Live chat requires backend integration.') },
    { icon: 'bug', label: 'Report a Bug', desc: 'Something broken?', action: () => window.dispatchEvent(new CustomEvent('open-bug-report')) },
];

const NotifIconMap: Record<NotifIcon, React.ElementType> = { calendar: CalendarClock, check: CheckCircle2, message: MessageCircle, alert: AlertTriangle };
const HelpIconMap: Record<HelpIcon, React.ElementType> = { book: BookOpen, play: PlayCircle, headphones: Headphones, bug: Bug };

const Header: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useContext(AppContext);
    const { logout, user: authUser } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isUserOpen, setIsUserOpen] = useState(false);
    const [readIds, setReadIds] = useState<string[]>([]);
    const calendarRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const helpRef = useRef<HTMLDivElement>(null);
    const userRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleMouseDown(e: MouseEvent) {
            if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
                setIsCalendarOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setIsNotifOpen(false);
            }
            if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
                setIsHelpOpen(false);
            }
            if (userRef.current && !userRef.current.contains(e.target as Node)) {
                setIsUserOpen(false);
            }
        }
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, []);

    const unreadCount = NOTIFICATIONS.filter(n => !readIds.includes(n.id) && n.unread).length;

    return (
        <motion.header
            className="h-16 bg-white border-b border-surface-200 flex items-center justify-between px-6 shrink-0"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
        >
            {/* Search */}
            <div className="relative w-[340px]">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search for anything..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) navigate('/tasks'); }}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-100 rounded-xl border-none text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all"
                />
            </div>

            {/* Right section */}
            <div className="flex items-center gap-3">
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
                                className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-card border border-surface-200 z-50 overflow-hidden"
                                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                transition={{ duration: 0.15 }}
                            >
                                <div className="px-4 py-3 border-b border-surface-100">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Help & Support</span>
                                </div>
                                {HELP_ITEMS.map(item => {
                                    const HIcon = HelpIconMap[item.icon];
                                    return (
                                        <button key={item.label} onClick={() => { item.action(); setIsHelpOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-100 transition-colors text-left">
                                            <span className="w-7 h-7 rounded-lg bg-surface-100 flex items-center justify-center shrink-0">
                                                <HIcon size={14} className="text-gray-500" />
                                            </span>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-700">{item.label}</div>
                                                <div className="text-[10px] text-gray-400">{item.desc}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Notifications */}
                <div ref={notifRef} className="relative">
                    <motion.button
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors relative ${isNotifOpen ? 'bg-primary-50 text-primary-500' : 'text-gray-400 hover:text-gray-600 hover:bg-surface-100'}`}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => { setIsNotifOpen(o => !o); setIsHelpOpen(false); setReadIds(NOTIFICATIONS.filter(n => n.unread).map(n => n.id)); }}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D8727D] rounded-full" />
                        )}
                    </motion.button>
                    <AnimatePresence>
                        {isNotifOpen && (
                            <motion.div
                                className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-card border border-surface-200 z-50 overflow-hidden"
                                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                transition={{ duration: 0.15 }}
                            >
                                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
                                    <span className="text-xs font-bold text-gray-900">Notifications</span>
                                    <span onClick={() => setReadIds(NOTIFICATIONS.map(n => n.id))} className="text-[10px] text-primary-500 font-semibold cursor-pointer hover:text-primary-600">Mark all read</span>
                                </div>
                                <div className="max-h-72 overflow-y-auto">
                                    {NOTIFICATIONS.map(n => {
                                        const NIcon = NotifIconMap[n.icon];
                                        const isUnread = !readIds.includes(n.id) && n.unread;
                                        return (
                                            <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-surface-100 last:border-0 transition-colors hover:bg-surface-100 ${isUnread ? 'bg-primary-50' : ''}`}>
                                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${n.iconBg}`}>
                                                    <NIcon size={14} className={n.iconColor} />
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-xs leading-snug ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{n.title}</div>
                                                    <div className="text-[10px] text-gray-400 mt-0.5">{n.desc}</div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <span className="text-[10px] text-gray-400">{n.time}</span>
                                                    {isUnread && <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
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
                        <Avatar name={authUser?.name ?? currentUser?.name ?? ''} color={memberColors[0]} size="md" />
                        <motion.div animate={{ rotate: isUserOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown size={14} className="text-gray-400" />
                        </motion.div>
                    </motion.button>
                    <AnimatePresence>
                        {isUserOpen && (
                            <motion.div
                                className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-card border border-surface-200 z-50 overflow-hidden"
                                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                transition={{ duration: 0.15 }}
                            >
                                {/* User info header */}
                                <div className="px-4 py-3 border-b border-surface-100">
                                    <div className="text-sm font-semibold text-gray-800">{authUser?.name ?? currentUser?.name}</div>
                                    <div className="text-xs text-gray-400">{authUser?.email}</div>
                                </div>
                                {/* Settings */}
                                <button
                                    onClick={() => { navigate('/settings'); setIsUserOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-100 transition-colors text-left"
                                >
                                    <span className="w-7 h-7 rounded-lg bg-surface-100 flex items-center justify-center shrink-0">
                                        <Settings size={14} className="text-gray-500" />
                                    </span>
                                    <span className="text-xs font-semibold text-gray-700">Settings</span>
                                </button>
                                {/* Sign out */}
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
