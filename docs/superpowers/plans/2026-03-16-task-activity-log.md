# Task Activity Log Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-task activity/audit log with a Details/Activity tab in both task detail panels.

**Architecture:** Activity entries are embedded in each Task document as an `activity[]` array. IPC handlers in main.ts/main.js append entries on create/update/move. Actor identity (id + name) flows from the renderer via ProjectContext using useAuth(). The UI renders a tab bar in both task detail panels (TasksPage + KanbanBoard).

**Tech Stack:** Mongoose 9, MongoDB Atlas M0, Electron IPC, React 18, TypeScript, Tailwind CSS

---

## Task 1 — Types (`src/types/index.ts`)

Add `TaskActivityEntryType`, `TaskActivityEntry`, and `activity?: TaskActivityEntry[]` to the `Task` interface.

### Steps

- [ ] Edit `src/types/index.ts`

**old_string** (the closing brace of `TaskCommentItem` through the end of the `Task` interface — lines 27-47):
```ts
export interface TaskCommentItem {
    id: string;
    author: string;
    text: string;
    time: string;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    priority: Priority;
    status: TaskStatus;
    assignees: string[];
    comments: number;
    commentData?: TaskCommentItem[];
    files: number;
    images?: string[];
    dueDate?: string;
    projectId?: string;
}
```

**new_string:**
```ts
export interface TaskCommentItem {
    id: string;
    author: string;
    text: string;
    time: string;
}

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
    id: string;
    type: TaskActivityEntryType;
    actorId: string;
    actorName: string;
    timestamp: string;
    from?: string;
    to?: string;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    priority: Priority;
    status: TaskStatus;
    assignees: string[];
    comments: number;
    commentData?: TaskCommentItem[];
    files: number;
    images?: string[];
    dueDate?: string;
    projectId?: string;
    activity?: TaskActivityEntry[];
}
```

### Verification

```
./node_modules/.bin/tsc --noEmit
```
Expected: no output (zero errors).

### Commit

```
git add src/types/index.ts
git commit -m "feat(types): add TaskActivityEntry types and activity field to Task"
```

---

## Task 2 — `electron/main.ts` — schema + toTask + IPC handlers

Three changes in one file:
1. Add `activity` field to `TaskSchema`
2. Replace `toTask` to include `activity`
3. Replace the three one-liner IPC handlers (`db:tasks:create`, `db:tasks:update`, `db:tasks:move`) with full async handlers

### Steps

- [ ] **2a** Add `activity` to TaskSchema

**File:** `electron/main.ts`

**old_string** (lines 23-35, the full TaskSchema block):
```ts
const TaskSchema = new Schema({
    appId:       { type: String, required: true, unique: true },
    title:       { type: String, required: true },
    description: { type: String, default: '' },
    priority:    { type: String, enum: ['low', 'high', 'completed'], default: 'low' },
    status:      { type: String, enum: ['todo', 'in-progress', 'ready-for-qa', 'deployment-pending', 'blocker', 'done'], default: 'todo' },
    assignees:   [String],
    comments:    { type: Number, default: 0 },
    files:       { type: Number, default: 0 },
    images:      [String],
    dueDate:     String,
    projectId:   String,
});
```

**new_string:**
```ts
const TaskSchema = new Schema({
    appId:       { type: String, required: true, unique: true },
    title:       { type: String, required: true },
    description: { type: String, default: '' },
    priority:    { type: String, enum: ['low', 'high', 'completed'], default: 'low' },
    status:      { type: String, enum: ['todo', 'in-progress', 'ready-for-qa', 'deployment-pending', 'blocker', 'done'], default: 'todo' },
    assignees:   [String],
    comments:    { type: Number, default: 0 },
    files:       { type: Number, default: 0 },
    images:      [String],
    dueDate:     String,
    projectId:   String,
    activity:    { type: Array, default: [] },
});
```

- [ ] **2b** Replace `toTask` to include `activity`

**File:** `electron/main.ts`

**old_string** (line 188):
```ts
const toTask        = (d: any) => ({ id: d.appId, title: d.title, description: d.description ?? '', priority: d.priority, status: d.status, assignees: (d.assignees ?? []).map(String), comments: d.comments ?? 0, files: d.files ?? 0, images: (d.images ?? []).map(String), dueDate: d.dueDate ?? null, projectId: d.projectId ?? null });
```

**new_string:**
```ts
const toTask        = (d: any) => ({ id: d.appId, title: d.title, description: d.description ?? '', priority: d.priority, status: d.status, assignees: (d.assignees ?? []).map(String), comments: d.comments ?? 0, files: d.files ?? 0, images: (d.images ?? []).map(String), dueDate: d.dueDate ?? null, projectId: d.projectId ?? null, activity: d.activity ?? [] });
```

- [ ] **2c** Replace the three task IPC handler one-liners

**File:** `electron/main.ts`

**old_string** (lines 302-305, the create/update/move one-liners — delete handler and scrubAssignee are left unchanged):
```ts
    ipcMain.handle('db:tasks:create', async (_e, taskData: object) => { const d = await TaskModel.create({ appId: `t${Date.now()}`, ...taskData }); return safe(toTask(d.toObject())); });
    ipcMain.handle('db:tasks:update', async (_e, id: string, changes: object) => { const d = await TaskModel.findOneAndUpdate({ appId: id }, changes, { returnDocument: 'after' }).lean(); return d ? safe(toTask(d)) : null; });
    ipcMain.handle('db:tasks:delete', async (_e, id: string) => { await TaskModel.deleteOne({ appId: id }); return true; });
    ipcMain.handle('db:tasks:move', async (_e, id: string, newStatus: string) => { const d = await TaskModel.findOneAndUpdate({ appId: id }, { status: newStatus }, { returnDocument: 'after' }).lean(); return d ? safe(toTask(d)) : null; });
```

