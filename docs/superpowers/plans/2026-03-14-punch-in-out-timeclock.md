# Punch In/Out Time Clock Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add punch in/out and multi-break tracking with a live work timer to the Attendance page for the logged-in user.

**Architecture:** Extend the existing `AttendanceSchema` in Mongoose with a `breakSessions` array. Update `AppContext.setAttendanceRecord` to return a `Promise<void>` so the UI can await DB writes. Add a `TodaySessionCard` component inline in `AttendancePage.tsx` that derives its state from `attendanceRecords` and renders the punch/break buttons and a live ticking timer.

**Tech Stack:** React 18, TypeScript, Framer Motion, Mongoose (via Electron IPC), Tailwind CSS, Lucide React icons.

---

## Chunk 1: Data Layer — DB Schema + AppContext

### Task 1: Add `breakSessions` to `AttendanceSchema` in `electron/main.js`

**Files:**
- Modify: `electron/main.js:44-52` (AttendanceSchema definition)

The current schema ends at `notes: String,` on line 51. Add the new field **after** `notes`:

- [ ] **Step 1: Open `electron/main.js` and locate `AttendanceSchema`**

  It starts at line 44:
  ```js
  const AttendanceSchema = new Schema({
      recordId: { type: String, required: true, unique: true },
      userId: { type: String, required: true },
      date: { type: String, required: true },
      checkIn: String,
      checkOut: String,
      status: { type: String, enum: ['present', 'absent', 'half-day', 'on-leave', 'holiday', 'wfh'], default: 'present' },
      notes: String,
  });
  ```

- [ ] **Step 2: Add `breakSessions` field after `notes: String,`**

  Replace the schema so it reads:
  ```js
  const AttendanceSchema = new Schema({
      recordId: { type: String, required: true, unique: true },
      userId: { type: String, required: true },
      date: { type: String, required: true },
      checkIn: String,
      checkOut: String,
      status: { type: String, enum: ['present', 'absent', 'half-day', 'on-leave', 'holiday', 'wfh'], default: 'present' },
      notes: String,
      breakSessions: { type: [{ start: String, end: String }], default: [] },
  });
  ```

- [ ] **Step 3: Update the `db:attendance:getAll` inline mapper (line 222)**

  The current mapper is:
  ```js
  ipcMain.handle('db:attendance:getAll', async () => safe((await AttendanceModel.find().lean()).map(d => ({ id: d.recordId, userId: d.userId, date: d.date ?? null, checkIn: d.checkIn ?? null, checkOut: d.checkOut ?? null, status: d.status, notes: d.notes ?? null }))));
  ```

  Change it to append `breakSessions`:
  ```js
  ipcMain.handle('db:attendance:getAll', async () => safe((await AttendanceModel.find().lean()).map(d => ({ id: d.recordId, userId: d.userId, date: d.date ?? null, checkIn: d.checkIn ?? null, checkOut: d.checkOut ?? null, status: d.status, notes: d.notes ?? null, breakSessions: (d.breakSessions ?? []).map(b => ({ start: b.start, end: b.end ?? null })) }))));
  ```

- [ ] **Step 4: Update the `db:attendance:set` inline mapper (lines 223–226)**

  The current return literal is:
  ```js
  return safe({ id: d.recordId, userId: d.userId, date: d.date ?? null, checkIn: d.checkIn ?? null, checkOut: d.checkOut ?? null, status: d.status, notes: d.notes ?? null });
  ```

  Change it to:
  ```js
  return safe({ id: d.recordId, userId: d.userId, date: d.date ?? null, checkIn: d.checkIn ?? null, checkOut: d.checkOut ?? null, status: d.status, notes: d.notes ?? null, breakSessions: (d.breakSessions ?? []).map(b => ({ start: b.start, end: b.end ?? null })) });
  ```

- [ ] **Step 5: Verify manually**

  Launch the Electron app (or run `npm run dev` / `npm start`). Open the Attendance page. Open DevTools console. Confirm no errors about `breakSessions`. Existing records should load fine — the `?? []` guard handles old records without the field.

- [ ] **Step 6: Commit**

  ```bash
  git add electron/main.js
  git commit -m "feat: add breakSessions field to AttendanceSchema and mappers"
  ```

---

### Task 2: Update `AttendanceRecord` interface and `setAttendanceRecord` in `src/context/AppContext.tsx`

**Files:**
- Modify: `src/context/AppContext.tsx:70-78` (AttendanceRecord interface)
- Modify: `src/context/AppContext.tsx:90` (AppContextType interface — setAttendanceRecord signature)
- Modify: `src/context/AppContext.tsx:105` (default context stub)
- Modify: `src/context/AppContext.tsx:179-192` (useCallback implementation)

