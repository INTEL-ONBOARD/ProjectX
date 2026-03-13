# UI Revamp — All Pages Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish all 9 non-Home pages of ProjectX so they match the visual quality of the Home (Kanban) page — better hierarchy, larger text, color accents, distinct page identities — with no new dependencies.

**Architecture:** Pure visual/styling changes only. Each task targets one file at a time. The MetricCard component is upgraded first (affects all pages), then each page is improved independently. No routing, state, or data changes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 3, Framer Motion, Lucide React, Recharts. Run with `npm run dev` (Vite dev server).

---

## Chunk 1: Global Component Upgrade

### Task 1: Upgrade MetricCard component

**Files:**
- Modify: `src/components/ui/MetricCard.tsx`

- [ ] **Step 1: Open and read the current file**

```bash
cat src/components/ui/MetricCard.tsx
```

Expected: shows `h-9 w-9` icon container, `text-[11px]` hint, `px-4 py-3` outer card.

- [ ] **Step 2: Apply the three upgrades**

Edit `src/components/ui/MetricCard.tsx`:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  iconClassName: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, hint, icon: Icon, iconClassName }) => (
  <motion.div
    className="rounded-xl border border-surface-200 bg-white px-4 py-4 shadow-card"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-gray-400">{hint}</p>}
      </div>
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
        <Icon size={18} />
      </div>
    </div>
  </motion.div>
);

export default MetricCard;
```

Changes: `py-3` → `py-4`, `h-9 w-9` → `h-10 w-10`, `size={17}` → `size={18}`, `text-[11px]` → `text-xs`.

- [ ] **Step 3: Verify visually**

```bash
npm run dev
```

Navigate to any page with metric cards (e.g. `/dashboard`). Confirm icon boxes are slightly larger and hint text is readable.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/MetricCard.tsx
git commit -m "style: upgrade MetricCard icon size and hint text to text-xs"
```

---

## Chunk 2: Dashboard & Messages Pages

### Task 2: Polish DashboardPage

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

- [ ] **Step 1: Add Legend to Attendance Trend chart**

In `DashboardPage.tsx`, find the `LineChart` for attendance (around line 136 in the current source — it is the second chart in the bottom row). Add `<Legend />` import and component:

```tsx
// At top, add Legend to recharts import:
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
```

Inside the attendance `LineChart`, add `<Legend wrapperStyle={{ fontSize: 11 }} />` as a child of `<LineChart>`:

```tsx
<LineChart data={attendanceData}>
  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
  <Tooltip contentStyle={{ borderRadius: 10, border: 'none', fontSize: 12 }} />
  <Legend wrapperStyle={{ fontSize: 11 }} />
  <Line type="monotone" dataKey="present" stroke="#8BC34A" strokeWidth={2} dot={false} />
  <Line type="monotone" dataKey="absent" stroke="#E84C3D" strokeWidth={2} dot={false} />
</LineChart>
```

- [ ] **Step 2: Increase bottom charts row height**

Find `style={{ height: '44%' }}` on the bottom two charts container. Change to:

```tsx
style={{ height: '48%' }}
```

- [ ] **Step 3: Add timestamps to activity feed**

Replace the `activity` array and its render with timestamped items:

```tsx
const activity = [
  { text: 'Priya moved Moodboard to In Progress', time: '2m ago' },
  { text: 'Rohan approved the research outline', time: '5m ago' },
  { text: 'Thursday attendance closed at 93%', time: '1h ago' },
  { text: 'Two new comments on Mobile App Design', time: '3h ago' },
];
```

Update the render in the activity feed section:

```tsx
{activity.map((item, i) => (
  <motion.div
    key={item.text}
    className="flex items-start gap-2 rounded-lg bg-surface-100 px-3 py-2"
    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.2 + i * 0.04 }}
  >
    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-600 leading-relaxed">{item.text}</p>
    </div>
    <span className="flex-shrink-0 text-[10px] text-gray-400 mt-0.5">{item.time}</span>
  </motion.div>
))}
```

- [ ] **Step 4: Verify visually**

Run dev server and navigate to `/dashboard`. Confirm:
- Attendance trend chart shows a legend with "present" and "absent" labels
- Bottom charts row is visibly taller
- Activity items each show a time stamp on the right

- [ ] **Step 5: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "style: dashboard - add legend to attendance chart, timestamps to activity feed"
```

---

### Task 3: Polish MessagesPage

**Files:**
- Modify: `src/pages/MessagesPage.tsx`

- [ ] **Step 1: Remove standalone top header bar**

Delete the entire `{/* Header bar */}` block (the `<div className="flex flex-shrink-0 items-center justify-between rounded-2xl border border-white/70 bg-white/95 px-5 py-3 shadow-card">` and its contents).

- [ ] **Step 2: Add integrated sidebar header**

Inside the conversation sidebar `<div className="flex flex-col rounded-xl bg-white shadow-card overflow-hidden">`, add a new header block as the first child (before the search div). The existing search wrapper `<div className="p-3 flex-shrink-0 border-b border-surface-200">` must be preserved unchanged — its `border-b` provides the visual separator between the new header and the search input.

```tsx
{/* Sidebar header */}
<div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0">
  <div className="flex items-center gap-2">
    <Hash size={14} className="text-primary-400" />
    <h1 className="text-sm font-bold text-gray-900">Messages</h1>
    <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-600">
      {msgState.reduce((n, c) => n + c.unread, 0)} unread
    </span>
  </div>
  <button className="flex items-center gap-1 rounded-lg bg-primary-500 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-primary-600 transition-colors">
    <Plus size={11} />New
  </button>
