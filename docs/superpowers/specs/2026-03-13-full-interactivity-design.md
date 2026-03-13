# Full Interactivity Design — ProjectX

**Date:** 2026-03-13
**Status:** Approved
**Scope:** Make every interactive element across all pages fully functional with real state, CRUD operations, drag-and-drop, modals, exports, and navigation.

---

## 1. State Management Architecture

### Two canonical `User` types — keep them separate

`AppContext.tsx` exports its own `User` interface (with `orgId`, `deptId`, `pin`). `src/types/index.ts` exports a lighter `User` for tasks/members. **Do not merge them.** `MembersContext` uses `types/index.ts` `User`. `AppContext` keeps its own. The `Header` component already imports from `AppContext` — leave it alone.

### Ensure `AppProvider` wraps the app

`AppProvider` is **missing** from `App.tsx` — `AppContext` is used by `AttendancePage` and `Header`. Add `AppProvider` as the outermost wrapper in `App.tsx`.

Provider nesting order in `App.tsx`:
```tsx
<AppProvider>
  <MembersProvider>
    <ProjectProvider>
      <HashRouter>…</HashRouter>
      <BugReportModal />
    </ProjectProvider>
  </MembersProvider>
</AppProvider>
```

`BugReportModal` sits inside `ProjectProvider` (and therefore also `MembersProvider` and `AppProvider`). It currently only needs `ProjectContext` — the statement "has access to all three providers" means access is available if needed, not that it actively uses all three.

Also remove the duplicate `sidebarCollapsed` / `setSidebarCollapsed` local state from `Layout` in `App.tsx`. Instead consume `sidebarCollapsed` and `setSidebarCollapsed` from `useContext(AppContext)` — `AppContext` already manages this state.

### Extend `ProjectContext` (`src/context/ProjectContext.tsx`)

Add to context interface and implementation:

```ts
updateTask(id: string, changes: Partial<Omit<Task, 'id'>>): void
deleteTask(id: string): void
moveTask(id: string, newStatus: TaskStatus): void
updateProject(id: string, changes: Partial<Pick<Project, 'name' | 'color'>>): void
deleteProject(id: string): void  // orphaned tasks: set projectId to undefined
activeProject: string            // initial value: 'p1' (first seed project id)
setActiveProject(id: string): void
```

`deleteProject` must also set `projectId: undefined` on all tasks in `allTasks` whose `projectId` matches the deleted project (no orphaned references). If the deleted project was `activeProject`, reset `activeProject` to the first remaining project's id, or `''` if no projects remain.

**`Project.tasks` array:** `Project.tasks` exists on the `Project` type but is unused after the migration — all task reads go through `allTasks` filtered by `projectId`. `createTask` still appends to `Project.tasks` for the relevant project (existing behaviour). All other mutations (`updateTask`, `deleteTask`, `moveTask`, `scrubAssignee`) operate only on `allTasks`. Code reading `project.tasks` (TeamsPage completion bar, ReportsPage) must be updated to instead derive counts from `allTasks.filter(t => t.projectId === project.id)`.

**`TeamsPage` completion bar and `ReportsPage` export:** both must use `allTasks.filter(t => t.projectId === p.id)` rather than `project.tasks`.

`activeProject` and `setActiveProject` move from `Layout` local state into `ProjectContext`, so `TeamsPage` can call `setActiveProject` then `navigate('/')` to switch the board.

**Initial value:** `activeProject` is initialised to `'p1'` inside `ProjectContext` (the first seed project always exists). If all projects are deleted, `activeProject` falls back to `''` and `ProjectHeader` renders the name as `'Untitled'` and disables the pencil-edit.

**Fix `createTask` implementation:** The existing `createTask` destructures `projectId` out and does not include it in `newTask`. After adding `projectId` to the `Task` type (§12 — apply that change first), update `createTask` to include `projectId` in `newTask`:
```ts
const newTask: Task = { ...rest, projectId, id: `t${Date.now()}` };
```

### Add `MembersContext` (`src/context/MembersContext.tsx`)

```ts
members: User[]   // User from src/types/index.ts
getMemberColor(id: string): string
addMember(member: Omit<User, 'id'>): void
removeMember(id: string): void
```

