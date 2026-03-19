# Attendance: Break Persistence & Midnight Auto-Split Design

**Date:** 2026-03-19
**Status:** Approved

---

## Problem Statement

Three related bugs in the attendance system:

1. **Break sessions lost on restart** — `breakSessions` only lives in React state, not MongoDB. Timer math breaks after any restart.
2. **Wrong work hours / phantom auto clock-out on restart** — `TodaySessionCard` re-derives state from live DB data. If the user punched in yesterday and never punched out, the UI shows `WORKING` state but the `checkInIsToday` guard zeroes the timer. Subsequent punch-out writes a wrong or missing elapsed time.
3. **Multi-day shifts not supported** — A shift that starts on day N and is never punched out stays open indefinitely with no clock-out recorded for day N.

---

## Decisions

- **Midnight split strategy:** Auto-split at midnight (23:59:59) on app startup — not a live cron or client-side watcher.
- **Split time:** Always use local `23:59:59` on the date of the open record (not UTC, not org workEnd, not last activity).
- **Break persistence:** Yes — persist `breakSessions` to MongoDB so timer survives restarts and auto-split correctly closes open breaks before writing `checkOut`.
- **Today's open session:** Never touched by the heal routine. If the user is still working today with no punch-out, the session stays open.

---

## Architecture

### Approach: Startup Heal Routine (Approach A)

A one-shot async function `healOpenSessions()` runs after MongoDB connects and before the renderer loads data. It finds all stale open sessions and closes them at 23:59:59 local time of their own date.

This is the only approach that works regardless of whether the app was running at midnight. No cron, no client-side timers, no external scheduler needed.

**Idempotency:** `healOpenSessions()` is safe to run multiple times on the same record. Writing `23:59:59` to an already-closed record is a no-op in effect. This is important because it may be called on reconnect in the future.

---

## Detailed Design

### 1. Database Schema — `AttendanceSchema` (`electron/main.ts`)

Add `breakSessions` as a persisted array field:

```typescript
breakSessions: [{
  start: { type: String, required: true },  // ISO 8601 timestamp
  end:   { type: String, default: null }     // ISO 8601 timestamp or null if open
}]
```

**Why:** Breaks must survive restarts so the timer can resume correctly and `healOpenSessions` can properly close open break sessions before writing `checkOut`.

### 2. IPC Data Mappers (`electron/main.ts`)

Three mappers must be updated to include `breakSessions`:

**a) `db:attendance:getAll` handler mapper:**
```typescript
{
  id: d.recordId,
  userId: d.userId,
  date: d.date ?? null,
  checkIn: d.checkIn ?? null,
  checkOut: d.checkOut ?? null,
  status: d.status,
  notes: d.notes ?? null,
  breakSessions: d.breakSessions ?? [],   // ← added
}
```

**b) `db:attendance:set` handler:**
- Update the TypeScript parameter type to include `breakSessions?: { start: string; end: string | null }[]`
- Update the return mapper to include `breakSessions: d.breakSessions ?? []`

**c) Change stream mapper** (inside `startAttendanceStream`):
```typescript
safe({ id: d.recordId, ..., breakSessions: d.breakSessions ?? [] })
```

### 3. Startup Heal Routine (`electron/main.ts`)

New async function `healOpenSessions()`:

```typescript
async function healOpenSessions(): Promise<void> {
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  // { checkOut: null } matches both missing field ($exists: false) and explicitly null — intentional
  const stale = await AttendanceModel.find({
    checkIn: { $exists: true, $ne: null },
    checkOut: null,
    date: { $lt: today },
  }).lean();

  for (const record of stale) {
    // Build local-time 23:59:59 for the record's own date
    const [y, m, d] = (record.date as string).split('-').map(Number);
    const closeTime = new Date(y, m - 1, d, 23, 59, 59).toISOString();

    // Close any open break session
    const breaks = (record.breakSessions ?? []) as { start: string; end: string | null }[];
    const healedBreaks = breaks.map(b => b.end ? b : { ...b, end: closeTime });

    await AttendanceModel.findOneAndUpdate(
      { recordId: record.recordId },
      { checkOut: closeTime, breakSessions: healedBreaks },
      { upsert: false }
    );
  }

  if (stale.length > 0) {
    console.log(`[healOpenSessions] Closed ${stale.length} stale open session(s)`);
  }
}
```