</div>
```

- [ ] **Step 3: Upgrade conversation list items**

In the **conversation sidebar** `filtered.map(...)` render (not the chat panel), change avatar size and name text size. The file has three `<Avatar>` usages — the correct one is inside `filtered.map((c, i) => ...)` around line 102 in the sidebar list:

```tsx
<Avatar name={c.name} color={memberColors[i % memberColors.length]} size="md" />
```

Change name `text-xs font-semibold` → `text-sm font-semibold` (same `filtered.map` render block, not the chat header avatar at line 143):

```tsx
<p className="truncate text-sm font-semibold text-gray-900">{c.name}</p>
```

- [ ] **Step 4: Upgrade chat bubbles and input**

Change bubble padding from `px-3.5 py-2.5` → `px-4 py-3`. Add `shadow-sm` to outgoing bubbles:

```tsx
<div className={`max-w-[65%] rounded-2xl px-4 py-3 ${msg.mine ? 'bg-primary-500 text-white shadow-sm' : 'bg-surface-100 text-gray-700'}`}>
```

Change message input container from `py-2` → `py-3` and add `focus-within:shadow-md`:

```tsx
<div className="flex items-center gap-2 rounded-xl border border-surface-200 bg-surface-50 px-3 py-3 focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100 focus-within:shadow-md transition-all">
```

- [ ] **Step 5: Add date separator**

At the top of the messages list (before the first `AnimatePresence` messages render), add a static date separator:

```tsx
{/* Date separator */}
<div className="text-center py-2">
  <span className="text-[10px] text-gray-400 bg-surface-100 px-3 py-1 rounded-full">Today</span>
</div>
```

- [ ] **Step 6: Verify visually**

Navigate to `/messages`. Confirm:
- No top header bar above the split pane
- Sidebar has its own compact title/unread/new-channel header
- Conversation names are larger
- Chat bubbles are more padded
- "Today" separator appears above messages

- [ ] **Step 7: Commit**

```bash
git add src/pages/MessagesPage.tsx
git commit -m "style: messages - integrate sidebar header, upgrade bubbles and conversation list"
```

---

## Chunk 3: Tasks & Members Pages

### Task 4: Polish TasksPage

**Files:**
- Modify: `src/pages/TasksPage.tsx`

- [ ] **Step 1: Upgrade status and priority badge sizes**

Find `statusStyle` and `priorityStyle` records. Update all badge classes:

```tsx
const statusStyle: Record<string, string> = {
  'todo': 'bg-surface-100 text-gray-500',
  'in-progress': 'bg-amber-50 text-amber-600',
  'done': 'bg-emerald-50 text-emerald-600',
};
const priorityStyle: Record<string, string> = {
  'low': 'bg-blue-50 text-blue-600',
  'high': 'bg-rose-50 text-rose-600',
  'completed': 'bg-emerald-50 text-emerald-600',
};
```

In both badge renders in the `<motion.tr>`, change `px-2 py-0.5 text-[11px]` → `px-2.5 py-1 text-xs`:

```tsx
<span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[task.status] ?? 'bg-surface-100 text-gray-500'}`}>
  {task.status.replace('-', ' ')}
</span>
```

```tsx
<span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityStyle[task.priority] ?? 'bg-surface-100 text-gray-500'}`}>
  {task.priority}
</span>
```

- [ ] **Step 2: Upgrade table row height and title size**

In `<motion.tr>`, add `even:bg-surface-50/60` (note: Tailwind needs this in the className, not inside `motion.tr` props directly — use `className` prop):

```tsx
<motion.tr
  key={task.id}
  className="cursor-pointer border-b border-surface-100 hover:bg-primary-50/40 transition-colors even:bg-surface-50/60"
  ...
>
```

In the task title `<td>`, change row padding from `py-3` → `py-3.5` and title size:

```tsx
<td className="px-4 py-3.5 w-[40%]">
  <p className="text-sm font-semibold text-gray-900 truncate">{task.title}</p>
  {task.description && <p className="text-xs text-gray-400 truncate mt-0.5">{task.description}</p>}
</td>
```

Also update the other `<td>` padding cells from `py-3` → `py-3.5`:

```tsx
<td className="px-4 py-3.5">  {/* status cell */}
<td className="px-4 py-3.5">  {/* priority cell */}
<td className="px-4 py-3.5 text-right text-gray-500">{task.comments}</td>
<td className="px-4 py-3.5 text-right text-gray-500">{task.files}</td>
```

- [ ] **Step 3: Add "New Task" heading to create form**

In the AnimatePresence create form `motion.div`, add a heading as its first child:

```tsx
<motion.div
  className="flex-shrink-0 rounded-xl bg-white p-4 shadow-card"
  initial={{ opacity: 0, height: 0, y: -8 }}
  animate={{ opacity: 1, height: 'auto', y: 0 }}
  exit={{ opacity: 0, height: 0, y: -8 }}
  transition={spring}
