# Full Interactivity Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every interactive element across all 9 pages of ProjectX fully functional with real state, CRUD operations, drag-and-drop, modals, exports, and navigation.

**Architecture:** Extend `ProjectContext` with full task/project CRUD + active project state; add `MembersContext` for team member management; wrap app with `AppProvider` (missing); build shared modal components and utilities reused across pages; wire every button/card/dropdown to real state.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, React Router v6 (HashRouter), HTML5 Drag and Drop API, Lucide React icons.

---

## Chunk 1: Types, Data, Utilities

### Task 1: Add `projectId` and optional `avatar` to types

**Files:**
- Modify: `src/types/index.ts`

- [ ] Open `src/types/index.ts`. In the `Task` interface, add after the `dueDate` field:
  ```ts
  projectId?: string;
  ```
  In the `User` interface, change `avatar: string` to `avatar?: string`.

- [ ] Verify the file compiles — run:
  ```bash
  cd /Users/kkwenuja/Desktop/ProjectX && npx tsc --noEmit 2>&1 | head -30
  ```
  Expected: any existing errors are unrelated to these two fields; no new errors about `avatar` or `projectId`.

- [ ] Commit:
  ```bash
  git add src/types/index.ts
  git commit -m "feat: add projectId to Task, make User.avatar optional"
  ```

---

### Task 2: Add seed data fields and constants to mockData

**Files:**
- Modify: `src/data/mockData.ts`

- [ ] Add `MOCK_TODAY` and `PROJECT_COLORS` exports after the existing `memberColors` array:
  ```ts
  export const MOCK_TODAY = '2020-12-15';

  export const PROJECT_COLORS = [
    '#7AC555', '#FFA500', '#E4CCFD', '#76A5EA', '#5030E5', '#30C5E5',
  ];
  ```

- [ ] Add `dueDate` and `projectId` to all 7 seed tasks. Update each task object:
  ```ts
  // todoTasks
  { id: 't1', ..., dueDate: '2020-12-22', projectId: 'p2' }
  { id: 't2', ..., dueDate: '2020-12-15', projectId: 'p4' }
  { id: 't3', ..., dueDate: '2020-12-28', projectId: 'p4' }

  // inProgressTasks
  { id: 't4', ..., dueDate: '2020-12-18', projectId: 'p1' }
  { id: 't5', ..., dueDate: '2020-12-20', projectId: 'p3' }

  // doneTasks
  { id: 't6', ..., projectId: 'p1' }   // no dueDate
  { id: 't7', ..., projectId: 'p3' }   // no dueDate
  ```

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors.

- [ ] Commit:
  ```bash
  git add src/data/mockData.ts
  git commit -m "feat: add dueDate/projectId to seed tasks, MOCK_TODAY, PROJECT_COLORS"
  ```

---

### Task 3: Create `exportCsv` utility

**Files:**
- Create: `src/utils/exportCsv.ts`

