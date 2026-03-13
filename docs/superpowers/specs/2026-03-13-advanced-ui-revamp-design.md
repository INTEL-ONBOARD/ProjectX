# Advanced UI Revamp — All Pages Design Spec

## Goal

Replace the current stretched, sparse page layouts with advanced desktop-grade UIs. Every page gets a fixed-width constrained content area (`max-w-[860px] mx-auto`), a 4-metric strip at the top, a two-column body (main content + right side-panel stack), rich data tables with avatars/badges/progress bars, and a donut/breakdown panel on the right. Sidebar and Header remain unchanged.

## Constraints

- **No new npm dependencies** — Framer Motion, Lucide React, Tailwind CSS only
- **No interactive state** — all pages are purely presentational (read-only mock data)
- **Sidebar/Header unchanged** — only content area (`flex-1 overflow-y-auto`) is modified
- **Fixed-width, not stretched** — all page content wrapped in `max-w-[860px] mx-auto` container
- **Existing imports reused** — `PageHeader`, `Avatar`, `AvatarGroup` from existing components. `MetricCard` is NOT used for the 4-metric strip — the strip uses custom `motion.div` cards (gradient accent + white) to support progress bars and trend indicators beyond MetricCard's props.
- **Animation system preserved** — `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`, stagger `delay: index * 0.05–0.08`, `duration: 0.35`, `ease: [0.4, 0, 0.2, 1]`

---

## Design System

### Layout Shell (every page)

```tsx
<motion.div className="flex-1 overflow-y-auto px-8 pb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.1 }}>
  <div className="max-w-[860px] mx-auto">
    {/* PageHeader */}
    {/* 4-metric strip */}
    {/* Two-column body */}
  </div>
</motion.div>
```

### PageHeader (every page)

Already uses the existing `PageHeader` component. Add a `eyebrow` prop breadcrumb:

```tsx
<PageHeader
  eyebrow="Home / PageName"
  title="Page Title"
  description="N items · context"
  actions={<>
    <motion.button className="btn-outline">Secondary</motion.button>
    <motion.button className="btn-primary">+ Primary Action</motion.button>
  </>}
/>
```

Button styles:
- Primary: `bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600`
- Outline: `bg-white border border-surface-200 text-gray-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-surface-100`

### 4-Metric Strip (every page)

```tsx
<div className="grid grid-cols-4 gap-4 mt-6 mb-5">
  {/* First card: gradient accent */}
  <motion.div className="rounded-xl p-4 bg-gradient-to-br from-primary-500 to-primary-400 text-white shadow-card">
    <div className="flex justify-between items-start mb-3">
      <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center"><Icon size={16} /></div>
      <span className="text-xs font-semibold text-white/70">↑ trend</span>
    </div>
    <div className="text-3xl font-extrabold tracking-tight">N</div>
    <div className="text-xs text-white/70 mt-1">Label</div>
    <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
      <div className="h-full bg-white/60 rounded-full" style={{ width: '100%' }} />
    </div>
  </motion.div>
  {/* Remaining 3: white cards */}
  <motion.div className="rounded-xl p-4 bg-white border border-surface-200 shadow-card">
    <div className="flex justify-between items-start mb-3">
      <div className="w-8 h-8 rounded-lg bg-[COLOR/15] flex items-center justify-center text-[COLOR]"><Icon size={16} /></div>
      <span className="text-xs font-semibold text-[COLOR]">↑/↓ trend</span>
    </div>
    <div className="text-3xl font-extrabold tracking-tight text-[COLOR]">N</div>
    <div className="text-xs text-gray-400 mt-1">Label</div>
    <div className="mt-3 h-1 bg-surface-200 rounded-full overflow-hidden">
      <div className="h-full bg-[COLOR] rounded-full" style={{ width: 'X%' }} />
    </div>
  </motion.div>
</div>
```

### Two-Column Body

```tsx
<div className="grid grid-cols-[1fr_280px] gap-4">
  {/* Main content card */}
  {/* Side panel stack */}
</div>
```

### White Card