>
  <p className="text-sm font-semibold text-gray-900 mb-3">New Task</p>
  <div className="grid grid-cols-[1fr_2fr_auto_auto_auto] gap-2 items-center">
    {/* Keep the existing 5 children unchanged: title input, description input, status select, priority select, Create button */}
    {/* These are lines 94–115 in the current source — move them inside this new wrapper div */}
    <input
      value={draft.title}
      onChange={e => setDraft(c => ({ ...c, title: e.target.value }))}
      className="rounded-lg border border-surface-300 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary-200"
      placeholder="Task title"
    />
    <input
      value={draft.description}
      onChange={e => setDraft(c => ({ ...c, description: e.target.value }))}
      className="rounded-lg border border-surface-300 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary-200"
      placeholder="Short description"
    />
    <select value={draft.status} onChange={e => setDraft(c => ({ ...c, status: e.target.value as TaskStatus }))} className="rounded-lg border border-surface-300 px-3 py-2 text-xs outline-none">
      <option value="todo">To Do</option>
      <option value="in-progress">In Progress</option>
      <option value="done">Done</option>
    </select>
    <select value={draft.priority} onChange={e => setDraft(c => ({ ...c, priority: e.target.value as Priority }))} className="rounded-lg border border-surface-300 px-3 py-2 text-xs outline-none">
      <option value="low">Low</option>
      <option value="high">High</option>
    </select>
    <button onClick={handleCreate} className="rounded-lg bg-primary-500 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600 transition-colors">Create</button>
  </div>
</motion.div>
```

- [ ] **Step 4: Verify visually**

Navigate to `/tasks`. Confirm:
- Badges are visibly larger and easier to read
- Rows alternate with subtle gray tint
- Task titles are `text-sm` (slightly larger)
- Create form shows "New Task" heading when opened

- [ ] **Step 5: Commit**

```bash
git add src/pages/TasksPage.tsx
git commit -m "style: tasks - larger badges, taller rows, zebra striping, create form heading"
```

---

### Task 5: Polish MembersPage

**Files:**
- Modify: `src/pages/MembersPage.tsx`

- [ ] **Step 1: Upgrade avatar size and add role-colored card border**

In the member card `motion.div`, change avatar size to `"lg"` and add a `border-l-4` class derived from role:

```tsx
// Helper above the component or inline:
const roleBorderColor = (role: string) => {
  if (role === 'admin') return 'border-l-primary-400';
  if (role === 'manager') return 'border-l-amber-400';
  return 'border-l-sky-400';
};
```

Apply to the card:

```tsx
<motion.div
  key={m.id}
  onClick={() => setSelectedId(m.id)}
  className={`cursor-pointer rounded-xl bg-white p-4 shadow-card border-l-4 transition-shadow ${roleBorderColor(m.role)} ${selected?.id === m.id ? 'ring-2 ring-primary-200' : 'hover:shadow-card-hover'}`}
  ...
>
  <div className="flex items-center gap-3 mb-3">
    <Avatar name={m.name} color={memberColors[idx % 6]} size="lg" />
```

- [ ] **Step 2: Upgrade role badge in card footer**

Change from `px-2 py-0.5 text-[10px]` → `px-2.5 py-1 text-xs`:

```tsx
<span className="rounded-full bg-surface-100 px-2.5 py-1 text-xs font-semibold text-gray-500 capitalize">{m.role}</span>
```

- [ ] **Step 3: Add gradient cover band to detail panel**

At the top of the detail panel `motion.div` (inside the `{selected && (...)}` block), replace the existing top with:

```tsx
<motion.div
  key={selected.id}
  className="rounded-xl bg-white shadow-card overflow-y-auto p-4"
  ...
>
  {/* Gradient cover band */}
  <div className="h-16 rounded-t-xl bg-gradient-to-r from-primary-100 to-primary-50 -mx-4 -mt-4 mb-2" />
  {/* Avatar overlapping band */}
  <div className="flex flex-col items-center text-center -mt-10 pb-4 border-b border-surface-100">
    <Avatar name={selected.name} color={memberColors[0]} size="lg" />
    <p className="mt-2 text-sm font-bold text-gray-900">{selected.name}</p>
    <p className="text-xs text-gray-500">{selected.designation ?? 'Cross-functional'}</p>
    <span className="mt-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-600 capitalize">{selected.role}</span>
  </div>
  {/* Detail fields — keep lines 132–143 from original source unchanged below this block */}
  <div className="mt-3 space-y-2 text-xs">
    <div className="flex items-center gap-2 text-gray-600"><Mail size={13} className="text-gray-400" />{selected.name.toLowerCase().replace(' ', '.')}@techcorp.com</div>
    <div className="flex items-center gap-2 text-gray-600"><MapPin size={13} className="text-gray-400" />{selected.location ?? 'Hybrid'}</div>
    <div className="flex items-center gap-2 text-gray-600"><Briefcase size={13} className="text-gray-400" />{selected.role === 'admin' ? 'Operations lead' : selected.role === 'manager' ? 'Team coordination' : 'Individual delivery'}</div>
    <div className="flex items-center gap-2 text-gray-600"><ShieldCheck size={13} className="text-gray-400" />Access: {selected.role}</div>
  </div>
  <div className="mt-4">
    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Current Focus</p>
    {/* Current Focus items — updated in Step 4 below */}
  </div>
