# Attendance Break Persistence & Midnight Auto-Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist break sessions to MongoDB and automatically close forgotten open sessions at 23:59:59 local time on app startup.

**Architecture:** Add `breakSessions` to the Mongoose `AttendanceSchema` and update all three IPC data mappers to include it. Add a `healOpenSessions()` function called inside `connectDB()` between `mongoose.connect()` and `ensureDefaultData()` that finds all open sessions from past days and closes them. Remove the `checkInIsToday` timer guard in `TodaySessionCard` that was masking the underlying persistence bug.

**Tech Stack:** Electron (main process), Mongoose/MongoDB Atlas, React (renderer), TypeScript

**Spec:** `docs/superpowers/specs/2026-03-19-attendance-break-persistence-design.md`

---

## File Map

| File | Change |
|---|---|
| `electron/main.ts` | Add `breakSessions` to `AttendanceSchema` (line ~86); update `getAll` mapper (line 1240); update `set` type + return mapper (lines 1241–1244); update change stream mapper (line 513); add `healOpenSessions()` function; call it inside `connectDB()` (line ~945) |
| `src/pages/AttendancePage.tsx` | Remove `checkInIsToday`, `checkInDateStr` variables and the `!checkInIsToday` branch from `workMs` calc (lines 63–66, 76) |

---

## Task 1: Add `breakSessions` to AttendanceSchema

**Files:**
- Modify: `electron/main.ts:78-86`

- [ ] **Step 1: Open `electron/main.ts` and locate `AttendanceSchema` (around line 78)**

It currently reads:
```typescript
const AttendanceSchema = new Schema({
    recordId: { type: String, required: true, unique: true },
    userId:   { type: String, required: true },
    date:     { type: String, required: true },
    checkIn:  String,
    checkOut: String,
    status:   { type: String, enum: ['present', 'absent', 'half-day', 'on-leave', 'holiday', 'wfh'], default: 'present' },
    notes:    String,
});
```

- [ ] **Step 2: Add `breakSessions` field to the schema**

Replace the schema with:
```typescript
const AttendanceSchema = new Schema({
    recordId: { type: String, required: true, unique: true },
    userId:   { type: String, required: true },
    date:     { type: String, required: true },
    checkIn:  String,
    checkOut: String,
    status:   { type: String, enum: ['present', 'absent', 'half-day', 'on-leave', 'holiday', 'wfh'], default: 'present' },
    notes:    String,
    breakSessions: [{
        start: { type: String, required: true },
        end:   { type: String, default: null },
    }],
});
```

