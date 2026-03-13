# Page Revamp Design Spec
_Date: 2026-03-13_

## Overview

Revamp all 9 non-home pages in ProjectX to match the home page (KanbanBoard) theme. Each page is fully hand-crafted with real mock content. No shared template component — each page is a self-contained `.tsx` file in `src/pages/`.

---

## Design System (from home page)

- **Background:** `bg-surface-100` (`#F5F5F5`) with `px-8 pb-8` padding, `flex-1 overflow-y-auto`
- **Cards:** `bg-white rounded-2xl shadow-card` — shadow is `0px 2px 8px rgba(0,0,0,0.06)`
- **Primary color:** `#5030E5` — classes: `bg-primary-500`, `text-primary-600`, `bg-primary-50`
- **Status colors:** todo `#5030E5` (`text-column-todo`), in-progress `#FFA500` (`text-column-progress`), done `#8BC34A` (`text-column-done`)
- **Priority badge styles:**
  - low: `bg-[#DFA87433] text-[#D58D49]`
  - high: `bg-[#D8727D33] text-[#D8727D]`
  - completed: `bg-[#83C29D33] text-[#68B266]`
- **Typography:** Inter, `font-bold text-gray-900 text-xl` for page titles, `text-sm text-gray-400` for subtitles, `font-semibold text-gray-900 text-[15px]` for card titles, `text-xs text-gray-400` for meta text
- **Animations:** Framer Motion `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`, stagger with `delay: index * 0.08`, `duration: 0.35`, `ease: [0.4, 0, 0.2, 1]`
- **Icons:** Lucide React
- **Import path for mock data:** `../data/mockData` (one level up from `src/pages/`)
- **Existing reusable components:**
  - `../components/ui/Avatar` — `Avatar` (props: name, color, size, className), `AvatarGroup` (props: names, colors, size, max)
  - `../components/ui/MetricCard` — `MetricCard` (props: label, value, hint?, icon: LucideIcon, iconClassName)
  - `../components/ui/PageHeader` — `PageHeader` (props: title, description?, eyebrow?, actions?, meta?) — renders a white card with `shadow-card backdrop-blur-sm`, title on left, actions slot on right

**Import patterns — use exactly these:**
```ts
import PageHeader from '../components/ui/PageHeader';
import MetricCard from '../components/ui/MetricCard';       // default export
import { Avatar, AvatarGroup } from '../components/ui/Avatar'; // named exports
import { currentUser, teamMembers, memberColors, projects, todoTasks, inProgressTasks, doneTasks } from '../data/mockData';
```

---

## Shared Page Structure

Every page uses this outer shell:

```tsx
<motion.div
  className="flex-1 overflow-y-auto px-8 pb-8"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3, delay: 0.1 }}
>
  <div className="py-6">
    <PageHeader
      title="Page Title"
      description="Short subtitle"
      actions={
        <motion.button
          className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={16} />
          Action Label
        </motion.button>
      }
    />
  </div>
  {/* white rounded-2xl shadow-card cards below */}
</motion.div>
```

**Use `PageHeader` for every page header. Do not build inline headers.**

---

## Resolving Assignee IDs to Names and Colors

For any component that needs display names and per-member canonical colors from assignee ID arrays:

```tsx
import { teamMembers, memberColors } from '../data/mockData';

const names = task.assignees.map(id => teamMembers.find(m => m.id === id)?.name ?? 'Unknown');
const colors = task.assignees.map(id => memberColors[teamMembers.findIndex(m => m.id === id)] ?? memberColors[0]);
<AvatarGroup names={names} colors={colors} size="sm" max={3} />
```

---

## Pages

### 1. Dashboard (`/dashboard`)
**PageHeader:** `title="Dashboard"` `description="Project overview"` `actions=<+ New Report button>`

**Content — 4 MetricCards in a 2x2 grid (`grid grid-cols-2 gap-4 mb-6`):**