- [ ] **Step 1: Update the `AttendanceRecord` interface (lines 70–78)**

  Current:
  ```ts
  export interface AttendanceRecord {
      id: string;
      userId: string;
      date: string;
      checkIn?: string;
      checkOut?: string;
      status: 'present' | 'absent' | 'half-day' | 'on-leave' | 'holiday' | 'wfh';
      notes?: string;
  }
  ```

  Change to:
  ```ts
  export interface AttendanceRecord {
      id: string;
      userId: string;
      date: string;
      checkIn?: string;
      checkOut?: string;
      status: 'present' | 'absent' | 'half-day' | 'on-leave' | 'holiday' | 'wfh';
      notes?: string;
      breakSessions?: { start: string; end: string | null }[];
  }
  ```

- [ ] **Step 2: Update `AppContextType` interface declaration (line 90)**

  Current:
  ```ts
  setAttendanceRecord: (record: Omit<AttendanceRecord, 'id'>) => void;
  ```

  Change to:
  ```ts
  setAttendanceRecord: (record: Omit<AttendanceRecord, 'id'>) => Promise<void>;
  ```

- [ ] **Step 3: Update the default context stub (line 105)**

  Current:
  ```ts
  setAttendanceRecord: () => {},
  ```

  Change to:
  ```ts
  setAttendanceRecord: () => Promise.resolve(),
  ```

- [ ] **Step 4: Update the `useCallback` implementation (lines 179–192)**

  Current implementation:
  ```ts
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
      dbApi().setAttendance({ ...record })
          .catch((err: unknown) => console.error('[AppContext] Failed to persist attendance record:', err));
  }, []);
  ```

  Change to (adds explicit return type and returns the DB promise):
  ```ts
  const setAttendanceRecord = useCallback((record: Omit<AttendanceRecord, 'id'>): Promise<void> => {
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
      return dbApi().setAttendance({ ...record })
          .then(() => {})
          .catch((err: unknown) => { console.error('[AppContext] Failed to persist attendance record:', err); });
  }, []);
  ```

  Key change: `dbApi().setAttendance(...)` is now **returned** so callers can `await` it. The `.then(() => {})` discards the returned record value, giving `Promise<void>`. Errors are caught and logged (never rejected to the caller).

- [ ] **Step 5: Check TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors related to `setAttendanceRecord` or `AttendanceRecord`.

- [ ] **Step 6: Commit**

  ```bash
  git add src/context/AppContext.tsx
  git commit -m "feat: extend AttendanceRecord with breakSessions, setAttendanceRecord returns Promise<void>"
  ```

---

## Chunk 2: UI — TodaySessionCard component

### Task 3: Add `TodaySessionCard` to `src/pages/AttendancePage.tsx`

**Files:**
- Modify: `src/pages/AttendancePage.tsx` — add component above existing code, render in right panel

**Background reading:**
- The right-side panel starts at line 191: `<div className="flex flex-col gap-4 overflow-y-auto min-h-0">`. The `TodaySessionCard` is inserted as the **first child** of this div, before the Attendance Summary `motion.div`.
- `AppContext` is already imported at line 6: `import { AppContext, AttendanceRecord } from '../context/AppContext';`
- `useContext` is already imported at line 1.
- Lucide icons already imported include `Calendar`. We need to add: `LogIn`, `LogOut`, `Coffee` (break icons). Check if these are in the existing import and add them if not.

- [ ] **Step 1: Add missing Lucide icon imports**

  Current import line 3:
  ```ts
  import { Download, TrendingUp, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
  ```

  Change to:
  ```ts
  import { Download, TrendingUp, CheckCircle, AlertCircle, Calendar, LogIn, LogOut, Coffee } from 'lucide-react';
  ```

- [ ] **Step 2: Add the `TODAY` module-level constant after the existing `addDays` helper (after line 18)**

  After the closing `}` of `addDays`, add:
  ```ts
  const TODAY_DATE = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD" — module-level, stable for the day
  ```

  > Note: We use `TODAY_DATE` (not `TODAY`) to avoid collision with any existing `TODAY` variable already defined in the file. Check line 74 — `AttendancePage` has no existing `TODAY` constant at module level, so either name works. Using `TODAY_DATE` is safer.

