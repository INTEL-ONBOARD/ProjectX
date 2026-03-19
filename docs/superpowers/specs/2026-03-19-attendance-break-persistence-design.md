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
- **Split time:** Always use `23:59:59` on the date of the open record (not org workEnd, not last activity).
- **Break persistence:** Yes — persist `breakSessions` to MongoDB so timer survives restarts and auto-split correctly excludes break time from the work-hours calculation.
- **Today's open session:** Never touched by the heal routine. If the user is still working today with no punch-out, the session stays open.

---

## Architecture

### Approach: Startup Heal Routine (Approach A)

A one-shot async function `healOpenSessions()` runs after MongoDB connects and before change streams start. It finds all stale open sessions and closes them at 23:59:59 of their own date.

This is the only approach that works regardless of whether the app was running at midnight. No cron, no client-side timers, no external scheduler needed.

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

Both the `db:attendance:getAll` handler and the change stream `doc` mapper must include `breakSessions`:

```typescript
// getAll mapper
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

// change stream mapper (same addition)
```

### 3. Startup Heal Routine (`electron/main.ts`)

New function `healOpenSessions()`:

```
today = local date as "YYYY-MM-DD"

query: AttendanceModel.find({
  checkIn: { $exists: true, $ne: null },
  checkOut: { $exists: false } OR checkOut: null,
  date: { $lt: today }
})

for each stale record:
  closeTime = record.date + "T23:59:59.000Z"

  for each breakSession where end === null:
    set end = closeTime

  set checkOut = closeTime
  save (findOneAndUpdate upsert)
```

**Called:** After `mongoose.connect()` resolves, before `startAttendanceStream()`.
**Scope:** Only records where `date < today`. Never touches today's open session.
**Side effects:** None — no new records created, no other fields modified.

### 4. Remove `checkInIsToday` Guard (`src/pages/AttendancePage.tsx`)

The `TodaySessionCard` has this guard in the `workMs` calculation (line 76):

```typescript
// BEFORE (buggy)
const workMs = state === 'NOT_STARTED' || !checkInIsToday ? 0
  : ...

// AFTER
const workMs = state === 'NOT_STARTED' ? 0
  : ...
```

**Why remove it:** After the heal routine, no active session will ever have a `checkIn` from a past day. The guard was masking the bug rather than fixing it. Removing it means that in the unlikely event the heal fails (e.g., DB unreachable on startup), the timer still shows real elapsed time instead of zero.

The `checkInIsToday` and `checkInDateStr` variables derived from it can also be removed as dead code.

---

## Data Flow After Fix

```
App starts
  └─ mongoose.connect() resolves
       └─ healOpenSessions() runs
            └─ finds Monday's open record (checkIn=09:00, checkOut=null, date="2026-03-16")
                 └─ closes open break if any → end = "2026-03-16T23:59:59.000Z"
                 └─ sets checkOut = "2026-03-16T23:59:59.000Z"
                 └─ saves to MongoDB
       └─ startAttendanceStream() starts
       └─ renderer loads:
            └─ db:attendance:getAll returns Monday record: checkIn=09:00, checkOut=23:59:59 ✓
            └─ breakSessions included ✓
            └─ Today: no open session → TodaySessionCard shows "Not Started" ✓

User takes a break today:
  └─ breakSession { start: ISO, end: null } written to MongoDB immediately
  └─ app restart → break session persists → timer resumes correctly ✓

User forgets to punch out again tonight:
  └─ next morning, healOpenSessions() closes at 23:59:59 ✓
```

---

## File Change Summary

| File | Change |
|---|---|
| `electron/main.ts` | Add `breakSessions` array to `AttendanceSchema` |
| `electron/main.ts` | Include `breakSessions` in `getAll` mapper and change stream mapper |
| `electron/main.ts` | Add `healOpenSessions()` async function, call it after connect |
| `src/pages/AttendancePage.tsx` | Remove `checkInIsToday` guard and dead variable from `workMs` calc |

---

## Out of Scope

- Creating phantom records for days the user didn't work (not desired)
- Notifying the user that their session was auto-closed (could be a future enhancement)
- Setting `half-day` status automatically based on hours worked (future enhancement)
- Any changes to the weekly grid, reports, or CSV export
