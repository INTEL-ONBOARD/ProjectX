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

The `toAttendance` inline mapper used in `db:attendance:getAll` and `db:attendance:set` must include `breakSessions`:

```js
const toAtt = d => ({
  id: d.recordId,
  userId: d.userId,
  date: d.date ?? null,
  checkIn: d.checkIn ?? null,
  checkOut: d.checkOut ?? null,
  status: d.status,
  notes: d.notes ?? null,
  breakSessions: (d.breakSessions ?? []).map(b => ({ start: b.start, end: b.end ?? null })),
});
```

`end` is nullable — an open break session has `end: null`.

### `AttendanceRecord` interface (`src/context/AppContext.tsx`)

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

### `ElectronDB` type (`src/vite-env.d.ts`)

`setAttendance` and `getAttendance` already use `AttendanceRecord` — no signature change needed. The new field flows through automatically.

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
│  In: 09:00 AM   Break: 12m   Out: — │  ← summary row
└─────────────────────────────────────┘
```

When `ON_BREAK`, a secondary amber timer appears below the main timer:
```
│         00:04:12                    │  ← break duration (ticking up)
│         On Break                    │
```

When `DONE`, no button is shown; the summary row shows punch-out time.

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

Interval is started only when `state === 'WORKING' || state === 'ON_BREAK'` and cleared on `DONE` or unmount.

### Action handlers

All times stored as ISO strings (`new Date().toISOString()`).

**Punch In:**
```ts
setAttendanceRecord({
  userId: currentUser.id,
  date: TODAY,
  status: 'present',
  checkIn: new Date().toISOString(),
  breakSessions: [],
});
```

**Break Out:**
```ts
const updated = { ...todayRecord, breakSessions: [...(todayRecord.breakSessions ?? []), { start: new Date().toISOString(), end: null }] };
setAttendanceRecord(updated);
```

**Break In:**
```ts
const sessions = [...(todayRecord.breakSessions ?? [])];
sessions[sessions.length - 1] = { ...sessions[sessions.length - 1], end: new Date().toISOString() };
setAttendanceRecord({ ...todayRecord, breakSessions: sessions });
```

**Punch Out:**
```ts
setAttendanceRecord({ ...todayRecord, checkOut: new Date().toISOString() });
```

### Button styles

| State | Button label | Button style |
|---|---|---|
| `NOT_STARTED` | Punch In | Primary green |
| `WORKING` | Break Out | Amber outlined |
| `WORKING` | Punch Out | Red outlined (secondary) |
| `ON_BREAK` | Break In | Amber filled |
| `DONE` | — | Hidden |

When `WORKING`, two buttons are shown side-by-side: **Break Out** and **Punch Out**.

---

## Files Changed

| File | Change |
|---|---|
| `electron/main.js` | Add `breakSessions` to `AttendanceSchema`; update inline mapper |
| `src/context/AppContext.tsx` | Add `breakSessions` to `AttendanceRecord` interface |
| `src/vite-env.d.ts` | Add `breakSessions` to `AttendanceRecord` in `ElectronDB` comments (type flows through existing signature) |
| `src/pages/AttendancePage.tsx` | Add `TodaySessionCard` local component; render it first in right panel |

No new files. No new IPC handlers.

---

## Edge Cases

- **App reopened mid-day**: State is re-derived from persisted record on load — timer resumes correctly.
- **Punch In on a day already marked absent/on-leave**: `setAttendanceRecord` overwrites status to `'present'` — acceptable self-service behaviour.
- **Break Out without Punch In**: Button is disabled (state is `NOT_STARTED`).
- **Multiple rapid clicks**: Buttons should be disabled during the `setAttendanceRecord` async call (add a `saving` boolean flag).