- [ ] **Step 3: Verify the file compiles — run the TypeScript check**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && npx tsc --noEmit 2>&1 | head -30
```

Expected: No new errors related to `AttendanceSchema`.

- [ ] **Step 4: Commit**

```bash
git add electron/main.ts
git commit -m "feat: add breakSessions field to AttendanceSchema"
```

---

## Task 2: Update IPC Data Mappers to Include `breakSessions`

**Files:**
- Modify: `electron/main.ts:513` (change stream mapper)
- Modify: `electron/main.ts:1240` (`getAll` mapper)
- Modify: `electron/main.ts:1241-1244` (`set` handler type + return mapper)

There are three places in `main.ts` that map a Mongoose document to a plain object for the renderer. All three must include `breakSessions`.

- [ ] **Step 1: Update the change stream mapper (line ~513)**

Find this line inside `startAttendanceStream()`:
```typescript
if (d) mainWindow.webContents.send('data:attendance:changed', { op, doc: safe({ id: d.recordId, userId: d.userId, date: d.date ?? null, checkIn: d.checkIn ?? null, checkOut: d.checkOut ?? null, status: d.status, notes: d.notes ?? null }) });
```

Replace with:
```typescript
if (d) mainWindow.webContents.send('data:attendance:changed', { op, doc: safe({ id: d.recordId, userId: d.userId, date: d.date ?? null, checkIn: d.checkIn ?? null, checkOut: d.checkOut ?? null, status: d.status, notes: d.notes ?? null, breakSessions: d.breakSessions ?? [] }) });
```

- [ ] **Step 2: Update the `db:attendance:getAll` mapper (line ~1240)**

Find:
```typescript
handle('db:attendance:getAll', async () => safe((await AttendanceModel.find().lean()).map((d: any) => ({ id: d.recordId, userId: d.userId, date: d.date ?? null, checkIn: d.checkIn ?? null, checkOut: d.checkOut ?? null, status: d.status, notes: d.notes ?? null }))));
```

Replace with:
```typescript
handle('db:attendance:getAll', async () => safe((await AttendanceModel.find().lean()).map((d: any) => ({ id: d.recordId, userId: d.userId, date: d.date ?? null, checkIn: d.checkIn ?? null, checkOut: d.checkOut ?? null, status: d.status, notes: d.notes ?? null, breakSessions: d.breakSessions ?? [] }))));
```

- [ ] **Step 3: Update the `db:attendance:set` handler type and return mapper (lines ~1241–1244)**

Find:
```typescript
handle('db:attendance:set', async (_e, record: { userId: string; date: string; status: string; checkIn?: string; checkOut?: string; notes?: string }) => {
    const recordId = `${record.userId}-${record.date}`;
    const d = await AttendanceModel.findOneAndUpdate({ recordId }, { recordId, ...record }, { upsert: true, returnDocument: 'after' }).lean() as any;
    return safe({ id: d.recordId, userId: d.userId, date: d.date ?? null, checkIn: d.checkIn ?? null, checkOut: d.checkOut ?? null, status: d.status, notes: d.notes ?? null });
});
```

Replace with:
```typescript
handle('db:attendance:set', async (_e, record: { userId: string; date: string; status: string; checkIn?: string; checkOut?: string; notes?: string; breakSessions?: { start: string; end: string | null }[] }) => {
    const recordId = `${record.userId}-${record.date}`;
    const d = await AttendanceModel.findOneAndUpdate({ recordId }, { recordId, ...record }, { upsert: true, returnDocument: 'after' }).lean() as any;
    return safe({ id: d.recordId, userId: d.userId, date: d.date ?? null, checkIn: d.checkIn ?? null, checkOut: d.checkOut ?? null, status: d.status, notes: d.notes ?? null, breakSessions: d.breakSessions ?? [] });
});
```

- [ ] **Step 4: Verify the file compiles**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && npx tsc --noEmit 2>&1 | head -30
```

Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add electron/main.ts
git commit -m "feat: include breakSessions in all attendance IPC mappers"
```

---

## Task 3: Add `healOpenSessions()` Function

**Files:**
- Modify: `electron/main.ts` — add new function before `connectDB()` (around line 933), then call it inside `connectDB()`

- [ ] **Step 1: Add the `healOpenSessions` function**

Insert the following function immediately before the `connectDB` function (which starts around line 934):

```typescript
async function healOpenSessions(): Promise<void> {
    try {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // { checkOut: null } matches both missing field and explicitly null — intentional
        const stale = await AttendanceModel.find({
            checkIn: { $exists: true, $ne: null },
            checkOut: null,
            date: { $lt: today },
        }).lean() as any[];

        for (const record of stale) {
            const [y, m, d] = (record.date as string).split('-').map(Number);
            const closeTime = new Date(y, m - 1, d, 23, 59, 59).toISOString();

            const healedBreaks = ((record.breakSessions ?? []) as { start: string; end: string | null }[])
                .map(b => b.end ? b : { ...b, end: closeTime });

            await AttendanceModel.findOneAndUpdate(
                { recordId: record.recordId },
                { checkOut: closeTime, breakSessions: healedBreaks },
                { upsert: false }
            );
        }

        if (stale.length > 0) {
            console.log(`[healOpenSessions] Closed ${stale.length} stale open session(s)`);
        }
    } catch (err: any) {
        // Non-fatal: log and continue. ensureDefaultData() will still run.
        console.error('[healOpenSessions] Failed to heal stale sessions:', err?.message ?? err);
    }
}
```

- [ ] **Step 2: Call `healOpenSessions()` inside `connectDB()`, between `mongoose.connect()` and `ensureDefaultData()`**

Find this block inside `connectDB()`:
```typescript
await mongoose.connect(uri, opts);
console.log('MongoDB connected');
if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('db:connected');
await ensureDefaultData();
return;
```

Replace with:
```typescript
await mongoose.connect(uri, opts);
console.log('MongoDB connected');
if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('db:connected');
await healOpenSessions();
await ensureDefaultData();
return;
```

- [ ] **Step 3: Verify the file compiles**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add electron/main.ts
git commit -m "feat: add healOpenSessions() to auto-close stale open attendance sessions at startup"
```

