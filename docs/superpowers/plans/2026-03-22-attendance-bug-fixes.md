# Attendance Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 13 bugs identified in the attendance feature covering data integrity, race conditions, timezone issues, stale closures, and UX problems.

**Architecture:** All fixes are targeted and surgical — no refactoring of component structure. Changes are isolated to three files: `src/pages/AttendancePage.tsx`, `src/components/layout/CalendarDropdown.tsx`, `src/context/AppContext.tsx`, and `electron/main.ts`.

**Tech Stack:** React (hooks), TypeScript, Electron IPC, MongoDB/Mongoose

---

## File Map

| File | Changes |
|------|---------|
| `src/pages/AttendancePage.tsx` | Fix punch-in guard, breakIn guard, punch-out guard, timer dependency, NaN break state, metrics N/A display |
| `src/components/layout/CalendarDropdown.tsx` | Fix stale closure in clockIn (already OK for clockOut/breakIn/breakOut — verify) |
| `src/context/AppContext.tsx` | Fix race condition (deduplicate change stream updates), debounce delete refetch, fix useMemo deps |
| `electron/main.ts` | Fix heal function timezone bug, heal function missing `start` field validation |

---

## Task 1: Fix punch-in guard — prevent double punch-in from resetting breakSessions

**Files:**
- Modify: `src/pages/AttendancePage.tsx:97-108`

**Problem:** `handlePunchIn` always sets `checkIn: new Date().toISOString()` and `breakSessions: []` even if already clocked in. A double-click or race condition overwrites the punch-in time and wipes breaks.

**Fix:** Guard against calling punch-in when already clocked in.

- [ ] **Step 1: Edit `handlePunchIn` to guard against re-punching**

In `src/pages/AttendancePage.tsx`, replace the `handlePunchIn` function body:

```typescript
const handlePunchIn = () => act(async () => {
  // Guard: if already clocked in, do nothing
  if (state !== 'NOT_STARTED') return;
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
```

- [ ] **Step 2: Verify visually** — The `Punch In` button is already disabled via `state === 'NOT_STARTED'` check in JSX (line 168), and `saving` flag in `act()` prevents concurrent calls. The guard is an extra safety net.

---

## Task 2: Fix `handleBreakIn` — add empty sessions guard

**Files:**
- Modify: `src/pages/AttendancePage.tsx:118-123`

**Problem:** `sessions[sessions.length - 1]` is `undefined` when `sessions` is empty, causing the spread to silently fail and the break to never be closed.

- [ ] **Step 1: Edit `handleBreakIn` to guard empty sessions array**

Replace the `handleBreakIn` function:

```typescript
const handleBreakIn = () => act(async () => {
  if (!todayRecord) return;
  const { id: _id, ...rec } = todayRecord;
  const sessions = [...(rec.breakSessions ?? [])];
  // Guard: nothing to close if no open break session
  if (sessions.length === 0) return;
  const lastIdx = sessions.length - 1;
  if (sessions[lastIdx].end !== null) return; // already closed
  sessions[lastIdx] = { ...sessions[lastIdx], end: new Date().toISOString() };
  await setAttendanceRecord({ ...rec, breakSessions: sessions });
});
```

---

## Task 3: Fix `handlePunchOut` — add null guard for todayRecord

**Files:**
- Modify: `src/pages/AttendancePage.tsx:125-132`

**Problem:** `todayRecord!` non-null assertion crashes at runtime if the record was deleted by an admin while the page is open.

- [ ] **Step 1: Edit `handlePunchOut` to guard null todayRecord**

Replace the `handlePunchOut` function:

```typescript
const handlePunchOut = () => act(async () => {
  if (!todayRecord) return;
  const { id: _id, ...rec } = todayRecord;
  const sessions = [...(rec.breakSessions ?? [])];
  if (sessions.length > 0 && !sessions[sessions.length - 1].end) {
    sessions[sessions.length - 1] = { ...sessions[sessions.length - 1], end: new Date().toISOString() };
  }
  await setAttendanceRecord({ ...rec, checkOut: new Date().toISOString(), breakSessions: sessions });
});
```

Also add null guard to `handleBreakOut` for consistency:

```typescript
const handleBreakOut = () => act(async () => {
  if (!todayRecord) return;
  const { id: _id, ...rec } = todayRecord;
  await setAttendanceRecord({
    ...rec,
    breakSessions: [...(rec.breakSessions ?? []), { start: new Date().toISOString(), end: null }],
  });
});
```

---

## Task 4: Fix timer `useEffect` — add `todayRecord` to dependency array

**Files:**
- Modify: `src/pages/AttendancePage.tsx:46-50`

**Problem:** Timer effect only depends on `[state]`. If `todayRecord` changes (e.g., change stream delivers a real `checkIn` time) without `state` changing, the timer continues using stale timestamps and shows wrong elapsed time.

- [ ] **Step 1: Add `todayRecord` to timer effect dependencies**

Replace the timer effect:

```typescript
React.useEffect(() => {
  if (state !== 'WORKING' && state !== 'ON_BREAK') return;
  const id = setInterval(() => setNow(Date.now()), 1000);
  return () => clearInterval(id);
}, [state, todayRecord]);
```