- Seeded from `mockData.teamMembers`
- `getMemberColor(id)`: find the member's index in `members` array, return `memberColors[index % memberColors.length]`. For members not found (id not in list), return `memberColors[0]`
- `addMember` generates `id: 'u' + Date.now()` and appends to state
- `removeMember(id)`: removes member from state. Also calls `updateTask` (via `ProjectContext`) to scrub the removed member's id from all `task.assignees` arrays — pass a callback or use a cross-context call pattern. **Implementation note:** since `MembersContext` does not have direct access to `ProjectContext`, the simplest approach is to expose a `scrubAssignee(memberId: string)` function on `ProjectContext` and have `MembersPage` call both `removeMember` and `scrubAssignee` in sequence. This avoids circular context dependencies.

### Add `projectId` to `Task` type

In `src/types/index.ts`, add `projectId?: string` to the `Task` interface. This replaces the local `taskProjects` record in `TasksPage` and allows the export CSV and `TaskFormModal` to work correctly.

### Wire contexts end-to-end

- All status changes call `updateTask` / `moveTask` (removes local `statusOverrides` in TasksPage)
- Deletions call `deleteTask` or `deleteProject`
- Task creation calls `createTask` (already exists, now includes `projectId`)
- Project creation calls `createProject` (already exists)

---

## 2. Data Changes (`src/data/mockData.ts`)

Add `dueDate` (ISO string `YYYY-MM-DD`) and `projectId` to all seed tasks, matching the existing `dueDates` and `taskProjects` records in `TasksPage`:

```ts
{ id: 't1', ..., dueDate: '2020-12-22', projectId: 'p2' }
{ id: 't2', ..., dueDate: '2020-12-15', projectId: 'p4' }
{ id: 't3', ..., dueDate: '2020-12-28', projectId: 'p4' }
{ id: 't4', ..., dueDate: '2020-12-18', projectId: 'p1' }
{ id: 't5', ..., dueDate: '2020-12-20', projectId: 'p3' }
{ id: 't6', ..., dueDate: undefined,     projectId: 'p1' }
{ id: 't7', ..., dueDate: undefined,     projectId: 'p3' }
```

**Priority vs status:** The `priority: 'completed'` value is a legacy conflation. Keep it for now — `TaskFormModal` only offers `low` and `high` as creation priorities. When a task is moved to the `done` column via `moveTask`, its priority is **not** automatically changed (priority and status are independent). The existing seed tasks that have `priority: 'completed'` retain that value.

---

## 3. Kanban Board

### Task Detail Modal (slide-over)

- Triggered by clicking any `TaskCard` (click handler passed as prop from `KanbanBoard`)
- Right-side panel (420px), same slide-over pattern as `TasksPage`
- **View mode** shows: title, description, priority badge, status dropdown, assignees chips, due date, comments list (from a local `comments` array seeded with 2 items per task), add-comment input, image attachment upload
- **Comments storage:** Local state array per open task — `{ id, author, text, time }[]`. Not persisted to `Task` type (the `Task.comments` number field remains a count). When the panel opens, seed 2 mock comments; new comments append to local state and increment the displayed count visually
- **Image attachment:** clicking the upload area opens a file picker; the selected file is converted to an object URL (`URL.createObjectURL(file)`) and passed to `updateTask({ images: [...task.images, objectUrl] })`. Object URLs are session-only — acceptable for a mock app
- **Status dropdown** calls `moveTask` — card moves to correct column immediately
- **"Edit" button** toggles edit mode: title → `<input>`, description → `<textarea>`, priority → button group (Low/High only), assignees → checkbox list, due date → `<input type="date">` (value in `YYYY-MM-DD`). "Save" calls `updateTask`, "Cancel" reverts
- **"Delete" button** at bottom: inline confirmation ("Delete this task? Confirm / Cancel"), on confirm calls `deleteTask(id)`, closes panel

### KanbanBoard data source

- Remove static `todoTasks / inProgressTasks / doneTasks` imports
- Use `allTasks` from `useProjects()`, filtered by status for each column
- Filter logic respects active filters (see Filter Button below)

### `+` Button on every column header

- All three column headers get a `+` button
- Opens `TaskFormModal` with `defaultStatus` pre-set to that column's status
- On submit: calls `createTask`, card animates into column

### Drag and Drop

