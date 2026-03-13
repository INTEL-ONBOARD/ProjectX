import React, { useContext, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Calendar, HelpCircle, Bell, ChevronDown } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import { memberColors } from '../../data/mockData';
import { Avatar } from '../ui/Avatar';
import CalendarDropdown from './CalendarDropdown';

const Header: React.FC = () => {
    const { currentUser } = useContext(AppContext);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleMouseDown(e: MouseEvent) {
            if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
                setIsCalendarOpen(false);
            }
        }
        document.addEventListener('mousedown', handleMouseDown);
        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
        };
    }, []);

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
                <motion.button
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-surface-100 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <HelpCircle size={20} />
                </motion.button>
                <motion.button
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-surface-100 transition-colors relative"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <Bell size={20} />
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                </motion.button>

                <div className="w-px h-8 bg-surface-200 mx-1" />

                {/* User profile */}
                <motion.button
                    className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-xl hover:bg-surface-100 transition-colors"
                    whileHover={{ scale: 1.01 }}
                >
                    <div className="text-right">
                        <div className="text-sm font-semibold text-gray-800 leading-tight">
                            {currentUser?.name ?? ''}
                        </div>
                        <div className="text-[11px] text-gray-400 leading-tight">
                            {currentUser?.designation ?? ''}
                        </div>
                    </div>
                    <Avatar name={currentUser?.name ?? ''} color={memberColors[0]} size="md" />
                    <ChevronDown size={14} className="text-gray-400" />
                </motion.button>
            </div>
        </motion.header>
    );
};

export default Header;