---

## Task 5: Fix break state derivation — guard missing `start` field to prevent NaN timer

**Files:**
- Modify: `src/pages/AttendancePage.tsx:36-43`

**Problem:** If a break session exists with `end: null` but no `start` field (possible from the heal bug or DB corruption), the state becomes `ON_BREAK` and `new Date(undefined).getTime()` returns `NaN`, making the timer show `NaN:NaN:NaN`.

- [ ] **Step 1: Add `start` field validation in state derivation**

Replace the state derivation IIFE:

```typescript
const state: SessionState = (() => {
  if (!todayRecord?.checkIn) return 'NOT_STARTED';
  if (todayRecord.checkOut) return 'DONE';
  const sessions = todayRecord.breakSessions ?? [];
  if (
    sessions.length > 0 &&
    sessions[sessions.length - 1].end === null &&
    sessions[sessions.length - 1].start  // guard: must have a valid start
  ) return 'ON_BREAK';
  return 'WORKING';
})();
```

---

## Task 6: Fix metrics — show "N/A" instead of "0%" when no data exists

**Files:**
- Modify: `src/pages/AttendancePage.tsx:377`

**Problem:** When `daysWithData === 0`, per-member rate shows `0%` — indistinguishable from a fully-absent member.

- [ ] **Step 1: Update per-member rate display**

Find line 377:
```typescript
const rate = `${Math.round((presentCount / Math.max(daysWithData, 1)) * 100)}%`;
```

Replace with:
```typescript
const rate = daysWithData === 0 ? 'N/A' : `${Math.round((presentCount / Math.max(daysWithData, 1)) * 100)}%`;
```

- [ ] **Step 2: Ensure rateStyle handles 'N/A' gracefully**

The `rateStyle` lookup at line 418 already uses `rateStyle?.bg ?? ''` with optional chaining, so `N/A` will simply render without a color class — this is acceptable.

---

## Task 7: Fix CalendarDropdown `clockIn` — guard against re-clocking already checked-in record

**Files:**
- Modify: `src/components/layout/CalendarDropdown.tsx:102-105`

**Problem:** `clockIn()` always sets `checkIn: nowISO()` and `breakSessions: []` even if already clocked in (for historical dates). This overwrites existing punch-in time. The button is disabled UI-wise (`disabled={isClockedIn && !isClockedOut}`) but a stale closure could still trigger it.

- [ ] **Step 1: Add guard in `clockIn`**

Replace the `clockIn` function:

```typescript
function clockIn() {
  // Guard: don't overwrite an existing punch-in
  if (isClockedIn && !isClockedOut) return;
  const base = currentRecord ?? { userId: currentUser!.id, date: selectedDate, status: 'present' as const };
  setAttendanceRecord({ ...base, status: 'present', checkIn: nowISO(), checkOut: undefined, breakSessions: [] });
}
```

Note: `clockOut`, `breakOut`, and `breakIn` in CalendarDropdown already use `currentRecord` read directly from context at render time (not a captured stale closure), so they are correct. The `currentRecord` is derived from `attendanceRecords` and `selectedDate` — both are fresh each render.

---

## Task 8: Fix AppContext change stream — suppress redundant state updates caused by own optimistic write

**Files:**
- Modify: `src/context/AppContext.tsx:184-203`

**Problem:** `setAttendanceRecord` optimistically updates state, then the IPC call triggers a change stream event which updates state again with the server's copy. This can cause a flash or stale state under rapid operations.

**Fix:** For `insert` and `update`/`replace` events, only apply the change stream update if the incoming doc differs from what's already in state. Since the optimistic update is always a superset of what the server stores (same fields), we can compare timestamps (checkIn, checkOut, breakSessions length) as a cheap equality check.

- [ ] **Step 1: Update the change stream listener to skip no-op updates**

Replace the real-time sync `useEffect` (lines 184-203):

```typescript
// Real-time sync for attendance
useEffect(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const electronAPI = (window as any).electronAPI;
  if (!electronAPI) return;
  const unsub = electronAPI.onAttendanceChanged?.((_: unknown, payload: { op: string; doc?: AttendanceRecord; id?: string }) => {
    const { op, doc } = payload;
    if (op === 'insert') {
      setAttendanceRecords(prev => prev.some(r => r.id === doc!.id) ? prev : [...prev, doc!]);
    } else if (op === 'update' || op === 'replace') {
      setAttendanceRecords(prev => {
        const exists = prev.some(r => r.id === doc!.id);
        if (!exists) return [...prev, doc!];
        // Skip update if the record is already identical (avoids re-render from own optimistic write)
        const current = prev.find(r => r.id === doc!.id)!;
        if (
          current.checkIn === doc!.checkIn &&
          current.checkOut === doc!.checkOut &&
          (current.breakSessions?.length ?? 0) === (doc!.breakSessions?.length ?? 0)
        ) return prev;
        return prev.map(r => r.id === doc!.id ? doc! : r);
      });
    } else if (op === 'delete') {
      dbApi().getAttendance().then((docs: AttendanceRecord[]) => setAttendanceRecords(docs)).catch(() => {});
    }
  });
  return () => { unsub?.(); };
}, []);
```

