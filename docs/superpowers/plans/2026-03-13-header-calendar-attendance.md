# Header Calendar Attendance Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a calendar dropdown to the Header that lets the current user mark their own attendance for any date, syncing changes to the AttendancePage via AppContext.

**Architecture:** Attendance state is lifted into AppContext with a `useCallback`-stable `setAttendanceRecord` upsert function. A new `CalendarDropdown` component renders a mini calendar and attendance toggle buttons. `Header.tsx` renders the dropdown on calendar icon click. `AttendancePage` reads attendance from context instead of hardcoded local constants.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide React

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/context/AppContext.tsx` | Modify | Add `attendanceRecords` state + `setAttendanceRecord` + seed data |
| `src/components/layout/CalendarDropdown.tsx` | Create | Mini calendar UI + attendance toggle buttons |
| `src/components/layout/Header.tsx` | Modify | Wire dropdown open/close, switch currentUser source |
| `src/pages/AttendancePage.tsx` | Modify | Read from context, reactive derived values |

---

## Chunk 1: AppContext Attendance State

### Task 1: Add attendance state and types to AppContext

**Files:**
- Modify: `src/context/AppContext.tsx`

- [ ] **Step 1: Add `attendanceRecords` and `setAttendanceRecord` to `AppContextType`**

Open `src/context/AppContext.tsx`. Add two fields to the `AppContextType` interface after `setSidebarCollapsed`. The existing `setSidebarCollapsed` line has no trailing semicolon issue since TypeScript interfaces use semicolons — just add the new lines after it:

```ts
attendanceRecords: AttendanceRecord[];
setAttendanceRecord: (record: Omit<AttendanceRecord, 'id'>) => void;
```

- [ ] **Step 2: Update the `createContext` default value**

In the `createContext` call (the object passed to `createContext<AppContextType>({...})`), add:

```ts
attendanceRecords: [],
setAttendanceRecord: () => {},
```

- [ ] **Step 3: Add `designation` to the `currentUser` seed in `AppProvider`**

In `AppProvider`, find the `currentUser` initial state (around line 98). Add `designation: 'Project Manager'` to it:

```ts
const [currentUser, setCurrentUser] = useState<User | null>({
    id: 'u1',
    orgId: 'org1',
    name: 'Anima Agrawal',
    email: 'anima@techcorp.com',
    role: 'admin',
    status: 'active',
    designation: 'Project Manager',
});
```

This ensures the Header profile subtitle renders "Project Manager" after the switch from `location` to `designation`.

- [ ] **Step 4: Add seed data constant above `AppProvider`**

Add this constant just before the `AppProvider` definition:

```ts
const SEED_ATTENDANCE: Omit<AttendanceRecord, 'id'>[] = [
    { userId: 'u1', date: '2020-12-01', status: 'present' },
    { userId: 'u1', date: '2020-12-02', status: 'present' },
    { userId: 'u1', date: '2020-12-03', status: 'present' },
    { userId: 'u1', date: '2020-12-04', status: 'present' },
    { userId: 'u1', date: '2020-12-05', status: 'present' },
    { userId: 'u2', date: '2020-12-01', status: 'present' },
    { userId: 'u2', date: '2020-12-02', status: 'present' },
    { userId: 'u2', date: '2020-12-03', status: 'absent' },
    { userId: 'u2', date: '2020-12-04', status: 'present' },
    { userId: 'u2', date: '2020-12-05', status: 'present' },
    { userId: 'u3', date: '2020-12-01', status: 'present' },
    { userId: 'u3', date: '2020-12-02', status: 'present' },
    { userId: 'u3', date: '2020-12-03', status: 'present' },
    { userId: 'u3', date: '2020-12-04', status: 'present' },
    { userId: 'u3', date: '2020-12-05', status: 'absent' },
    { userId: 'u4', date: '2020-12-01', status: 'present' },
    { userId: 'u4', date: '2020-12-02', status: 'absent' },
    { userId: 'u4', date: '2020-12-03', status: 'present' },
    { userId: 'u4', date: '2020-12-04', status: 'present' },
    { userId: 'u4', date: '2020-12-05', status: 'present' },
    { userId: 'u5', date: '2020-12-01', status: 'present' },
    { userId: 'u5', date: '2020-12-02', status: 'present' },
    { userId: 'u5', date: '2020-12-03', status: 'present' },
    { userId: 'u5', date: '2020-12-04', status: 'absent' },
    { userId: 'u5', date: '2020-12-05', status: 'present' },
    { userId: 'u6', date: '2020-12-01', status: 'absent' },
    { userId: 'u6', date: '2020-12-02', status: 'present' },
    { userId: 'u6', date: '2020-12-03', status: 'present' },
    { userId: 'u6', date: '2020-12-04', status: 'present' },
    { userId: 'u6', date: '2020-12-05', status: 'present' },
];