- HTML5 native drag events on `TaskCard` and `KanbanColumn`
- `TaskCard`: `draggable={true}`, `onDragStart`: `e.dataTransfer.setData('taskId', task.id)`, sets local `isDragging` state → `opacity-50`
- `KanbanColumn`: `onDragOver`: `e.preventDefault()`, sets local `isDragOver` state → dashed border highlight; `onDrop`: reads `taskId`, calls `moveTask(taskId, status)`, clears `isDragOver`
- `onDragEnd` on card clears `isDragging`

### `⋯` Menu on TaskCard hover

Dropdown positioned absolutely, three options:
- **Edit** — opens detail slide-over in edit mode
- **Move to** — shows the other two statuses as sub-items; selecting calls `moveTask`
- **Delete** — replaces menu with inline "Confirm delete? Yes / No"
- Click outside closes the menu (document `mousedown` listener, same pattern as Header)

### Invite Button (ProjectHeader)

- Opens `InviteMemberModal`
- On submit: calls `addMember` from `useMembersContext()`

### Filter Button (ProjectHeader)

- Toggles a filter bar (`AnimatePresence` slide-down, `h-auto` from `h-0`)
- Filter bar: Priority chips (All / Low / High), Assignee avatar chips (toggle), Due Date (All / Today / This Week / Overdue)
- Filter state lives in `KanbanBoard` as `{ priority, assignees, dueDateFilter }`
- `KanbanBoard` passes filtered tasks to each `KanbanColumn`
- **Mock "today" constant:** All seed task `dueDate` values are in December 2020. To make the date filters work with seed data, define a `MOCK_TODAY = '2020-12-15'` constant in `src/data/mockData.ts` and use it wherever "today" is needed in filter/highlight logic. Do NOT use `new Date()` for date comparisons in filter logic — use `MOCK_TODAY`. The `AttendancePage` and `CalendarDropdown` already default to Dec 2020; this keeps behaviour consistent.
- "Today" filter: tasks where `dueDate === MOCK_TODAY`
- "This week": tasks where `dueDate` is within Mon 2020-12-14 to Sun 2020-12-20 (computed from `MOCK_TODAY` using `getDay()` in local time)
- "Overdue": tasks where `dueDate < MOCK_TODAY` and `status !== 'done'`

### Today Button (ProjectHeader)

- Separate from the filter bar — toggles `todayMode` boolean in `KanbanBoard`
- When active: task cards whose `dueDate === MOCK_TODAY` get `border-l-4 border-primary-500`
- Button gets filled active style

### Share Button (ProjectHeader)

- `navigator.clipboard.writeText(window.location.href)`
- Shows a 2-second toast: "Link copied to clipboard!" (see Shared Components §10)

### Grid / List Toggle (ProjectHeader)

- Grid = current Kanban view (active = filled purple button)
- List = `navigate('/tasks')`
- Active state: `useState('grid')` in `ProjectHeader`

### Pencil Icon (ProjectHeader)

- Remove the `projectName` prop from `ProjectHeaderProps` — `ProjectHeader` reads the name directly from `useProjects()` as `projects.find(p => p.id === activeProject)?.name ?? 'Untitled'`. Update `App.tsx` to stop passing the `projectName` prop.
- `editingName` boolean state
- When true: `<h1>` replaced with `<input>` (same font size/weight via className)
- Enter or blur → `updateProject(activeProject, { name: value.trim() || 'Untitled' })`, exit edit mode
- Escape → exit edit mode without saving
- If `activeProject === ''` (no projects exist), hide the pencil button

---

## 4. Tasks Page

### Status changes sync to context

- Remove `statusOverrides` local state
- Status dropdown in detail panel calls `updateTask({ status: newStatus })`
- Changes reflect on Kanban board immediately (shared `allTasks` state)

### Edit Mode in Detail Panel

- "Edit" button toggles `editMode` boolean
- Title → `<input>`, description → `<textarea>`, priority → Low/High button group, assignees → checkbox list with all `members` from `useMembersContext()`, due date → `<input type="date">`
- "Save" calls `updateTask(selectedTask.id, { title, description, priority, assignees, dueDate })`
- "Cancel" reverts local edit state

### Delete Task

- "Delete task" button at bottom of detail panel (red text, light red bg)
- Inline: "Delete this task? Confirm / Cancel"
- Confirm: `deleteTask(selectedTask.id)`, `setSelectedTask(null)`

### New Task Modal (fix existing)