**new_string:**
```ts
    ipcMain.handle('db:tasks:create', async (_e, taskData: any) => {
        const { actorId, actorName, ...rest } = taskData;
        const entry = {
            id: crypto.randomUUID(),
            type: 'created',
            actorId: actorId ?? 'system',
            actorName: actorName ?? 'System',
            timestamp: new Date().toISOString(),
        };
        const doc = await TaskModel.create({ appId: 't' + Date.now(), ...rest, activity: [entry] });
        return safe(toTask(doc.toObject()));
    });
    ipcMain.handle('db:tasks:update', async (_e, id: string, changes: any) => {
        const { actorId, actorName, ...rest } = changes;
        const actor = { actorId: actorId ?? 'system', actorName: actorName ?? 'System' };
        const current = await TaskModel.findOne({ appId: id }).lean();
        if (!current) return null;
        const entries: any[] = [];
        const ts = new Date().toISOString();
        const scalarFields: [string, string][] = [
            ['status', 'status_changed'], ['priority', 'priority_changed'],
            ['dueDate', 'due_date_changed'], ['title', 'title_changed'],
            ['description', 'description_changed'],
        ];
        for (const [field, type] of scalarFields) {
            if (rest[field] !== undefined && String(rest[field]) !== String((current as any)[field] ?? '')) {
                entries.push({ id: crypto.randomUUID(), type, ...actor, timestamp: ts, from: String((current as any)[field] ?? ''), to: String(rest[field]) });
            }
        }
        if (rest.assignees !== undefined) {
            const oldSet = new Set<string>((current as any).assignees ?? []);
            const newSet = new Set<string>(rest.assignees);
            for (const a of newSet) {
                if (!oldSet.has(a)) entries.push({ id: crypto.randomUUID(), type: 'assignee_added', ...actor, timestamp: ts, to: a });
            }
            for (const a of oldSet) {
                if (!newSet.has(a)) entries.push({ id: crypto.randomUUID(), type: 'assignee_removed', ...actor, timestamp: ts, from: a });
            }
        }
        const updateDoc: any = { $set: { ...rest } };
        if (entries.length > 0) updateDoc.$push = { activity: { $each: entries } };
        const updated = await TaskModel.findOneAndUpdate({ appId: id }, updateDoc, { returnDocument: 'after' });
        return updated ? safe(toTask(updated.toObject())) : null;
    });
    ipcMain.handle('db:tasks:delete', async (_e, id: string) => { await TaskModel.deleteOne({ appId: id }); return true; });
    ipcMain.handle('db:tasks:move', async (_e, id: string, newStatus: string, actorId?: string, actorName?: string) => {
        const current = await TaskModel.findOne({ appId: id }).lean();
        if (!current) return null;
        const entry = {
            id: crypto.randomUUID(),
            type: 'status_changed',
            actorId: actorId ?? 'system',
            actorName: actorName ?? 'System',
            timestamp: new Date().toISOString(),
            from: (current as any).status,
            to: newStatus,
        };
        const updated = await TaskModel.findOneAndUpdate(
            { appId: id },
            { $set: { status: newStatus }, $push: { activity: entry } },
            { returnDocument: 'after' }
        );
        return updated ? safe(toTask(updated.toObject())) : null;
    });
```

### Verification

```
./node_modules/.bin/tsc --noEmit
```
Expected: no output (zero errors).

### Commit

```
git add electron/main.ts
git commit -m "feat(main.ts): add activity to TaskSchema/toTask; rewrite create/update/move IPC handlers"
```

---

## Task 3 — `electron/main.js` — mirror Task 2

Mirror all changes from Task 2 into `main.js`, keeping the existing `commentData` field intact.

### Steps

- [ ] **3a** Add `activity` to TaskSchema

**File:** `electron/main.js`

**old_string** (lines 24-37, the full TaskSchema block):
```js
const TaskSchema = new Schema({
    appId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['low', 'high', 'completed'], default: 'low' },
    status: { type: String, enum: ['todo', 'in-progress', 'ready-for-qa', 'deployment-pending', 'blocker', 'done'], default: 'todo' },
    assignees: [String],
    comments: { type: Number, default: 0 },
    commentData: { type: [{ id: String, author: String, text: String, time: String }], default: [] },
    files: { type: Number, default: 0 },
    images: [String],
    dueDate: String,
    projectId: String,
});
```

**new_string:**
```js
const TaskSchema = new Schema({
    appId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['low', 'high', 'completed'], default: 'low' },
    status: { type: String, enum: ['todo', 'in-progress', 'ready-for-qa', 'deployment-pending', 'blocker', 'done'], default: 'todo' },
    assignees: [String],
    comments: { type: Number, default: 0 },
    commentData: { type: [{ id: String, author: String, text: String, time: String }], default: [] },
    files: { type: Number, default: 0 },
    images: [String],
    dueDate: String,
    projectId: String,
    activity: { type: Array, default: [] },
});
```

- [ ] **3b** Replace `toTask` to include `activity` (keeping `commentData`)

**File:** `electron/main.js`

**old_string** (line 185):
```js
const toTask = d => ({ id: d.appId, title: d.title, description: d.description ?? '', priority: d.priority, status: d.status, assignees: (d.assignees ?? []).map(String), comments: d.comments ?? 0, commentData: (d.commentData ?? []).map(c => ({ id: c.id, author: c.author, text: c.text, time: c.time })), files: d.files ?? 0, images: (d.images ?? []).map(String), dueDate: d.dueDate ?? null, projectId: d.projectId ?? null });
```

**new_string:**
```js
const toTask = d => ({ id: d.appId, title: d.title, description: d.description ?? '', priority: d.priority, status: d.status, assignees: (d.assignees ?? []).map(String), comments: d.comments ?? 0, commentData: (d.commentData ?? []).map(c => ({ id: c.id, author: c.author, text: c.text, time: c.time })), files: d.files ?? 0, images: (d.images ?? []).map(String), dueDate: d.dueDate ?? null, projectId: d.projectId ?? null, activity: d.activity ?? [] });
```

- [ ] **3c** Replace the three task IPC handler one-liners

**File:** `electron/main.js`