```

- [ ] **Step 4: Upgrade "Current Focus" bullets**

Replace each focus item's plain border box with a dot-bullet style:

```tsx
{['Mobile App polish', 'Sprint docs', 'Stakeholder updates'].map(item => (
  <div key={item} className="mb-1.5 flex items-center gap-2 rounded-lg border border-surface-200 px-3 py-2">
    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
    <span className="text-xs text-gray-600">{item}</span>
  </div>
))}
```

- [ ] **Step 5: Verify visually**

Navigate to `/members`. Confirm:
- Cards have colored left border (purple for admin, amber for manager, blue for member)
- Avatars are larger
- Detail panel shows gradient header band with avatar overlapping it

- [ ] **Step 6: Commit**

```bash
git add src/pages/MembersPage.tsx
git commit -m "style: members - role-colored card borders, lg avatars, gradient detail panel header"
```

---

## Chunk 4: Teams & Attendance Pages

### Task 6: Polish TeamsPage

**Files:**
- Modify: `src/pages/TeamsPage.tsx`

- [ ] **Step 1: Add team color map**

Add this constant near the top of the component (before the return statement):

```tsx
// `border` = border-l-4 on team cards (thick left border)
// `priorityBorder` = border-l-2 on priority items in detail panel (thinner accent)
// Both use the same color but different widths — keep them separate for clarity
// `gradient` = from-* half only; `to-white` is always static on the wrapper (do NOT add to this map)
const COLOR_MAP = [
  { border: 'border-l-primary-400', text: 'text-primary-700', gradient: 'from-primary-50', priorityBorder: 'border-l-primary-400' },
  { border: 'border-l-emerald-400', text: 'text-emerald-700', gradient: 'from-emerald-50', priorityBorder: 'border-l-emerald-400' },
  { border: 'border-l-amber-400',   text: 'text-amber-700',   gradient: 'from-amber-50',   priorityBorder: 'border-l-amber-400' },
  { border: 'border-l-rose-400',    text: 'text-rose-700',    gradient: 'from-rose-50',     priorityBorder: 'border-l-rose-400' },
  { border: 'border-l-sky-400',     text: 'text-sky-700',     gradient: 'from-sky-50',      priorityBorder: 'border-l-sky-400' },
  { border: 'border-l-violet-400',  text: 'text-violet-700',  gradient: 'from-violet-50',   priorityBorder: 'border-l-violet-400' },
] as const;
```

- [ ] **Step 2: Apply color to team cards**

In `filtered.map((team, idx) => ...)`, derive colors:

```tsx
const colors = COLOR_MAP[idx % COLOR_MAP.length];
```

Apply to the card `motion.div`:

```tsx
<motion.div
  key={team.id}
  onClick={() => setSelectedId(team.id)}
  className={`cursor-pointer rounded-xl bg-white p-4 shadow-card border-l-4 ${colors.border} ${selected?.id === team.id ? 'ring-2 ring-primary-200' : 'hover:shadow-card-hover'}`}
  ...
>
  <div className="flex items-start justify-between mb-3">
    <div>
      <p className={`text-sm font-bold ${colors.text}`}>{team.name}</p>
      <p className="text-xs text-gray-500">Lead: {team.lead}</p>
    </div>
    ...delete button...
  </div>
```

- [ ] **Step 3: Upgrade capacity bar in detail panel**

Find the capacity bar in the detail panel. Change `h-1.5` to `h-2.5` and add percentage label:

```tsx
<div className="rounded-xl bg-surface-100 p-3 mb-4">
  <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
    <span>Capacity</span>
    <span className="font-semibold">{selected.memberCount}/6</span>
  </div>
  <div className="flex items-center gap-2">
    <div className="flex-1 h-2.5 rounded-full bg-white overflow-hidden">
      <motion.div
        className="h-2.5 rounded-full bg-primary-500"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min((selected.memberCount / 6) * 100, 100)}%` }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
    <span className="text-xs font-semibold text-gray-600 flex-shrink-0">
      {Math.min(Math.round((selected.memberCount / 6) * 100), 100)}%
    </span>
  </div>
</div>
```

- [ ] **Step 4: Add colored header band to detail panel**

For the detail panel, get the color of the selected team. Find the selected team's index:

```tsx
const selectedIdx = teams.findIndex(t => t.id === selected?.id);
const selectedColors = COLOR_MAP[selectedIdx % COLOR_MAP.length];
```

At the top of the detail panel `motion.div`:

```tsx
<motion.div
  key={selected.id}
  className="rounded-xl bg-white shadow-card overflow-y-auto p-4"
  ...
>
  {/* Color header band */}
  <div className={`h-14 rounded-t-xl bg-gradient-to-r ${selectedColors.gradient} to-white -mx-4 -mt-4 mb-3 flex items-end px-4 pb-2`}>
    <p className={`text-sm font-bold ${selectedColors.text}`}>{selected.name}</p>
  </div>
  <p className="text-xs text-gray-500 mb-4">Led by {selected.lead}</p>
  ...rest of panel...
```

- [ ] **Step 5: Upgrade priority items and member avatars**

Change priority items border style:

```tsx
{['Weekly delivery planning', 'Resolve review blockers', 'Maintain 90%+ attendance'].map(item => (
  <div key={item} className={`mb-1.5 flex items-center gap-2 rounded-lg border-l-2 ${selectedColors.priorityBorder} bg-surface-50 px-3 py-2`}>
    <Target size={11} className="text-primary-400 flex-shrink-0" />
    <span className="text-xs text-gray-600">{item}</span>
  </div>
))}
```

Change member avatar size from `size="sm"` to `size="md"`:

```tsx
{selected.members.map((m, i) => (
  <div key={m.id} className="flex items-center gap-2">
    <Avatar name={m.name} color={memberColors[i % 6]} size="md" />
    <span className="text-xs text-gray-700 truncate">{m.name}</span>
  </div>
))}
```

- [ ] **Step 6: Verify visually**

Navigate to `/teams`. Confirm:
- Each team card has a distinct colored left border
- Team name text is colored
- Capacity bar is thicker with % label
- Detail panel has a gradient colored header band

- [ ] **Step 7: Commit**

```bash
git add src/pages/TeamsPage.tsx
git commit -m "style: teams - per-team color identity, thicker capacity bar, gradient detail header"
```

---

### Task 7: Polish AttendancePage

**Files:**
- Modify: `src/pages/AttendancePage.tsx`

- [ ] **Step 1: Fix calendar cell sizing**

Find the calendar day button `motion.button`. Remove `aspect-square` and add `h-9 w-full`:

```tsx
<motion.button
  key={key}
  onClick={() => setSelectedDate(day)}
  className={`h-9 w-full rounded-lg border text-xs font-medium flex items-center justify-center transition-all ${
    isSelected ? 'ring-2 ring-primary-400 ring-offset-1' : ''
  } ${cfg ? `${cfg.cls}` : 'bg-surface-50 border-surface-200 text-gray-400'} ${isToday ? 'font-bold' : ''}`}
  whileHover={{ scale: 1.08 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
>
  {format(day, 'd')}
</motion.button>
```

- [ ] **Step 2: Upgrade legend**

Find the legend section at the bottom of the calendar card. Change dot size and label size:

```tsx
{Object.entries(statusCfg).map(([k, v]) => (
  <div key={k} className="flex items-center gap-1">
    <div className={`h-3 w-3 rounded-sm border ${v.cls}`} />
    <span className="text-xs text-gray-500">{v.label}</span>
  </div>
))}
```

- [ ] **Step 3: Upgrade Today card**

Add `border-2 border-primary-200` to the Today card `motion.div`, and make time values more prominent:

```tsx
<motion.div className="rounded-xl bg-white shadow-card border-2 border-primary-200 p-4 flex-shrink-0" ...>
  <p className="text-xs font-bold text-gray-900 mb-3">Today — {format(today, 'MMM d')}</p>
  <div className="space-y-1.5 text-xs">
    <div className="flex justify-between">
      <span className="text-gray-500">Check in</span>
      <span className="text-base font-bold text-gray-900">{todayRec?.checkIn ?? '—'}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-gray-500">Check out</span>
      <span className="text-base font-bold text-gray-900">{todayRec?.checkOut ?? '—'}</span>
    </div>
    <div className="flex justify-between items-center">
      <span className="text-gray-500">Status</span>
      {todayRec
        ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusCfg[todayRec.status].cls}`}>{statusCfg[todayRec.status].label}</span>
        : <span className="text-gray-400">Not started</span>}
    </div>
  </div>
</motion.div>
```

- [ ] **Step 4: Upgrade Leave request panel**

Add `bg-amber-50/40` and upgrade section heading:

```tsx
<motion.div className="rounded-xl bg-white shadow-card bg-amber-50/40 p-4 flex-shrink-0" ...>
  <div className="flex items-center gap-1.5 mb-3">
    <FileText size={13} className="text-gray-400" />
    <p className="text-sm font-semibold text-gray-900">Request Leave</p>
  </div>
  ...existing form...