- [ ] **Step 3: Add the `TodaySessionCard` component after the `TODAY_DATE` constant and before the `AttendancePage` function**

  Insert this complete component:

  ```tsx
  const TodaySessionCard: React.FC = () => {
    const { currentUser, attendanceRecords, setAttendanceRecord } = useContext(AppContext);
    const [now, setNow] = React.useState(Date.now());
    const [saving, setSaving] = React.useState(false);

    if (!currentUser) return null;

    const todayRecord = attendanceRecords.find(
      r => r.userId === currentUser.id && r.date === TODAY_DATE
    ) ?? null;

    // ── Derive state ────────────────────────────────────────────────────────────
    type SessionState = 'NOT_STARTED' | 'WORKING' | 'ON_BREAK' | 'DONE';
    const state: SessionState = (() => {
      if (!todayRecord?.checkIn) return 'NOT_STARTED';
      if (todayRecord.checkOut) return 'DONE';
      const sessions = todayRecord.breakSessions ?? [];
      if (sessions.length > 0 && sessions[sessions.length - 1].end === null) return 'ON_BREAK';
      return 'WORKING';
    })();

    // ── Timer ───────────────────────────────────────────────────────────────────
    React.useEffect(() => {
      if (state !== 'WORKING' && state !== 'ON_BREAK') return;
      const id = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(id);
    }, [state, todayRecord?.checkIn]);

    // ── Time math ───────────────────────────────────────────────────────────────
    const fmt = (ms: number) => {
      const s = Math.max(0, Math.floor(ms / 1000));
      const hh = Math.floor(s / 3600).toString().padStart(2, '0');
      const mm = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
      const ss = (s % 60).toString().padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    };

    const checkInMs = todayRecord?.checkIn ? new Date(todayRecord.checkIn).getTime() : 0;
    const closedBreakMs = (todayRecord?.breakSessions ?? [])
      .filter(b => b.end)
      .reduce((sum, b) => sum + (new Date(b.end!).getTime() - new Date(b.start).getTime()), 0);
    const openBreakMs = state === 'ON_BREAK'
      ? now - new Date(todayRecord!.breakSessions!.at(-1)!.start).getTime()
      : 0;
    const workMs = state === 'NOT_STARTED' ? 0
      : state === 'DONE'
        ? new Date(todayRecord!.checkOut!).getTime() - checkInMs - closedBreakMs
        : now - checkInMs - closedBreakMs - openBreakMs;

    // ── Summary row helpers ─────────────────────────────────────────────────────
    const fmtTime = (iso: string | null | undefined) =>
      iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
    const breakMinutes = Math.round(closedBreakMs / 60000);

    // ── Badge config ────────────────────────────────────────────────────────────
    const badgeCfg: Record<SessionState, { label: string; bg: string; text: string }> = {
      NOT_STARTED: { label: 'Not Started', bg: 'bg-gray-100',          text: 'text-gray-500'    },
      WORKING:     { label: 'Working',     bg: 'bg-[#83C29D33]',       text: 'text-[#68B266]'  },
      ON_BREAK:    { label: 'On Break',    bg: 'bg-[#DFA87433]',       text: 'text-[#D58D49]'  },
      DONE:        { label: 'Done',        bg: 'bg-[#E0E7EF]',         text: 'text-[#6B7FA3]'  },
    };
    const badge = badgeCfg[state];

    // ── Action handlers ─────────────────────────────────────────────────────────
    const act = async (fn: () => Promise<void>) => {
      if (saving) return;
      setSaving(true);
      try { await fn(); } finally { setSaving(false); }
    };

    const handlePunchIn = () => act(async () => {
      const existing = attendanceRecords.find(r => r.userId === currentUser.id && r.date === TODAY_DATE);
      const { id: _id, ...existingRest } = existing ?? { id: '' };
      await setAttendanceRecord({
        ...existingRest,
        userId: currentUser.id,
        date: TODAY_DATE,
        status: 'present',
        checkIn: new Date().toISOString(),
        breakSessions: [],
      });
    });

    const handleBreakOut = () => act(async () => {
      const { id: _id, ...rec } = todayRecord!;
      await setAttendanceRecord({
        ...rec,
        breakSessions: [...(rec.breakSessions ?? []), { start: new Date().toISOString(), end: null }],
      });
    });

    const handleBreakIn = () => act(async () => {
      const { id: _id, ...rec } = todayRecord!;
      const sessions = [...(rec.breakSessions ?? [])];
      sessions[sessions.length - 1] = { ...sessions[sessions.length - 1], end: new Date().toISOString() };
      await setAttendanceRecord({ ...rec, breakSessions: sessions });
    });

    const handlePunchOut = () => act(async () => {
      const { id: _id, ...rec } = todayRecord!;
      const sessions = [...(rec.breakSessions ?? [])];
      if (sessions.length > 0 && !sessions[sessions.length - 1].end) {
        sessions[sessions.length - 1] = { ...sessions[sessions.length - 1], end: new Date().toISOString() };
      }
      await setAttendanceRecord({ ...rec, checkOut: new Date().toISOString(), breakSessions: sessions });
    });

    return (
      <motion.div
        className="bg-white rounded-2xl border border-surface-200 p-4"
        initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 text-sm">Today's Session</h3>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        </div>

        {/* Timer area */}
        <div className="text-center mb-4">
          <div className="text-3xl font-mono font-bold text-gray-900 tracking-tight">
            {fmt(workMs)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {state === 'DONE' ? 'Total Work Time' : 'Net Work Time'}
          </div>

          {state === 'ON_BREAK' && (
            <div className="mt-2">
              <div className="text-lg font-mono font-semibold text-[#D58D49]">
                {fmt(openBreakMs)}
              </div>
              <div className="text-xs text-[#D58D49]">On Break</div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {state === 'NOT_STARTED' && (
          <button
            onClick={handlePunchIn}
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #68B266 0%, #4CAF50 100%)' }}
          >
            <LogIn size={15} /> Punch In
          </button>
        )}

        {state === 'WORKING' && (
          <div className="flex gap-2">
            <button
              onClick={handleBreakOut}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[#D58D49] text-[#D58D49] flex items-center justify-center gap-2 hover:bg-[#DFA87415] transition-colors disabled:opacity-60"
            >
              <Coffee size={15} /> Break Out
            </button>
            <button
              onClick={handlePunchOut}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[#D8727D] text-[#D8727D] flex items-center justify-center gap-2 hover:bg-[#D8727D15] transition-colors disabled:opacity-60"
            >
              <LogOut size={15} /> Punch Out
            </button>
          </div>
        )}

        {state === 'ON_BREAK' && (
          <button
            onClick={handleBreakIn}
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: '#D58D49' }}
          >
            <Coffee size={15} /> Break In
          </button>
        )}

        {/* Summary row */}
        <div className="flex justify-between mt-4 pt-3 border-t border-surface-100 text-xs text-gray-500">
          <span>In: <span className="font-semibold text-gray-800">{fmtTime(todayRecord?.checkIn)}</span></span>
          <span>Break: <span className="font-semibold text-gray-800">{breakMinutes}m</span></span>
          <span>Out: <span className="font-semibold text-gray-800">{fmtTime(todayRecord?.checkOut)}</span></span>
        </div>
      </motion.div>
    );
  };
  ```