**old_string** (lines 252-255):
```js
    ipcMain.handle('db:tasks:create', async (_e, taskData) => { const d = await TaskModel.create({ appId: `t${Date.now()}`, ...taskData }); return safe(toTask(d.toObject())); });
    ipcMain.handle('db:tasks:update', async (_e, id, changes) => { const d = await TaskModel.findOneAndUpdate({ appId: id }, changes, { returnDocument: 'after' }).lean(); return d ? safe(toTask(d)) : null; });
    ipcMain.handle('db:tasks:delete', async (_e, id) => { await TaskModel.deleteOne({ appId: id }); return true; });
    ipcMain.handle('db:tasks:move', async (_e, id, newStatus) => { const d = await TaskModel.findOneAndUpdate({ appId: id }, { status: newStatus }, { returnDocument: 'after' }).lean(); return d ? safe(toTask(d)) : null; });
```

**new_string:**
```js
    ipcMain.handle('db:tasks:create', async (_e, taskData) => {
        const { actorId, actorName, ...rest } = taskData;
        const entry = {
            id: crypto.randomUUID(),
            type: 'created',
            actorId: actorId ?? 'system',
            actorName: actorName ?? 'System',
            timestamp: new Date().toISOString(),
        };
        const doc = await TaskModel.create({ appId: 't' + Date.now(), ...rest, activity: [entry] });
        return safe(toTask(doc.toObject()));
    });
    ipcMain.handle('db:tasks:update', async (_e, id, changes) => {
        const { actorId, actorName, ...rest } = changes;
        const actor = { actorId: actorId ?? 'system', actorName: actorName ?? 'System' };
        const current = await TaskModel.findOne({ appId: id }).lean();
        if (!current) return null;
        const entries = [];
        const ts = new Date().toISOString();
        const scalarFields = [
            ['status', 'status_changed'], ['priority', 'priority_changed'],
            ['dueDate', 'due_date_changed'], ['title', 'title_changed'],
            ['description', 'description_changed'],
        ];
        for (const [field, type] of scalarFields) {
            if (rest[field] !== undefined && String(rest[field]) !== String(current[field] ?? '')) {
                entries.push({ id: crypto.randomUUID(), type, ...actor, timestamp: ts, from: String(current[field] ?? ''), to: String(rest[field]) });
            }
        }
        if (rest.assignees !== undefined) {
            const oldSet = new Set(current.assignees ?? []);
            const newSet = new Set(rest.assignees);
            for (const a of newSet) {
                if (!oldSet.has(a)) entries.push({ id: crypto.randomUUID(), type: 'assignee_added', ...actor, timestamp: ts, to: a });
            }
            for (const a of oldSet) {
                if (!newSet.has(a)) entries.push({ id: crypto.randomUUID(), type: 'assignee_removed', ...actor, timestamp: ts, from: a });
            }
        }
        const updateDoc = { $set: { ...rest } };
        if (entries.length > 0) updateDoc.$push = { activity: { $each: entries } };
        const updated = await TaskModel.findOneAndUpdate({ appId: id }, updateDoc, { returnDocument: 'after' });
        return updated ? safe(toTask(updated.toObject())) : null;
    });
    ipcMain.handle('db:tasks:delete', async (_e, id) => { await TaskModel.deleteOne({ appId: id }); return true; });
    ipcMain.handle('db:tasks:move', async (_e, id, newStatus, actorId, actorName) => {
        const current = await TaskModel.findOne({ appId: id }).lean();
        if (!current) return null;
        const entry = {
            id: crypto.randomUUID(),
            type: 'status_changed',
            actorId: actorId ?? 'system',
            actorName: actorName ?? 'System',
            timestamp: new Date().toISOString(),
            from: current.status,
            to: newStatus,
        };
        const updated = await TaskModel.findOneAndUpdate(
            { appId: id },
            { $set: { status: newStatus }, $push: { activity: entry } },
            { returnDocument: 'after' }
        );
        return updated ? safe(toTask(updated.toObject())) : null;
    });
```

### Verification

```
./node_modules/.bin/tsc --noEmit
```
Expected: no output (zero errors). (main.js is plain JS — tsc will only check main.ts, but no regressions should appear.)

### Commit

```
git add electron/main.js
git commit -m "feat(main.js): mirror activity schema/toTask/IPC handler changes from main.ts"
```

---

## Task 4 — Preload + type declarations

Update `moveTask` in both preload files to forward `actorId`/`actorName`, and update the three task method signatures in `src/vite-env.d.ts`.

### Steps

- [ ] **4a** Update `moveTask` in `electron/preload.ts`

**File:** `electron/preload.ts`

**old_string** (line 125):
```ts
        moveTask:      (id: string, newStatus: string): Promise<unknown>       => ipcRenderer.invoke('db:tasks:move', id, newStatus),
```

**new_string:**
```ts
        moveTask:      (id: string, newStatus: string, actorId?: string, actorName?: string): Promise<unknown> => ipcRenderer.invoke('db:tasks:move', id, newStatus, actorId, actorName),
```

- [ ] **4b** Update `moveTask` in `electron/preload.js`

**File:** `electron/preload.js`

**old_string** (line 81):
```js
        moveTask: (id, newStatus) => ipcRenderer.invoke('db:tasks:move', id, newStatus),
```

**new_string:**
```js
        moveTask: (id, newStatus, actorId, actorName) => ipcRenderer.invoke('db:tasks:move', id, newStatus, actorId, actorName),
```

- [ ] **4c** Update `createTask`, `updateTask`, `moveTask` signatures in `src/vite-env.d.ts`

**File:** `src/vite-env.d.ts`

**old_string** (lines 16-19):
```ts
  createTask(task: Omit<Task, 'id'>): Promise<Task>;
  updateTask(id: string, changes: Partial<Omit<Task, 'id'>>): Promise<Task | null>;
  deleteTask(id: string): Promise<boolean>;
  moveTask(id: string, newStatus: TaskStatus): Promise<Task | null>;
```