**Timestamp construction note:** `new Date(y, m - 1, d, 23, 59, 59).toISOString()` produces the correct UTC-encoded ISO string for local 23:59:59 on that date, matching how the renderer builds all other timestamps (via `new Date().toISOString()`). Using `record.date + "T23:59:59.000Z"` would be wrong for non-UTC users.

**Call site:** Inside `connectDB()`, between `await mongoose.connect()` and `await ensureDefaultData()` — i.e., as a new `await healOpenSessions()` call inserted between those two lines. This guarantees the heal runs before the renderer calls `db:attendance:getAll` on mount, which is triggered by `AppContext`'s `useEffect` after the window loads.

**Ordering note:** `startAttendanceStream()` is called from `mainWindow.once('ready-to-show', ...)` — independently of `connectDB()`. Due to network latency vs. window initialization, the stream may start before or after the heal completes. This is acceptable: the renderer's initial `db:attendance:getAll` (not the change stream) is the source of truth for the first render, and it fires after the window is ready — by which time the heal will have completed. Any change-stream event that arrives before `getAll` resolves will be reconciled by `AppContext`'s upsert logic.

### 4. Remove `checkInIsToday` Guard (`src/pages/AttendancePage.tsx`)

The `TodaySessionCard` currently has (lines 63–79):

```typescript
// Remove these two lines:
const checkInDateStr = todayRecord?.checkIn
  ? new Date(todayRecord.checkIn).toISOString().split('T')[0]
  : null;
const checkInIsToday = checkInDateStr === TODAY_DATE;

// And change workMs from:
const workMs = state === 'NOT_STARTED' || !checkInIsToday ? 0 : ...

// To:
const workMs = state === 'NOT_STARTED' ? 0 : ...
```

**Why:** After the heal routine, no active session will ever have a `checkIn` from a past day. The guard was masking the underlying persistence bug rather than fixing it.

**Offline degraded mode:** If MongoDB is unreachable at startup and the heal cannot run, a stale open session from a prior day will remain, and with the guard removed the timer will show elapsed time since the original `checkIn` (e.g., 26+ hours). This is an honest representation of the unclosed session rather than silently showing zero. Admins can delete the stale record via the weekly grid's delete button.

---

## Data Flow After Fix

```
App starts
  └─ mongoose.connect() resolves
       └─ healOpenSessions() runs (inside connectDB / ensureDefaultData)
            └─ finds Monday's open record (checkIn=09:00, checkOut=null, date="2026-03-16")
                 └─ closes open break if any → end = "2026-03-16T23:59:59" (local)
                 └─ sets checkOut = "2026-03-16T23:59:59" (local)
                 └─ saves to MongoDB
       └─ startAttendanceStream() starts (independently, from ready-to-show)
       └─ renderer loads:
            └─ db:attendance:getAll returns Monday record: checkIn=09:00, checkOut=23:59:59 ✓
            └─ breakSessions included ✓
            └─ Today: no open session → TodaySessionCard shows "Not Started" ✓

User takes a break today:
  └─ breakSession { start: ISO, end: null } written to MongoDB immediately ✓
  └─ app restart → break session persists → timer resumes correctly ✓

User forgets to punch out again tonight:
  └─ next morning, healOpenSessions() closes at local 23:59:59 ✓
```

---

## File Change Summary

| File | Change |
|---|---|
| `electron/main.ts` | Add `breakSessions` array to `AttendanceSchema` |
| `electron/main.ts` | Include `breakSessions` in `db:attendance:getAll` mapper |
| `electron/main.ts` | Include `breakSessions` in `db:attendance:set` TS parameter type and return mapper |
| `electron/main.ts` | Include `breakSessions` in change stream `doc` mapper inside `startAttendanceStream` |
| `electron/main.ts` | Add `healOpenSessions()` async function, call inside `connectDB` after connect resolves |
| `src/pages/AttendancePage.tsx` | Remove `checkInIsToday` guard and dead variables from `workMs` calc |

---

## Out of Scope

- Creating phantom records for days the user didn't work (not desired)
- Notifying the user that their session was auto-closed (future enhancement)
- Setting `half-day` status automatically based on hours worked (future enhancement)
- Any changes to the weekly grid, reports, or CSV export