```tsx
<div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden">
  <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
    <h2 className="font-bold text-gray-900 text-sm">Title</h2>
    <span className="text-xs text-primary-500 font-semibold cursor-pointer">Action →</span>
  </div>
  {/* content */}
</div>
```

### Tabs (used on Tasks, Teams, Reports)

```tsx
<div className="flex gap-1 bg-surface-100 rounded-lg p-1 mb-4">
  {['All (7)', 'To Do', 'In Progress', 'Done'].map((t, i) => (
    <div key={i} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${i === 0 ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}>{t}</div>
  ))}
</div>
```

### Rich Table

```tsx
<table className="w-full">
  <thead>
    <tr className="border-b border-surface-100">
      {['Col1','Col2'].map(h => (
        <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50">{h}</th>
      ))}
    </tr>
  </thead>
  <tbody>
    <motion.tr className="border-b border-surface-100 hover:bg-surface-50 transition-colors" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ... }}>
      <td className="px-5 py-3">...</td>
    </motion.tr>
  </tbody>
</table>
```

### Donut Chart (CSS conic-gradient, no Recharts)

```tsx
<div className="flex items-center gap-4">
  <div className="w-14 h-14 rounded-full shrink-0" style={{ background: 'conic-gradient(#5030E5 0% 43%, #FFA500 43% 71%, #68B266 71% 100%)' }} />
  <div className="flex flex-col gap-1.5">
    {items.map(item => (
      <div key={item.label} className="flex items-center gap-2 text-xs">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
        <span className="text-gray-500 flex-1">{item.label}</span>
        <span className="font-bold text-gray-900">{item.count}</span>
      </div>
    ))}
  </div>
</div>
```

### Progress Bar (inline)

```tsx
<div className="flex items-center gap-2">
  <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
    <div className="h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
  </div>
  <span className="text-xs text-gray-400 w-8 text-right shrink-0">{count}</span>
</div>
```

### Status Dot

```tsx
<div className="flex items-center gap-1.5">
  <div className={`w-2 h-2 rounded-full ${online ? 'bg-[#68B266]' : away ? 'bg-[#FFA500]' : 'bg-gray-300'}`} />
  <span className={`text-xs font-medium ${...}`}>{label}</span>
</div>
```

---

## Hardcoded Data

### Designation map (used in Dashboard, Messages, Members, Attendance, Organization, Teams)

**IMPORTANT:** `member.designation` is NOT set on `teamMembers` entries (only `currentUser` has it). Always use `designations[member.id]` — never `member.designation`.

```ts
const designations: Record<string, string> = {
  u1: 'Project Manager', u2: 'Frontend Developer', u3: 'UI Designer',
  u4: 'Backend Developer', u5: 'QA Engineer', u6: 'DevOps Engineer',
};
```

### Location map (used in Members)

**IMPORTANT:** `member.location` is optional and only set on u1 in `teamMembers`. Always use `locations[member.id]` — never `member.location`.

```ts
const locations: Record<string, string> = {
  u1: '🏙 U.P, India', u2: '🌆 Mumbai', u3: '🌍 Remote',
  u4: '🌍 Remote', u5: '🏙 Bangalore', u6: '🌍 Remote',
};
```

### Task counts per member (used in Members)

```ts
const memberTaskCounts: Record<string, { assigned: number; total: number }> = {
  u1: { assigned: 4, total: 5 }, u2: { assigned: 3, total: 5 },
  u3: { assigned: 3, total: 5 }, u4: { assigned: 2, total: 5 },
  u5: { assigned: 2, total: 5 }, u6: { assigned: 0, total: 5 },
};
```

### Online status (used in Members)

```ts
const onlineStatus: Record<string, 'online' | 'away' | 'offline'> = {
  u1: 'online', u2: 'online', u3: 'away', u4: 'online', u5: 'online', u6: 'offline',
};
```

### Sprint metadata (used in Tasks side panel)

```ts
const sprintMeta = { start: 'Dec 1, 2020', end: 'Dec 31, 2020', velocity: '2.3 tasks/day', blockers: 2 };
```

### Due dates per task (used in Tasks table)

