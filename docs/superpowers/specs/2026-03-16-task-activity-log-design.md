# Task Activity Log — Design Spec

## Goal
Add a per-task activity/audit log showing who did what and when. Visible in a new "Activity" tab in the task detail side panel (both TasksPage and KanbanBoard).

## Architecture
- **Storage:** Embedded `activity` array on each Task document in MongoDB (no separate collection).
- **Actor identity:** Passed from renderer to IPC handler as `actorId` + `actorName` fields alongside the changes payload. Stripped from `changes` before applying to the task document. Actor name stored at write time (avoids join at read time).
- **Log generation:** Inside the IPC handlers in `electron/main.ts` and `electron/main.js`.
- **Tech Stack:** Mongoose 9, MongoDB Atlas M0, React 18, Electron IPC, existing ProjectContext pattern.

---

## 1. Data Model

### `TaskActivityEntry` type (`src/types/index.ts`)
```typescript
export type TaskActivityEntryType =
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'assignee_added'
  | 'assignee_removed'
  | 'due_date_changed'
  | 'title_changed'
  | 'description_changed';

export interface TaskActivityEntry {
  id: string;           // unique entry ID (crypto.randomUUID() generated in main process)
  type: TaskActivityEntryType;
  actorId: string;
  actorName: string;    // stored at write time
  timestamp: string;    // ISO string
  from?: string;        // previous value (for change events)
  to?: string;          // new value (for change events)
}
```

### `Task` type (`src/types/index.ts`)
Add field:
```typescript
activity?: TaskActivityEntry[];
```

### Mongoose `TaskSchema` (`electron/main.ts` and `electron/main.js`)
Add field:
```javascript
activity: { type: Array, default: [] }
```

### `toTask` transformer
Include `activity` in the mapped object:
```typescript
activity: d.activity ?? [],
```

---

## 2. IPC Handlers

### `db:tasks:create` (`electron/main.ts` + `electron/main.js`)
After creating the document, append one `created` entry:
```typescript
ipcMain.handle('db:tasks:create', async (_e, taskData: any) => {
    const { actorId, actorName, ...rest } = taskData;
    const entry = {
        id: require('crypto').randomUUID(),
        type: 'created',
        actorId: actorId ?? 'system',
        actorName: actorName ?? 'System',
        timestamp: new Date().toISOString(),
    };
    const doc = await TaskModel.create({
        appId: 't' + Date.now(),
        ...rest,
        activity: [entry],
    });
    return toTask(doc.toObject());
});
```

### `db:tasks:update` (`electron/main.ts` + `electron/main.js`)
Before updating, fetch the current document and diff against `changes`. Generate one entry per changed watched field. Strip `actorId`/`actorName` from `changes`.

Watched fields and their entry types:
- `status` → `status_changed`
- `priority` → `priority_changed`
- `dueDate` → `due_date_changed`
- `title` → `title_changed`
- `description` → `description_changed`
- `assignees` → diff old vs new array; produce `assignee_added` (to = added member id) and `assignee_removed` (from = removed member id) entries for each change

```typescript
ipcMain.handle('db:tasks:update', async (_e, id: string, changes: any) => {
    const { actorId, actorName, ...rest } = changes;
    const actor = { actorId: actorId ?? 'system', actorName: actorName ?? 'System' };

    const current = await TaskModel.findOne({ appId: id }).lean();
    if (!current) return null;

    const entries: any[] = [];
    const ts = new Date().toISOString();

    const scalarFields: [string, string][] = [
        ['status', 'status_changed'],
        ['priority', 'priority_changed'],
        ['dueDate', 'due_date_changed'],
        ['title', 'title_changed'],
        ['description', 'description_changed'],
    ];
    for (const [field, type] of scalarFields) {
        if (rest[field] !== undefined && String(rest[field]) !== String((current as any)[field] ?? '')) {
            entries.push({ id: require('crypto').randomUUID(), type, ...actor, timestamp: ts, from: String((current as any)[field] ?? ''), to: String(rest[field]) });
        }
    }

    if (rest.assignees !== undefined) {
        const oldSet = new Set<string>((current as any).assignees ?? []);
        const newSet = new Set<string>(rest.assignees);
        for (const a of newSet) {
            if (!oldSet.has(a)) entries.push({ id: require('crypto').randomUUID(), type: 'assignee_added', ...actor, timestamp: ts, to: a });
        }
        for (const a of oldSet) {
            if (!newSet.has(a)) entries.push({ id: require('crypto').randomUUID(), type: 'assignee_removed', ...actor, timestamp: ts, from: a });
        }
    }

    const updated = await TaskModel.findOneAndUpdate(
        { appId: id },
        { ...rest, $push: { activity: { $each: entries } } },
        { returnDocument: 'after' }
    );
    return updated ? toTask(updated.toObject()) : null;
});
```

### `db:tasks:move` (`electron/main.ts` + `electron/main.js`)
```typescript
ipcMain.handle('db:tasks:move', async (_e, id: string, newStatus: string, actorId?: string, actorName?: string) => {
    const current = await TaskModel.findOne({ appId: id }).lean();
    if (!current) return null;
    const entry = {
        id: require('crypto').randomUUID(),
        type: 'status_changed',
        actorId: actorId ?? 'system',
        actorName: actorName ?? 'System',
        timestamp: new Date().toISOString(),
        from: (current as any).status,
        to: newStatus,
    };
    const updated = await TaskModel.findOneAndUpdate(
        { appId: id },
        { status: newStatus, $push: { activity: entry } },
        { returnDocument: 'after' }
    );
    return updated ? toTask(updated.toObject()) : null;
});
```