**new_string:**
```ts
  createTask(task: Omit<Task, 'id'> & { actorId?: string; actorName?: string }): Promise<Task>;
  updateTask(id: string, changes: Partial<Omit<Task, 'id'>> & { actorId?: string; actorName?: string }): Promise<Task | null>;
  deleteTask(id: string): Promise<boolean>;
  moveTask(id: string, newStatus: TaskStatus, actorId?: string, actorName?: string): Promise<Task | null>;
```

### Verification

```
./node_modules/.bin/tsc --noEmit
```
Expected: no output (zero errors).

### Commit

```
git add electron/preload.ts electron/preload.js src/vite-env.d.ts
git commit -m "feat(preload/types): add actorId/actorName params to createTask, updateTask, moveTask"
```

---

## Task 5 — `src/context/ProjectContext.tsx`

Import `useAuth`, read `authUser` inside the provider, pass `actorMeta` in all three mutations, and use the returned task from `updateTask`/`moveTask` to keep `activity` in sync (replacing the optimistic spread).

### Steps

- [ ] **5a** Add `useAuth` import

**File:** `src/context/ProjectContext.tsx`

**old_string** (line 1-2):
```ts
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, Task, TaskStatus } from '../types';
```

**new_string:**
```ts
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, Task, TaskStatus } from '../types';
import { useAuth } from './AuthContext';
```

- [ ] **5b** Read `authUser` inside the provider and update the three mutations

**File:** `src/context/ProjectContext.tsx`

**old_string** (lines 31-89, from `export const ProjectProvider` opening through `scrubAssignee`):
```ts
export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [activeProject, setActiveProject] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api().getProjects(), api().getTasks()])
      .then(([prjs, tasks]) => {
        const typedProjects = prjs as Project[];
        const typedTasks = tasks as Task[];
        setProjects(typedProjects);
        setAllTasks(typedTasks);
        setActiveProject(typedProjects[0]?.id ?? '');
      })
      .catch(err => console.error('[ProjectContext] Failed to load projects/tasks:', err))
      .finally(() => setLoading(false));
  }, []);

  const createProject = async (name: string, color: string): Promise<Project> => {
    const newProject = await api().createProject(name, color) as Project;
    setProjects(prev => [...prev, newProject]);
    return newProject;
  };

  const updateProject = async (id: string, changes: Partial<Pick<Project, 'name' | 'color'>>) => {
    await api().updateProject(id, changes);
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
  };

  const deleteProject = async (id: string) => {
    await api().deleteProject(id);
    setProjects(prev => {
      const remaining = prev.filter(p => p.id !== id);
      setActiveProject(ap => ap === id ? (remaining[0]?.id ?? '') : ap);
      return remaining;
    });
    setAllTasks(prev => prev.map(t => t.projectId === id ? { ...t, projectId: undefined } : t));
  };

  const createTask = async (taskData: Omit<Task, 'id'> & { projectId?: string }) => {
    const newTask = await api().createTask(taskData) as Task;
    setAllTasks(prev => [...prev, newTask]);
  };

  const updateTask = async (id: string, changes: Partial<Omit<Task, 'id'>>) => {
    await api().updateTask(id, changes);
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
  };

  const deleteTask = async (id: string) => {
    await api().deleteTask(id);
    setAllTasks(prev => prev.filter(t => t.id !== id));
  };

  const moveTask = async (id: string, newStatus: TaskStatus) => {
    await api().moveTask(id, newStatus);
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const scrubAssignee = async (memberId: string) => {
    await api().scrubAssignee(memberId);
    setAllTasks(prev => prev.map(t => ({ ...t, assignees: t.assignees.filter(a => a !== memberId) })));
  };
```

**new_string:**
```ts
export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [activeProject, setActiveProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useAuth();

  useEffect(() => {
    Promise.all([api().getProjects(), api().getTasks()])
      .then(([prjs, tasks]) => {
        const typedProjects = prjs as Project[];
        const typedTasks = tasks as Task[];
        setProjects(typedProjects);
        setAllTasks(typedTasks);
        setActiveProject(typedProjects[0]?.id ?? '');
      })
      .catch(err => console.error('[ProjectContext] Failed to load projects/tasks:', err))
      .finally(() => setLoading(false));
  }, []);

  const createProject = async (name: string, color: string): Promise<Project> => {
    const newProject = await api().createProject(name, color) as Project;
    setProjects(prev => [...prev, newProject]);
    return newProject;
  };

  const updateProject = async (id: string, changes: Partial<Pick<Project, 'name' | 'color'>>) => {
    await api().updateProject(id, changes);
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
  };

  const deleteProject = async (id: string) => {
    await api().deleteProject(id);
    setProjects(prev => {
      const remaining = prev.filter(p => p.id !== id);
      setActiveProject(ap => ap === id ? (remaining[0]?.id ?? '') : ap);
      return remaining;
    });
    setAllTasks(prev => prev.map(t => t.projectId === id ? { ...t, projectId: undefined } : t));
  };

  const createTask = async (taskData: Omit<Task, 'id'> & { projectId?: string }) => {
    const actorMeta = { actorId: authUser?.id ?? '', actorName: authUser?.name ?? '' };
    const newTask = await api().createTask({ ...taskData, ...actorMeta }) as Task;
    setAllTasks(prev => [...prev, newTask]);
  };

  const updateTask = async (id: string, changes: Partial<Omit<Task, 'id'>>) => {
    const actorMeta = { actorId: authUser?.id ?? '', actorName: authUser?.name ?? '' };
    const updated = await api().updateTask(id, { ...changes, ...actorMeta }) as Task | null;
    if (updated) {
      setAllTasks(prev => prev.map(t => t.id === id ? updated : t));
    } else {
      setAllTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
    }
  };

  const deleteTask = async (id: string) => {
    await api().deleteTask(id);
    setAllTasks(prev => prev.filter(t => t.id !== id));
  };

  const moveTask = async (id: string, newStatus: TaskStatus) => {
    const actorMeta = { actorId: authUser?.id ?? '', actorName: authUser?.name ?? '' };
    const moved = await api().moveTask(id, newStatus, actorMeta.actorId, actorMeta.actorName) as Task | null;
    if (moved) {
      setAllTasks(prev => prev.map(t => t.id === id ? moved : t));
    } else {
      setAllTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    }
  };

  const scrubAssignee = async (memberId: string) => {
    await api().scrubAssignee(memberId);
    setAllTasks(prev => prev.map(t => ({ ...t, assignees: t.assignees.filter(a => a !== memberId) })));
  };
```