- Replace `emptyNew` local state with `TaskFormModal` component
- On submit: `createTask({ ...fields, status: 'todo' })`
- Assignees: multi-select checkboxes from `useMembersContext().members`
- Project: select from `useProjects().projects`
- Due date: `<input type="date">` stored as `YYYY-MM-DD`

### Export Button

CSV schema — exact columns:
```
Title,Project,Priority,Status,Assignees,Due Date
```
- Project: look up `projects.find(p => p.id === task.projectId)?.name ?? ''`
- Assignees: comma-separated names, wrapped in quotes if multiple
- Due Date: `task.dueDate ?? ''`
- Uses `downloadCsv('tasks.csv', rows)` from `src/utils/exportCsv.ts`

---

## 5. Members Page

### Invite Member Button

- Opens `InviteMemberModal`
- On submit: `addMember` from `useMembersContext()` — new card appears with entrance animation

### Member Card — Click to open profile

- Clicking the card opens a 420px slide-over panel (right side)
- Panel: avatar, full name, designation, location, role badge, status dot, task progress bar (`memberTaskCounts[id]`)
- "Send Message" button: `navigate('/messages', { state: { memberId: member.id } })`

### Messages page picks up navigation state

- `MessagesPage` reads `location.state?.memberId` on mount via `useLocation()`
- If present, sets `activeId` to that member ID
- If member has no existing chat, initialise with empty `chats[memberId] = []`
- Default (no state): current behaviour (`activeId: 'u2'`)

### `⋯` Menu on member card

- "View Profile" — opens side panel
- "Remove from team" — inline confirm → `removeMember(id)`, card animates out with `AnimatePresence`
- Cannot remove the current user (`currentUser.id`) — "Remove" option disabled/hidden for self
- `MembersPage` must import both `useMembersContext()` and `useProjects()` — `useProjects()` is needed to call `scrubAssignee` after `removeMember`

### Export Button

CSV: `Name,Email,Role,Designation,Location,Status`
Uses `downloadCsv('members.csv', rows)`

---

## 6. Teams Page

### New Team / New Project Button

- Opens `NewProjectModal`
- On submit: `createProject(name, color)`, new card animates in

**Project color palette** (used in `NewProjectModal` swatches and seed data):
`['#7AC555', '#FFA500', '#E4CCFD', '#76A5EA', '#5030E5', '#30C5E5']`
These are distinct from `memberColors` (avatar accent colors). Define this array as `PROJECT_COLORS` in `src/data/mockData.ts`.

### `activeProject` integration

- `TeamsPage` uses `setActiveProject` from `useProjects()` (moved into context per §1)
- "Go to Board" button in project detail panel: `setActiveProject(project.id)` then `navigate('/')`

### Project Card — Click

- Opens a 420px slide-over panel
- Shows: color swatch, project name (editable inline — same pencil-icon pattern as `ProjectHeader`), member avatars (from `teamMembersMap`), task count, completion bar
- "Go to Board" button (primary, bottom of panel)
- Inline name edit calls `updateProject(project.id, { name })`

### `⋯` Menu on project cards

- "Edit" — opens `NewProjectModal` pre-filled with `initial={{ name, color }}`
- "Delete" — inline confirm, calls `deleteProject(id)`. If deleted project was `activeProject`, reset `activeProject` to `projects[0]?.id ?? ''`

---

## 7. Messages Page

### New Conversation `+` Button

- Opens a member picker modal (simple overlay, no separate file): list of all `members` from `useMembersContext()` whose `id` is not already a key in `chats`
- Clicking a member: adds `chats[member.id] = []`, sets `activeId = member.id`, closes picker

### Attach File Button (paperclip icon in input row)

- `<input type="file" ref={fileRef} className="hidden">` triggered on click
- On file selected: appends a message to current chat:
  ```ts
  { id, from: currentUser.id, text: `📎 ${file.name}`, time: now, read: true }
  ```
  (File is not actually read/uploaded — just the name displayed)

### Phone / Video Call Buttons

- Both set `showCallBanner = true` and a `callType: 'phone' | 'video'` state
- Banner (already exists as `showCallBanner` pattern): "Calling [name] via [Phone/Video]..."
- Hang-up button sets `showCallBanner = false`

---

## 8. Reports Page

### Export Button

CSV schema:
```
Project,Total Tasks,Completed,In Progress,To Do,Completion Rate
```
- Computed from `allTasks` grouped by `projectId`
- Uses `downloadCsv('reports.csv', rows)`