```ts
const dueDates: Record<string, { label: string; overdue: boolean }> = {
  t1: { label: 'Dec 22', overdue: false }, t2: { label: 'Dec 15', overdue: true },
  t3: { label: 'Dec 28', overdue: false }, t4: { label: 'Dec 18', overdue: true },
  t5: { label: 'Dec 20', overdue: false }, t6: { label: 'Done', overdue: false },
  t7: { label: 'Done', overdue: false },
};
```

### Project assignment per task (used in Tasks table)

```ts
const taskProjects: Record<string, string> = {
  t1: 'p2', t2: 'p4', t3: 'p4', t4: 'p1', t5: 'p3', t6: 'p1', t7: 'p3',
};
```

### Teams member map (used in Teams)

**IMPORTANT:** Store member IDs (not names) so `AvatarGroup` colors can be resolved via the `findIndex` pattern. Resolve display names as `teamMembers.find(m => m.id === id)?.name ?? 'Unknown'`.

```ts
const teamMembersMap: Record<string, string[]> = {
  p1: ['u1', 'u2', 'u3'],
  p2: ['u4', 'u5'],
  p3: ['u1', 'u6', 'u3'],
  p4: ['u2', 'u4', 'u5', 'u6'],
};
const taskCounts: Record<string, number> = { p1: 7, p2: 5, p3: 3, p4: 4 };
const completedCounts: Record<string, number> = { p1: 2, p2: 1, p3: 1, p4: 0 };
```

Color resolution for TeamsPage `AvatarGroup`:
```ts
const ids = teamMembersMap[project.id] ?? [];
const names = ids.map(id => teamMembers.find(m => m.id === id)?.name ?? 'Unknown');
const colors = ids.map(id => memberColors[teamMembers.findIndex(m => m.id === id)] ?? memberColors[0]);
```

### Attendance data (used in Attendance)

```ts
const attendanceData: Record<string, boolean[]> = {
  u1: [true, true, true, true, true],   // 100%
  u2: [true, true, false, true, true],  // 80%
  u3: [true, true, true, true, false],  // 80%
  u4: [true, false, true, true, true],  // 80%
  u5: [true, true, true, false, true],  // 80%
  u6: [false, true, true, true, true],  // 80%
};
```

### Messages last messages (used in Messages)

```ts
const lastMessages: Record<string, { text: string; time: string; unread: number }> = {
  u2: { text: 'Can you review the PR?', time: '2m', unread: 2 },
  u3: { text: 'The design looks great!', time: '1h', unread: 0 },
  u4: { text: 'Meeting at 3pm?', time: '3h', unread: 1 },
  u5: { text: 'Pushed the latest build', time: 'Yesterday', unread: 0 },
  u6: { text: 'Check the new wireframes', time: 'Mon', unread: 0 },
};
```

### Mock chat messages (used in Messages right panel — first conversation u2)

```ts
const mockChat = [
  { from: 'u2', text: 'Hey, can you review the PR I just pushed?', time: '10:32 AM' },
  { from: 'u1', text: 'Sure! Give me 10 minutes.', time: '10:35 AM' },
  { from: 'u2', text: 'No rush, just the auth middleware changes.', time: '10:36 AM' },
  { from: 'u1', text: 'Looks good overall. Left one comment on line 42.', time: '10:48 AM' },
  { from: 'u2', text: 'Can you review the PR?', time: '10:50 AM' },
];
```

---

## Page Specs

### 1. DashboardPage

**File:** `src/pages/DashboardPage.tsx`

**Metrics (4):**
| Card | Value | Color | Trend |
|------|-------|-------|-------|
| Team Members (accent) | `teamMembers.length` (6) | gradient primary | "Active this sprint" |
| Tasks Completed | `doneTasks.length` (2) | `#68B266` | "↑ 1 today" |
| Tasks Pending | `todoTasks.length` (3) | `#D8727D` | "2 overdue" |
| Attendance Rate | "88%" | `#30C5E5` | "Weekly avg" |

