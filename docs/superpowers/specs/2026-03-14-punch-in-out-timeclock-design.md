# Punch In/Out Time Clock — Design Spec

## Goal

Allow the logged-in user to punch in, punch out, and take multiple break sessions per day directly from the Attendance page. A live timer shows net work time in real time.

## Scope

- Self-service only: logged-in user manages their own record.
- Attendance page only: no persistent header widget.
- Multiple breaks per day supported (unlimited break out/in cycles).
- Timer is computed in the UI — no separate persistence for "current tick."

---

## Data Layer

### `AttendanceSchema` change (`electron/main.js`)

Add one new field:

```js
breakSessions: {
  type: [{ start: String, end: String }],
  default: [],
}
```

### Mapper update

Both IPC handlers (`db:attendance:getAll` and `db:attendance:set`) contain **inline** object literals that map Mongoose documents to API responses. There is no shared `toAtt` function — each handler's inline mapper must be updated independently.

In `db:attendance:getAll`, the `.map(d => ({ ... }))` lambda currently ends with `status: d.status, notes: d.notes ?? null`. Append:
```js
breakSessions: (d.breakSessions ?? []).map(b => ({ start: b.start, end: b.end ?? null })),
```

In `db:attendance:set`, the `return safe({ ... })` literal currently ends with `status: d.status, notes: d.notes ?? null`. Append the same field:
```js
breakSessions: (d.breakSessions ?? []).map(b => ({ start: b.start, end: b.end ?? null })),
```

`end` is nullable — an open break session has `end: null`.

### `AttendanceRecord` interface and `setAttendanceRecord` (`src/context/AppContext.tsx`)

Update `AttendanceRecord`:
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

Update `AppContextType` interface (the declaration):
```ts
setAttendanceRecord: (record: Omit<AttendanceRecord, 'id'>) => Promise<void>;
```

Update the default context stub (currently `setAttendanceRecord: () => {}`):
```ts
setAttendanceRecord: () => Promise.resolve(),
```

Update the `useCallback` implementation to **return the DB promise** (resolves after DB write, not just the optimistic update). The `saving` flag in the component will clear only after the DB confirms the write:
```ts
const setAttendanceRecord = useCallback((record: Omit<AttendanceRecord, 'id'>): Promise<void> => {
  const id = `${record.userId}-${record.date}`;
  setAttendanceRecords(prev => {
    // ... existing optimistic update logic unchanged ...
  });
  return dbApi().setAttendance({ ...record })
    .then(() => {})
    .catch((err: unknown) => { console.error('[AppContext] Failed to persist attendance record:', err); });
}, []);
```

This way `await setAttendanceRecord(...)` in the component resolves after the DB write (or silently after error), and `saving` is set to `false` correctly.

### `ElectronDB` type (`src/vite-env.d.ts`)

`setAttendance` and `getAttendance` signatures reference `AttendanceRecord` from `AppContext.tsx` via import. Once `breakSessions` is added to `AttendanceRecord` in `AppContext.tsx`, the type flows through those signatures automatically — **no edits to `vite-env.d.ts` are required**. Remove it from the Files Changed table.

---

## State Machine

```
NOT_STARTED
  → Punch In → WORKING

WORKING
  → Break Out → ON_BREAK
  → Punch Out → DONE

ON_BREAK
  → Break In → WORKING

DONE
  (terminal for the day)
```

State is **derived** from the today's `AttendanceRecord`, never stored separately:

| Condition | State |
|---|---|
| No record, or `checkIn` null | `NOT_STARTED` |
| `checkIn` set, `checkOut` null, last breakSession has `end` set (or no breaks) | `WORKING` |
| `checkIn` set, `checkOut` null, last breakSession has `end: null` | `ON_BREAK` |
| `checkOut` set | `DONE` |

---

## UI — `TodaySessionCard` component

Location: defined locally inside `src/pages/AttendancePage.tsx`, rendered in the **right-side panel as the first card** (above Attendance Summary).

**Context**: Pull `currentUser` from `AppContext` (not `AuthContext`):
```ts
const { currentUser, attendanceRecords, setAttendanceRecord } = useContext(AppContext);
```
If `currentUser` is `null`, render nothing (`return null`).