```

- [ ] **Step 5: Verify visually**

Navigate to `/attendance`. Confirm:
- Calendar cells are taller (fixed height, not aspect-ratio constrained)
- Legend dots are larger; labels are `text-xs`
- Today card has a blue border and bold time values
- Leave panel has a warm amber tint

- [ ] **Step 6: Commit**

```bash
git add src/pages/AttendancePage.tsx
git commit -m "style: attendance - fix calendar cell height, larger legend, prominent today card"
```

---

## Chunk 5: Organization & Reports Pages

### Task 8: Polish OrganizationPage

**Files:**
- Modify: `src/pages/OrganizationPage.tsx`

- [ ] **Step 1: Switch to 2-column layout and restructure column 2**

Find the main content grid. Change `grid-cols-[1fr_1fr_220px]` to `grid-cols-[1fr_1fr]`:

```tsx
<div className="flex-1 min-h-0 grid grid-cols-[1fr_1fr] gap-3">
```

Column 1 stays the same (Profile + Departments stacked).

For column 2, replace the single Work Schedule `motion.div` with a flex column wrapper containing two cards:

```tsx
{/* Column 2: Work Schedule + Policy Notes */}
<div className="overflow-y-auto flex flex-col gap-3">
  {/* Work Schedule card */}
  <motion.div className="rounded-xl bg-white shadow-card p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.08 }}>
    <div className="flex items-center gap-2 mb-3">
      <Clock size={14} className="text-gray-400" />
      <p className="text-sm font-semibold text-gray-900">Work Schedule</p>
    </div>
    <div className="grid grid-cols-2 gap-2.5">
      {[
        { label: 'Work Start', key: 'workStart' as const },
        { label: 'Work End', key: 'workEnd' as const },
        { label: 'Lunch Start', key: 'lunchStart' as const },
        { label: 'Lunch End', key: 'lunchEnd' as const },
      ].map(({ label, key }) => (
        <div key={key}>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
          <input type="time" value={work[key]} onChange={e => setWork(c => ({ ...c, [key]: e.target.value }))} className={`mt-1 ${inputCls}`} />
        </div>
      ))}
    </div>
    {/* Timeline strip */}
    <div className="mt-3 mb-1">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Day Timeline</p>
      <div className="h-3 rounded-full bg-surface-100 overflow-hidden flex">
        <div className="bg-primary-200 w-[88%]" />
        <div className="bg-amber-200 w-[12%]" />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-400">Work hours</span>
        <span className="text-[10px] text-amber-500">Lunch</span>
      </div>
    </div>
    <div className="mt-2 space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Schedule Summary</p>
      <div className="rounded-xl bg-surface-100 p-3">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Work hours</span>
          <span className="font-semibold">{work.workStart} – {work.workEnd}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Lunch break</span>
          <span className="font-semibold">{work.lunchStart} – {work.lunchEnd}</span>
        </div>
      </div>
    </div>
  </motion.div>

  {/* Policy Notes card (moved from old column 3) */}
  <motion.div className="rounded-xl bg-white shadow-card p-4" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.1 }}>
    <p className="text-sm font-semibold text-gray-900 mb-3">Policy Notes</p>
    {['Attendance tracked from work start time.', 'Lunch window standardized for payroll.', 'Dept heads auto-receive leave approvals.', 'Schedule applies to all employees.'].map(item => (
      <div key={item} className="mb-2 rounded-xl bg-surface-100 px-3 py-2.5 text-xs text-gray-600 leading-relaxed">{item}</div>
    ))}
  </motion.div>
</div>
```

- [ ] **Step 2: Add department colored dots and upgrade dept labels**

Add the color palette constant at the top of the component:

```tsx
const DEPT_COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#38bdf8', '#a78bfa'];
```

In the `depts.map(d => ...)` render, add the dot before the dept name and upgrade name size:

```tsx
<motion.div key={d.id} className="flex items-center justify-between rounded-lg bg-surface-100 px-3 py-2" ...>
  <div className="flex items-center gap-2">
    <span
      className="w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: DEPT_COLORS[depts.indexOf(d) % DEPT_COLORS.length] }}
    />
    <div>
      <p className="text-sm font-semibold text-gray-900">{d.name}</p>
      <p className="text-[11px] text-gray-500">Head: {d.head}</p>
    </div>
  </div>
  <button ...><Trash2 size={12} /></button>
</motion.div>
```

- [ ] **Step 3: Add labels to dept add form**

Replace the inline input grid with labeled inputs:

```tsx
<div className="grid grid-cols-2 gap-2.5 mb-3">
  <div>
    <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 block mb-1">Dept name</label>
    <input value={draftDept.name} onChange={e => setDraftDept(c => ({ ...c, name: e.target.value }))} className={inputCls} placeholder="e.g. Engineering" />
  </div>
  <div>
    <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 block mb-1">Dept head</label>
    <input value={draftDept.head} onChange={e => setDraftDept(c => ({ ...c, head: e.target.value }))} className={inputCls} placeholder="e.g. Rohan Kumar" />
  </div>