**Two-column body:**
- **Main (left):** White card "Recent Activity" — 5 animated rows. Each row: colored icon wrapper (8px border-radius bg) + activity text + relative time. Icons: `CheckCircle` (green bg), `Plus` (primary bg), `Users` (cyan bg), `MessageSquare` (gray bg), `Clock` (orange bg).
- **Side panel stack (right):**
  1. "Sprint Overview" card: progress bar (29% complete), 3 stat rows (Total tasks / Done / Remaining)
  2. "Task Status" card: donut chart using `todoTasks`, `inProgressTasks`, `doneTasks` counts — colors primary/orange/green
  3. "Team" card: stacked avatar rows showing all 6 members. Per row: `Avatar` + name + `designations[member.id]` (use the `designations` map, NOT `member.designation`) + online dot (use `onlineStatus[member.id]`, defaulting to `'online'`). Declare both `designations` and `onlineStatus` maps at top of the component.

### 2. TasksPage

**File:** `src/pages/TasksPage.tsx`

**Metrics (4):**
| Card | Value | Color | Trend |
|------|-------|-------|-------|
| Total Tasks (accent) | `allTasks.length` (7) | gradient primary | "↑ 2 this week" |
| In Progress | `inProgressTasks.length` (2) | `#FFA500` | "Active now" |
| Completed | `doneTasks.length` (2) | `#68B266` | "↑ 1 today" |
| Pending | `todoTasks.length` (3) | `#D8727D` | "2 overdue" |

**Two-column body:**
- **Main (left):** White card "All Tasks" with tab row (All / To Do / In Progress / Done, static, first tab highlighted). Rich table columns: Task (title + "N comments · N files" subtitle), Project (colored dot + name), Priority badge, Assignees (`AvatarGroup`), Due date (red if overdue), Status badge. Data: `[...todoTasks, ...inProgressTasks, ...doneTasks]`. Colors resolved via `taskProjects` and `dueDates` maps.
- **Side panel stack (right):**
  1. "Sprint Summary" card: sprint progress bar (29%), 4 stat rows (Start / End / Velocity / Blockers)
  2. "Priority Breakdown" card: donut (High=3/Low=2/Done=2) + legend
  3. "Top Assignees" card: 3 rows — Avatar + name + inline progress bar + task count

### 3. MessagesPage

**File:** `src/pages/MessagesPage.tsx`

**Layout exception:** This page does NOT use the two-column body or metric strip. It uses a full-height two-panel chat layout.

**Structure:**
```
<div className="flex-1 overflow-y-auto px-8 pb-8">
  <div className="max-w-[860px] mx-auto">
    <PageHeader ... />
    <div className="mt-6 bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
      {/* Left panel w-72 */}
      {/* Right panel flex-1 */}
    </div>
  </div>
</div>
```

**Left panel (w-72):**
- Search input (read-only)
- Unread count badge above list: "3 unread"
- Conversation rows: Avatar (color from `memberColors[teamMembers.findIndex(m => m.id === member.id)]`) + name + `designations[member.id]` subtitle (use the `designations` map, NOT `member.designation`) + last message preview + time + unread pill (if `unread > 0`, show primary-500 circle with count). First row (u2) highlighted with `bg-primary-50`.

**Right panel (flex-1):**
- Top bar: Avatar + name + `designations['u2']` (= "Frontend Developer") + "Online" dot
- Chat message area: 5 hardcoded `mockChat` messages. Own messages (u1) right-aligned `bg-primary-500 text-white rounded-2xl rounded-br-sm`. Others left-aligned `bg-surface-100 text-gray-800 rounded-2xl rounded-bl-sm`. Timestamp below each bubble.
- Bottom: read-only input bar "Type a message..." + send icon button

### 4. MembersPage

**File:** `src/pages/MembersPage.tsx`

**Metrics (4):**
| Card | Value | Color | Trend |
|------|-------|-------|-------|
| Total Members (accent) | 6 | gradient primary | "↑ 1 new" |
| Admins | 1 | `#5030E5` | bar 17% |
| Managers | 1 | `#D97706` | bar 17% |
| Active Members | 5 | `#68B266` | "5 online" |