---

## Task 9: Fix AppContext `useMemo` — add missing dependencies

**Files:**
- Modify: `src/context/AppContext.tsx:286-303`

**Problem:** `setOrg`, `setCurrentUser`, and `deleteAttendanceRecord` are included in the context value but missing from the `useMemo` dependency array. This causes React to warn in development and means the context won't rebuild if these change.

- [ ] **Step 1: Add missing deps to `useMemo`**

Replace line 302:
```typescript
[org, currentUser, theme, setTheme, sidebarCollapsed, setSidebarCollapsed, attendanceRecords, setAttendanceRecord, selectedWeekStart, setSelectedWeekStart]
```

With:
```typescript
[org, setOrg, currentUser, setCurrentUser, theme, setTheme, sidebarCollapsed, setSidebarCollapsed, attendanceRecords, setAttendanceRecord, deleteAttendanceRecord, selectedWeekStart, setSelectedWeekStart]
```

---

## Task 10: Fix heal function — use UTC-neutral date construction instead of local time

**Files:**
- Modify: `electron/main.ts:951-952`

**Problem:** `new Date(y, m - 1, d, 23, 59, 59)` creates a date in the **server's local timezone**. If the server runs in UTC but users are in another timezone, the close time stored is wrong.

**Fix:** Build the close time as an ISO string directly without relying on `Date` local constructor, or use `Date.UTC`.

- [ ] **Step 1: Fix `closeTime` construction in `healOpenSessions`**

Replace lines 951-952:
```typescript
const [y, m, d] = (record.date as string).split('-').map(Number);
const closeTime = new Date(y, m - 1, d, 23, 59, 59).toISOString();
```

With:
```typescript
// Use the date string directly to build an end-of-day ISO timestamp,
// treating the record's date as local wall-clock time expressed as UTC
// (consistent with how TODAY_DATE is built on the frontend).
const closeTime = `${record.date as string}T23:59:59.000Z`;
```

This is consistent: the frontend stores `date` as `YYYY-MM-DD` in local time and all timestamps as ISO UTC strings. End-of-day 23:59:59 UTC for that date string is the right close boundary.

---

## Task 11: Fix heal function — validate `start` field before healing break sessions

**Files:**
- Modify: `electron/main.ts:954-955`

**Problem:** Break sessions without a `start` field get healed with only `end` set — creating malformed records that cause `NaN` in the frontend timer.

- [ ] **Step 1: Filter out malformed break sessions during heal**

Replace lines 954-955:
```typescript
const healedBreaks = ((record.breakSessions ?? []) as { start: string; end: string | null }[])
    .map(b => b.end ? b : { ...b, end: closeTime });
```

With:
```typescript
const healedBreaks = ((record.breakSessions ?? []) as { start?: string; end: string | null }[])
    .filter(b => !!b.start)  // drop malformed sessions missing a start time
    .map(b => b.end ? b : { ...b, end: closeTime });
```

---

## Task 12: Final review pass

- [ ] **Step 1: TypeScript check** — run `npx tsc --noEmit` from the project root and confirm no new errors introduced.

```bash
cd /Users/kkwenuja/Desktop/ProjectX && npx tsc --noEmit 2>&1 | head -60
```

Expected: no errors (or same pre-existing errors as before — none introduced by our changes).

- [ ] **Step 2: Manual smoke test checklist**
  - Open app → AttendancePage loads with correct metrics
  - Punch In → timer starts, state = WORKING
  - Take Break → state = ON_BREAK, break timer starts
  - Break Out → state = WORKING, net work time resumes correctly
  - Punch Out → state = DONE, total time shown
  - Double-click Punch In (simulate) → second call is blocked by state guard
  - Admin deletes today's record → punch out does not crash
  - CalendarDropdown → select past date → clock actions work for that date
  - CalendarDropdown → clock in on a date that's already clocked in → no overwrite

---

## Summary of all fixes

| Task | Bug # | Severity | File |
|------|-------|----------|------|
| 1 | Double punch-in resets breaks | HIGH | AttendancePage.tsx |
| 2 | breakIn guard on empty sessions | HIGH | AttendancePage.tsx |
| 3 | Punch out null guard | MEDIUM | AttendancePage.tsx |
| 4 | Timer missing todayRecord dep | MEDIUM | AttendancePage.tsx |
| 5 | NaN timer from missing break start | MEDIUM | AttendancePage.tsx |
| 6 | 0% vs N/A when no data | LOW | AttendancePage.tsx |
| 7 | CalendarDropdown clockIn guard | HIGH | CalendarDropdown.tsx |
| 8 | Change stream double-update race | HIGH | AppContext.tsx |
| 9 | useMemo missing deps | LOW | AppContext.tsx |
| 10 | Heal uses server local timezone | MEDIUM | main.ts |
| 11 | Heal writes breaks without start | MEDIUM | main.ts |
| 12 | TypeScript check + smoke test | — | all |