### Note on `useAuth` return type

`useAuth` returns `useContext(AuthContext)` which can be `null`. The `authUser` is accessed as `useAuth()?.user`. Check what `AuthContext` exposes — the existing pattern in other files (e.g. `MessagesPage.tsx`) uses `const { user } = useAuth()!` or similar. Match that pattern. The safe fallback `authUser?.id ?? ''` handles the null case.

Actually — inspect `src/context/AuthContext.tsx` if the return type allows `null`. The `useAuth` export at line 41 is `export const useAuth = () => useContext(AuthContext)`. The AuthContext value type includes `user`. Use:

```ts
const authCtx = useAuth();
const authUser = authCtx?.user ?? null;
```

Then replace `authUser?.id ?? ''` and `authUser?.name ?? ''` accordingly if the above pattern is needed. Alternatively, if AuthContext is always provided above ProjectProvider in the tree (which it is — check `src/App.tsx`), the non-null assertion `useAuth()!` is safe.

The simplest safe pattern (no TS errors):

```ts
const { user: authUser } = useAuth() ?? { user: null };
```

Use this form in the new_string above instead of `const { user: authUser } = useAuth();` if `useAuth()` can return `null`.

### Verification

```
./node_modules/.bin/tsc --noEmit
```
Expected: no output (zero errors).

### Commit

```
git add src/context/ProjectContext.tsx
git commit -m "feat(ProjectContext): pass actorId/actorName via useAuth for activity log"
```

---

## Task 6 — `src/pages/TasksPage.tsx` — tab bar + Activity tab

Add a Details/Activity tab bar below the "TASK DETAIL" header, wrap existing panel content in the Details tab, add the Activity tab content, and add the `ActivityEntryRow` helper component above the main component.

### Steps

- [ ] **6a** Add new imports

**File:** `src/pages/TasksPage.tsx`

**old_string** (lines 1-12):
```ts
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckSquare, Clock, TrendingUp, AlertCircle, Plus, Download, X, ImagePlus, Calendar, User, Tag, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { AvatarGroup } from '../components/ui/Avatar';
import { Task, TaskStatus } from '../types';
import { useProjects } from '../context/ProjectContext';
import { useMembersContext } from '../context/MembersContext';
import TaskFormModal from '../components/modals/TaskFormModal';
import { downloadCsv } from '../utils/exportCsv';
```

**new_string:**
```ts
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckSquare, Clock, TrendingUp, AlertCircle, Plus, Download, X, ImagePlus, Calendar, User, Tag, ChevronDown, Pencil, Trash2, ArrowRight, Flag, UserPlus, UserMinus, FileText } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { AvatarGroup } from '../components/ui/Avatar';
import { Task, TaskStatus, TaskActivityEntry } from '../types';
import { useProjects } from '../context/ProjectContext';
import { useMembersContext } from '../context/MembersContext';
import { useAuth } from '../context/AuthContext';
import TaskFormModal from '../components/modals/TaskFormModal';
import { downloadCsv } from '../utils/exportCsv';
```

- [ ] **6b** Add the `ActivityEntryRow` helper component and its supporting maps

Insert this block immediately **before** the `const priorityStyles` constant (i.e., before line 15 of the current file). The `old_string` anchor is the `priorityStyles` declaration.

**File:** `src/pages/TasksPage.tsx`

**old_string:**
```ts
const priorityStyles: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-[#DFA87433]', text: 'text-[#D58D49]', label: 'Low' },
  high: { bg: 'bg-[#D8727D33]', text: 'text-[#D8727D]', label: 'High' },
  completed: { bg: 'bg-[#83C29D33]', text: 'text-[#68B266]', label: 'Done' },
};
```

**new_string:**
```ts
// ── Activity Log helpers ────────────────────────────────────────────────────
const activityIconMap: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  created:             { icon: Plus,      color: '#68B266' },
  status_changed:      { icon: ArrowRight, color: '#6366f1' },
  priority_changed:    { icon: Flag,      color: '#FFA500' },
  assignee_added:      { icon: UserPlus,  color: '#68B266' },
  assignee_removed:    { icon: UserMinus, color: '#D8727D' },
  due_date_changed:    { icon: Calendar,  color: '#a855f7' },
  title_changed:       { icon: Pencil,    color: '#6b7280' },
  description_changed: { icon: FileText,  color: '#6b7280' },
};
const activityLabelMap: Record<string, string> = {
  created:             'created this task',
  status_changed:      'changed status',
  priority_changed:    'changed priority',
  assignee_added:      'added assignee',
  assignee_removed:    'removed assignee',
  due_date_changed:    'changed due date',
  title_changed:       'changed title',
  description_changed: 'updated description',
};
function formatActivityTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
const ActivityEntryRow: React.FC<{ entry: TaskActivityEntry; currentUserId: string }> = ({ entry, currentUserId }) => {
  const { icon: Icon, color } = activityIconMap[entry.type] ?? { icon: ArrowRight, color: '#6b7280' };
  const label = activityLabelMap[entry.type] ?? entry.type;
  const actor = entry.actorId === currentUserId ? 'You' : entry.actorName;
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: color + '20' }}>
        <Icon size={11} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-700 leading-snug">
          <span className="font-semibold">{actor}</span> {label}
          {(entry.from || entry.to) && (
            <span className="inline-flex items-center gap-1 ml-1">
              {entry.from && <span className="bg-surface-100 text-gray-500 rounded px-1 py-0.5 text-[10px]">{entry.from}</span>}
              {entry.from && entry.to && <ArrowRight size={9} className="text-gray-400" />}
              {entry.to && <span className="bg-surface-100 text-gray-500 rounded px-1 py-0.5 text-[10px]">{entry.to}</span>}
            </span>
          )}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">{formatActivityTime(entry.timestamp)}</p>
      </div>
    </div>
  );
};
// ── End Activity Log helpers ────────────────────────────────────────────────

const priorityStyles: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-[#DFA87433]', text: 'text-[#D58D49]', label: 'Low' },
  high: { bg: 'bg-[#D8727D33]', text: 'text-[#D8727D]', label: 'High' },
  completed: { bg: 'bg-[#83C29D33]', text: 'text-[#68B266]', label: 'Done' },
};
```