**Two-column body:**
- **Main (left):** White card "Team Directory". Rich table columns: Member (Avatar lg sized `size="lg"` + name bold + `designations[member.id]` subtitle — use `designations` map, NOT `member.designation`), Role badge, Location (`locations[member.id]` — use the `locations` map below, NOT `member.location` which is unset for u2–u6), Workload (progress bar `assigned/total * 100%` + "N/5" label), Tasks (`memberTaskCounts[member.id].assigned`), Status (dot + label from `onlineStatus[member.id]`). All 6 members.
- **Side panel stack (right):**
  1. "Role Distribution" donut (Admin/Manager/Member)
  2. "Location Split" card: 3 stat rows with emoji + city + bar + count
  3. "Availability" card: 3 stat rows (Online/Away/Offline) with colored dots + counts

### 5. TeamsPage

**File:** `src/pages/TeamsPage.tsx`

**Metrics (4):**
| Card | Value | Color | Trend |
|------|-------|-------|-------|
| Total Projects (accent) | 4 | gradient primary | "Active" |
| Total Tasks | 19 (sum taskCounts) | `#5030E5` | bar 100% |
| Completed | 4 (sum completedCounts) | `#68B266` | "↑ 1 today" |
| Completion Rate | "21%" | `#FFA500` | bar 21% |

**Two-column body:**
- **Main (left):** White card "All Projects" with tab row (All / Active / Completed). Rich table columns: Project (color dot + name bold), Members (`AvatarGroup`), Tasks (count pill), Completed (count), Progress (inline bar showing `completed/total * 100%`), Status badge ("Active" / "On Hold"). All 4 projects.
- **Side panel stack (right):**
  1. "Project Breakdown" donut — tasks per project (p1=7/p2=5/p3=3/p4=4), colors from `project.color`
  2. "Member Load" card: each unique member name + bar showing how many projects they appear in (max 4)

### 6. AttendancePage

**File:** `src/pages/AttendancePage.tsx`

**Metrics (4):**
| Card | Value | Color | Trend |
|------|-------|-------|-------|
| Team Avg Rate (accent) | "88%" | gradient primary | "This week" |
| Perfect Attendance | 1 | `#68B266` | "100% rate" |
| One Absence | 5 | `#D58D49` | "80% rate" |
| Days Tracked | 5 | `#30C5E5` | "Mon–Fri" |

**Two-column body:**
- **Main (left):** White card "Weekly Attendance". Rich table columns: Member (Avatar + name), Role (`designations[member.id]` — use `designations` map, NOT `member.designation`), Mon/Tue/Wed/Thu/Fri (green dot `w-2.5 h-2.5 bg-[#68B266]` or red dot `bg-[#D8727D]`), Rate badge (green=100%, orange=80%).
- **Side panel stack (right):**
  1. "Attendance Summary" card: 3 stat rows — Present days total / Absent days total / Perfect attendance streak
  2. "Daily Breakdown" card: 5 rows (Mon–Fri) each showing how many of 6 were present. Bar: `present/6 * 100%`. Color green if 6/6, orange if < 6.

### 7. ReportsPage

**File:** `src/pages/ReportsPage.tsx`

**Metrics (4):**
| Card | Value | Color | Trend |
|------|-------|-------|-------|
| Completion Rate (accent) | "29%" | gradient primary | "↓ vs last sprint" |
| Total Tasks | 7 | `#5030E5` | bar 100% |
| Active Members | 6 | `#68B266` | "Contributing" |
| Overdue | 2 | `#D8727D` | "Need attention" |

**Two-column body:**
- **Main (left):** White card "Task Breakdown" — animated horizontal bar chart (existing style but improved). Each bar row: label (w-28) + animated fill bar + count. Three bars: To Do (primary), In Progress (orange), Done (green). Below bars: "By Project" section with 4 rows, each showing project color dot + name + count + bar.
- **Side panel stack (right):**
  1. "Priority Breakdown" donut (High/Low/Done)
  2. "Team Velocity" card: 3 stat rows — Tasks/day / Sprint days left / Projected completion

### 8. OrganizationPage

**File:** `src/pages/OrganizationPage.tsx`