---

## 9. Attendance Page

### Export Button

CSV schema:
```
Member,Date,Status
```
- Rows from `attendanceRecords` (from `AppContext`), look up member name from `useMembersContext().members` (not static `mockData.teamMembers`) so newly added members are included
- Uses `downloadCsv('attendance.csv', rows)`

---

## 10. Organization Page

### Add Department Button

- `deptRoster` promoted from module-level constant to `useState` in `OrganizationPage`

**Local `DeptEntry` type** (defined inside `OrganizationPage.tsx`):
```ts
interface DeptEntry {
  name: string
  icon: React.ElementType   // a Lucide icon component
  color: string
  memberIds: string[]       // user IDs; was previously embedded as roster objects
}
```
The existing `deptRoster` uses objects with `{ name, icon, color, roster: [...] }`. Migrate `roster` → `memberIds: string[]` when promoting to state.

- "Add Department" button opens a modal (inline in the component, not a separate file):
  - Department name input (required)
  - Icon picker: radio buttons showing the 5 existing Lucide icons (FolderKanban, Code2, Palette, Settings2, SearchCode)
  - Color: 6 swatches (`PROJECT_COLORS` from `mockData`)
  - On submit: appends `{ name, icon, color, memberIds: [] }` to `deptRoster` state

### `+` Button on department cards (add member)

- Opens a member picker (same inline overlay pattern)
- Lists all `members` from `useMembersContext()`
- On select: appends member id to `dept.memberIds` array in local state (immutable update via `setDeptRoster`)

---

## 11. Shared Components

### `InviteMemberModal` (`src/components/modals/InviteMemberModal.tsx`)

```tsx
interface Props {
  onClose: () => void
  onSubmit: (member: Omit<User, 'id'>) => void  // User from src/types/index.ts
}
```
Fields: Full Name (required), Email (required), Role (select: admin/manager/member), Designation
Note: no `location` or `avatar` fields in the form. `addMember` will be called with `location: undefined, avatar: undefined` — both are optional on `User` (`types/index.ts`), so newly added members will show no location in the profile panel. This is acceptable for a mock app.
Used by: `ProjectHeader` (Invite button) and `MembersPage`

### `NewProjectModal` (`src/components/modals/NewProjectModal.tsx`)

```tsx
interface Props {
  onClose: () => void
  onSubmit: (name: string, color: string) => void
  initial?: { name: string; color: string }
  editingProjectId?: string   // present when editing; caller uses this to call updateProject
}
```
Fields: Project name (required), color swatches (6 colors from `PROJECT_COLORS` — see §6, not `memberColors`)

**Edit vs create:** The modal is "dumb" — it just calls `onSubmit(name, color)`. The caller (`TeamsPage`) decides whether to call `createProject` or `updateProject(editingProjectId, { name, color })` based on whether `editingProjectId` is set. `TeamsPage` maintains `editingProject: Project | null` state. The `⋯` menu "Edit" sets `editingProject = project` and opens the modal; "New Team" sets `editingProject = null`.

Used by: `TeamsPage` "New Team" button and project card "Edit"

### `TaskFormModal` (`src/components/modals/TaskFormModal.tsx`)

```tsx
interface Props {
  onClose: () => void
  onSubmit: (task: Omit<Task, 'id'>) => void
  initial?: Partial<Task>
  defaultStatus?: TaskStatus
}
```
Fields: title (required), description, priority button group (Low / High — no "Completed"), assignees multi-select (from `useMembersContext()`), project select (from `useProjects()`), due date
**Edit mode contract:** When used to edit an existing task, the caller passes `initial` containing the task including its `id`. The modal's `onSubmit` returns `Omit<Task, 'id'>`. The caller must use `initial.id` to call `updateTask(initial.id!, fields)` — `id` is not returned from `onSubmit`. This is the caller's responsibility; the modal is unaware of create vs edit.
Used by: Kanban `+` buttons, Tasks "New Task" button, task edit mode

### Toast Notification

`src/hooks/useToast.ts`:
```ts
export function useToast(): { show: (msg: string) => void; ToastEl: React.ReactNode }
```
- State: `useState<{ msg: string; key: number } | null>(null)`. The `key` field is `Date.now()` — ensures rapid successive calls (double-click) always change the state value and re-trigger the effect even if the message text is the same
- Clearing uses `useEffect` with cleanup to avoid setting state on unmounted components:
  ```ts
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(id);
  }, [toast]);
  ```