- [ ] **6c** Add `useAuth`, `detailTab` state, and reset effect inside `TasksPage`

**File:** `src/pages/TasksPage.tsx`

**old_string** (lines 34-36, inside the component):
```ts
  const { projects: contextProjects, allTasks, createTask, updateTask, deleteTask } = useProjects();
  const { members, getMemberColor } = useMembersContext();
  const [activeTab, setActiveTab] = useState(0);
```

**new_string:**
```ts
  const { projects: contextProjects, allTasks, createTask, updateTask, deleteTask } = useProjects();
  const { members, getMemberColor } = useMembersContext();
  const { user: authUser } = useAuth() ?? { user: null };
  const [activeTab, setActiveTab] = useState(0);
  const [detailTab, setDetailTab] = useState<'details' | 'activity'>('details');
```

- [ ] **6d** Reset `detailTab` when `selectedTask` changes

**File:** `src/pages/TasksPage.tsx`

Add a `useEffect` that resets `detailTab` to `'details'` whenever `selectedTask` changes. Insert it right after the existing effect that reads `location.state`.

**old_string:**
```ts
  // Pre-populate search from header search navigation
  useEffect(() => {
    const s = (location.state as any)?.search;
    if (s) setSearchQuery(s);
  }, [location.state]);
  const [showTaskForm, setShowTaskForm] = useState(false);
```

**new_string:**
```ts
  // Pre-populate search from header search navigation
  useEffect(() => {
    const s = (location.state as any)?.search;
    if (s) setSearchQuery(s);
  }, [location.state]);

  // Reset detail tab when selected task changes
  useEffect(() => {
    setDetailTab('details');
  }, [selectedTask?.id]);

  const [showTaskForm, setShowTaskForm] = useState(false);
```

- [ ] **6e** Add the tab bar below the panel header, and wrap existing content + add Activity tab

**File:** `src/pages/TasksPage.tsx`

**old_string** (the panel header close tag and start of content div — lines 289-308):
```tsx
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Task Detail</span>
                <div className="flex items-center gap-2">
                  {!editMode && (
                    <button
                      onClick={() => startEdit(selectedTask)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-surface-100 hover:text-gray-600 transition-colors"
                      title="Edit task"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  <button onClick={() => { setSelectedTask(null); setEditMode(false); setConfirmDelete(false); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-surface-100 hover:text-gray-600 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 px-5 py-4 flex flex-col gap-4">
```

**new_string:**
```tsx
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Task Detail</span>
                <div className="flex items-center gap-2">
                  {!editMode && (
                    <button
                      onClick={() => startEdit(selectedTask)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-surface-100 hover:text-gray-600 transition-colors"
                      title="Edit task"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  <button onClick={() => { setSelectedTask(null); setEditMode(false); setConfirmDelete(false); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-surface-100 hover:text-gray-600 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex border-b border-surface-100 shrink-0">
                {(['details', 'activity'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                      detailTab === tab
                        ? 'text-primary-600 border-b-2 border-primary-500'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {detailTab === 'details' && (
              <div className="flex-1 px-5 py-4 flex flex-col gap-4">
```

- [ ] **6f** Close the Details tab wrapper and add the Activity tab content after the existing panel close tag

**File:** `src/pages/TasksPage.tsx`

The existing panel content ends with the closing `</div>` of `<div className="flex-1 px-5 py-4 flex flex-col gap-4">` at line 565. The `</motion.div>` (the white panel) follows at line 566.

**old_string** (the final section of the details content and the motion.div closing):
```tsx
                {/* Delete section */}
                {!editMode && (
                  <div className="pt-2 border-t border-surface-100">
                    {confirmDelete ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-gray-500 text-center">Are you sure you want to delete this task?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              deleteTask(selectedTask.id).catch(console.error);
                              setSelectedTask(null);
                              setConfirmDelete(false);
                            }}
                            className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-[#D8727D] hover:bg-[#c4636d] transition-colors"
                          >
                            Confirm delete
                          </button>
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="flex-1 py-2 rounded-xl text-sm font-semibold text-gray-500 bg-surface-100 hover:bg-surface-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-[#D8727D] hover:bg-[#D8727D11] transition-colors"
                      >
                        <Trash2 size={14} /> Delete task
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
```

**new_string:**
```tsx
                {/* Delete section */}
                {!editMode && (
                  <div className="pt-2 border-t border-surface-100">
                    {confirmDelete ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-gray-500 text-center">Are you sure you want to delete this task?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              deleteTask(selectedTask.id).catch(console.error);
                              setSelectedTask(null);
                              setConfirmDelete(false);
                            }}
                            className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-[#D8727D] hover:bg-[#c4636d] transition-colors"
                          >
                            Confirm delete
                          </button>
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="flex-1 py-2 rounded-xl text-sm font-semibold text-gray-500 bg-surface-100 hover:bg-surface-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-[#D8727D] hover:bg-[#D8727D11] transition-colors"
                      >
                        <Trash2 size={14} /> Delete task
                      </button>
                    )}
                  </div>
                )}
              </div>
              )}

              {detailTab === 'activity' && (
                <div className="flex-1 overflow-y-auto p-4">
                  {(selectedTask.activity ?? []).length === 0 ? (
                    <p className="text-xs text-gray-400 text-center mt-8">No activity yet.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {[...(selectedTask.activity ?? [])].reverse().map(entry => (
                        <ActivityEntryRow key={entry.id} entry={entry} currentUserId={authUser?.id ?? ''} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
```