const seedRecords: AttendanceRecord[] = SEED_ATTENDANCE.map(r => ({
    ...r,
    id: `${r.userId}-${r.date}`,
}));
```

- [ ] **Step 5: Add `useCallback` to imports**

At the top of the file, add `useCallback` to the React import:

```ts
import React, { createContext, useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
```

- [ ] **Step 6: Add state and upsert function inside `AppProvider`**

Inside `AppProvider`, after the `sidebarCollapsed` state line, add:

```ts
const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(seedRecords);

const setAttendanceRecord = useCallback((record: Omit<AttendanceRecord, 'id'>) => {
    const id = `${record.userId}-${record.date}`;
    setAttendanceRecords(prev => {
        const idx = prev.findIndex(r => r.id === id);
        if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...record, id };
            return updated;
        }
        return [...prev, { ...record, id }];
    });
}, []);
```

- [ ] **Step 7: Add `attendanceRecords` and `setAttendanceRecord` to the `useMemo` value object and deps array**

In the `useMemo` call, add to the returned object:

```ts
attendanceRecords,
setAttendanceRecord,
```

And add both to the deps array:

```ts
[org, currentUser, theme, sidebarCollapsed, attendanceRecords, setAttendanceRecord]
```

- [ ] **Step 8: Verify the app still compiles**

Run: `cd /Users/kkwenuja/Desktop/ProjectX && npx tsc --noEmit`

Expected: No errors related to `AppContext`. (There may be pre-existing errors elsewhere — only care about AppContext errors here.)

- [ ] **Step 9: Commit**

```bash
cd /Users/kkwenuja/Desktop/ProjectX
git add src/context/AppContext.tsx
git commit -m "feat: add attendance records state to AppContext"
```

---

## Chunk 2: CalendarDropdown Component

### Task 2: Create the CalendarDropdown component

**Files:**
- Create: `src/components/layout/CalendarDropdown.tsx`

- [ ] **Step 1: Create the file with imports and types**

Create `src/components/layout/CalendarDropdown.tsx` with:

```tsx
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
```

- [ ] **Step 2: Add the helper to build calendar grid cells**

Below the constants, add this helper:

```ts
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
```

- [ ] **Step 3: Write the component body**

```tsx
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
        setAttendanceRecord({ userId: currentUser.id, date: selectedDate, status });
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
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /Users/kkwenuja/Desktop/ProjectX && npx tsc --noEmit`

Expected: No errors in `CalendarDropdown.tsx`.

- [ ] **Step 5: Commit**

```bash
cd /Users/kkwenuja/Desktop/ProjectX
git add src/components/layout/CalendarDropdown.tsx
git commit -m "feat: add CalendarDropdown component with attendance marking"
```

---

## Chunk 3: Header Integration

### Task 3: Wire CalendarDropdown into Header

**Files:**
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Update imports**

Replace the current import block at the top of `src/components/layout/Header.tsx` with:

```tsx
import React, { useContext, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Calendar, HelpCircle, Bell, ChevronDown } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import { memberColors } from '../../data/mockData';
import { Avatar } from '../ui/Avatar';
import CalendarDropdown from './CalendarDropdown';
```

Note: `currentUser` is removed from the `mockData` import. `memberColors` is kept.

- [ ] **Step 2: Update the component body to read from context**

Replace the entire `const Header: React.FC = () => {` function opening and its `return` with a version that has state and a ref:

```tsx
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
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setIsCalendarOpen(false);
        }
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);
```

- [ ] **Step 3: Update the calendar icon button to use a ref container and toggle open**

Find the calendar icon `motion.button` (the first button in the right section). Wrap it and the dropdown in a `div` with `ref={calendarRef}` and `relative` positioning. Replace just that button with:

```tsx
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
```

- [ ] **Step 4: Update the profile subtitle from `location` to `designation`**

Find the line rendering `currentUser.location`:

```tsx
<div className="text-[11px] text-gray-400 leading-tight">
    {currentUser.location}
