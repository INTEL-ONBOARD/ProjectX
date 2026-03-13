import React, { useContext, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContext } from '../../context/AppContext';

interface CalendarDropdownProps {
    onClose: () => void;
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getCalendarDays(year: number, month: number): { date: Date; isCurrentMonth: boolean }[] {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const cells: { date: Date; isCurrentMonth: boolean }[] = [];

    // Leading days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
        cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
    }
    // Trailing days to fill 6 rows (42 cells); use separate counter to avoid cells.length mutation issue
    let trailing = 1;
    while (cells.length < 42) {
        cells.push({ date: new Date(year, month + 1, trailing++), isCurrentMonth: false });
    }
    return cells;
}

function toISODate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatLabel(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const CalendarDropdown: React.FC<CalendarDropdownProps> = ({ onClose }) => {
    const { attendanceRecords, setAttendanceRecord, currentUser } = useContext(AppContext);

    // Hooks MUST come before any conditional return (Rules of Hooks)
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState(toISODate(today));

    // Guard after all hooks
    if (!currentUser) return null;

    const cells = getCalendarDays(viewYear, viewMonth);
    const todayStr = toISODate(today);

    const currentRecord = attendanceRecords.find(
        r => r.userId === currentUser.id && r.date === selectedDate
    );
    const currentStatus = currentRecord?.status;

    function prevMonth() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    }

    function markAttendance(status: 'present' | 'absent' | 'wfh') {
        setAttendanceRecord({ userId: currentUser!.id, date: selectedDate, status });
    }

    const toggleBtns: { label: string; status: 'present' | 'absent' | 'wfh'; active: string; inactive: string }[] = [
        {
            label: 'Present',
            status: 'present',
            active: 'bg-[#68B266] text-white border-[#68B266]',
            inactive: 'border-[#68B266] text-[#68B266] hover:bg-[#68B26610]',
        },
        {
            label: 'Absent',
            status: 'absent',
            active: 'bg-[#D8727D] text-white border-[#D8727D]',
            inactive: 'border-[#D8727D] text-[#D8727D] hover:bg-[#D8727D10]',
        },
        {
            label: 'WFH',
            status: 'wfh',
            active: 'bg-[#30C5E5] text-white border-[#30C5E5]',
            inactive: 'border-[#30C5E5] text-[#30C5E5] hover:bg-[#30C5E510]',
        },
    ];

    return (
        <motion.div
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-lg border border-surface-200 z-50 overflow-hidden"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
        >
            {/* Month navigation */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
                <button
                    onClick={prevMonth}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-surface-100 transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-semibold text-gray-800">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button
                    onClick={nextMonth}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-surface-100 transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 px-3 pt-3 pb-1">
                {DAY_NAMES.map(d => (
                    <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase">{d}</div>
                ))}
            </div>

            {/* Date grid */}
            <div className="grid grid-cols-7 px-3 pb-3 gap-y-1">
                {cells.map(({ date, isCurrentMonth }) => {
                    const dateStr = toISODate(date);
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDate;
                    return (
                        <button
                            key={dateStr}
                            onClick={() => setSelectedDate(dateStr)}
                            className={`
                                w-8 h-8 mx-auto rounded-lg text-xs font-medium transition-colors
                                ${isSelected ? 'bg-primary-500 text-white' : ''}
                                ${!isSelected && isToday ? 'ring-2 ring-primary-300 text-primary-600' : ''}
                                ${!isSelected && !isToday && isCurrentMonth ? 'text-gray-700 hover:bg-surface-100' : ''}
                                ${!isSelected && !isCurrentMonth ? 'text-gray-300 hover:bg-surface-50' : ''}
                            `}
                        >
                            {date.getDate()}
                        </button>
                    );
                })}
            </div>

            {/* Divider */}
            <div className="h-px bg-surface-100 mx-4" />

            {/* Attendance section */}
            <div className="px-4 py-3">
                <p className="text-xs text-gray-500 mb-2">
                    Mark attendance for <span className="font-semibold text-gray-700">{formatLabel(selectedDate)}</span>
                </p>
                <div className="flex gap-2">
                    {toggleBtns.map(btn => (
                        <button
                            key={btn.status}
                            onClick={() => markAttendance(btn.status)}
                            className={`
                                flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                                ${currentStatus === btn.status ? btn.active : btn.inactive}
                            `}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default CalendarDropdown;