**`todayRecord`**: derived inside the component:
```ts
const todayRecord = attendanceRecords.find(r => r.userId === currentUser.id && r.date === TODAY) ?? null;
```

### Layout

```
┌─────────────────────────────────────┐
│  Today's Session          [WORKING] │  ← status badge
│                                     │
│         05:23:41                    │  ← net work timer (HH:MM:SS)
│         Net Work Time               │
│                                     │
│  [  Break Out  ]                    │  ← single action button
│                                     │
│  In: 09:00 AM   Break: 12m   Out: — │  ← summary row (see formatting spec below)
└─────────────────────────────────────┘
```

**Per-state card content:**

| State | Timer area | Button area |
|---|---|---|
| `NOT_STARTED` | Shows `"00:00:00"` static (no ticking) | "Punch In" button |
| `WORKING` | Shows net work timer ticking (`fmt(workMs)`) + label "Net Work Time" | "Break Out" + "Punch Out" side-by-side |
| `ON_BREAK` | Shows net work timer (frozen/paused) above; `fmt(openBreakMs)` + "On Break" label in amber below | "Break In" button |
| `DONE` | Shows final net work time frozen (computed from `checkOut` as `now`) + label "Total Work Time" | No buttons |

**Status badge** (top-right of card header):

| State | Label | Color |
|---|---|---|
| `NOT_STARTED` | Not Started | Gray |
| `WORKING` | Working | Green (`#68B266`) |
| `ON_BREAK` | On Break | Amber (`#D58D49`) |
| `DONE` | Done | Blue-gray |

When `DONE`, no button is shown; the summary row shows punch-out time.

### Summary row formatting

The summary row always shows three values: **In**, **Break**, **Out**.

- **In**: `new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })` → e.g. `"09:00 AM"`. Shows `"—"` when not punched in.
- **Break**: total closed break minutes = `Math.round(closedBreakMs / 60000)`. Display as `"Xm"` (e.g. `"12m"`). Shows `"0m"` when no breaks taken. Does **not** include the currently-open break.
- **Out**: same locale format as In, from `todayRecord.checkOut`. Shows `"—"` until punched out.

### Timer logic

A single `useEffect` runs `setInterval(1000)` and updates a `now: number` state (ms timestamp). All display values are computed from `now` on every render tick — no extra state.

```ts
// Net work seconds
const checkInMs = new Date(todayRecord.checkIn!).getTime();
const closedBreakMs = (todayRecord.breakSessions ?? [])
  .filter(b => b.end)
  .reduce((sum, b) => sum + (new Date(b.end!).getTime() - new Date(b.start).getTime()), 0);
const openBreakMs = state === 'ON_BREAK'
  ? now - new Date(todayRecord.breakSessions!.at(-1)!.start).getTime()
  : 0;
const workMs = now - checkInMs - closedBreakMs - openBreakMs;

// Format helper: ms → "HH:MM:SS"
const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600).toString().padStart(2, '0');
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const sc = (s % 60).toString().padStart(2, '0');
  return `${h}:${m}:${sc}`;
};
```

The break duration display (shown only in `ON_BREAK`) uses `openBreakMs`:
```ts
// When ON_BREAK, show the current break duration above the "On Break" label:
fmt(openBreakMs)  // e.g. "00:04:12"
```

The interval `useEffect` depends on `state` (the derived string) and `todayRecord?.checkIn`:
```ts
useEffect(() => {
  if (state !== 'WORKING' && state !== 'ON_BREAK') return;
  const id = setInterval(() => setNow(Date.now()), 1000);
  return () => clearInterval(id);
}, [state, todayRecord?.checkIn]);
```
`state` here is a `const` computed each render from `todayRecord` — it is stable as a string value and safe to use as a dependency.

In `NOT_STARTED` and `DONE`, the interval is never started (early return).

### Action handlers

All times stored as ISO strings (`new Date().toISOString()`).

**`TODAY` constant** — defined as a **module-level constant** outside the component function (evaluated once at module load, not per render). This avoids recalculation on every render and is stable across re-renders during the same day. Midnight crossover is an accepted non-issue for a desktop app (user would reopen the app the next day):
```ts
const TODAY = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
```
This matches the `date` field format used across all existing `AttendanceRecord` queries.