- [ ] Create the file with this exact content:
  ```ts
  export function downloadCsv(filename: string, rows: string[][]): void {
    const csv = rows
      .map(row =>
        row
          .map(cell =>
            cell.includes(',') || cell.includes('"')
              ? `"${cell.replace(/"/g, '""')}"`
              : cell
          )
          .join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
  ```

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors.

- [ ] Commit:
  ```bash
  git add src/utils/exportCsv.ts
  git commit -m "feat: add downloadCsv utility"
  ```

---

### Task 4: Create `useToast` hook

**Files:**
- Create: `src/hooks/useToast.ts`

- [ ] Create the file:
  ```ts
  import React, { useState, useEffect } from 'react';
  import { motion, AnimatePresence } from 'framer-motion';

  export function useToast(): {
    show: (msg: string) => void;
    ToastEl: React.ReactNode;
  } {
    const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);

    useEffect(() => {
      if (!toast) return;
      const id = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(id);
    }, [toast]);

    const show = (msg: string) => setToast({ msg, key: Date.now() });

    const ToastEl = (
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.key}
            className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    );

    return { show, ToastEl };
  }
  ```

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors.

- [ ] Commit:
  ```bash
  git add src/hooks/useToast.ts
  git commit -m "feat: add useToast hook"
  ```

---

## Chunk 2: Context Layer

### Task 5: Extend `ProjectContext` with full CRUD + activeProject

**Files:**
- Modify: `src/context/ProjectContext.tsx`

- [ ] Replace the entire file with the extended version. The full new content:
  ```tsx
  import React, { createContext, useContext, useState } from 'react';
  import { projects as initialProjects, todoTasks, inProgressTasks, doneTasks } from '../data/mockData';
  import { Project, Task, TaskStatus } from '../types';

  interface ProjectContextValue {
    projects: Project[];
    allTasks: Task[];
    activeProject: string;
    setActiveProject: (id: string) => void;
    createProject: (name: string, color: string) => void;
    updateProject: (id: string, changes: Partial<Pick<Project, 'name' | 'color'>>) => void;
    deleteProject: (id: string) => void;
    createTask: (task: Omit<Task, 'id'> & { projectId?: string }) => void;
    updateTask: (id: string, changes: Partial<Omit<Task, 'id'>>) => void;
    deleteTask: (id: string) => void;
    moveTask: (id: string, newStatus: TaskStatus) => void;
    scrubAssignee: (memberId: string) => void;
  }

  const ProjectContext = createContext<ProjectContextValue | null>(null);

  export const useProjects = () => {
    const ctx = useContext(ProjectContext);
    if (!ctx) throw new Error('useProjects must be used within ProjectProvider');
    return ctx;
  };

  export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [allTasks, setAllTasks] = useState<Task[]>([
      ...todoTasks, ...inProgressTasks, ...doneTasks,
    ]);
    const [activeProject, setActiveProject] = useState<string>('p1');

    const createProject = (name: string, color: string) => {
      const newProject: Project = { id: `p${Date.now()}`, name, color, tasks: [] };
      setProjects(prev => [...prev, newProject]);
    };

    const updateProject = (id: string, changes: Partial<Pick<Project, 'name' | 'color'>>) => {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
    };

    const deleteProject = (id: string) => {
      setProjects(prev => {
        const remaining = prev.filter(p => p.id !== id);
        setActiveProject(ap => ap === id ? (remaining[0]?.id ?? '') : ap);
        return remaining;
      });
      setAllTasks(prev => prev.map(t => t.projectId === id ? { ...t, projectId: undefined } : t));
    };

    const createTask = (taskData: Omit<Task, 'id'> & { projectId?: string }) => {
      const newTask: Task = { ...taskData, id: `t${Date.now()}` };
      setAllTasks(prev => [...prev, newTask]);
      if (taskData.projectId) {
        setProjects(prev => prev.map(p =>
          p.id === taskData.projectId ? { ...p, tasks: [...p.tasks, newTask] } : p
        ));
      }
    };

    const updateTask = (id: string, changes: Partial<Omit<Task, 'id'>>) => {
      setAllTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
    };

    const deleteTask = (id: string) => {
      setAllTasks(prev => prev.filter(t => t.id !== id));
    };

    const moveTask = (id: string, newStatus: TaskStatus) => {
      setAllTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    };

    const scrubAssignee = (memberId: string) => {
      setAllTasks(prev =>
        prev.map(t => ({ ...t, assignees: t.assignees.filter(a => a !== memberId) }))
      );
    };

    return (
      <ProjectContext.Provider value={{
        projects, allTasks, activeProject, setActiveProject,
        createProject, updateProject, deleteProject,
        createTask, updateTask, deleteTask, moveTask, scrubAssignee,
      }}>
        {children}
      </ProjectContext.Provider>
    );
  };
  ```

  Note: `deleteProject` uses a functional `setActiveProject` updater to avoid stale closure.

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors.

- [ ] Commit:
  ```bash
  git add src/context/ProjectContext.tsx
  git commit -m "feat: extend ProjectContext with full CRUD, activeProject, scrubAssignee"
  ```

---

### Task 6: Create `MembersContext`

**Files:**
- Create: `src/context/MembersContext.tsx`

- [ ] Create the file:
  ```tsx
  import React, { createContext, useContext, useState } from 'react';
  import { teamMembers, memberColors } from '../data/mockData';
  import { User } from '../types';

  interface MembersContextValue {
    members: User[];
    getMemberColor: (id: string) => string;
    addMember: (member: Omit<User, 'id'>) => void;
    removeMember: (id: string) => void;
  }

  const MembersContext = createContext<MembersContextValue | null>(null);

  export const useMembersContext = () => {
    const ctx = useContext(MembersContext);
    if (!ctx) throw new Error('useMembersContext must be used within MembersProvider');
    return ctx;
  };

  export const MembersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [members, setMembers] = useState<User[]>(teamMembers);

    const getMemberColor = (id: string): string => {
      const idx = members.findIndex(m => m.id === id);
      if (idx === -1) return memberColors[0];
      return memberColors[idx % memberColors.length];
    };

    const addMember = (member: Omit<User, 'id'>) => {
      const newMember: User = { ...member, id: `u${Date.now()}` };
      setMembers(prev => [...prev, newMember]);
    };

    const removeMember = (id: string) => {
      setMembers(prev => prev.filter(m => m.id !== id));
    };

    return (
      <MembersContext.Provider value={{ members, getMemberColor, addMember, removeMember }}>
        {children}
      </MembersContext.Provider>
    );
  };
  ```

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors.

- [ ] Commit:
  ```bash
  git add src/context/MembersContext.tsx
  git commit -m "feat: add MembersContext with add/remove/color helpers"
  ```

---

### Task 7: Wire providers in `App.tsx` and remove duplicate state

**Files:**
- Modify: `src/App.tsx`

- [ ] At the top of `App.tsx`, add the two new imports:
  ```ts
  import { AppProvider } from './context/AppContext';
  import { MembersProvider } from './context/MembersContext';
  ```

- [ ] In the `Layout` component, remove these two lines:
  ```ts
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  ```
  Replace with:
  ```ts
  const { sidebarCollapsed, setSidebarCollapsed } = useContext(AppContext);
  ```
  Add `import { AppContext } from './context/AppContext';` at the top if not already imported.

- [ ] Remove the `activeProject` and `setActiveProject` local state from `Layout` — these now come from `useProjects()`:
  ```ts
  // REMOVE:
  const [activeProject, setActiveProject] = useState('p1');
  // KEEP (already there):
  const { projects } = useProjects();
  // ADD:
  const { projects, activeProject, setActiveProject } = useProjects();
  ```

- [ ] Wrap the return of `App` component:
  ```tsx
  return (
    <AppProvider>
      <MembersProvider>
        <ProjectProvider>
          <HashRouter>
            <Routes>
              {/* ... all existing routes unchanged ... */}
            </Routes>
          </HashRouter>
          <BugReportModal />
        </ProjectProvider>
      </MembersProvider>
    </AppProvider>
  );
  ```

- [ ] Stop passing `projectName` prop to `ProjectHeader` — remove it from the `Layout` JSX (it will now read from context directly).

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors. (Note: `ProjectHeader` will have a type error until Task 11 updates it — acceptable at this stage, or fix the prop temporarily.)

- [ ] Commit:
  ```bash
  git add src/App.tsx
  git commit -m "feat: add AppProvider+MembersProvider, migrate sidebar/activeProject to context"
  ```

---

## Chunk 3: Shared Modals

### Task 8: Create `InviteMemberModal`

**Files:**
- Create: `src/components/modals/InviteMemberModal.tsx`

- [ ] Create the file:
  ```tsx
  import React, { useState } from 'react';
  import { motion, AnimatePresence } from 'framer-motion';
  import { X, UserPlus } from 'lucide-react';
  import { User } from '../../types';

  interface Props {
    onClose: () => void;
    onSubmit: (member: Omit<User, 'id'>) => void;
  }

  const InviteMemberModal: React.FC<Props> = ({ onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<User['role']>('member');
    const [designation, setDesignation] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !email.trim()) return;
      onSubmit({ name: name.trim(), email: email.trim(), role, designation: designation.trim(), status: 'active' });
      onClose();
    };

    return (
      <motion.div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden"
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
            <div className="flex items-center gap-2">
              <UserPlus size={16} className="text-primary-500" />
              <span className="font-bold text-gray-900 text-sm">Invite Member</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Full Name *</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Email *</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="e.g. priya@techcorp.com"
                className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Role</label>
              <select
                value={role} onChange={e => setRole(e.target.value as User['role'])}
                className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 bg-white"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="member">Member</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Designation</label>
              <input
                value={designation} onChange={e => setDesignation(e.target.value)}
                placeholder="e.g. Frontend Developer"
                className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <motion.button
              type="submit"
              className="w-full bg-primary-500 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-600 transition-colors mt-1"
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            >
              Send Invite
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    );
  };

  export default InviteMemberModal;
  ```

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors.

- [ ] Commit:
  ```bash
  git add src/components/modals/InviteMemberModal.tsx
  git commit -m "feat: add InviteMemberModal"
  ```

---

### Task 9: Create `NewProjectModal`

**Files:**
- Create: `src/components/modals/NewProjectModal.tsx`

- [ ] Create the file:
  ```tsx
  import React, { useState } from 'react';
  import { motion } from 'framer-motion';
  import { X, FolderPlus } from 'lucide-react';
  import { PROJECT_COLORS } from '../../data/mockData';

  interface Props {
    onClose: () => void;
    onSubmit: (name: string, color: string) => void;
    initial?: { name: string; color: string };
  }

  const NewProjectModal: React.FC<Props> = ({ onClose, onSubmit, initial }) => {
    const [name, setName] = useState(initial?.name ?? '');
    const [color, setColor] = useState(initial?.color ?? PROJECT_COLORS[0]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      onSubmit(name.trim(), color);
      onClose();
    };

    return (
      <motion.div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden"
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
            <div className="flex items-center gap-2">
              <FolderPlus size={16} className="text-primary-500" />
              <span className="font-bold text-gray-900 text-sm">
                {initial ? 'Edit Project' : 'New Project'}
              </span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Project Name *</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Mobile App v2"
                className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                required autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-2 block">Color</label>
              <div className="flex gap-2">
                {PROJECT_COLORS.map(c => (
                  <button
                    key={c} type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <motion.button
              type="submit"
              className="w-full bg-primary-500 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-600 transition-colors mt-1"
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            >
              {initial ? 'Save Changes' : 'Create Project'}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    );
  };

  export default NewProjectModal;
  ```

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors.

- [ ] Commit:
  ```bash
  git add src/components/modals/NewProjectModal.tsx
  git commit -m "feat: add NewProjectModal"
  ```

---

### Task 10: Create `TaskFormModal`

**Files:**
- Create: `src/components/modals/TaskFormModal.tsx`

- [ ] Create the file:
  ```tsx
  import React, { useState } from 'react';
  import { motion } from 'framer-motion';
  import { X } from 'lucide-react';
  import { Task, TaskStatus } from '../../types';
  import { useProjects } from '../../context/ProjectContext';
  import { useMembersContext } from '../../context/MembersContext';
  import { Avatar } from '../ui/Avatar';

  interface Props {
    onClose: () => void;
    onSubmit: (task: Omit<Task, 'id'>) => void;
    initial?: Partial<Task>;
    defaultStatus?: TaskStatus;
  }

  const TaskFormModal: React.FC<Props> = ({ onClose, onSubmit, initial, defaultStatus }) => {
    const { projects } = useProjects();
    const { members, getMemberColor } = useMembersContext();

    const [title, setTitle] = useState(initial?.title ?? '');
    const [description, setDescription] = useState(initial?.description ?? '');
    const [priority, setPriority] = useState<'low' | 'high'>(
      (initial?.priority === 'high' ? 'high' : 'low')
    );
    const [assignees, setAssignees] = useState<string[]>(initial?.assignees ?? []);
    const [projectId, setProjectId] = useState(initial?.projectId ?? '');
    const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
    const status: TaskStatus = initial?.status ?? defaultStatus ?? 'todo';

    const toggleAssignee = (id: string) =>
      setAssignees(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) return;
      onSubmit({
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        assignees,
        projectId: projectId || undefined,
        dueDate: dueDate || undefined,
        comments: initial?.comments ?? 0,
        files: initial?.files ?? 0,
        images: initial?.images ?? [],
      });
      onClose();
    };

    return (
      <motion.div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
            <span className="font-bold text-gray-900 text-sm">
              {initial?.id ? 'Edit Task' : 'New Task'}
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Title *</label>
              <input
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Task title"
                className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                required autoFocus
              />
            </div>
            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description</label>
              <textarea
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="What needs to be done?"
                rows={3}
                className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 resize-none"
              />
            </div>
            {/* Priority */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-2 block">Priority</label>
              <div className="flex gap-2">
                {(['low', 'high'] as const).map(p => (
                  <button
                    key={p} type="button"
                    onClick={() => setPriority(p)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      priority === p
                        ? p === 'high'
                          ? 'bg-[#D8727D22] text-[#D8727D] ring-1 ring-[#D8727D]'
                          : 'bg-[#DFA87433] text-[#D58D49] ring-1 ring-[#D58D49]'
                        : 'bg-surface-100 text-gray-500 hover:bg-surface-200'
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {/* Project */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Project</label>
              <select
                value={projectId} onChange={e => setProjectId(e.target.value)}
                className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 bg-white"
              >
                <option value="">No project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {/* Due date */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Due Date</label>
              <input
                type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            {/* Assignees */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-2 block">Assignees</label>
              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                {members.map(m => (
                  <label key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignees.includes(m.id)}
                      onChange={() => toggleAssignee(m.id)}
                      className="rounded text-primary-500"
                    />
                    <Avatar name={m.name} color={getMemberColor(m.id)} size="sm" />
                    <span className="text-sm text-gray-700">{m.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{m.designation}</span>
                  </label>
                ))}
              </div>
            </div>
            <motion.button
              type="submit"
              className="w-full bg-primary-500 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-600 transition-colors mt-1"
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            >
              {initial?.id ? 'Save Changes' : 'Create Task'}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    );
  };

  export default TaskFormModal;
  ```

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors.

- [ ] Commit:
  ```bash
  git add src/components/modals/TaskFormModal.tsx
  git commit -m "feat: add TaskFormModal with all fields"
  ```

---

## Chunk 4: Kanban Board

### Task 11: Update `ProjectHeader` — wire all buttons, remove `projectName` prop

**Files:**
- Modify: `src/components/layout/ProjectHeader.tsx`

- [ ] Replace the entire file. Key changes: remove `projectName` prop; read project name from `useProjects()`; add `useNavigate`; wire all buttons; add filter bar; add invite modal state. Full content:

  ```tsx
  import React, { useState } from 'react';
  import { motion, AnimatePresence } from 'framer-motion';
  import {
    Pencil, Link2, UserPlus, SlidersHorizontal, Calendar,
    Share2, LayoutGrid, List, X, Check,
  } from 'lucide-react';
  import { useNavigate } from 'react-router-dom';
  import { teamMembers, memberColors, MOCK_TODAY } from '../../data/mockData';
  import { Avatar, AvatarGroup } from '../ui/Avatar';
  import { useProjects } from '../../context/ProjectContext';
  import { useMembersContext } from '../../context/MembersContext';
  import InviteMemberModal from '../modals/InviteMemberModal';
  import { useToast } from '../../hooks/useToast';

  interface ProjectHeaderProps {
    onFilterChange?: (filters: { priority: string; assignees: string[]; dueDateFilter: string }) => void;
    onTodayToggle?: (active: boolean) => void;
  }

  const ProjectHeader: React.FC<ProjectHeaderProps> = ({ onFilterChange, onTodayToggle }) => {
    const navigate = useNavigate();
    const { projects, activeProject, updateProject } = useProjects();
    const { members, addMember } = useMembersContext();
    const { show, ToastEl } = useToast();

    const currentProject = projects.find(p => p.id === activeProject);
    const projectName = currentProject?.name ?? 'Untitled';

    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState(projectName);
    const [showFilter, setShowFilter] = useState(false);
    const [todayActive, setTodayActive] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showInvite, setShowInvite] = useState(false);

    // Filter state
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterAssignees, setFilterAssignees] = useState<string[]>([]);
    const [filterDueDate, setFilterDueDate] = useState('all');

    const commitName = () => {
      if (activeProject && nameValue.trim()) {
        updateProject(activeProject, { name: nameValue.trim() || 'Untitled' });
      }
      setEditingName(false);
    };

    const handleShare = () => {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      show('Link copied to clipboard!');
    };

    const handleTodayToggle = () => {
      const next = !todayActive;
      setTodayActive(next);
      onTodayToggle?.(next);
    };

    const handleFilterChange = (priority: string, assignees: string[], dueDateFilter: string) => {
      setFilterPriority(priority);
      setFilterAssignees(assignees);
      setFilterDueDate(dueDateFilter);
      onFilterChange?.({ priority, assignees, dueDateFilter });
    };

    const toggleAssigneeFilter = (id: string) => {
      const next = filterAssignees.includes(id)
        ? filterAssignees.filter(a => a !== id)
        : [...filterAssignees, id];
      handleFilterChange(filterPriority, next, filterDueDate);
    };

    return (
      <motion.div
        className="px-8 pt-6 pb-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        {ToastEl}
        {/* Title row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {editingName ? (
              <input
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onBlur={commitName}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitName();
                  if (e.key === 'Escape') { setNameValue(projectName); setEditingName(false); }
                }}
                className="text-[42px] font-bold text-gray-900 tracking-tight leading-none border-b-2 border-primary-400 focus:outline-none bg-transparent w-auto"
                autoFocus
              />
            ) : (
              <motion.h1
                className="text-[42px] font-bold text-gray-900 tracking-tight leading-none"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                {projectName}
              </motion.h1>
            )}
            {activeProject && (
              <div className="flex items-center gap-1.5 mt-2">
                <motion.button
                  onClick={() => { setNameValue(projectName); setEditingName(true); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                >
                  <Pencil size={16} />
                </motion.button>
                <motion.button
                  onClick={handleShare}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                >
                  <Link2 size={16} />
                </motion.button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-4 py-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors text-sm font-semibold"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              <UserPlus size={18} /> Invite
            </motion.button>
            <AvatarGroup names={members.map(m => m.name)} colors={memberColors} size="md" max={4} />
          </div>
        </div>

        {/* Filter row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => setShowFilter(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilter ? 'border-primary-400 bg-primary-50 text-primary-600' : 'border-surface-300 text-gray-600 hover:bg-surface-100'}`}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              <SlidersHorizontal size={16} /> Filter
            </motion.button>
            <motion.button
              onClick={handleTodayToggle}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${todayActive ? 'border-primary-400 bg-primary-50 text-primary-600' : 'border-surface-300 text-gray-600 hover:bg-surface-100'}`}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              <Calendar size={16} /> Today
              {todayActive && <Check size={12} />}
            </motion.button>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 border border-surface-300 rounded-lg text-gray-600 text-sm font-medium hover:bg-surface-100 transition-colors"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              <Share2 size={16} /> Share
            </motion.button>
            <div className="flex items-center bg-surface-100 rounded-lg p-1">
              <motion.button
                onClick={() => { setViewMode('grid'); }}
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              >
                <LayoutGrid size={16} />
              </motion.button>
              <motion.button
                onClick={() => { setViewMode('list'); navigate('/tasks'); }}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              >
                <List size={16} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <AnimatePresence>
          {showFilter && (
            <motion.div
              className="mt-3 p-4 bg-surface-50 rounded-xl border border-surface-200 flex flex-wrap gap-4 items-start"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
            >
              {/* Priority */}
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Priority</div>
                <div className="flex gap-1.5">
                  {['all', 'low', 'high'].map(p => (
                    <button
                      key={p}
                      onClick={() => handleFilterChange(p, filterAssignees, filterDueDate)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filterPriority === p ? 'bg-primary-500 text-white' : 'bg-white text-gray-500 border border-surface-200 hover:border-primary-300'}`}
                    >
                      {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {/* Due date */}
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Due Date</div>
                <div className="flex gap-1.5">
                  {['all', 'today', 'week', 'overdue'].map(d => (
                    <button
                      key={d}
                      onClick={() => handleFilterChange(filterPriority, filterAssignees, d)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors capitalize ${filterDueDate === d ? 'bg-primary-500 text-white' : 'bg-white text-gray-500 border border-surface-200 hover:border-primary-300'}`}
                    >
                      {d === 'all' ? 'All' : d === 'week' ? 'This Week' : d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {/* Assignees */}
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Assignees</div>
                <div className="flex gap-1.5">
                  {members.map((m, i) => {
                    const color = memberColors[i % memberColors.length];
                    const active = filterAssignees.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleAssigneeFilter(m.id)}
                        className={`transition-all ${active ? 'ring-2 ring-primary-400 ring-offset-1 rounded-full' : 'opacity-60 hover:opacity-100'}`}
                        title={m.name}
                      >
                        <Avatar name={m.name} color={color} size="sm" />
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Clear */}
              {(filterPriority !== 'all' || filterAssignees.length > 0 || filterDueDate !== 'all') && (
                <button
                  onClick={() => handleFilterChange('all', [], 'all')}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-auto ml-auto"
                >
                  <X size={12} /> Clear filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invite modal */}
        <AnimatePresence>
          {showInvite && (
            <InviteMemberModal
              onClose={() => setShowInvite(false)}
              onSubmit={member => addMember(member)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  export default ProjectHeader;
  ```

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors.

- [ ] Commit:
  ```bash
  git add src/components/layout/ProjectHeader.tsx
  git commit -m "feat: wire all ProjectHeader buttons — filter, today, share, grid/list, invite, pencil-edit"
  ```

---

### Task 12: Update `KanbanColumn` — drag-over highlight + `+` button on all columns

**Files:**
- Modify: `src/components/dashboard/KanbanColumn.tsx`

- [ ] Replace the entire file:
  ```tsx
  import React, { useState } from 'react';
  import { motion, AnimatePresence } from 'framer-motion';
  import { Plus } from 'lucide-react';
  import { Task, TaskStatus } from '../../types';
  import TaskCard from './TaskCard';

  interface KanbanColumnProps {
    title: string;
    status: TaskStatus;
    tasks: Task[];
    dotColor: string;
    lineColor: string;
    index: number;
    onTaskClick: (task: Task) => void;
    onAddTask: (status: TaskStatus) => void;
    onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
  }

  const KanbanColumn: React.FC<KanbanColumnProps> = ({
    title, status, tasks, dotColor, lineColor, index,
    onTaskClick, onAddTask, onMoveTask,
  }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    };
    const handleDragLeave = () => setIsDragOver(false);
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('taskId');
      if (taskId) onMoveTask(taskId, status);
      setIsDragOver(false);
    };

    return (
      <motion.div
        className="flex-1 min-w-[310px] max-w-[380px] flex flex-col h-full"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.12, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Column header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2.5">
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: dotColor }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
            />
            <span className="font-semibold text-gray-900 text-base">{title}</span>
            <span className="w-5 h-5 rounded-full bg-surface-200 text-[11px] text-gray-500 font-semibold flex items-center justify-center">
              {tasks.length}
            </span>
          </div>
          <motion.button
            onClick={() => onAddTask(status)}
            className="w-6 h-6 rounded-md bg-primary-50 flex items-center justify-center text-primary-500 hover:bg-primary-100 transition-colors"
            whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <Plus size={14} strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* Color line */}
        <motion.div
          className="h-[3px] rounded-full mb-5"
          style={{ backgroundColor: lineColor, transformOrigin: 'left' }}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: index * 0.12 + 0.2, ease: [0.4, 0, 0.2, 1] }}
        />

        {/* Drop zone */}
        <div
          className={`flex-1 overflow-y-auto space-y-4 pr-1 rounded-xl transition-all ${isDragOver ? 'bg-primary-50/50 ring-2 ring-dashed ring-primary-300' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {tasks.map((task, i) => (
            <TaskCard
              key={task.id}
              task={task}
              index={i}
              onClick={() => onTaskClick(task)}
              onMoveTask={onMoveTask}
            />
          ))}
          {tasks.length === 0 && isDragOver && (
            <div className="h-20 rounded-xl border-2 border-dashed border-primary-300 flex items-center justify-center">
              <span className="text-xs text-primary-400 font-medium">Drop here</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  export default KanbanColumn;
  ```

- [ ] Run `npx tsc --noEmit 2>&1 | head -30`.

- [ ] Commit:
  ```bash
  git add src/components/dashboard/KanbanColumn.tsx
  git commit -m "feat: add drag-drop to KanbanColumn, + button on all columns"
  ```

---

### Task 13: Update `TaskCard` — drag events and `⋯` menu

**Files:**
- Modify: `src/components/dashboard/TaskCard.tsx`

- [ ] Replace the entire file:
  ```tsx
  import React, { useState, useEffect, useRef } from 'react';
  import { motion, AnimatePresence } from 'framer-motion';
  import { MoreHorizontal, MessageSquare, Paperclip, Edit3, Trash2, ArrowRight } from 'lucide-react';
  import { Task, TaskStatus } from '../../types';
  import { useMembersContext } from '../../context/MembersContext';
  import { AvatarGroup } from '../ui/Avatar';
  import { memberColors } from '../../data/mockData';
  import { MOCK_TODAY } from '../../data/mockData';

  const priorityStyles: Record<string, { bg: string; text: string; label: string }> = {
    low: { bg: 'bg-[#DFA87433]', text: 'text-[#D58D49]', label: 'Low' },
    high: { bg: 'bg-[#D8727D33]', text: 'text-[#D8727D]', label: 'High' },
    completed: { bg: 'bg-[#83C29D33]', text: 'text-[#68B266]', label: 'Completed' },
  };

  const statusLabels: Record<TaskStatus, string> = {
    'todo': 'To Do',
    'in-progress': 'In Progress',
    'done': 'Done',
  };

  interface TaskCardProps {
    task: Task;
    index: number;
    onClick: () => void;
    onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
    todayMode?: boolean;
  }

  const TaskCard: React.FC<TaskCardProps> = ({ task, index, onClick, onMoveTask, todayMode }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { members, getMemberColor } = useMembersContext();
    const priority = priorityStyles[task.priority] ?? priorityStyles.low;

    const assigneeNames = task.assignees.map(id => members.find(m => m.id === id)?.name ?? 'Unknown');
    const assigneeColors = task.assignees.map(id => getMemberColor(id));

    const isToday = todayMode && task.dueDate === MOCK_TODAY;

    useEffect(() => {
      if (!showMenu) return;
      const handler = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setShowMenu(false);
          setConfirmDelete(false);
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [showMenu]);

    const otherStatuses = (['todo', 'in-progress', 'done'] as TaskStatus[]).filter(s => s !== task.status);

    return (
      <motion.div
        className={`bg-white rounded-2xl p-4 border cursor-pointer group relative transition-all ${isToday ? 'border-l-4 border-l-primary-500 border-surface-200' : 'border-surface-200'} ${isDragging ? 'opacity-50' : ''}`}
        draggable
        onDragStart={e => { e.dataTransfer.setData('taskId', task.id); setIsDragging(true); }}
        onDragEnd={() => setIsDragging(false)}
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: index * 0.08, ease: [0.4, 0, 0.2, 1] }}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
        layout
        onClick={onClick}
      >
        {/* Priority badge & menu */}
        <div className="flex items-center justify-between mb-2">
          <motion.span
            className={`text-xs font-semibold px-2.5 py-1 rounded-md ${priority.bg} ${priority.text}`}
            whileHover={{ scale: 1.05 }}
          >
            {priority.label}
          </motion.span>
          <div ref={menuRef} className="relative" onClick={e => e.stopPropagation()}>
            <motion.button
              className="text-gray-300 hover:text-gray-500 transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: showMenu ? 1 : undefined }}
              whileHover={{ opacity: 1 }}
              onClick={e => { e.stopPropagation(); setShowMenu(v => !v); setConfirmDelete(false); }}
            >
              <MoreHorizontal size={18} />
            </motion.button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-surface-200 shadow-lg z-20 overflow-hidden"
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
                >
                  {!confirmDelete ? (
                    <>
                      <button
                        onClick={() => { setShowMenu(false); onClick(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-surface-50 transition-colors"
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                      {otherStatuses.map(s => (
                        <button
                          key={s}
                          onClick={() => { onMoveTask(task.id, s); setShowMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-surface-50 transition-colors"
                        >
                          <ArrowRight size={13} /> Move to {statusLabels[s]}
                        </button>
                      ))}
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#D8727D] hover:bg-[#D8727D0A] transition-colors border-t border-surface-100"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </>
                  ) : (
                    <div className="px-4 py-3">
                      <p className="text-xs text-gray-600 mb-2 font-medium">Delete this task?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { /* deleteTask called from KanbanBoard */ setShowMenu(false); }}
                          className="flex-1 text-xs font-semibold bg-[#D8727D] text-white py-1.5 rounded-lg hover:bg-[#c5616b] transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="flex-1 text-xs font-semibold bg-surface-100 text-gray-600 py-1.5 rounded-lg hover:bg-surface-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 text-[15px] mb-1 leading-snug">{task.title}</h3>
        {task.description && (
          <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">{task.description}</p>
        )}
        {task.images && task.images.length > 0 && (
          <div className="flex gap-2 mb-3">
            {task.images.map((img, i) => (
              <motion.div key={i} className="flex-1 h-[110px] rounded-xl overflow-hidden bg-surface-100"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.08 + i * 0.1 + 0.15 }}
              >
                <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
              </motion.div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <AvatarGroup names={assigneeNames} colors={assigneeColors} size="sm" max={3} />
          <div className="flex items-center gap-3 text-gray-400">
            <motion.div className="flex items-center gap-1 text-xs" whileHover={{ color: '#5030E5' }}>
              <MessageSquare size={14} /><span>{task.comments} comments</span>
            </motion.div>
            <motion.div className="flex items-center gap-1 text-xs" whileHover={{ color: '#5030E5' }}>
              <Paperclip size={14} /><span>{task.files} files</span>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  };

  export default TaskCard;
  ```

  Note: The "Delete" confirm button in the menu calls `setShowMenu(false)` as a placeholder — the actual `deleteTask` call will come from `KanbanBoard` which passes an `onDeleteTask` prop in Task 14. We'll add that prop wiring in the next task.

- [ ] Run `npx tsc --noEmit 2>&1 | head -30`.

- [ ] Commit:
  ```bash
  git add src/components/dashboard/TaskCard.tsx
  git commit -m "feat: add drag events, ⋯ menu to TaskCard"
  ```

---

### Task 14: Rewrite `KanbanBoard` — context data, task detail panel, filter

**Files:**
- Modify: `src/components/dashboard/KanbanBoard.tsx`

- [ ] Replace the entire file. This is the largest component — it wires everything together:

  ```tsx
  import React, { useState, useRef } from 'react';
  import { motion, AnimatePresence } from 'framer-motion';
  import {
    X, Tag, User, Calendar, ChevronDown, ImagePlus,
    Check, Edit3, Trash2, MessageSquare, Send,
  } from 'lucide-react';
  import { Task, TaskStatus } from '../../types';
  import { useProjects } from '../../context/ProjectContext';
  import { useMembersContext } from '../../context/MembersContext';
  import { Avatar, AvatarGroup } from '../ui/Avatar';
  import KanbanColumn from './KanbanColumn';
  import TaskFormModal from '../modals/TaskFormModal';
  import { MOCK_TODAY } from '../../data/mockData';

  const WEEK_START = '2020-12-14';
  const WEEK_END   = '2020-12-20';

  const statusStyles: Record<TaskStatus, { bg: string; text: string; label: string }> = {
    'todo':        { bg: 'bg-primary-50',     text: 'text-primary-600',  label: 'To Do' },
    'in-progress': { bg: 'bg-[#FFA50020]',    text: 'text-[#FFA500]',   label: 'In Progress' },
    'done':        { bg: 'bg-[#83C29D33]',    text: 'text-[#68B266]',   label: 'Done' },
  };
  const priorityStyles: Record<string, { bg: string; text: string; label: string }> = {
    low:       { bg: 'bg-[#DFA87433]', text: 'text-[#D58D49]', label: 'Low' },
    high:      { bg: 'bg-[#D8727D33]', text: 'text-[#D8727D]', label: 'High' },
    completed: { bg: 'bg-[#83C29D33]', text: 'text-[#68B266]', label: 'Completed' },
  };

  type Comment = { id: string; author: string; text: string; time: string };

  const SEED_COMMENTS: Comment[] = [
    { id: 'c1', author: 'Rohan Kumar',  text: 'Great progress on this!',      time: '10:32 AM' },
    { id: 'c2', author: 'Priya Singh',  text: 'Need to review the designs.',   time: '10:45 AM' },
  ];

  interface Filters {
    priority: string;
    assignees: string[];
    dueDateFilter: string;
  }

  interface KanbanBoardProps {
    filters?: Filters;
    todayMode?: boolean;
  }

  const KanbanBoard: React.FC<KanbanBoardProps> = ({ filters, todayMode }) => {
    const { allTasks, moveTask, updateTask, deleteTask, createTask, projects } = useProjects();
    const { members, getMemberColor } = useMembersContext();

    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [showStatusDrop, setShowStatusDrop] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [formDefaultStatus, setFormDefaultStatus] = useState<TaskStatus>('todo');
    const [comments, setComments] = useState<Comment[]>(SEED_COMMENTS);
    const [commentInput, setCommentInput] = useState('');
    const [detailImage, setDetailImage] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // Edit state
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editPriority, setEditPriority] = useState<'low' | 'high'>('low');
    const [editAssignees, setEditAssignees] = useState<string[]>([]);
    const [editDueDate, setEditDueDate] = useState('');

    const openTask = (task: Task) => {
      setSelectedTask(task);
      setEditMode(false);
      setConfirmDelete(false);
      setShowStatusDrop(false);
      setComments(SEED_COMMENTS);
      setCommentInput('');
      setDetailImage(null);
    };

    const startEdit = (task: Task) => {
      setEditTitle(task.title);
      setEditDesc(task.description ?? '');
      setEditPriority(task.priority === 'high' ? 'high' : 'low');
      setEditAssignees([...task.assignees]);
      setEditDueDate(task.dueDate ?? '');
      setEditMode(true);
    };

    const saveEdit = () => {
      if (!selectedTask) return;
      updateTask(selectedTask.id, {
        title: editTitle,
        description: editDesc,
        priority: editPriority,
        assignees: editAssignees,
        dueDate: editDueDate || undefined,
      });
      setSelectedTask(prev => prev ? { ...prev, title: editTitle, description: editDesc, priority: editPriority, assignees: editAssignees, dueDate: editDueDate || undefined } : prev);
      setEditMode(false);
    };

    const handleDelete = () => {
      if (!selectedTask) return;
      deleteTask(selectedTask.id);
      setSelectedTask(null);
      setConfirmDelete(false);
    };

    const handleAddComment = () => {
      if (!commentInput.trim()) return;
      setComments(prev => [...prev, { id: String(Date.now()), author: 'You', text: commentInput.trim(), time: 'Now' }]);
      setCommentInput('');
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedTask) return;
      const url = URL.createObjectURL(file);
      setDetailImage(url);
      updateTask(selectedTask.id, { images: [...(selectedTask.images ?? []), url] });
    };

    const applyFilters = (tasks: Task[]): Task[] => {
      if (!filters) return tasks;
      return tasks.filter(t => {
        if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
        if (filters.assignees.length > 0 && !filters.assignees.some(id => t.assignees.includes(id))) return false;
        if (filters.dueDateFilter === 'today' && t.dueDate !== MOCK_TODAY) return false;
        if (filters.dueDateFilter === 'week' && (!t.dueDate || t.dueDate < WEEK_START || t.dueDate > WEEK_END)) return false;
        if (filters.dueDateFilter === 'overdue' && (t.dueDate === undefined || t.dueDate >= MOCK_TODAY || t.status === 'done')) return false;
        return true;
      });
    };

    const columns: { title: string; status: TaskStatus; dotColor: string; lineColor: string }[] = [
      { title: 'To Do',       status: 'todo',        dotColor: '#5030E5', lineColor: '#5030E5' },
      { title: 'On Progress', status: 'in-progress', dotColor: '#FFA500', lineColor: '#FFA500' },
      { title: 'Done',        status: 'done',         dotColor: '#8BC34A', lineColor: '#8BC34A' },
    ];

    const currentStatus = selectedTask ? (selectedTask.status) : 'todo';
    const currentStatusStyle = statusStyles[currentStatus];
    const proj = selectedTask ? projects.find(p => p.id === selectedTask.projectId) : null;

    return (
      <>
        <motion.div
          className="flex-1 overflow-x-auto overflow-y-hidden px-8 pb-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="flex gap-6 h-full">
            {columns.map((col, index) => (
              <KanbanColumn
                key={col.status}
                title={col.title}
                status={col.status}
                tasks={applyFilters(allTasks.filter(t => t.status === col.status))}
                dotColor={col.dotColor}
                lineColor={col.lineColor}
                index={index}
                onTaskClick={openTask}
                onAddTask={(status) => { setFormDefaultStatus(status); setShowTaskForm(true); }}
                onMoveTask={(taskId, newStatus) => moveTask(taskId, newStatus)}
              />
            ))}
          </div>
        </motion.div>

        {/* Task Form Modal */}
        <AnimatePresence>
          {showTaskForm && (
            <TaskFormModal
              onClose={() => setShowTaskForm(false)}
              onSubmit={task => createTask(task)}
              defaultStatus={formDefaultStatus}
            />
          )}
        </AnimatePresence>

        {/* Task Detail Slide-over */}
        <AnimatePresence>
          {selectedTask && (
            <motion.div
              className="fixed inset-0 top-16 z-50 flex"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div className="flex-1 bg-black/30" onClick={() => setSelectedTask(null)} />
              <motion.div
                className="w-[420px] bg-white h-full overflow-y-auto border-l border-surface-200 flex flex-col"
                initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
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
                  {/* Title */}
                  <div>
                    {editMode ? (
                      <input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full text-base font-bold text-gray-900 border-b-2 border-primary-400 focus:outline-none bg-transparent pb-1"
                      />
                    ) : (
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h2 className="font-bold text-gray-900 text-base leading-snug">{selectedTask.title}</h2>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md shrink-0 ${(priorityStyles[selectedTask.priority] ?? priorityStyles.low).bg} ${(priorityStyles[selectedTask.priority] ?? priorityStyles.low).text}`}>
                          {(priorityStyles[selectedTask.priority] ?? priorityStyles.low).label}
                        </span>
                      </div>
                    )}
                    {proj && !editMode && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color }} />
                        <span className="text-xs text-gray-400">{proj.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <div className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1"><Tag size={11} /> Status</div>
                    <div className="relative">
                      <button
                        onClick={() => setShowStatusDrop(v => !v)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${currentStatusStyle.bg} ${currentStatusStyle.text} hover:opacity-80 transition-opacity`}
                      >
                        {currentStatusStyle.label}
                        <ChevronDown size={12} className={`transition-transform ${showStatusDrop ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {showStatusDrop && (
                          <motion.div
                            className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-surface-100 overflow-hidden z-10 w-40"
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                          >
                            {(['todo', 'in-progress', 'done'] as TaskStatus[]).map(s => {
                              const st = statusStyles[s];
                              return (
                                <button key={s}
                                  onClick={() => {
                                    moveTask(selectedTask.id, s);
                                    setSelectedTask(prev => prev ? { ...prev, status: s } : prev);
                                    setShowStatusDrop(false);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold hover:bg-surface-50 transition-colors"
                                >
                                  <span className={`w-2 h-2 rounded-full ${s === 'todo' ? 'bg-primary-500' : s === 'in-progress' ? 'bg-[#FFA500]' : 'bg-[#68B266]'}`} />
                                  <span className={st.text}>{st.label}</span>
                                  {selectedTask.status === s && <Check size={11} className="ml-auto text-primary-500" />}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Priority edit */}
                  {editMode && (
                    <div>
                      <div className="text-xs font-semibold text-gray-400 mb-1.5">Priority</div>
                      <div className="flex gap-2">
                        {(['low', 'high'] as const).map(p => (
                          <button key={p} onClick={() => setEditPriority(p)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${editPriority === p ? (p === 'high' ? 'bg-[#D8727D22] text-[#D8727D] ring-1 ring-[#D8727D]' : 'bg-[#DFA87433] text-[#D58D49] ring-1 ring-[#D58D49]') : 'bg-surface-100 text-gray-500'}`}
                          >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assignees */}
                  <div>
                    <div className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1"><User size={11} /> Assignees</div>
                    {editMode ? (
                      <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                        {members.map(m => (
                          <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-50 cursor-pointer">
                            <input type="checkbox" checked={editAssignees.includes(m.id)}
                              onChange={() => setEditAssignees(prev => prev.includes(m.id) ? prev.filter(a => a !== m.id) : [...prev, m.id])}
                              className="rounded text-primary-500" />
                            <Avatar name={m.name} color={getMemberColor(m.id)} size="sm" />
                            <span className="text-xs text-gray-700">{m.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedTask.assignees.map(id => {
                          const member = members.find(m => m.id === id);
                          if (!member) return null;
                          return (
                            <div key={id} className="flex items-center gap-1.5 bg-surface-100 rounded-full px-2.5 py-1">
                              <Avatar name={member.name} color={getMemberColor(id)} size="sm" />
                              <span className="text-xs font-semibold text-gray-700">{member.name.split(' ')[0]}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Due Date */}
                  <div>
                    <div className="text-xs font-semibold text-gray-400 mb-1 flex items-center gap-1"><Calendar size={11} /> Due Date</div>
                    {editMode ? (
                      <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)}
                        className="border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400" />
                    ) : (
                      <span className="text-sm font-semibold text-gray-700">{selectedTask.dueDate ?? '—'}</span>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <div className="text-xs font-semibold text-gray-400 mb-1.5">Description</div>
                    {editMode ? (
                      <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3}
                        className="w-full border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 resize-none" />
                    ) : (
                      <p className="text-sm text-gray-600 leading-relaxed">{selectedTask.description || 'No description.'}</p>
                    )}
                  </div>

                  {/* Image attachment */}
                  {!editMode && (
                    <div>
                      <div className="text-xs font-semibold text-gray-400 mb-1.5">Attachment</div>
                      {detailImage ? (
                        <div className="relative rounded-xl overflow-hidden">
                          <img src={detailImage} alt="attachment" className="w-full h-40 object-cover rounded-xl" />
                          <button onClick={() => setDetailImage(null)} className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => fileRef.current?.click()}
                          className="w-full h-24 border-2 border-dashed border-surface-300 rounded-xl flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-primary-300 hover:text-primary-400 transition-colors">
                          <ImagePlus size={20} /><span className="text-xs font-medium">Upload image</span>
                        </button>
                      )}
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </div>
                  )}

                  {/* Edit mode save/cancel */}
                  {editMode && (
                    <div className="flex gap-2">
                      <motion.button onClick={saveEdit} className="flex-1 bg-primary-500 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-primary-600 transition-colors" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                        Save
                      </motion.button>
                      <button onClick={() => setEditMode(false)} className="flex-1 bg-surface-100 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-surface-200 transition-colors">
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Comments */}
                  {!editMode && (
                    <div>
                      <div className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1"><MessageSquare size={11} /> Comments ({comments.length})</div>
                      <div className="flex flex-col gap-3 mb-3 max-h-40 overflow-y-auto">
                        {comments.map(c => (
                          <div key={c.id} className="flex gap-2.5">
                            <Avatar name={c.author} color="#5030E5" size="sm" />
                            <div>
                              <div className="text-[11px] font-semibold text-gray-900">{c.author} <span className="text-gray-400 font-normal">{c.time}</span></div>
                              <div className="text-xs text-gray-600 mt-0.5">{c.text}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input value={commentInput} onChange={e => setCommentInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                          placeholder="Add a comment..." className="flex-1 border border-surface-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary-400" />
                        <button onClick={handleAddComment} className="w-8 h-8 bg-primary-500 rounded-xl flex items-center justify-center text-white hover:bg-primary-600 transition-colors shrink-0">
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  )}

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
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  };

  export default KanbanBoard;
  ```

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors.

- [ ] Commit:
  ```bash
  git add src/components/dashboard/KanbanBoard.tsx
  git commit -m "feat: full KanbanBoard — context data, task detail panel, filter, drag-drop wiring"
  ```

---

### Task 15: Wire `KanbanBoard` filters from `ProjectHeader` in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] The `KanbanBoard` route currently renders `<KanbanBoard />` inside `<Layout showProjectHeader={true}>`. `ProjectHeader` now has `onFilterChange` and `onTodayToggle` props, but `KanbanBoard` needs to receive them. The cleanest approach without deep prop drilling: promote filter/today state into the `Layout` component (for the Kanban route only) using a simple pass-through via a wrapper component.

  In `App.tsx`, add a `KanbanRoute` wrapper component right before the `App` component definition:
  ```tsx
  const KanbanRoute: React.FC = () => {
    const [filters, setFilters] = React.useState({ priority: 'all', assignees: [] as string[], dueDateFilter: 'all' });
    const [todayMode, setTodayMode] = React.useState(false);
    return (
      <Layout
        showProjectHeader={true}
        onFilterChange={setFilters}
        onTodayToggle={setTodayMode}
      >
        <KanbanBoard filters={filters} todayMode={todayMode} />
      </Layout>
    );
  };
  ```

  Update `Layout` props to accept and pass `onFilterChange` and `onTodayToggle` to `ProjectHeader`:
  ```tsx
  const Layout: React.FC<{
    children: React.ReactNode;
    showProjectHeader?: boolean;
    onFilterChange?: (f: any) => void;
    onTodayToggle?: (v: boolean) => void;
  }> = ({ children, showProjectHeader = false, onFilterChange, onTodayToggle }) => {
    // ...
    {showProjectHeader && <ProjectHeader onFilterChange={onFilterChange} onTodayToggle={onTodayToggle} />}
  ```

  Replace the `"/"` route element with `<KanbanRoute />`:
  ```tsx
  <Route path="/" element={<KanbanRoute />} />
  ```

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors.

- [ ] Commit:
  ```bash
  git add src/App.tsx
  git commit -m "feat: wire KanbanBoard filters through Layout/ProjectHeader"
  ```

---

## Chunk 5: Tasks Page

### Task 16: Rewrite `TasksPage` — context sync, edit/delete, TaskFormModal, export

**Files:**
- Modify: `src/pages/TasksPage.tsx`

- [ ] The `TasksPage` detail panel already exists and is well-structured. Make these targeted changes:

  1. **Remove `statusOverrides` state** (lines 55–56). Replace `getStatus(task)` usage with `task.status` directly — it now comes from context.

  2. **Add imports** at top:
     ```ts
     import { useProjects } from '../context/ProjectContext';
     import { useMembersContext } from '../context/MembersContext';
     import TaskFormModal from '../components/modals/TaskFormModal';
     import { downloadCsv } from '../utils/exportCsv';
     import { AnimatePresence } from 'framer-motion';
     ```

  3. **Remove** `const { projects: contextProjects, allTasks, createTask } = useProjects();` and replace with:
     ```ts
     const { projects: contextProjects, allTasks, createTask, updateTask, deleteTask, moveTask } = useProjects();
     const { members, getMemberColor } = useMembersContext();
     ```

  4. **Replace** the `showModal` / `newTask` form state with:
     ```ts
     const [showTaskForm, setShowTaskForm] = useState(false);
     ```
     Replace the New Task modal JSX with:
     ```tsx
     <AnimatePresence>
       {showTaskForm && (
         <TaskFormModal
           onClose={() => setShowTaskForm(false)}
           onSubmit={task => createTask(task)}
           defaultStatus="todo"
         />
       )}
     </AnimatePresence>
     ```
     Wire the "New Task" button: `onClick={() => setShowTaskForm(true)}`.

  5. **Status dropdown** in detail panel: replace `setStatusOverrides(...)` call with `updateTask(selectedTask.id, { status: s })`.

  6. **Add Edit mode state** in detail panel:
     ```ts
     const [editMode, setEditMode] = useState(false);
     const [editTitle, setEditTitle] = useState('');
     // ... (same pattern as KanbanBoard task detail)
     ```
     Add Edit button to panel header that calls `startEdit(selectedTask)`.
     Add Save/Cancel buttons when in edit mode — Save calls `updateTask(...)`.

  7. **Add Delete confirmation** at bottom of panel (same pattern as KanbanBoard).

  8. **Wire Export button**:
     ```ts
     const handleExport = () => {
       const header = ['Title', 'Project', 'Priority', 'Status', 'Assignees', 'Due Date'];
       const rows = allTasks.map(t => {
         const proj = contextProjects.find(p => p.id === t.projectId)?.name ?? '';
         const assigneeNames = t.assignees.map(id => members.find(m => m.id === id)?.name ?? '').filter(Boolean).join(', ');
         return [t.title, proj, t.priority, t.status, assigneeNames, t.dueDate ?? ''];
       });
       downloadCsv('tasks.csv', [header, ...rows]);
     };
     ```
     Wire to Export button `onClick={handleExport}`.

  9. **Remove** `dueDates` / `taskProjects` / `taskDescriptions` local records — replace lookups with `task.dueDate`, `task.projectId`, `task.description`.

  10. Remove `showStatusDrop` and `setShowStatusDrop` from the existing `emptyNew` form state — not needed any more.

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors.

- [ ] Test in browser: click a row → panel opens; change status → updates; Export → downloads CSV.

- [ ] Commit:
  ```bash
  git add src/pages/TasksPage.tsx
  git commit -m "feat: TasksPage — context sync, edit/delete panel, TaskFormModal, CSV export"
  ```

---

## Chunk 6: Members Page

### Task 17: Rewrite `MembersPage` — profile panel, invite, remove, export

**Files:**
- Modify: `src/pages/MembersPage.tsx`

- [ ] Add imports:
  ```ts
  import { useState } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { MoreVertical, X, Send } from 'lucide-react';
  import { useMembersContext } from '../context/MembersContext';
  import { useProjects } from '../context/ProjectContext';
  import InviteMemberModal from '../components/modals/InviteMemberModal';
  import { downloadCsv } from '../utils/exportCsv';
  import { AnimatePresence } from 'framer-motion';
  ```

- [ ] Replace the static `teamMembers` / `memberColors` usage inside the component with `useMembersContext()`:
  ```ts
  const { members, getMemberColor, addMember, removeMember } = useMembersContext();
  const { scrubAssignee } = useProjects();
  const navigate = useNavigate();
  ```

- [ ] Add state:
  ```ts
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  ```

- [ ] **Member cards**: add `onClick={() => setSelectedMember(member)}` and a `⋯` menu button:
  ```tsx
  <button onClick={e => { e.stopPropagation(); setConfirmRemoveId(m.id === confirmRemoveId ? null : m.id); }}
    className="..."><MoreVertical size={16} /></button>
  ```
  When `confirmRemoveId === m.id`, show inline: "Remove [name]? Confirm / Cancel".
  Confirm calls: `removeMember(m.id); scrubAssignee(m.id); setConfirmRemoveId(null);`
  Wrap the member card list in `<AnimatePresence>` so removed cards animate out.

- [ ] **Profile side panel** (420px slide-over, same pattern as KanbanBoard):
  Shows avatar, name, designation, location (`'—'` if none), role badge, online status dot, task progress bar (hardcode `memberTaskCounts` or derive from `allTasks`), "Send Message" button:
  ```ts
  onClick={() => navigate('/messages', { state: { memberId: selectedMember.id } })}
  ```

- [ ] **Invite button**: `onClick={() => setShowInvite(true)}`. Render `<InviteMemberModal>` inside `<AnimatePresence>`.

- [ ] **Export button**:
  ```ts
  const handleExport = () => {
    const header = ['Name', 'Email', 'Role', 'Designation', 'Location', 'Status'];
    const rows = members.map(m => [m.name, m.email ?? '', m.role, m.designation ?? '', m.location ?? '', m.status ?? 'active']);
    downloadCsv('members.csv', [header, ...rows]);
  };
  ```

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors.

- [ ] Commit:
  ```bash
  git add src/pages/MembersPage.tsx
  git commit -m "feat: MembersPage — profile panel, invite, remove, export, navigate-to-messages"
  ```

---

## Chunk 7: Teams Page

### Task 18: Rewrite `TeamsPage` — project cards, modals, delete

**Files:**
- Modify: `src/pages/TeamsPage.tsx`

- [ ] Add imports:
  ```ts
  import { useState } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { MoreVertical, X, ArrowRight } from 'lucide-react';
  import { useProjects } from '../context/ProjectContext';
  import { useMembersContext } from '../context/MembersContext';
  import NewProjectModal from '../components/modals/NewProjectModal';
  import { AnimatePresence } from 'framer-motion';
  import { Project } from '../types';
  ```

- [ ] Replace static data usage with context:
  ```ts
  const { projects, allTasks, createProject, updateProject, deleteProject, setActiveProject } = useProjects();
  const { members, getMemberColor } = useMembersContext();
  const navigate = useNavigate();
  ```

- [ ] Add state:
  ```ts
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  ```

- [ ] **Project cards**: add `onClick={() => setSelectedProject(project)}`. Add `⋯` menu with Edit/Delete.

- [ ] **"New Team" button**: `onClick={() => { setEditingProject(null); setShowProjectModal(true); }}`.

- [ ] **`NewProjectModal`** wiring:
  ```tsx
  <AnimatePresence>
    {showProjectModal && (
      <NewProjectModal
        onClose={() => setShowProjectModal(false)}
        onSubmit={(name, color) => {
          if (editingProject) updateProject(editingProject.id, { name, color });
          else createProject(name, color);
        }}
        initial={editingProject ? { name: editingProject.name, color: editingProject.color } : undefined}
      />
    )}
  </AnimatePresence>
  ```

- [ ] **Project detail slide-over panel** (same 420px pattern):
  Shows color swatch, project name (editable inline with pencil), members from `teamMembersMap` (keep local map for seed projects; new projects show empty), task count from `allTasks.filter(t => t.projectId === project.id).length`, completion bar.
  "Go to Board" button: `setActiveProject(project.id); navigate('/');`

- [ ] **Delete**: inline confirm → `deleteProject(id); setSelectedProject(null);`

- [ ] **Derive metrics from context** (not static `taskCounts`/`completedCounts` local vars):
  ```ts
  const totalTasks = allTasks.length;
  const totalCompleted = allTasks.filter(t => t.status === 'done').length;
  const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
  ```

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors.

- [ ] Commit:
  ```bash
  git add src/pages/TeamsPage.tsx
  git commit -m "feat: TeamsPage — project cards, detail panel, new/edit/delete project, setActiveProject"
  ```

---

## Chunk 8: Messages, Reports, Attendance, Organization

### Task 19: Update `MessagesPage` — useLocation, new convo, file attach, call type

**Files:**
- Modify: `src/pages/MessagesPage.tsx`

- [ ] Add `useLocation` import from `react-router-dom` and `useEffect`:
  ```ts
  import { useLocation } from 'react-router-dom';
  ```

- [ ] Add after existing state declarations:
  ```ts
  const location = useLocation();
  useEffect(() => {
    const memberId = (location.state as any)?.memberId;
    if (memberId) {
      setActiveId(memberId);
      setChats(prev => ({ [memberId]: [], ...prev }));
    }
  }, []);
  ```

- [ ] **New conversation `+` button**: add state `const [showNewConvo, setShowNewConvo] = useState(false);`. Wire the existing `<Plus>` button to toggle it. Render an inline overlay:
  ```tsx
  <AnimatePresence>
    {showNewConvo && (
      <motion.div className="absolute inset-0 bg-white z-10 flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-100">
          <button onClick={() => setShowNewConvo(false)}><X size={16} /></button>
          <span className="font-semibold text-sm text-gray-900">New Conversation</span>
        </div>
        {members.filter(m => m.id !== currentUser.id && !Object.keys(chats).includes(m.id)).map(m => (
          <button key={m.id} onClick={() => {
            setChats(prev => ({ ...prev, [m.id]: [] }));
            setActiveId(m.id);
            setShowNewConvo(false);
          }} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors">
            <Avatar name={m.name} color={getMemberColor(m.id)} size="md" />
            <div><div className="text-sm font-semibold text-gray-900">{m.name}</div><div className="text-xs text-gray-400">{designations[m.id] ?? ''}</div></div>
          </button>
        ))}
      </motion.div>
    )}
  </AnimatePresence>
  ```

- [ ] **File attach**: add `const attachRef = useRef<HTMLInputElement>(null);`. Find the existing paperclip button in the input row and wire it:
  ```tsx
  <button onClick={() => attachRef.current?.click()} ...>
  <input ref={attachRef} type="file" className="hidden" onChange={e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChats(prev => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), { id: String(Date.now()), from: currentUser.id, text: `📎 ${file.name}`, time: now, read: true }],
    }));
    e.target.value = '';
  }} />
  ```

- [ ] **Call buttons**: add `const [callType, setCallType] = useState<'phone' | 'video' | null>(null);`. Wire the Phone and Video buttons in the chat header to set `callType` and `setShowCallBanner(true)`. Update the call banner to display call type:
  ```tsx
  "Calling {activeMember.name} via {callType === 'video' ? 'Video' : 'Phone'}..."
  ```
  Hang-up button sets `setShowCallBanner(false); setCallType(null);`.

- [ ] Add `useMembersContext` import and use `members` / `getMemberColor` for the new convo picker.

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors.

- [ ] Commit:
  ```bash
  git add src/pages/MessagesPage.tsx
  git commit -m "feat: MessagesPage — useLocation pre-select, new convo, file attach, call type"
  ```

---

### Task 20: Add export to `ReportsPage`

**Files:**
- Modify: `src/pages/ReportsPage.tsx`

- [ ] Add imports:
  ```ts
  import { useProjects } from '../context/ProjectContext';
  import { downloadCsv } from '../utils/exportCsv';
  ```

- [ ] Inside the component (convert from arrow function component to regular function if needed to use hooks), add:
  ```ts
  const { projects, allTasks } = useProjects();

  const handleExport = () => {
    const header = ['Project', 'Total Tasks', 'Completed', 'In Progress', 'To Do', 'Completion Rate'];
    const rows = projects.map(p => {
      const tasks = allTasks.filter(t => t.projectId === p.id);
      const total = tasks.length;
      const done = tasks.filter(t => t.status === 'done').length;
      const inProg = tasks.filter(t => t.status === 'in-progress').length;
      const todo = tasks.filter(t => t.status === 'todo').length;
      const rate = total > 0 ? `${Math.round((done / total) * 100)}%` : '0%';
      return [p.name, String(total), String(done), String(inProg), String(todo), rate];
    });
    downloadCsv('reports.csv', [header, ...rows]);
  };
  ```

- [ ] Wire the Download button: `onClick={handleExport}`.

- [ ] Remove the module-level static `allTasks` / `taskProjects` variables (now from context).

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors.

- [ ] Commit:
  ```bash
  git add src/pages/ReportsPage.tsx
  git commit -m "feat: ReportsPage — wire export button with real context data"
  ```

---

### Task 21: Add export to `AttendancePage`

**Files:**
- Modify: `src/pages/AttendancePage.tsx`

- [ ] Add imports:
  ```ts
  import { useMembersContext } from '../context/MembersContext';
  import { downloadCsv } from '../utils/exportCsv';
  ```

- [ ] Inside the component, add:
  ```ts
  const { members } = useMembersContext();

  const handleExport = () => {
    const header = ['Member', 'Date', 'Status'];
    const rows = attendanceRecords.map(r => {
      const memberName = members.find(m => m.id === r.userId)?.name ?? r.userId;
      return [memberName, r.date, r.status];
    });
    downloadCsv('attendance.csv', [header, ...rows]);
  };
  ```

- [ ] Wire the Download button: `onClick={handleExport}`.

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors.

- [ ] Commit:
  ```bash
  git add src/pages/AttendancePage.tsx
  git commit -m "feat: AttendancePage — wire export button"
  ```

---

### Task 22: Update `OrganizationPage` — deptRoster to state, add dept modal, add member

**Files:**
- Modify: `src/pages/OrganizationPage.tsx`

- [ ] Add imports:
  ```ts
  import React, { useState } from 'react';
  import { X, Plus } from 'lucide-react';
  import { AnimatePresence } from 'framer-motion';
  import { useMembersContext } from '../context/MembersContext';
  import { PROJECT_COLORS } from '../data/mockData';
  ```

- [ ] Define the local `DeptEntry` interface at the top of the file (inside module scope, above the component):
  ```ts
  interface DeptEntry {
    name: string;
    icon: React.ElementType;
    color: string;
    memberIds: string[];
  }
  ```

- [ ] Migrate the module-level `deptRoster` constant to component state, converting `member` string → `memberIds` array (use member id lookup):
  ```ts
  const [deptRoster, setDeptRoster] = useState<DeptEntry[]>([
    { icon: FolderKanban, name: 'Project Management', color: '#5030E5', memberIds: ['u1'] },
    { icon: Code2,        name: 'Frontend',            color: '#30C5E5', memberIds: ['u2'] },
    { icon: Palette,      name: 'Design',               color: '#FFA500', memberIds: ['u3'] },
    { icon: Settings2,    name: 'Backend',              color: '#68B266', memberIds: ['u4'] },
    { icon: SearchCode,   name: 'QA',                   color: '#D8727D', memberIds: ['u5'] },
  ]);
  ```

- [ ] Add modal state:
  ```ts
  const [showAddDept, setShowAddDept] = useState(false);
  const [addMemberToDept, setAddMemberToDept] = useState<number | null>(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptIcon, setNewDeptIcon] = useState<React.ElementType>(FolderKanban);
  const [newDeptColor, setNewDeptColor] = useState(PROJECT_COLORS[0]);
  ```

- [ ] Convert `OrganizationPage` from an arrow function expression (`const OrganizationPage: React.FC = () => (...)`) to a function body (`const OrganizationPage: React.FC = () => { ... return (...); }`) so hooks can be used.

- [ ] Wire "Add Member" button in PageHeader to `setShowAddDept(true)`.

- [ ] In the dept roster rendering, update to use `memberIds` (look up member objects from `useMembersContext().members`). Add a `+` button to each dept card that sets `setAddMemberToDept(deptIndex)`.

- [ ] **Add Dept modal** (inline in JSX):
  ```tsx
  <AnimatePresence>
    {showAddDept && (
      <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" ...>
        <motion.div className="bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden" ...>
          {/* Name input */}
          {/* Icon picker: 5 radio buttons */}
          {/* Color swatches: PROJECT_COLORS */}
          {/* Submit: appends to deptRoster */}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
  ```

- [ ] **Add Member to Dept overlay** (inline):
  ```tsx
  <AnimatePresence>
    {addMemberToDept !== null && (
      <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" ...>
        {/* List members not already in dept */}
        {/* On select: setDeptRoster(prev => prev.map((d, i) => i === addMemberToDept ? { ...d, memberIds: [...d.memberIds, memberId] } : d)); setAddMemberToDept(null); */}
      </motion.div>
    )}
  </AnimatePresence>
  ```

- [ ] Run `npx tsc --noEmit 2>&1 | head -30` — expect no errors.

- [ ] Commit:
  ```bash
  git add src/pages/OrganizationPage.tsx
  git commit -m "feat: OrganizationPage — dept state, add dept modal, add member to dept"
  ```

---

### Task 23: Final wiring check and build

- [ ] Run full TypeScript check:
  ```bash
  cd /Users/kkwenuja/Desktop/ProjectX && npx tsc --noEmit 2>&1
  ```
  Expected: 0 errors.

- [ ] Run dev server and manually verify each feature works:
  ```bash
  npm run dev
  ```
  Checklist:
  - [ ] Kanban: click card → detail panel opens
  - [ ] Kanban: drag card to another column → moves
  - [ ] Kanban: `+` button on any column → TaskFormModal opens, submit → card appears
  - [ ] Kanban: `⋯` menu → Edit / Move to / Delete all work
  - [ ] ProjectHeader: Filter → filter bar toggles; Today → highlights cards
  - [ ] ProjectHeader: Share → toast appears
  - [ ] ProjectHeader: Grid/List → list navigates to /tasks
  - [ ] ProjectHeader: Invite → modal opens, submit → member appears
  - [ ] ProjectHeader: pencil → inline edit works
  - [ ] Tasks: row click → panel; status change; Export → downloads CSV
  - [ ] Tasks: New Task → TaskFormModal → appears in table
  - [ ] Tasks: delete from panel → row removed
  - [ ] Members: card click → profile panel; Invite; Remove (with confirm); Export
  - [ ] Members: Send Message → navigates to Messages with that member selected
  - [ ] Teams: New Team → modal; card click → panel; Go to Board → switches project
  - [ ] Messages: `+` → new convo picker; paperclip → file name appears in chat; call buttons → banner
  - [ ] Reports: Export → downloads CSV
  - [ ] Attendance: Export → downloads CSV
  - [ ] Organization: Add Member button → dept modal; `+` on dept card → member picker

- [ ] Fix any remaining issues found during manual test.

- [ ] Final commit:
  ```bash
  git add -A
  git commit -m "feat: complete full interactivity — all pages wired"
  ```