---

## Task 4: Remove `checkInIsToday` Guard from TodaySessionCard

**Files:**
- Modify: `src/pages/AttendancePage.tsx:63-79`

- [ ] **Step 1: Open `src/pages/AttendancePage.tsx` and locate the timer math section (around lines 63–79)**

It currently reads:
```typescript
const checkInMs = todayRecord?.checkIn ? new Date(todayRecord.checkIn).getTime() : 0;
// Midnight guard: if checkIn is from a different calendar day, treat elapsed as 0
const checkInDateStr = todayRecord?.checkIn
  ? new Date(todayRecord.checkIn).toISOString().split('T')[0]
  : null;
const checkInIsToday = checkInDateStr === TODAY_DATE;
const closedBreakMs = Math.max(0, (todayRecord?.breakSessions ?? [])
  .filter(b => b.end)
  .reduce((sum, b) => sum + (new Date(b.end!).getTime() - new Date(b.start).getTime()), 0));
const openBreakSession = state === 'ON_BREAK'
  ? (() => { const s = todayRecord?.breakSessions ?? []; return s.length ? s[s.length - 1] : null; })() ?? null
  : null;
const openBreakMs = openBreakSession
  ? Math.max(0, now - new Date(openBreakSession.start).getTime())
  : 0;
const workMs = state === 'NOT_STARTED' || !checkInIsToday ? 0
  : state === 'DONE'
    ? Math.max(0, new Date(todayRecord!.checkOut!).getTime() - checkInMs - closedBreakMs)
    : Math.max(0, now - checkInMs - closedBreakMs - openBreakMs);
```

- [ ] **Step 2: Remove the `checkInDateStr`, `checkInIsToday` variables and simplify `workMs`**

Replace the entire block with:
```typescript
const checkInMs = todayRecord?.checkIn ? new Date(todayRecord.checkIn).getTime() : 0;
const closedBreakMs = Math.max(0, (todayRecord?.breakSessions ?? [])
  .filter(b => b.end)
  .reduce((sum, b) => sum + (new Date(b.end!).getTime() - new Date(b.start).getTime()), 0));
const openBreakSession = state === 'ON_BREAK'
  ? (() => { const s = todayRecord?.breakSessions ?? []; return s.length ? s[s.length - 1] : null; })() ?? null
  : null;
const openBreakMs = openBreakSession
  ? Math.max(0, now - new Date(openBreakSession.start).getTime())
  : 0;
const workMs = state === 'NOT_STARTED' ? 0
  : state === 'DONE'
    ? Math.max(0, new Date(todayRecord!.checkOut!).getTime() - checkInMs - closedBreakMs)
    : Math.max(0, now - checkInMs - closedBreakMs - openBreakMs);
```

- [ ] **Step 3: Verify the file compiles**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors. If `checkInDateStr` or `checkInIsToday` are referenced anywhere else in the file, TypeScript will catch it here.

- [ ] **Step 4: Commit**

```bash
git add src/pages/AttendancePage.tsx
git commit -m "fix: remove checkInIsToday guard — break persistence makes it unnecessary"
```

---

## Task 5: Manual Verification

No automated test suite is present in this project. Verify behavior manually by building and running the app.

- [ ] **Step 1: Build the app**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Test break persistence across restart**

1. Launch the app
2. Punch In
3. Take a Break
4. Fully quit the app (Cmd+Q / tray → Quit)
5. Relaunch
6. Open Attendance page → `TodaySessionCard` should show `ON_BREAK` state with the break timer resuming from when the break started, not reset to zero

- [ ] **Step 3: Test midnight auto-heal**

Simulate a stale open session by directly inserting a record into MongoDB with:
- `date` = yesterday's date (e.g. `"2026-03-18"`)
- `checkIn` = any ISO timestamp from yesterday
- `checkOut` = absent (do not set it)
- `status` = `"present"`

Then fully quit and relaunch the app. Check MongoDB — the record should now have `checkOut = "2026-03-18T23:59:59.xxx"` (local time encoded as ISO). The Attendance page weekly grid should show yesterday's dot as green (present).

- [ ] **Step 4: Test today's open session is untouched**

Punch in today, then fully quit and relaunch. The record for today should have `checkIn` but no `checkOut` — the heal must not close it.

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: attendance break persistence and midnight auto-heal verified"
```