- [ ] **Step 4: Render `TodaySessionCard` as the first child of the right-side panel**

  In `AttendancePage`, find the right-side panel at line 191:
  ```tsx
  {/* Side panels */}
  <div className="flex flex-col gap-4 overflow-y-auto min-h-0">
    {/* Attendance Summary */}
    <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
  ```

  Insert `<TodaySessionCard />` before the Attendance Summary card:
  ```tsx
  {/* Side panels */}
  <div className="flex flex-col gap-4 overflow-y-auto min-h-0">
    {/* Today's Session */}
    <TodaySessionCard />

    {/* Attendance Summary */}
    <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
  ```

- [ ] **Step 5: Check TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no type errors. Common issues to watch for:
  - `Coffee` not found in lucide-react → substitute `Pause` or `UtensilsCrossed` if needed
  - `React.useState` / `React.useEffect` — these work because `React` is imported as a namespace at line 1

- [ ] **Step 6: Manual test — NOT_STARTED state**

  1. Open the app, navigate to Attendance.
  2. Right panel should show "Today's Session" card with "Not Started" badge, `00:00:00` timer, and "Punch In" green button.
  3. Summary row shows `In: —  Break: 0m  Out: —`.

- [ ] **Step 7: Manual test — WORKING state**

  1. Click "Punch In". Button should briefly disable (saving), then card updates to show "Working" badge.
  2. Timer starts ticking (0:00:01, 0:00:02 ...).
  3. Two buttons appear: "Break Out" (amber) and "Punch Out" (red).
  4. Summary row: `In: HH:MM AM  Break: 0m  Out: —`.

- [ ] **Step 8: Manual test — ON_BREAK state**

  1. Click "Break Out". Card shows "On Break" badge.
  2. Main timer freezes. Amber break timer appears below, counting up.
  3. Only "Break In" button is visible (Punch Out is hidden).

- [ ] **Step 9: Manual test — return from break and DONE state**

  1. Click "Break In". Returns to WORKING. Break timer disappears.
  2. Summary row "Break:" now shows accumulated minutes.
  3. Click "Punch Out". Card shows "Done" badge. Buttons disappear. Summary row shows Out time.
  4. Verify the record persisted: reload the app. Card should show DONE with the correct times.

- [ ] **Step 10: Manual test — app reopen mid-session**

  1. Punch In, then close and reopen the app.
  2. Navigate to Attendance. Card should show WORKING with timer resumed from the correct punch-in time (net work time computed from stored checkIn).

- [ ] **Step 11: Commit**

  ```bash
  git add src/pages/AttendancePage.tsx
  git commit -m "feat: add TodaySessionCard punch in/out with break tracking and live timer"
  ```

---

## Final commit message reference

After all tasks, the git log should show:
```
feat: add TodaySessionCard punch in/out with break tracking and live timer
feat: extend AttendanceRecord with breakSessions, setAttendanceRecord returns Promise<void>
feat: add breakSessions field to AttendanceSchema and mappers
```