### Verification

```
./node_modules/.bin/tsc --noEmit
```
Expected: no output (zero errors).

### Commit

```
git add src/pages/TasksPage.tsx
git commit -m "feat(TasksPage): add Details/Activity tab bar with activity log rendering"
```

---

## Task 7 — `src/components/dashboard/KanbanBoard.tsx` — tab bar + Activity tab

Same changes as Task 6, applied to `KanbanBoard.tsx`. The import path for `useAuth` and `types` differs slightly.

### Steps

- [ ] **7a** Add new imports

**File:** `src/components/dashboard/KanbanBoard.tsx`

**old_string** (lines 1-12):
```ts
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Tag, User, Calendar, ChevronDown, ImagePlus,
  Check, Edit3, Trash2, MessageSquare, Send,
} from 'lucide-react';
import { Task, TaskStatus, TaskCommentItem } from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { useMembersContext } from '../../context/MembersContext';
import { Avatar, AvatarGroup } from '../ui/Avatar';
import KanbanColumn from './KanbanColumn';
import TaskFormModal from '../modals/TaskFormModal';
```

**new_string:**
```ts
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Tag, User, Calendar, ChevronDown, ImagePlus,
  Check, Edit3, Trash2, MessageSquare, Send,
  ArrowRight, Flag, UserPlus, UserMinus, FileText, Plus, Pencil,
} from 'lucide-react';
import { Task, TaskStatus, TaskCommentItem, TaskActivityEntry } from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { useMembersContext } from '../../context/MembersContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar, AvatarGroup } from '../ui/Avatar';
import KanbanColumn from './KanbanColumn';
import TaskFormModal from '../modals/TaskFormModal';
```

- [ ] **7b** Add `ActivityEntryRow` helper and supporting maps

Insert before the `const statusStyles` declaration (line 17).

**File:** `src/components/dashboard/KanbanBoard.tsx`

**old_string:**
```ts
const statusStyles: Record<TaskStatus, { bg: string; text: string; label: string; dot: string }> = {
```

**new_string:**
```ts
// ── Activity Log helpers ────────────────────────────────────────────────────
const activityIconMap: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  created:             { icon: Plus,      color: '#68B266' },
  status_changed:      { icon: ArrowRight, color: '#6366f1' },
  priority_changed:    { icon: Flag,      color: '#FFA500' },
  assignee_added:      { icon: UserPlus,  color: '#68B266' },
  assignee_removed:    { icon: UserMinus, color: '#D8727D' },
  due_date_changed:    { icon: Calendar,  color: '#a855f7' },
  title_changed:       { icon: Pencil,    color: '#6b7280' },
  description_changed: { icon: FileText,  color: '#6b7280' },
};
const activityLabelMap: Record<string, string> = {
  created:             'created this task',
  status_changed:      'changed status',
  priority_changed:    'changed priority',
  assignee_added:      'added assignee',
  assignee_removed:    'removed assignee',
  due_date_changed:    'changed due date',
  title_changed:       'changed title',
  description_changed: 'updated description',
};
function formatActivityTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
const ActivityEntryRow: React.FC<{ entry: TaskActivityEntry; currentUserId: string }> = ({ entry, currentUserId }) => {
  const { icon: Icon, color } = activityIconMap[entry.type] ?? { icon: ArrowRight, color: '#6b7280' };
  const label = activityLabelMap[entry.type] ?? entry.type;
  const actor = entry.actorId === currentUserId ? 'You' : entry.actorName;
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: color + '20' }}>
        <Icon size={11} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-700 leading-snug">
          <span className="font-semibold">{actor}</span> {label}
          {(entry.from || entry.to) && (
            <span className="inline-flex items-center gap-1 ml-1">
              {entry.from && <span className="bg-surface-100 text-gray-500 rounded px-1 py-0.5 text-[10px]">{entry.from}</span>}
              {entry.from && entry.to && <ArrowRight size={9} className="text-gray-400" />}
              {entry.to && <span className="bg-surface-100 text-gray-500 rounded px-1 py-0.5 text-[10px]">{entry.to}</span>}
            </span>
          )}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">{formatActivityTime(entry.timestamp)}</p>
      </div>
    </div>
  );
};
// ── End Activity Log helpers ────────────────────────────────────────────────

const statusStyles: Record<TaskStatus, { bg: string; text: string; label: string; dot: string }> = {
```

- [ ] **7c** Add `useAuth`, `detailTab` state inside `KanbanBoard`

**File:** `src/components/dashboard/KanbanBoard.tsx`

**old_string** (lines 46-49):
```ts
  const { allTasks, moveTask, updateTask, deleteTask, createTask, projects, activeProject } = useProjects();
  const { members, getMemberColor } = useMembersContext();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
```

**new_string:**
```ts
  const { allTasks, moveTask, updateTask, deleteTask, createTask, projects, activeProject } = useProjects();
  const { members, getMemberColor } = useMembersContext();
  const { user: authUser } = useAuth() ?? { user: null };

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailTab, setDetailTab] = useState<'details' | 'activity'>('details');
```

- [ ] **7d** Reset `detailTab` inside `openTask`

**File:** `src/components/dashboard/KanbanBoard.tsx`

**old_string:**
```ts
  const openTask = (task: Task) => {
    setSelectedTask(task);
    setEditMode(false);
    setConfirmDelete(false);
    setShowStatusDrop(false);
    setComments(task.commentData ?? []);
    setCommentInput('');
    setDetailImage(null);
  };
```

**new_string:**
```ts
  const openTask = (task: Task) => {
    setSelectedTask(task);
    setEditMode(false);
    setConfirmDelete(false);
    setShowStatusDrop(false);
    setComments(task.commentData ?? []);
    setCommentInput('');
    setDetailImage(null);
    setDetailTab('details');
  };
```