**Metrics (4):**
| Card | Value | Color | Trend |
|------|-------|-------|-------|
| Total Members (accent) | 6 | gradient primary | "In org" |
| Departments | 5 | `#5030E5` | "Roles" |
| Locations | 3 | `#30C5E5` | "Cities" |
| Avg Workload | "2.3" | `#FFA500` | "tasks/member" |

**Two-column body:**
- **Main (left):** White card "Org Chart". Same structure as existing (root node centered, connector line, subordinate row) but upgraded visually:
  - Root node: `bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200 rounded-2xl p-5` — Avatar xl + name + designation + "Admin" pill
  - Connector: `w-px h-10 bg-surface-300 mx-auto`
  - Horizontal line across subordinates: `h-px bg-surface-300 relative`
  - Subordinate nodes: white card `border border-surface-200 rounded-xl p-4 text-center w-40 hover:shadow-card-hover` — Avatar lg + name + `designations[member.id]` (use `designations` map, NOT `member.designation`) + role badge
- **Side panel stack (right):**
  1. "Department Roster" card: 5 rows (one per designation/role) — icon + role name + member name
  2. "Reporting Lines" card: static text showing "Anima Agrawal → All Members" with arrows

### 9. SettingsPage

**File:** `src/pages/SettingsPage.tsx`

**Layout exception:** No metric strip. Three stacked white cards fill the constrained container.

**Structure:**
```
<div className="max-w-[860px] mx-auto">
  <PageHeader ... />
  <div className="mt-6 grid grid-cols-[1fr_280px] gap-4">
    <div className="flex flex-col gap-4">
      {/* Profile card */}
      {/* Notifications card */}
    </div>
    <div className="flex flex-col gap-4">
      {/* Appearance card */}
      {/* Account card */}
    </div>
  </div>
</div>
```

**Profile card (left):**
- Header with `Avatar xl` of currentUser + name + role badge inline
- 3 read-only rows: Name / Location / Role — with edit icon placeholder on right
- "Joined" row: "December 2020"

**Notifications card (left):**
- 3 toggle rows (existing Toggle sub-component): Task updates (on) / Team mentions (on) / Weekly digest (off)
- Each row: label + sublabel + Toggle

**Appearance card (right):**
- Theme row: "Light" badge
- Language row: "English" badge
- Timezone row: "IST +5:30" badge

**Account card (right):**
- "Plan" row: "Free" badge + "Upgrade" link in primary-500
- "Storage" row: inline progress bar showing "2.3 GB / 5 GB" (46% full)
- "Last login" row: "Today, 9:41 AM"

---

## Color Reference

| Use | Value |
|-----|-------|
| Primary gradient (accent cards) | `from-primary-500 to-primary-400` |
| Priority high | `#D8727D` bg `#D8727D18` |
| Priority low | `#D58D49` bg `#DFA87418` |
| Priority done | `#68B266` bg `#83C29D33` |
| Status todo | `bg-primary-50 text-primary-600` |
| Status in-progress | `bg-[#FFA50020] text-[#FFA500]` |
| Status done | `bg-[#83C29D33] text-[#68B266]` |
| Role admin | `bg-primary-50 text-primary-600` |
| Role manager | `bg-[#FFFBEB] text-[#D97706]` |
| Role member | `bg-surface-200 text-gray-500` |
| Online | `#68B266` |
| Away | `#FFA500` |
| Offline | `#D1D5DB` (gray-300) |

## Member color resolution

Always resolve per-member colors by `findIndex`, never by filtered array position:

```ts
const color = memberColors[teamMembers.findIndex(m => m.id === member.id)] ?? memberColors[0];
```

## Animation pattern

```ts
// Page wrapper
initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.1 }}

// Metric cards (staggered)
initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.35, delay: index * 0.08, ease: [0.4, 0, 0.2, 1] }}

// Table rows (staggered)
initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.35, delay: index * 0.05, ease: [0.4, 0, 0.2, 1] }}

// Side panel cards (staggered)
initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
transition={{ duration: 0.35, delay: index * 0.08, ease: [0.4, 0, 0.2, 1] }}
```