```
MetricCard label="Team Members"    value={String(teamMembers.length)}       hint="Active this sprint"        icon=Users       iconClassName="bg-primary-50 text-primary-500"
MetricCard label="Tasks Completed" value={String(doneTasks.length)}          hint="This sprint"               icon=CheckSquare iconClassName="bg-[#83C29D33] text-[#68B266]"
MetricCard label="Tasks Pending"   value={String(todoTasks.length)}          hint="Needs attention"           icon=Clock       iconClassName="bg-[#DFA87433] text-[#D58D49]"
MetricCard label="Attendance Rate" value="94%"                               hint="Weekly average"            icon=TrendingUp  iconClassName="bg-[#30C5E533] text-[#30C5E5]"
```

**Content — Recent Activity (white card below grid):**

Section title `font-semibold text-gray-900 mb-4`. Vertical list of 5 hardcoded activity rows (no data source, inline only):

| Icon | Text | Time |
|------|------|------|
| CheckCircle (text-[#68B266]) | "Mobile App Design marked as Done" | "2m ago" |
| Plus (text-primary-500) | "Wireframes task created" | "1h ago" |
| Users (text-[#30C5E5]) | "Priya Singh joined the team" | "3h ago" |
| MessageSquare (text-gray-400) | "12 new comments on Brainstorming" | "5h ago" |
| Clock (text-[#FFA500]) | "Research task moved to In Progress" | "Yesterday" |

Each row: `flex items-center gap-3 py-3 border-b border-surface-200 last:border-0`
- Icon 16px colored as above
- Text `text-sm text-gray-700 flex-1`
- Time `text-xs text-gray-400 shrink-0`

Staggered `delay: index * 0.06`.

---

### 2. Tasks (`/tasks`)
**PageHeader:** `title="Tasks"` `description="All tasks across projects"` `actions=<+ New Task button>`

**Content — single white card (`bg-white rounded-2xl shadow-card overflow-hidden`):**

Flat list of all tasks: `[...todoTasks, ...inProgressTasks, ...doneTasks]`

Each row (`flex items-center gap-4 px-5 py-4 border-b border-surface-200 last:border-0`):
- Priority badge `text-xs font-semibold px-2.5 py-1 rounded-md` — full style map (all 3 values):
  - low: `bg-[#DFA87433] text-[#D58D49]`
  - high: `bg-[#D8727D33] text-[#D8727D]`
  - completed: `bg-[#83C29D33] text-[#68B266]`
- Center block `flex-1 min-w-0`: title `font-semibold text-gray-900 text-sm` + description `text-xs text-gray-400 truncate`
- Status pill `text-xs font-semibold px-2.5 py-1 rounded-full shrink-0`:
  - todo: `bg-primary-50 text-primary-600`
  - in-progress: `bg-[#FFA50020] text-[#FFA500]`
  - done: `bg-[#83C29D33] text-[#68B266]`
- AvatarGroup: resolve assignee IDs to names via `teamMembers`, then resolve per-member colors:
  ```tsx
  const names = task.assignees.map(id => teamMembers.find(m => m.id === id)?.name ?? 'Unknown');
  const colors = task.assignees.map(id => memberColors[teamMembers.findIndex(m => m.id === id)] ?? memberColors[0]);
  <AvatarGroup names={names} colors={colors} size="sm" max={3} />
  ```

Staggered row entrance `delay: index * 0.05`.

---

### 3. Messages (`/messages`)
**PageHeader:** `title="Messages"` `description="Team conversations"` `actions=<+ New Message button>`

**Content — white card with two-column split (`flex bg-white rounded-2xl shadow-card overflow-hidden` height `h-[calc(100vh-220px)]`):**

**Left panel** (`w-80 border-r border-surface-200 flex flex-col shrink-0`):
- Search input at top: `bg-surface-100 rounded-xl px-3 py-2 text-sm m-4 w-auto`
- Conversation list: one item per member in `teamMembers` filtered to exclude `currentUser` (filter `m.id !== 'u1'`)
- Each item (`flex items-center gap-3 px-4 py-3 hover:bg-surface-100 cursor-pointer transition-colors`):
  - `Avatar` size="md" color resolved per-member: `memberColors[teamMembers.findIndex(m => m.id === member.id)]`
  - Center: name `font-semibold text-sm text-gray-900` + last message `text-xs text-gray-400 truncate`
  - Time `text-xs text-gray-400 shrink-0 ml-auto`

Hardcoded last messages (by position after filtering u1):
- Rohan Kumar: "Can you review the PR?" — "2m"
- Priya Singh: "The design looks great!" — "1h"
- Arjun Patel: "Meeting at 3pm?" — "3h"
- Neha Sharma: "Pushed the latest build" — "Yesterday"
- Vikram Rao: "Check the new wireframes" — "Mon"

**Right panel** (`flex-1 flex items-center justify-center flex-col gap-3`):
- `MessageSquare` icon 48px `text-surface-300`
- `text-gray-500 font-medium` "Select a conversation"
- `text-xs text-gray-400` "Choose from the list to start messaging"

---

### 4. Members (`/members`)
**PageHeader:** `title="Members"` `` description={`${teamMembers.length} team members`} `` `actions=<+ Invite Member button>`

**Content — 2-column grid (`grid grid-cols-2 gap-4`):**

One card per member in `teamMembers`. Each card (`bg-white rounded-2xl shadow-card p-5 flex items-center gap-4`):
- `Avatar` size="xl" name=member.name color=`memberColors[index]`
- Right side:
  - Name `font-bold text-gray-900 text-base`
  - Designation (hardcoded inline, NOT from data):
    - u1 Anima Agrawal → "Project Manager"
    - u2 Rohan Kumar → "Frontend Developer"
    - u3 Priya Singh → "UI Designer"
    - u4 Arjun Patel → "Backend Developer"
    - u5 Neha Sharma → "QA Engineer"
    - u6 Vikram Rao → "DevOps Engineer"
  - Location `text-xs text-gray-400` — show `member.location` if truthy, else "Remote"
  - Role badge `text-xs font-semibold px-2 py-0.5 rounded-md mt-1`:
    - admin: `bg-primary-50 text-primary-600`
    - manager: `bg-[#FFFBEB] text-[#D97706]`
    - member: `bg-surface-200 text-gray-500`

Staggered `delay: index * 0.08`.

---

### 5. Teams (`/teams`)
**PageHeader:** `title="Teams"` `description="Project teams"` `actions=<+ New Team button>`

**Content — vertical list (`flex flex-col gap-4`):**

One card per project in `projects`. Each card (`bg-white rounded-2xl shadow-card p-5 flex items-center gap-4`):
- Color dot `w-3 h-3 rounded-full shrink-0` `style={{ backgroundColor: project.color }}`
- Project name `font-bold text-gray-900 text-base flex-1`
- `AvatarGroup` with hardcoded name lists (not from data — hardcoded strings). Use per-member canonical colors by resolving each name against `teamMembers`:
  ```tsx
  const teamAvatarColors = (names: string[]) =>
    names.map(name => memberColors[teamMembers.findIndex(m => m.name === name)] ?? memberColors[0]);
  ```
  Member lists per project:
  - p1 Mobile App: `["Anima Agrawal", "Rohan Kumar", "Priya Singh"]`
  - p2 Website Redesign: `["Arjun Patel", "Neha Sharma"]`
  - p3 Design System: `["Anima Agrawal", "Vikram Rao", "Priya Singh"]`
  - p4 Wireframes: `["Rohan Kumar", "Arjun Patel", "Neha Sharma", "Vikram Rao"]`
- Task count badge `bg-surface-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full`:
  - p1: 7, p2: 5, p3: 3, p4: 4

Staggered `delay: index * 0.08`.

---

### 6. Attendance (`/attendance`)
**PageHeader:** `title="Attendance"` `description="Weekly overview"` `actions=<Export button (outline: border border-surface-300 text-gray-700 bg-white)>`

**Content — single white card (`bg-white rounded-2xl shadow-card overflow-hidden`):**

Table `w-full`:
- Header `bg-surface-100 text-xs font-bold text-gray-500 uppercase tracking-wider px-5 py-3`: Member | Role | Mon | Tue | Wed | Thu | Fri | Rate
- "Role" column value: use the hardcoded designation map (same as Members page), not `member.role`. Display the job title string (e.g. "Project Manager", "Frontend Developer"), not the role enum value.
- One row per `teamMembers`, `px-5 py-3 border-b border-surface-200 last:border-0`

Day dot: present = `w-2 h-2 rounded-full bg-[#8BC34A] mx-auto`, absent = `bg-[#D8727D]`

Hardcoded data (✅=present, ❌=absent):

| Member | Mon | Tue | Wed | Thu | Fri | Rate |
|--------|-----|-----|-----|-----|-----|------|
| Anima Agrawal | ✅ | ✅ | ✅ | ✅ | ✅ | 100% |
| Rohan Kumar | ✅ | ✅ | ❌ | ✅ | ✅ | 80% |
| Priya Singh | ✅ | ✅ | ✅ | ✅ | ❌ | 80% |
| Arjun Patel | ✅ | ❌ | ✅ | ✅ | ✅ | 80% |
| Neha Sharma | ✅ | ✅ | ✅ | ❌ | ✅ | 80% |
| Vikram Rao | ❌ | ✅ | ✅ | ✅ | ✅ | 80% |

Rate badge: 100% → `bg-[#83C29D33] text-[#68B266]`, 80% → `bg-[#DFA87433] text-[#D58D49]`

Row avatar: `Avatar` size="sm" name=member.name color=`memberColors[index]` inline with name in first cell.

Staggered row `delay: index * 0.05`.

---

### 7. Reports (`/reports`)
**PageHeader:** `title="Reports"` `description="Project analytics"` `actions=<Download Report button>`

**Content — 3 MetricCards in a row (`grid grid-cols-3 gap-4 mb-6`):**

```
const totalTasks = todoTasks.length + inProgressTasks.length + doneTasks.length;

MetricCard label="Total Tasks"      value={String(totalTasks)}                                              hint="Across all projects"       icon=BarChart3   iconClassName="bg-primary-50 text-primary-500"
MetricCard label="Completion Rate"  value={totalTasks > 0 ? `${Math.round(doneTasks.length / totalTasks * 100)}%` : '0%'}  hint="Tasks completed"  icon=TrendingUp  iconClassName="bg-[#83C29D33] text-[#68B266]"
MetricCard label="Active Members"   value={String(teamMembers.length)}                                      hint="Contributing this sprint"  icon=Users       iconClassName="bg-[#30C5E533] text-[#30C5E5]"
```

**Content — Task Breakdown (white card below grid):**

Section title `font-semibold text-gray-900 mb-5` "Task Breakdown".

Three bar rows, one per status:

```
Row layout: flex items-center gap-4 mb-4
  - Label: text-sm text-gray-600 w-28
  - Track: flex-1 bg-surface-200 rounded-full h-3 overflow-hidden
    - Fill: h-full rounded-full, width = (count / totalTasks * 100)%
  - Count: text-xs text-gray-500 w-8 text-right
```

| Row | Label | Count | Fill color |
|-----|-------|-------|------------|
| 1 | To Do | `todoTasks.length` | `bg-primary-500` |
| 2 | In Progress | `inProgressTasks.length` | `bg-[#FFA500]` |
| 3 | Done | `doneTasks.length` | `bg-[#8BC34A]` |

Width formula: `style={{ width: \`${totalTasks > 0 ? (count / totalTasks * 100) : 0}%\` }}`

---

### 8. Organization (`/organization`)
**PageHeader:** `title="Organization"` `description="Team structure"` `actions=<+ Add Member button>`

**Content — single white card (`bg-white rounded-2xl shadow-card p-8`):**

Structure (flexbox, no SVG):

```
[currentUser node — centered, mx-auto]
        |  (div: mx-auto w-px h-8 bg-surface-300)
[flex flex-wrap justify-center gap-4 — subordinate nodes]
```

**currentUser node** (`bg-primary-50 border-2 border-primary-200 rounded-2xl p-4 text-center w-44 mx-auto mb-0`):
- `Avatar` size="lg" centered (`mx-auto`) name=`currentUser.name` color=`memberColors[0]`
- Name `font-bold text-gray-900 text-sm mt-2`
- "Project Manager" `text-xs text-gray-400`
- `bg-primary-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block` "Admin"

**Subordinate row** — `teamMembers.filter(m => m.id !== currentUser.id)` (removes u1, gives u2–u6). One node per member (`bg-white border border-surface-200 rounded-xl p-3 text-center w-36`):
- `Avatar` size="md" centered name=member.name color=`memberColors[index + 1]`
- Name `font-semibold text-gray-800 text-xs mt-2`
- Designation (same hardcoded map as Members page) `text-[10px] text-gray-400`

Staggered `delay: index * 0.06`.

---

### 9. Settings (`/settings`)
**PageHeader:** `title="Settings"` `description="Account & preferences"` `actions=<Save Changes button>`

**Content — 3 white cards stacked (`flex flex-col gap-4`):**

**Card 1 — Profile** (`bg-white rounded-2xl shadow-card p-6`):
- Section heading `font-bold text-gray-900 mb-1` + `text-xs text-gray-400 mb-5` "Manage your account details"
- 3 display rows (`flex items-center justify-between py-3 border-b border-surface-200 last:border-0`):
  - Label `text-sm font-medium text-gray-500` | Value `text-sm font-semibold text-gray-900`
  - Name → `currentUser.name`
  - Location → `currentUser.location ?? 'Not set'`
  - Role → capitalize first letter of `currentUser.role`

**Card 2 — Notifications** (`bg-white rounded-2xl shadow-card p-6`):
- Section heading `font-bold text-gray-900 mb-1` + subtitle `text-xs text-gray-400 mb-5`
- 3 toggle rows (`flex items-center justify-between py-3 border-b border-surface-200 last:border-0`):
  - Left: label `text-sm font-medium text-gray-900` + sublabel `text-xs text-gray-400`
  - Right: static CSS pill toggle (no state, no onClick)

| Label | Sublabel | Default |
|-------|----------|---------|
| Task updates | "Get notified when tasks change" | ON |
| Team mentions | "Alerts when someone mentions you" | ON |
| Weekly digest | "Summary email every Monday" | OFF |

Toggle ON: `w-9 h-5 bg-primary-500 rounded-full relative` with inner `w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5`
Toggle OFF: `w-9 h-5 bg-surface-300 rounded-full relative` with inner `w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5`

**Card 3 — Appearance** (`bg-white rounded-2xl shadow-card p-6`):
- Section heading `font-bold text-gray-900 mb-1` + subtitle `text-xs text-gray-400 mb-5`
- 1 display row: "Theme" label | "Light" value with `bg-surface-100 text-gray-600 text-xs px-3 py-1 rounded-full`

---

## Constraints

- **No new dependencies** — React, TypeScript, Framer Motion, Lucide React, Tailwind CSS only
- **No Recharts** — Reports chart uses plain divs
- **No interactive state** — all pages are visual/presentational only
- **Reuse existing components** — `PageHeader`, `MetricCard`, `Avatar`, `AvatarGroup` where specified
- **Each page is self-contained** in `src/pages/`
- **Import path:** `../data/mockData`, `../components/ui/Avatar`, `../components/ui/MetricCard`, `../components/ui/PageHeader`