- [ ] **7e** Add tab bar below panel header

**File:** `src/components/dashboard/KanbanBoard.tsx`

**old_string** (lines 211-229):
```tsx
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Task Detail</span>
                <div className="flex items-center gap-2">
                  {!editMode && (
                    <button
                      onClick={() => startEdit(selectedTask)}
                      className="flex items-center gap-1 text-xs font-semibold text-primary-500 hover:text-primary-700 bg-primary-50 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                  )}
                  <button onClick={() => setSelectedTask(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-surface-100 hover:text-gray-600 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 px-5 py-4 flex flex-col gap-4">
```

**new_string:**
```tsx
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Task Detail</span>
                <div className="flex items-center gap-2">
                  {!editMode && (
                    <button
                      onClick={() => startEdit(selectedTask)}
                      className="flex items-center gap-1 text-xs font-semibold text-primary-500 hover:text-primary-700 bg-primary-50 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                  )}
                  <button onClick={() => setSelectedTask(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-surface-100 hover:text-gray-600 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex border-b border-surface-100 shrink-0">
                {(['details', 'activity'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                      detailTab === tab
                        ? 'text-primary-600 border-b-2 border-primary-500'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {detailTab === 'details' && (
              <div className="flex-1 px-5 py-4 flex flex-col gap-4">
```

- [ ] **7f** Close Details tab wrapper and add Activity tab after the existing panel content

**File:** `src/components/dashboard/KanbanBoard.tsx`

**old_string** (the final delete section and motion.div close — lines 423-446):
```tsx
                {/* Delete */}
                {!editMode && (
                  <div className="mt-auto pt-4 border-t border-surface-100">
                    {!confirmDelete ? (
                      <button onClick={() => setConfirmDelete(true)} className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-[#D8727D] bg-[#D8727D0A] border border-[#D8727D33] py-2.5 rounded-xl hover:bg-[#D8727D15] transition-colors">
                        <Trash2 size={13} /> Delete task
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={handleDelete} className="flex-1 text-xs font-semibold bg-[#D8727D] text-white py-2.5 rounded-xl hover:bg-[#c5616b] transition-colors">
                          Confirm delete
                        </button>
                        <button onClick={() => setConfirmDelete(false)} className="flex-1 text-xs font-semibold bg-surface-100 text-gray-600 py-2.5 rounded-xl hover:bg-surface-200 transition-colors">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
```

**new_string:**
```tsx
                {/* Delete */}
                {!editMode && (
                  <div className="mt-auto pt-4 border-t border-surface-100">
                    {!confirmDelete ? (
                      <button onClick={() => setConfirmDelete(true)} className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-[#D8727D] bg-[#D8727D0A] border border-[#D8727D33] py-2.5 rounded-xl hover:bg-[#D8727D15] transition-colors">
                        <Trash2 size={13} /> Delete task
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={handleDelete} className="flex-1 text-xs font-semibold bg-[#D8727D] text-white py-2.5 rounded-xl hover:bg-[#c5616b] transition-colors">
                          Confirm delete
                        </button>
                        <button onClick={() => setConfirmDelete(false)} className="flex-1 text-xs font-semibold bg-surface-100 text-gray-600 py-2.5 rounded-xl hover:bg-surface-200 transition-colors">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}

              {detailTab === 'activity' && (
                <div className="flex-1 overflow-y-auto p-4">
                  {(selectedTask.activity ?? []).length === 0 ? (
                    <p className="text-xs text-gray-400 text-center mt-8">No activity yet.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {[...(selectedTask.activity ?? [])].reverse().map(entry => (
                        <ActivityEntryRow key={entry.id} entry={entry} currentUserId={authUser?.id ?? ''} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
```

### Verification

```
./node_modules/.bin/tsc --noEmit
```
Expected: no output (zero errors).

### Commit

```
git add src/components/dashboard/KanbanBoard.tsx
git commit -m "feat(KanbanBoard): add Details/Activity tab bar with activity log rendering"
```

---

## Full Verification Checklist (manual, post-all-tasks)

1. Run `./node_modules/.bin/tsc --noEmit` — zero errors
2. Launch the app (`npm run dev` or `npx electron .`)
3. Create a new task → open it → click **Activity** tab → confirm "You created this task" appears
4. Edit the task title and save → Activity shows "You changed title: [old] → [new]"
5. Change priority → "You changed priority: low → high"
6. Add an assignee → "You added assignee"
7. Remove an assignee → "You removed assignee"
8. Change due date → "You changed due date"
9. Edit description → "You updated description"
10. Change status via the dropdown in the detail panel → "You changed status"
11. Drag a card on the Kanban board to a new column → open it → Activity tab shows "You changed status"
12. Entries appear newest-first (reversed array)
13. Timestamps show relative time ("just now", "2m ago", etc.) and full date for entries older than 24h
14. Open the same task from both TasksPage and KanbanBoard — Activity tab works in both
15. Confirm `overflow-y-auto` on the Activity tab scrolls when entries are many

---

## Files Modified

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `TaskActivityEntryType`, `TaskActivityEntry`, `activity?` on `Task` |
| `electron/main.ts` | Add `activity` to `TaskSchema`; update `toTask`; rewrite `create`/`update`/`move` handlers |
| `electron/main.js` | Mirror all `main.ts` changes (keeping `commentData`) |
| `electron/preload.ts` | Update `moveTask` signature with `actorId?`/`actorName?` |
| `electron/preload.js` | Mirror `preload.ts` change |
| `src/vite-env.d.ts` | Update `createTask`, `updateTask`, `moveTask` to accept actor fields |
| `src/context/ProjectContext.tsx` | Import `useAuth`; pass `actorMeta`; use returned task in `updateTask`/`moveTask` |
| `src/pages/TasksPage.tsx` | Add `ActivityEntryRow` helper; add tab bar; add Activity tab UI |
| `src/components/dashboard/KanbanBoard.tsx` | Same as `TasksPage.tsx` |