- `show(msg)` calls `setToast({ msg, key: Date.now() })`
- `ToastEl`: absolutely positioned div at bottom-right, `z-50`, animates in/out with Framer Motion `AnimatePresence`
- Used wherever `show()` is needed — caller renders `{ToastEl}` in their JSX

### Export Utility (`src/utils/exportCsv.ts`)

```ts
export function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map(row =>
    row.map(cell => (cell.includes(',') || cell.includes('"') ? `"${cell.replace(/"/g, '""')}"` : cell)).join(',')
  ).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  // Defer revocation to allow the browser to begin the download first
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
```

---

## 12. Type Changes (`src/types/index.ts`)

Add `projectId` to `Task` and make `avatar` optional on `User`:
```ts
export interface Task {
  // ...existing fields...
  projectId?: string   // ADD: enables project lookup from any task
}

export interface User {
  // ...existing fields...
  avatar?: string   // CHANGE: was required string, now optional (InviteMemberModal has no avatar field)
}
```

Also add `scrubAssignee` to `ProjectContext` interface (see §1 MembersContext):
```ts
scrubAssignee(memberId: string): void  // removes memberId from all task.assignees arrays
```

---

## 13. File Structure Summary

**New files:**
- `src/context/MembersContext.tsx`
- `src/hooks/useToast.ts`
- `src/utils/exportCsv.ts`
- `src/components/modals/InviteMemberModal.tsx`
- `src/components/modals/NewProjectModal.tsx`
- `src/components/modals/TaskFormModal.tsx`

**Modified files:**
- `src/types/index.ts` — add `projectId?: string` to `Task`
- `src/data/mockData.ts` — add `dueDate` + `projectId` to all seed tasks
- `src/context/ProjectContext.tsx` — add `updateTask`, `deleteTask`, `moveTask`, `updateProject`, `deleteProject`, `activeProject`, `setActiveProject`, `scrubAssignee`; fix `createTask` to include `projectId`
- `src/App.tsx` — add `AppProvider` (outermost), `MembersProvider`, remove `activeProject` local state from `Layout`
- `src/components/layout/ProjectHeader.tsx` — wire all buttons (filter, today, share, grid/list, invite, pencil)
- `src/components/dashboard/KanbanBoard.tsx` — use context tasks, filter state, drag state, task detail panel
- `src/components/dashboard/KanbanColumn.tsx` — drag-over highlight, `+` on all columns
- `src/components/dashboard/TaskCard.tsx` — drag events, `⋯` menu, click handler
- `src/pages/TasksPage.tsx` — sync to context, edit/delete in panel, `TaskFormModal`, export
- `src/pages/MembersPage.tsx` — profile panel, invite, remove, export, navigate-to-messages with state
- `src/pages/TeamsPage.tsx` — project cards, side panel, `NewProjectModal`, delete
- `src/pages/MessagesPage.tsx` — `useLocation` state, new convo picker, file attach, call type
- `src/pages/ReportsPage.tsx` — export button
- `src/pages/AttendancePage.tsx` — export button
- `src/pages/OrganizationPage.tsx` — `deptRoster` to state, add dept modal, add member to dept

---

## 14. Implementation Order

1. **Types + data foundation:** `Task.projectId` in types, `dueDate`/`projectId` in mockData, `exportCsv` util, `useToast` hook
2. **Context layer:** Extend `ProjectContext` (CRUD + `activeProject`), add `MembersContext`, add `AppProvider` to `App.tsx`
3. **Shared modals:** `TaskFormModal`, `InviteMemberModal`, `NewProjectModal`
4. **Kanban board:** context-driven data, `TaskCard` drag + menu + click, `KanbanColumn` drag-over + `+` button, `KanbanBoard` detail panel + filter state, `ProjectHeader` all buttons
5. **Tasks page:** context sync, edit/delete in panel, `TaskFormModal`, export
6. **Members page:** profile panel, invite/remove, export, navigate-to-messages
7. **Teams page:** project detail panel, new/edit/delete project, `setActiveProject`
8. **Messages page:** `useLocation` state, new convo, file attach, call type
9. **Reports + Attendance + Organization:** export buttons, org modals