**Punch In:**

Merge with any existing record (to preserve `notes` etc.), or create fresh if none exists. Strip `id` from the spread to satisfy `Omit<AttendanceRecord, 'id'>`:
```ts
const existing = attendanceRecords.find(r => r.userId === currentUser.id && r.date === TODAY);
const { id: _id, ...existingRest } = existing ?? { id: '' };
await setAttendanceRecord({
  ...existingRest,
  userId: currentUser.id,
  date: TODAY,
  status: 'present',
  checkIn: new Date().toISOString(),
  breakSessions: [],
});
```

All handlers use `await setAttendanceRecord(...)` for the `saving` guard. `todayRecord` is guaranteed non-null in `WORKING`/`ON_BREAK` states. Strip `id` from spreads:

```ts
const { id: _id, ...rec } = todayRecord!;
```

**Break Out:**
```ts
const { id: _id, ...rec } = todayRecord!;
await setAttendanceRecord({ ...rec, breakSessions: [...(rec.breakSessions ?? []), { start: new Date().toISOString(), end: null }] });
```

**Break In:**
```ts
const { id: _id, ...rec } = todayRecord!;
const sessions = [...(rec.breakSessions ?? [])];
sessions[sessions.length - 1] = { ...sessions[sessions.length - 1], end: new Date().toISOString() };
await setAttendanceRecord({ ...rec, breakSessions: sessions });
```

**Punch Out:**

The Punch Out button is **only shown when `state === 'WORKING'`** (not when `ON_BREAK`). There is no `ON_BREAK → DONE` transition. If the user is on break, they must Break In first.

Punch Out closes any accidentally-open break session as a safety measure:
```ts
const { id: _id, ...rec } = todayRecord!;
const sessions = [...(rec.breakSessions ?? [])];
// Close any open break (defensive)
if (sessions.length > 0 && !sessions[sessions.length - 1].end) {
  sessions[sessions.length - 1] = { ...sessions[sessions.length - 1], end: new Date().toISOString() };
}
await setAttendanceRecord({ ...rec, checkOut: new Date().toISOString(), breakSessions: sessions });
```

### Button styles

| State | Buttons shown |
|---|---|
| `NOT_STARTED` | "Punch In" (green, full-width) |
| `WORKING` | "Break Out" (amber outlined) + "Punch Out" (red outlined), side-by-side |
| `ON_BREAK` | "Break In" (amber filled, full-width). Punch Out is **hidden**. |
| `DONE` | No buttons |

---

## Files Changed

| File | Change |
|---|---|
| `electron/main.js` | Add `breakSessions` to `AttendanceSchema`; update inline mapper |
| `src/context/AppContext.tsx` | Add `breakSessions` to `AttendanceRecord` interface; update `setAttendanceRecord` return type in both `AppContextType` interface and implementation to `Promise<void>` |
| `src/pages/AttendancePage.tsx` | Add `TodaySessionCard` local component; render it first in right panel |

No new files. No new IPC handlers.

---

## Edge Cases

- **App reopened mid-day**: State is re-derived from persisted record on load — timer resumes correctly.
- **Punch In on a day already marked absent/on-leave**: `setAttendanceRecord` overwrites status to `'present'` — acceptable self-service behaviour.
- **Break Out without Punch In**: Button is disabled (state is `NOT_STARTED`).
- **Multiple rapid clicks**: Add a `saving` boolean state in `TodaySessionCard`. Set it to `true` before calling `setAttendanceRecord`, then back to `false` in a `finally` block. All action buttons are `disabled={saving}` while true. Since `setAttendanceRecord` in `AppContext` is currently fire-and-forget (returns `void`), wrap the DB call directly in the component using `window.electronAPI.db.setAttendance(...)` returning a Promise, or update `setAttendanceRecord` to return the Promise. **Recommended**: update `setAttendanceRecord` signature in `AppContext` to return `Promise<void>` so components can await it.
- **`breakSessions` omitted from payload**: The IPC handler uses `d.breakSessions ?? []` — this guard is intentional and must not be removed. A missing field in the payload is valid (e.g., existing records without this field).