---

## 3. Preload + Type Declarations

### `electron/preload.ts` + `electron/preload.js`
Update `moveTask` signature to accept optional actorId and actorName:
```typescript
moveTask: (id: string, newStatus: string, actorId?: string, actorName?: string): Promise<unknown> =>
    ipcRenderer.invoke('db:tasks:move', id, newStatus, actorId, actorName),
```

### `src/vite-env.d.ts` (`ElectronDB` interface)
```typescript
moveTask(id: string, newStatus: TaskStatus, actorId?: string, actorName?: string): Promise<Task | null>;
```

---

## 4. ProjectContext (`src/context/ProjectContext.tsx`)

`ProjectContext` must access `useAuth()` to get `authUser`. All three mutation methods pass `actorId` and `actorName`:

```typescript
const { user: authUser } = useAuth();
const actorMeta = { actorId: authUser?.id ?? '', actorName: authUser?.name ?? '' };

// createTask:
const created = await window.electronAPI.db.createTask({ ...taskData, ...actorMeta });

// updateTask:
const updated = await window.electronAPI.db.updateTask(id, { ...changes, ...actorMeta });

// moveTask:
const moved = await window.electronAPI.db.moveTask(id, newStatus, actorMeta.actorId, actorMeta.actorName);
```

---

## 5. UI

Both side panels (`src/pages/TasksPage.tsx` and `src/components/dashboard/KanbanBoard.tsx`) get identical changes:

### Tab bar (added below "TASK DETAIL" header, above task title)
```tsx
const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');

// Tab bar UI:
<div className="flex border-b border-surface-100 shrink-0">
  {(['details', 'activity'] as const).map(tab => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
        activeTab === tab
          ? 'text-primary-600 border-b-2 border-primary-500'
          : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {tab.charAt(0).toUpperCase() + tab.slice(1)}
    </button>
  ))}
</div>
```

### Details tab
Wraps the existing panel content in `{activeTab === 'details' && (...)}`.

### Activity tab
```tsx
{activeTab === 'activity' && (
  <div className="flex-1 overflow-y-auto p-4">
    {(selectedTask.activity ?? []).length === 0 ? (
      <p className="text-xs text-gray-400 text-center mt-8">No activity yet.</p>
    ) : (
      <div className="flex flex-col gap-3">
        {[...(selectedTask.activity ?? [])].reverse().map(entry => (
          <ActivityEntry key={entry.id} entry={entry} currentUserId={authUser?.id ?? ''} />
        ))}
      </div>
    )}
  </div>
)}
```

### `ActivityEntry` helper (inline in each file, not a shared component)

Icon map:
- `created` → `Plus` (green)
- `status_changed` → `ArrowRight` (blue)
- `priority_changed` → `Flag` (orange)
- `assignee_added` → `UserPlus` (green)
- `assignee_removed` → `UserMinus` (red)
- `due_date_changed` → `Calendar` (purple)
- `title_changed` → `Pencil` (gray)
- `description_changed` → `FileText` (gray)

Label map:
- `created` → "created this task"
- `status_changed` → "changed status"
- `priority_changed` → "changed priority"
- `assignee_added` → "added assignee"
- `assignee_removed` → "removed assignee"
- `due_date_changed` → "changed due date"
- `title_changed` → "changed title"
- `description_changed` → "updated description"

Actor display: `entry.actorId === currentUserId ? 'You' : entry.actorName`

Timestamp: relative if within 24h ("2 hours ago"), full date otherwise ("Mar 14, 2:01 AM").

`from → to` chip: shown for all types except `created`. For `assignee_added`, show only `to`. For `assignee_removed`, show only `from`.

---

## 6. Files to Modify/Create

| File | Change |
|------|--------|
| `electron/main.ts` | Add `activity` to TaskSchema + toTask; rewrite create/update/move handlers |
| `electron/main.js` | Mirror all above |
| `electron/preload.ts` | Update `moveTask` signature |
| `electron/preload.js` | Mirror |
| `src/vite-env.d.ts` | Update `moveTask` type in `ElectronDB` |
| `src/types/index.ts` | Add `TaskActivityEntry`, `TaskActivityEntryType`, `activity?` on `Task` |
| `src/context/ProjectContext.tsx` | Import `useAuth`, pass `actorMeta` in all 3 mutations |
| `src/pages/TasksPage.tsx` | Add tab bar + Activity tab UI |
| `src/components/dashboard/KanbanBoard.tsx` | Add tab bar + Activity tab UI |

---

## 7. Verification

1. `./node_modules/.bin/tsc --noEmit` — zero errors
2. Create a task → Activity tab shows "You created this task"
3. Change status → "You changed status: To Do → Ready for QA"
4. Change priority → "You changed priority: Low → High"
5. Add/remove assignee → "You added assignee" / "You removed assignee"
6. Change due date → "You changed due date"
7. Edit title/description → respective entries appear
8. Drag card on Kanban → status change logged
9. Entries appear newest-first
10. Another user's changes show their full name, not "You"