</div>
```

Change it to:

```tsx
<div className="text-[11px] text-gray-400 leading-tight">
    {currentUser?.designation ?? ''}
</div>
```

Also add a null guard to the user name:

```tsx
<div className="text-sm font-semibold text-gray-800 leading-tight">
    {currentUser?.name ?? ''}
</div>
```

And update the Avatar line:

```tsx
<Avatar name={currentUser?.name ?? ''} color={memberColors[0]} size="md" />
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /Users/kkwenuja/Desktop/ProjectX && npx tsc --noEmit`

Expected: No errors in `Header.tsx`.

- [ ] **Step 6: Commit**

```bash
cd /Users/kkwenuja/Desktop/ProjectX
git add src/components/layout/Header.tsx
git commit -m "feat: wire CalendarDropdown into Header with outside-click close"
```

---

## Chunk 4: AttendancePage Refactor

### Task 4: Connect AttendancePage to AppContext

**Files:**
- Modify: `src/pages/AttendancePage.tsx`

- [ ] **Step 1: Update imports**

At the top of `src/pages/AttendancePage.tsx`, replace the import block with:

```tsx
import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { Download, TrendingUp, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { teamMembers, memberColors } from '../data/mockData';
import { AppContext, AttendanceRecord } from '../context/AppContext';
```

- [ ] **Step 2: Remove all module-level computed constants**

Delete the following lines entirely (they will move inside the component):
- `const designations` block
- `const attendanceData` block
- `const rateStyles` block
- `const days` line
- `const totalPresent` line
- `const totalAbsent` line
- `const perfectCount` line
- `const avgRate` line
- `const dailyPresent` line
- `const metrics` block

Keep only the import block.

- [ ] **Step 3: Convert the component to a full function body and add context reads**

Change the component from an arrow function expression (`const AttendancePage: React.FC = () => (...)`) to one with a proper body. Replace the opening of the component with:

```tsx
const AttendancePage: React.FC = () => {
    const { attendanceRecords } = useContext(AppContext);

    const WEEK_DATES = ['2020-12-01', '2020-12-02', '2020-12-03', '2020-12-04', '2020-12-05'];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    const designations: Record<string, string> = {
        u1: 'Project Manager', u2: 'Frontend Developer', u3: 'UI Designer',
        u4: 'Backend Developer', u5: 'QA Engineer', u6: 'DevOps Engineer',
    };

    const rateStyles: Record<string, { bg: string; text: string }> = {
        '100%': { bg: 'bg-[#83C29D33]', text: 'text-[#68B266]' },
        '80%':  { bg: 'bg-[#DFA87433]', text: 'text-[#D58D49]' },
        '60%':  { bg: 'bg-[#DFA87433]', text: 'text-[#D58D49]' },
        '40%':  { bg: 'bg-[#F8D7DA33]', text: 'text-[#D8727D]' },
        '20%':  { bg: 'bg-[#F8D7DA33]', text: 'text-[#D8727D]' },
        '0%':   { bg: 'bg-[#F8D7DA33]', text: 'text-[#D8727D]' },
    };

    // Per-member, per-date status lookup
    function getMemberStatus(userId: string, date: string): AttendanceRecord['status'] | undefined {
        return attendanceRecords.find(r => r.userId === userId && r.date === date)?.status;
    }

    function isPresent(status: AttendanceRecord['status'] | undefined): boolean {
        return status === 'present' || status === 'wfh';
    }

    // Metrics
    const totalPresent = teamMembers.reduce((sum, m) =>
        sum + WEEK_DATES.filter(d => isPresent(getMemberStatus(m.id, d))).length, 0);
    const totalAbsent = teamMembers.reduce((sum, m) =>
        sum + WEEK_DATES.filter(d => getMemberStatus(m.id, d) === 'absent').length, 0);
    const perfectCount = teamMembers.filter(m =>
        WEEK_DATES.every(d => isPresent(getMemberStatus(m.id, d)))).length;
    const avgRate = Math.round((totalPresent / (teamMembers.length * 5)) * 100);

    const dailyPresent = WEEK_DATES.map(date =>
        teamMembers.filter(m => isPresent(getMemberStatus(m.id, date))).length
    );

    const metrics = [
        { label: 'Team Avg Rate', value: `${avgRate}%`, trend: 'This week', trendUp: true, color: '', accent: true, icon: TrendingUp, barPct: avgRate },
        { label: 'Perfect Attendance', value: String(perfectCount), trend: '100% rate', trendUp: true, color: '#68B266', accent: false, icon: CheckCircle, barPct: (perfectCount / teamMembers.length) * 100 },
        { label: 'One Absence', value: String(teamMembers.length - perfectCount), trend: '80% rate', trendUp: false, color: '#D58D49', accent: false, icon: AlertCircle, barPct: ((teamMembers.length - perfectCount) / teamMembers.length) * 100 },
        { label: 'Days Tracked', value: '5', trend: 'Mon–Fri', trendUp: true, color: '#30C5E5', accent: false, icon: Calendar, barPct: 100 },
    ];

    return (
```

- [ ] **Step 4: Update the table row rendering to use context data**

Find the table `tbody` rows. Replace the per-member data derivation from:

```tsx
const dayData = attendanceData[member.id] ?? [];
const presentCount = dayData.filter(Boolean).length;
const rate = presentCount === 5 ? '100%' : '80%';
```

To:

```tsx
const dayStatuses = WEEK_DATES.map(date => getMemberStatus(member.id, date));
const presentCount = dayStatuses.filter(isPresent).length;
const rate = `${Math.round((presentCount / 5) * 100)}%`;
```

- [ ] **Step 5: Update the dot rendering to use status**

Replace the dot `td` cells from iterating `dayData` (boolean array) to iterating `dayStatuses`:

```tsx
{dayStatuses.map((status, di) => (
    <td key={days[di]} className="px-3 py-3 text-center">
        <div className={`w-2.5 h-2.5 rounded-full mx-auto ${
            isPresent(status) ? 'bg-[#68B266]' :
            status === 'absent' ? 'bg-[#D8727D]' :
            'bg-gray-300'
        }`} />
    </td>
))}
```

- [ ] **Step 6: Close the component with `);`**

Make sure the component ends with:

```tsx
    );
};

