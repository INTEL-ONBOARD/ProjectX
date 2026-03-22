import React, { useContext, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LogIn, LogOut, Coffee, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';
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

function getMonday(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay(); // 0=Sun
    date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
    return toISODate(date);
}

function formatLabel(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const CalendarDropdown: React.FC<CalendarDropdownProps> = ({ onClose }) => {
    const { attendanceRecords, setAttendanceRecord, currentUser, setSelectedWeekStart } = useContext(AppContext);

    // Hooks MUST come before any conditional return (Rules of Hooks)
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState(toISODate(today));

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Guard after all hooks
    if (!currentUser) return null;

    const cells = getCalendarDays(viewYear, viewMonth);
    const todayStr = toISODate(today);

    const currentRecord = attendanceRecords.find(
        r => r.userId === currentUser.id && r.date === selectedDate
    );
    const currentStatus = currentRecord?.status;

    function prevMonth() {
        const newMonth = viewMonth === 0 ? 11 : viewMonth - 1;
        const newYear  = viewMonth === 0 ? viewYear - 1 : viewYear;
        setViewMonth(newMonth);
        setViewYear(newYear);
    }
    function nextMonth() {
        const newMonth = viewMonth === 11 ? 0 : viewMonth + 1;
        const newYear  = viewMonth === 11 ? viewYear + 1 : viewYear;
        setViewMonth(newMonth);
        setViewYear(newYear);
    }

    const nowISO = () => new Date().toISOString();

    function clockIn() {
        // Guard: don't overwrite an existing active session (handles stale-closure race)
        if (isClockedIn && !isClockedOut) return;
        const base = currentRecord ?? { userId: currentUser!.id, date: selectedDate, status: 'present' as const };
        setAttendanceRecord({ ...base, status: 'present', checkIn: nowISO(), checkOut: undefined, breakSessions: [] });
    }

    function clockOut() {
        if (!currentRecord) return;
        // Close any open break session first
        const breaks = (currentRecord.breakSessions ?? []).map(b =>
            b.end === null ? { ...b, end: nowISO() } : b
        );
        setAttendanceRecord({ ...currentRecord, checkOut: nowISO(), breakSessions: breaks });
    }

    function breakOut() {
        if (!currentRecord) return;
        const breaks = [...(currentRecord.breakSessions ?? []), { start: nowISO(), end: null }];
        setAttendanceRecord({ ...currentRecord, breakSessions: breaks });
    }

    function breakIn() {
        if (!currentRecord) return;
        const breaks = (currentRecord.breakSessions ?? []).map((b, i, arr) =>
            i === arr.length - 1 && b.end === null ? { ...b, end: nowISO() } : b
        );
        setAttendanceRecord({ ...currentRecord, breakSessions: breaks });
    }

    const isClockedIn  = !!currentRecord?.checkIn;
    const isClockedOut = !!currentRecord?.checkOut;
    const isOnBreak    = isClockedIn && !isClockedOut &&
        (currentRecord?.breakSessions ?? []).some(b => b.end === null);

    function fmtTime(iso?: string): string {
        if (!iso) return '';
        return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <motion.div
            className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-lg border border-surface-200 z-50 overflow-hidden"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
        >
            {/* Month navigation */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-surface-100">
                <button
                    onClick={prevMonth}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-surface-100 transition-colors"
                >
                    <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-gray-800">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button
                    onClick={nextMonth}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-surface-100 transition-colors"
                >
                    <ChevronRight size={14} />
                </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 px-2 pt-2 pb-0.5">
                {DAY_NAMES.map(d => (
                    <div key={d} className="text-center text-[9px] font-bold text-gray-400 uppercase">{d}</div>
                ))}
            </div>

            {/* Date grid — up to 6 rows (42 cells) */}
            <div className="grid grid-cols-7 px-2 pb-2 gap-y-0.5">
                {cells.map(({ date, isCurrentMonth }) => {
                    const dateStr = toISODate(date);
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDate;
                    return (
                        <button
                            key={dateStr}
                            onClick={() => { setSelectedDate(dateStr); setSelectedWeekStart(getMonday(dateStr)); }}
                            className={`
                                w-7 h-7 mx-auto rounded-md text-[11px] font-medium transition-colors
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
            <div className="h-px bg-surface-100 mx-3" />

            {/* Clock actions */}
            <div className="px-3 py-2.5">
                <p className="text-[10px] text-gray-400 mb-2.5">
                    Log time for <span className="font-semibold text-gray-600">{formatLabel(selectedDate)}</span>
                </p>

                {/* Status summary */}
                {isClockedIn && (
                    <div className="flex items-center gap-3 mb-2.5 px-2 py-1.5 bg-surface-50 rounded-lg text-[10px] text-gray-500">
                        <span className="flex items-center gap-1">
                            <LogIn size={10} className="text-[#68B266]" />
                            <span className="font-semibold text-gray-700">{fmtTime(currentRecord?.checkIn)}</span>
                        </span>
                        {isClockedOut && (
                            <span className="flex items-center gap-1">
                                <LogOut size={10} className="text-[#D8727D]" />
                                <span className="font-semibold text-gray-700">{fmtTime(currentRecord?.checkOut)}</span>
                            </span>
                        )}
                        {isOnBreak && (
                            <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#FFA50015', color: '#FFA500' }}>
                                On break
                            </span>
                        )}
                    </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-1.5">
                    {/* Clock In */}
                    <button
                        onClick={clockIn}
                        disabled={isClockedIn && !isClockedOut}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold border transition-colors
                            ${isClockedIn && !isClockedOut
                                ? 'bg-[#68B266] text-white border-[#68B266] opacity-60 cursor-not-allowed'
                                : 'border-[#68B266] text-[#68B266] hover:bg-[#68B26610]'
                            }`}
                    >
                        <LogIn size={11} />
                        Clock In
                    </button>

                    {/* Clock Out */}
                    <button
                        onClick={clockOut}
                        disabled={!isClockedIn || isClockedOut}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold border transition-colors
                            ${isClockedOut
                                ? 'bg-[#D8727D] text-white border-[#D8727D] opacity-60 cursor-not-allowed'
                                : !isClockedIn
                                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                : 'border-[#D8727D] text-[#D8727D] hover:bg-[#D8727D10]'
                            }`}
                    >
                        <LogOut size={11} />
                        Clock Out
                    </button>

                    {/* Break In (start break) */}
                    <button
                        onClick={breakOut}
                        disabled={!isClockedIn || isClockedOut || isOnBreak}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold border transition-colors
                            ${isOnBreak
                                ? 'bg-[#FFA500] text-white border-[#FFA500] opacity-60 cursor-not-allowed'
                                : !isClockedIn || isClockedOut
                                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                : 'border-[#FFA500] text-[#FFA500] hover:bg-[#FFA50010]'
                            }`}
                    >
                        <Coffee size={11} />
                        Break In
                    </button>

                    {/* Break Out (end break) */}
                    <button
                        onClick={breakIn}
                        disabled={!isOnBreak}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold border transition-colors
                            ${isOnBreak
                                ? 'border-[#5030E5] text-[#5030E5] hover:bg-[#5030E510]'
                                : 'border-gray-200 text-gray-300 cursor-not-allowed'
                            }`}
                    >
                        <PlayCircle size={11} />
                        Break Out
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default CalendarDropdown;