</div>
```

- [ ] **Step 4: Verify visually**

Navigate to `/organization`. Confirm:
- Layout is 2 columns (no 3rd narrow column)
- Policy notes appear below the schedule section in column 2
- Department list items have colored dots and larger dept names
- Work schedule section has a timeline strip

- [ ] **Step 5: Commit**

```bash
git add src/pages/OrganizationPage.tsx
git commit -m "style: organization - 2-col layout, dept color dots, timeline strip, labeled form"
```

---

### Task 9: Polish ReportsPage

**Files:**
- Modify: `src/pages/ReportsPage.tsx`

- [ ] **Step 1: Add ArrowUpRight import**

At the top of the file, add `ArrowUpRight` to the lucide-react import:

```tsx
import { Download, Filter, Calendar, FileSpreadsheet, ChartColumn, ShieldCheck, ArrowUpRight } from 'lucide-react';
```

After adding `ArrowUpRight`, check if `FileSpreadsheet` and `ShieldCheck` still appear anywhere else in the file. If they are only used in the metric cards block being replaced, remove them from the import. If they appear elsewhere, leave them. Do not remove imports speculatively — read the file first.

- [ ] **Step 2: Replace metric card grid with insight chip strip**

Replace the entire `<div className="grid grid-cols-3 gap-3 flex-shrink-0">` block with:

```tsx
{/* Insight chips */}
<div className="flex items-center gap-3 flex-shrink-0">
  <div className="flex items-center gap-2 rounded-xl bg-primary-50 px-4 py-2.5">
    <ChartColumn size={14} className="text-primary-500" />
    <span className="text-xs font-semibold text-primary-700">{rows.length} rows</span>
  </div>
  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5">
    <ArrowUpRight size={14} className="text-emerald-500" />
    <span className="text-xs font-semibold text-emerald-700">↑ 12% vs last sprint</span>
  </div>
  <div className="flex items-center gap-2 rounded-xl bg-surface-100 px-4 py-2.5">
    <Download size={14} className="text-gray-500" />
    <span className="text-xs font-semibold text-gray-600">Export ready</span>
  </div>
</div>
```

- [ ] **Step 3: Replace report type select with pill-toggle tabs**

In the filter bar, replace the `<select value={reportType} ...>` element with pill tabs. Keep the `<Filter>` icon and add the tabs immediately after:

```tsx
<div className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-card">
  <Filter size={13} className="text-gray-400" />
  {/* Pill-toggle report type */}
  <div className="flex gap-1 rounded-xl bg-surface-100 p-1">
    {(['project', 'team', 'attendance'] as ReportType[]).map(type => (
      <button
        key={type}
        onClick={() => setReportType(type)}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
          reportType === type
            ? 'bg-white shadow-sm text-primary-600 font-semibold'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        {type === 'project' ? 'Project' : type === 'team' ? 'Team' : 'Attendance'}
      </button>
    ))}
  </div>
  <Calendar size={13} className="text-gray-400 ml-3" />
  <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="rounded-lg border border-surface-200 px-2 py-1.5 text-xs outline-none cursor-pointer">
    <option value="week">This Week</option>
    <option value="month">This Month</option>
    <option value="quarter">This Quarter</option>
    <option value="year">This Year</option>
  </select>
</div>
```

- [ ] **Step 4: Add color dots to table rows**

In the table body `rows.map((row, i) => ...)`, update the first `<td>` (the name cell):

```tsx
<td className="px-4 py-2.5">
  <div className="flex items-center gap-2">
    <span
      className="h-2 w-2 rounded-full flex-shrink-0"
      style={{ background: keys[0]?.fill ?? '#9ca3af' }}
    />
    <span className="font-medium text-gray-900">{row.name}</span>
  </div>
</td>
```

- [ ] **Step 5: Verify visually**

Navigate to `/reports`. Confirm:
- Three insight chips replace the old metric cards
- Report type selector shows three pill buttons (not a dropdown)
- Clicking a pill switches the report type
- Table rows have colored dots matching the primary bar color

- [ ] **Step 6: Commit**

```bash
git add src/pages/ReportsPage.tsx
git commit -m "style: reports - insight chips, pill-toggle tabs, table color dots"
```

---

## Chunk 6: Settings Page

### Task 10: Polish SettingsPage

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Add Avatar import**

Add to the import section:

```tsx
import { Avatar } from '../components/ui/Avatar';
import { memberColors } from '../data/mockData';
```

- [ ] **Step 2: Add avatar to profile card**

At the top of the Profile `motion.div` content, add an avatar section before the form fields:

```tsx
<motion.div className="rounded-xl bg-white shadow-card p-4" ...>
  <p className="text-sm font-semibold text-gray-900 mb-3">Profile</p>
  {/* Avatar */}
  <div className="flex flex-col items-center mb-4">
    <Avatar name="Anima Agrawal" color={memberColors[0]} size="lg" />
    <p className="text-[10px] text-gray-400 mt-1">Profile photo</p>
  </div>
  {/* Existing form fields — keep unchanged from current source */}
  <div className="space-y-2.5">
    {[{ label: 'Name', type: 'text', val: 'Anima Agrawal' },{ label: 'Email', type: 'email', val: 'anima@techcorp.com' },{ label: 'Designation', type: 'text', val: 'Project Manager' }].map(f => (
      <div key={f.label}>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{f.label}</label>
        <input type={f.type} defaultValue={f.val} className={`mt-1 ${inputCls}`} />
      </div>
    ))}
  </div>