export default AttendancePage;
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `cd /Users/kkwenuja/Desktop/ProjectX && npx tsc --noEmit`

Expected: No errors in `AttendancePage.tsx`.

- [ ] **Step 8: Commit**

```bash
cd /Users/kkwenuja/Desktop/ProjectX
git add src/pages/AttendancePage.tsx
git commit -m "feat: connect AttendancePage to AppContext attendance state"
```

---

## Chunk 5: Smoke Test

### Task 5: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && npm run dev
```

Expected: Server starts on `http://localhost:5173` (or similar) with no compile errors in the terminal.

- [ ] **Step 2: Verify AttendancePage renders correctly**

Navigate to the Attendance page in the app. Verify:
- Metrics strip shows correct numbers (avg ~93%, **1 perfect** [only u1/Anima has all 5 present], 5 with at least one absence, 5 days tracked).
- Weekly table shows 6 members with correct green/red dots matching the seed data (u2 has red on Wed, u3 on Fri, u4 on Tue, u5 on Thu, u6 on Mon).

- [ ] **Step 3: Verify calendar dropdown opens**

Click the calendar icon in the header. Verify:
- Dropdown appears below the icon.
- Shows current month (March 2026) with today highlighted.
- Attendance section shows "Mark attendance for [today's date]".
- All three toggle buttons (Present, Absent, WFH) are unselected (no record for today yet).

- [ ] **Step 4: Verify attendance marking syncs to AttendancePage**

1. In the header dropdown, navigate to December 2020.
2. Click on Dec 3 (a Wednesday).
3. Click "Absent".
4. Close the dropdown (click outside or Escape).
5. Navigate to the Attendance page.

Expected: Anima Agrawal's row now shows a red dot on Wednesday (was green). The "Team Avg Rate" metric decreases slightly. Perfect attendance count drops (Anima had 100% — now she has 80%).

- [ ] **Step 5: Verify toggling works**

Reopen the calendar dropdown, navigate to Dec 2020, click Dec 3 again, click "WFH".

Expected: The AttendancePage shows a green dot for Anima on Wednesday (wfh counts as present). Metrics return to original values.
