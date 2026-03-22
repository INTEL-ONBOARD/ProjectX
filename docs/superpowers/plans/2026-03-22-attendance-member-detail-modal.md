# Attendance Member Detail Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a member row is clicked on the Attendance page, open a modal showing that member's daily work hours, completed tasks per day, and performance metrics for the selected week.

**Architecture:** Add `completedAt` to the Task type and stamp it in `updateTask` when status changes to `done`. Create a self-contained `AttendanceMemberModal` component that receives member + attendance records + tasks as props and computes all metrics locally. Wire it into `AttendancePage` with a `selectedMember` state.

**Tech Stack:** React, TypeScript, Framer Motion, Lucide icons — no new dependencies.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/types/index.ts` | Modify | Add `completedAt?: string` to Task interface |
| `src/context/ProjectContext.tsx` | Modify | Stamp `completedAt` in `updateTask` when status becomes `done` |
| `src/components/modals/AttendanceMemberModal.tsx` | Create | New modal component |
| `src/pages/AttendancePage.tsx` | Modify | Add `selectedMember` state + click handler on member rows + render modal |

---

## Task 1: Add `completedAt` to Task type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add the field**

Open `src/types/index.ts`. Inside the `Task` interface (after `dueDate?: string;`), add:

```typescript
completedAt?: string;   // ISO date string — stamped when status first set to 'done'
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add completedAt field to Task type"
```

---

## Task 2: Stamp `completedAt` in `updateTask`

**Files:**
- Modify: `src/context/ProjectContext.tsx:223-231`

- [ ] **Step 1: Update `updateTask` to stamp completedAt**

Replace the `updateTask` function body (lines 223–231) with:

```typescript
const updateTask = async (id: string, changes: Partial<Omit<Task, 'id'>>) => {
  const actorMeta = { actorId: authUser?.id ?? '', actorName: authUser?.name ?? '' };

  // Stamp completedAt the first time status transitions to 'done'
  const existingTask = allTasks.find(t => t.id === id);
  const isCompletingNow = changes.status === 'done' && existingTask?.status !== 'done';
  const completedAt = isCompletingNow && !existingTask?.completedAt
    ? new Date().toISOString()
    : undefined;

  const finalChanges = {
    ...changes,
    ...(completedAt ? { completedAt } : {}),
    ...actorMeta,
  };

  const updated = await api().updateTask(id, finalChanges) as Task | null;
  if (updated) {
    setAllTasks(prev => prev.map(t => t.id === id ? updated : t));
  } else {
    console.warn('[ProjectContext] updateTask: API returned null for task', id, '— keeping existing state unchanged');
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/context/ProjectContext.tsx
git commit -m "feat: stamp completedAt when task status set to done"
```

---

## Task 3: Create `AttendanceMemberModal` component

**Files:**
- Create: `src/components/modals/AttendanceMemberModal.tsx`

- [ ] **Step 1: Create the file**

```typescript
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, CheckSquare, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { User, Task } from '../../types';
import { AttendanceRecord } from '../../context/AppContext';

interface Props {
  member: User;
  weekDates: string[];           // ['2026-03-16', '2026-03-17', ...] Mon–Fri
  attendanceRecords: AttendanceRecord[];
  tasks: Task[];
  getMemberColor: (id: string) => string;
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function calcWorkHours(record: AttendanceRecord | undefined): number {
  if (!record?.checkIn || !record?.checkOut) return 0;
  const totalMs = new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime();
  const breakMs = (record.breakSessions ?? []).reduce((acc, b) => {
    if (!b.start || b.end == null) return acc;
    return acc + (new Date(b.end).getTime() - new Date(b.start).getTime());
  }, 0);
  return Math.max(0, (totalMs - breakMs) / 3_600_000);
}

function formatHours(h: number): string {
  if (h === 0) return '—';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function formatTime(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-600',
  medium: 'bg-amber-100 text-amber-600',
  low: 'bg-green-100 text-green-600',
};

// ── Component ───────────────────────────────────────────────────────────────

const AttendanceMemberModal: React.FC<Props> = ({
  member, weekDates, attendanceRecords, tasks, getMemberColor, onClose,
}) => {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const color = getMemberColor(member.id);

  // Per-day data
  const dayData = weekDates.map((date, i) => {
    const record = attendanceRecords.find(r => r.userId === member.id && r.date === date);
    const hours = calcWorkHours(record);
    const doneTasks = tasks.filter(t =>
      t.assignees.includes(member.id) &&
      t.completedAt?.startsWith(date)
    );
    return { date, label: DAY_LABELS[i], record, hours, doneTasks };
  });

  // Stats
  const workingDays = weekDates.length; // 5
  const presentDays = dayData.filter(d =>
    d.record && ['present', 'wfh', 'half-day'].includes(d.record.status)
  ).length;
  const attendanceRate = Math.round((presentDays / workingDays) * 100);

  const weekTasks = tasks.filter(t => t.assignees.includes(member.id));
  const weekDoneTasks = weekTasks.filter(t =>
    t.completedAt && weekDates.some(d => t.completedAt!.startsWith(d))
  );
  const taskCompletionRate = weekTasks.length > 0
    ? Math.round((weekDoneTasks.length / weekTasks.length) * 100)
    : 0;

  const overallScore = Math.round((attendanceRate + taskCompletionRate) / 2);

  const scoreColor = overallScore >= 80
    ? 'text-green-600 bg-green-50'
    : overallScore >= 50
    ? 'text-amber-600 bg-amber-50'
    : 'text-red-600 bg-red-50';

  const scoreBarColor = overallScore >= 80 ? 'bg-green-500' : overallScore >= 50 ? 'bg-amber-400' : 'bg-red-500';

  return (
    <motion.div
      className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col shadow-2xl"
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: color }}
            >
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">{member.name}</p>
              <p className="text-xs text-gray-400">{member.designation ?? member.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-px bg-surface-100 border-b border-surface-100 shrink-0">
          {[
            { icon: <Clock size={13} />, label: 'Attendance', value: `${attendanceRate}%`, sub: `${presentDays}/${workingDays} days` },
            { icon: <CheckSquare size={13} />, label: 'Tasks Done', value: `${taskCompletionRate}%`, sub: `${weekDoneTasks.length}/${weekTasks.length} tasks` },
            { icon: <TrendingUp size={13} />, label: 'Performance', value: `${overallScore}%`, sub: 'combined score', highlight: true },
          ].map(stat => (
            <div key={stat.label} className="bg-white px-4 py-3 flex flex-col gap-0.5">
              <div className="flex items-center gap-1 text-gray-400 text-[10px] font-semibold uppercase tracking-wide mb-1">
                {stat.icon}{stat.label}
              </div>
              <span className={`text-xl font-bold ${stat.highlight ? scoreColor.split(' ')[0] : 'text-gray-900'}`}>
                {stat.value}
              </span>
              <span className="text-[11px] text-gray-400">{stat.sub}</span>
            </div>
          ))}
        </div>

        {/* Overall score bar */}
        <div className="px-6 py-3 border-b border-surface-100 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-500">Overall Performance</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor}`}>{overallScore}%</span>
          </div>
          <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${scoreBarColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${overallScore}%` }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
        </div>

        {/* Day-by-day table */}
        <div className="overflow-y-auto flex-1 px-6 py-3 flex flex-col gap-1.5">
          {dayData.map(({ date, label, record, hours, doneTasks }) => {
            const isExpanded = expandedDay === date;
            const hasData = !!record;
            const statusLabel = record?.status ?? 'absent';

            return (
              <div key={date} className="rounded-xl border border-surface-100 overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors text-left"
                  onClick={() => setExpandedDay(isExpanded ? null : date)}
                >
                  {/* Day label */}
                  <span className="text-xs font-bold text-gray-400 w-8 shrink-0">{label}</span>

                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    statusLabel === 'present' || statusLabel === 'wfh' ? 'bg-green-400' :
                    statusLabel === 'half-day' ? 'bg-amber-400' :
                    statusLabel === 'absent' ? 'bg-red-300' : 'bg-gray-200'
                  }`} />

                  {/* Check-in / out */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-1">
                    {hasData ? (
                      <>
                        <span>{formatTime(record?.checkIn)}</span>
                        <span className="text-gray-300">→</span>
                        <span>{formatTime(record?.checkOut)}</span>
                      </>
                    ) : (
                      <span className="text-gray-300 italic">No record</span>
                    )}
                  </div>

                  {/* Hours */}
                  <span className="text-xs font-semibold text-gray-700 w-14 text-right shrink-0">
                    {formatHours(hours)}
                  </span>

                  {/* Task count */}
                  <span className={`text-xs font-semibold w-16 text-right shrink-0 ${doneTasks.length > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                    {doneTasks.length > 0 ? `${doneTasks.length} task${doneTasks.length > 1 ? 's' : ''}` : '—'}
                  </span>

                  {/* Expand icon */}
                  {doneTasks.length > 0 && (
                    isExpanded ? <ChevronDown size={13} className="text-gray-400 shrink-0" /> : <ChevronRight size={13} className="text-gray-300 shrink-0" />
                  )}
                </button>

                {/* Expanded task list */}
                <AnimatePresence>
                  {isExpanded && doneTasks.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 flex flex-col gap-1.5 border-t border-surface-50">
                        {doneTasks.map(task => (
                          <div key={task.id} className="flex items-center gap-2 pt-2">
                            <CheckSquare size={12} className="text-green-400 shrink-0" />
                            <span className="text-xs text-gray-700 flex-1 leading-snug">{task.title}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority] ?? 'bg-gray-100 text-gray-500'}`}>
                              {task.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AttendanceMemberModal;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modals/AttendanceMemberModal.tsx
git commit -m "feat: add AttendanceMemberModal component"
```

---

## Task 4: Wire modal into `AttendancePage`

**Files:**
- Modify: `src/pages/AttendancePage.tsx`

- [ ] **Step 1: Add import at the top of AttendancePage.tsx**

After the existing imports, add:

```typescript
import AttendanceMemberModal from '../components/modals/AttendanceMemberModal';
```

Also ensure `AnimatePresence` is imported from `framer-motion` (it likely already is).

- [ ] **Step 2: Add `selectedMember` state**

Inside the `AttendancePage` component, after the existing state declarations (around line 306), add:

```typescript
const [selectedMember, setSelectedMember] = useState<typeof allMembers[0] | null>(null);
```

- [ ] **Step 3: Make the member row clickable**

Find the `<motion.tr>` for the member row (around line 455). Add an `onClick` handler and a cursor style:

```tsx
<motion.tr
  key={member.id}
  className="border-b border-surface-100 hover:bg-surface-50 transition-colors cursor-pointer"
  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.35, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
  onClick={() => setSelectedMember(member)}
>
```

Also add `e.stopPropagation()` to the admin delete button inside the row so clicking delete does not also open the modal:

```tsx
<button
  onClick={(e) => { e.stopPropagation(); deleteAttendanceRecord(member.id, WEEK_DATES[di]); }}
  className="group relative w-5 h-5 rounded-full mx-auto flex items-center justify-center"
  title="Delete record"
>
```

- [ ] **Step 4: Render the modal at the bottom of the return statement**

Just before the final closing `</div>` of the component's return, add:

```tsx
<AnimatePresence>
  {selectedMember && (
    <AttendanceMemberModal
      member={selectedMember}
      weekDates={WEEK_DATES}
      attendanceRecords={attendanceRecords}
      tasks={allTasks}
      getMemberColor={getMemberColor}
      onClose={() => setSelectedMember(null)}
    />
  )}
</AnimatePresence>
```

Note: `WEEK_DATES` is a local `const` computed inside `AttendancePage` — it is already in scope here, no extra work needed.

- [ ] **Step 5: Add `allTasks` from `ProjectContext`**

`ProjectContext` is not currently imported in `AttendancePage`. Add the import and hook call:

```typescript
// At the top of the file, with the other context imports:
import { useProjectContext } from '../context/ProjectContext';

// Inside the AttendancePage component body, after the existing context calls:
const { allTasks } = useProjectContext();
```

Use `useProjectContext()` (the custom hook), not raw `useContext(ProjectContext)` — the raw call returns `ProjectContextValue | null` and would require a null-check.

- [ ] **Step 6: Commit**

```bash
git add src/pages/AttendancePage.tsx
git commit -m "feat: wire AttendanceMemberModal into AttendancePage"
```

---

## Verification

- [ ] Click a member row on the Attendance page → modal opens with dark overlay + blur
- [ ] Stats bar shows attendance rate, task completion rate, and overall performance score
- [ ] Each day row shows check-in/out times and hours worked
- [ ] Days with completed tasks show a task count; clicking expands the task list with names + priority badges
- [ ] Clicking the overlay or X closes the modal
- [ ] A task moved to `done` on a given day appears under that day in the modal