</motion.div>
```

- [ ] **Step 3: Add eyebrow labels to left column card groups**

The Settings page has three columns: left (Profile, Appearance, Security), middle (Notifications, Data Management), right (Workspace). Only the **left column** gets eyebrow labels — the Notifications and Data Management cards in the middle column intentionally have no eyebrow labels (their card titles are sufficient).

In the left column scrollable `div`, add an eyebrow `<p>` above each card's `motion.div`:

```tsx
<div className="overflow-y-auto space-y-3">
  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1 px-1">Profile</p>
  <motion.div className="rounded-xl bg-white shadow-card p-4" ...>
    {/* profile card content */}
  </motion.div>

  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1 px-1">Appearance</p>
  <motion.div className="rounded-xl bg-white shadow-card p-4" ...>
    {/* appearance card content */}
  </motion.div>

  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1 px-1">Security</p>
  <motion.div className="rounded-xl bg-white shadow-card p-4" ...>
    {/* security card content */}
  </motion.div>
</div>
```

- [ ] **Step 4: Upgrade toggle rows and add descriptions**

For the Security section, change `py-2.5` to `py-3` and add descriptions:

```tsx
{([['biometric', 'Biometric Unlock', 'Use Face ID or fingerprint'], ['twoFactor', 'Two-Factor Auth', 'Require code on sign in']] as const).map(([key, label, desc]) => (
  <div key={key} className="flex items-center justify-between rounded-xl bg-surface-100 px-4 py-3">
    <div>
      <p className="text-xs font-semibold text-gray-800">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
    </div>
    <Toggle checked={security[key]} onChange={v => setSecurity(c => ({ ...c, [key]: v }))} />
  </div>
))}
```

For the Notifications section, update the map to include descriptions:

```tsx
const notifItems: [keyof typeof notifs, string, string][] = [
  ['taskReminders',       'Task Reminders',        'Get notified before deadlines'],
  ['attendanceReminders', 'Attendance Reminders',   'Daily check-in prompts'],
  ['leaveApprovals',      'Leave Approvals',        'Instant approval alerts'],
  ['mentions',            'Mentions',               'When someone tags you'],
  ['email',               'Email Notifications',    'Digest sent to your inbox'],
];

{notifItems.map(([key, label, desc]) => (
  <div key={key} className="flex items-center justify-between rounded-xl bg-surface-100 px-4 py-3">
    <div>
      <p className="text-xs font-medium text-gray-700">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
    </div>
    <Toggle checked={notifs[key]} onChange={v => setNotifs(c => ({ ...c, [key]: v }))} />
  </div>
))}
```

- [ ] **Step 5: Add status dots to workspace panel**

In the workspace panel, update each status row to include a colored dot:

```tsx
{[
  { label: 'Theme', val: theme, cls: 'text-primary-600', dot: 'bg-primary-400' },
  { label: 'Notifications', val: `${Object.values(notifs).filter(Boolean).length}/5 on`, cls: 'text-emerald-600', dot: 'bg-emerald-400' },
  { label: 'Security', val: `${Object.values(security).filter(Boolean).length}/2 active`, cls: 'text-amber-600', dot: 'bg-amber-400' },
].map(s => (
  <div key={s.label} className="flex items-center justify-between rounded-xl bg-surface-100 px-3 py-2.5">
    <span className="text-xs text-gray-600">{s.label}</span>
    <div className="flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${s.dot}`} />
      <span className={`text-xs font-semibold ${s.cls}`}>{s.val}</span>
    </div>
  </div>
))}
```

- [ ] **Step 6: Verify visually**

Navigate to `/settings`. Confirm:
- Profile card shows avatar and "Profile photo" hint
- Section eyebrows ("PROFILE", "APPEARANCE", "SECURITY") appear above each card group
- Toggle rows are taller with description lines
- Workspace panel status values have colored dots

- [ ] **Step 7: Commit**

```bash
git add src/pages/SettingsPage.tsx
git commit -m "style: settings - avatar in profile, section eyebrows, toggle descriptions, status dots"
```

---

## Final Verification

- [ ] **Run dev server and walk through every page**

```bash
npm run dev
```

Visit in order: `/dashboard`, `/messages`, `/tasks`, `/members`, `/teams`, `/attendance`, `/organization`, `/reports`, `/settings`, and `/` (Kanban home — confirm unchanged).

- [ ] **Check success criteria table**

| Page | Check |
|------|-------|
| MetricCard | Hint is `text-xs`; icon is `h-10 w-10` |
| Dashboard | Attendance chart has Legend; activity items have timestamps |
| Messages | No top header bar; sidebar has integrated header |
| Tasks | Rows `py-3.5`; badges `text-xs px-2.5 py-1`; zebra striping visible |
| Members | Cards have `border-l-4` role accent; detail panel has gradient cover band |
| Teams | Each team card has unique color; capacity bar `h-2.5` with % |
| Attendance | Calendar cells use `h-9 w-full`; legend labels are `text-xs` |
| Organization | 2-column layout; Policy Notes below Work Schedule |
| Reports | Pill-toggle tabs for report type; table rows have color dot |
| Settings | Avatar in profile card; toggle rows have description lines |

- [ ] **Final commit**

```bash
git add -A
git commit -m "style: complete UI revamp — all 9 pages polished to match Home quality"
```
