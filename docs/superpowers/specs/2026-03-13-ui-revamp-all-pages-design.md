# UI Revamp — All Pages Design Spec
**Date:** 2026-03-13
**Direction:** Option A — Refined & Polished (light theme, elevated)
**Scope:** All 9 pages except Home (Kanban — already looks good)

---

## Problem Statement

The Home (Kanban) page stands out as visually polished. All other 9 pages suffer from:
- Visual monotony — every page uses the same white card + shadow pattern with no distinct identity
- Tiny text and badges (`text-[10px]`/`text-[11px]`) that are hard to scan
- Weak metric cards (icon box `h-9 w-9`, hint text at `text-[11px]`)
- Generic layouts that don't match the purpose of each page
- Missing hierarchy — all content sections compete equally for attention

## Design Philosophy

**No new dependencies. No theme change. No dark mode rewrite.**
Fix visual hierarchy, sizing, spacing, and add targeted color accents using existing Tailwind classes and existing design tokens (`primary-*`, `surface-*`, semantic colors).

---

## Global Design System Changes

These apply to every page uniformly.

### MetricCard component (`src/components/ui/MetricCard.tsx`)

Current state:
- Icon container: `h-9 w-9 rounded-xl`
- Value: `text-2xl font-bold` — already correct, no change
- Hint: `text-[11px] text-gray-400` — violates the no-sub-12px rule

Changes:
- Icon container: change `h-9 w-9` to `h-10 w-10`; change icon size from 17 to 18
- Hint text: change `text-[11px]` to `text-xs`
- Outer card: change `px-4 py-3` to `px-4 py-4`

**PageHeader is NOT modified** — it is frozen for this work. All per-page changes work within the existing PageHeader structure (eyebrow, title, description, actions props).

### Badges / Status Pills (inline in each page)

- Increase all `text-[10px]`/`text-[11px]` badges in primary content to `text-xs`
- Increase padding from `px-2 py-0.5` to `px-2.5 py-1`
- Keep existing color mappings

### No sub-12px text rule

All new text added in this work must be `text-xs` (12px) or larger.

**Exceptions allowed (intentional design accents, not primary content):**
- Section eyebrow labels inside cards: `text-[10px] font-bold uppercase tracking-wide text-gray-400` — retained as-is
- Conversation list timestamps in Messages: `text-[10px] text-gray-400` — retained as-is
- Date separator chips in Messages chat
- Avatar overlap hint text in Settings
- Department add form labels in Organization: `text-[11px] font-semibold uppercase tracking-wide text-gray-400` — intentional eyebrow-label style

---

## Per-Page Design Changes

### 1. DashboardPage (`/dashboard`)

**Current issues:**
- Bottom 2 charts row is `height: 44%` — too cramped
- Activity feed has 4 plain text items with no timestamp
- LineChart (Attendance Trend) has no legend; PieChart (Task Status) has manual legend — leave PieChart unchanged

**Changes:**
- Bottom charts row: change `style={{ height: '44%' }}` to `style={{ height: '48%' }}`
- Attendance Trend LineChart: add `<Legend />` Recharts component; keep existing `present`/`absent` data keys
- Task Status PieChart: leave existing manual legend unchanged
- Activity feed items: add a right-aligned `text-[10px] text-gray-400` relative timestamp (e.g. `"2m ago"`, `"5m ago"` — static strings matching each item) on each row; add a `w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 flex-shrink-0` dot (already exists as `h-1.5 w-1.5` — increase to `h-2 w-2`)
- Metric cards: apply global MetricCard sizing upgrade

### 2. MessagesPage (`/messages`)

**Current issues:**
- Standalone top header bar above the split pane wastes ~60px vertical space
- This page intentionally does NOT use PageHeader (valid exception — split-pane layout)
- Conversation list names are `text-xs`; avatars are `size="sm"`
- Chat bubbles have `px-3.5 py-2.5`

**Changes:**
- Remove the standalone top header bar (lines 75–84 in current source). Move its contents — title "Messages", unread badge, "New channel" button — into a new `<div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0">` block at the top of the conversation sidebar card, above the search input
- Conversation list items: increase avatar from `size="sm"` to `size="md"`; increase name from `text-xs font-semibold` to `text-sm font-semibold`
- Chat bubbles: increase from `px-3.5 py-2.5` to `px-4 py-3`; add `shadow-sm` to outgoing (`mine`) bubbles
- Message input container: add `focus-within:shadow-md`; increase from `py-2` to `py-3`
- Add a static date separator above the first message: `<div className="text-center py-2"><span className="text-[10px] text-gray-400 bg-surface-100 px-3 py-1 rounded-full">Today</span></div>`

### 3. TasksPage (`/tasks`)

**Current issues:**
- Table rows have `py-3` — too tight
- Badges at `text-[11px] px-2 py-0.5`
- Inline create form is a flat grid row

**Changes:**
- Table rows: change `py-3` to `py-3.5`; change task title from `font-semibold text-gray-900 truncate` (xs) to `text-sm font-semibold text-gray-900 truncate`; change description from `text-[11px]` to `text-xs`
- Status and priority badges: change to `text-xs px-2.5 py-1`
- Zebra striping: add `even:bg-surface-50/60` to each `<motion.tr>`
- Create task panel: add `<p className="text-sm font-semibold text-gray-900 mb-3">New Task</p>` as the first child inside the create form card

### 4. MembersPage (`/members`)

**Current issues:**
- Avatars are `size="md"` — could be larger for warmth
- No role-based visual distinction on cards
- Detail panel has no cover/profile area

**Changes:**
- Member card avatars: change from `size="md"` to `size="lg"`
- Each member card: add `border-l-4` accent — admin → `border-l-primary-400`, manager → `border-l-amber-400`, member → `border-l-sky-400` (derive from `m.role`)
- Role badge in card footer: apply global badge upgrade (`text-xs px-2.5 py-1`)
- Detail panel: add `<div className="h-16 rounded-t-xl bg-gradient-to-r from-primary-100 to-primary-50 -mx-4 -mt-4 mb-2" />` at the top; shift avatar to overlap by giving it `-mt-10 mx-auto block` wrapper; wrap in `<div className="flex flex-col items-center">`
- "Current Focus" item bullets: change from plain border boxes to `<div className="flex items-center gap-2">` with `<span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />` before each item text

### 5. TeamsPage (`/teams`)

**Current issues:**
- All team cards look identical
- Capacity bar `h-1.5` — too thin
- Detail panel has no visual header

**Changes:**
- Define color palette: `const teamColors = ['primary','emerald','amber','rose','sky','violet']` (index-based, wrapping with `% teamColors.length`)
- Each team card: add `border-l-4 border-l-{color}-400` using the palette; change team name to `text-sm font-bold text-{color}-700`
- Capacity bar: change from `h-1.5` to `h-2.5`; add `<span className="text-xs font-semibold text-gray-600 ml-2">{Math.min(Math.round((selected.memberCount/6)*100),100)}%</span>` to the right of the bar. The denominator `6` is an intentional constant — all teams in this app are capped at 6 members per the mock data. Cap display at 100% to guard against overflow.
- Detail panel: add `<div className="h-14 rounded-t-xl bg-gradient-to-r from-{color}-50 to-white -mx-4 -mt-4 mb-3 flex items-end px-4 pb-2"><p className="text-sm font-bold text-{color}-700">{selected.name}</p></div>` at the top
- Priority items: replace `border border-surface-200` boxes with `border-l-2 border-l-{color}-400 bg-surface-50` style
- Member avatars in detail panel: change from `size="sm"` to `size="md"`

> **Note on dynamic Tailwind classes:** Since Tailwind purges dynamic class names, use a lookup object: `const colorMap = { primary: { border: 'border-l-primary-400', text: 'text-primary-700', gradient: 'from-primary-50', priorityBorder: 'border-l-primary-400' }, emerald: {...}, ... }` and spread the correct classes. The `to-white` half of the detail panel gradient is a static class — keep it hardcoded directly on the wrapper div, not in the map (e.g., `className={\`h-14 rounded-t-xl bg-gradient-to-r ${colorMap[color].gradient} to-white ...\`}`).

### 6. AttendancePage (`/attendance`)

**Current issues:**
- Calendar cells use `aspect-square` — controlled by width, too small
- Legend labels are `text-[10px]`
- Today card check-in/out times not prominent

**Changes:**
- Calendar cells: remove `aspect-square`; add `h-9 w-full` instead; keep all other classes
- Legend dot: change from `h-2 w-2` to `h-3 w-3`
- Legend labels: change from `text-[10px]` to `text-xs`
- Today card: add `border-2 border-primary-200` to the `motion.div`; change check-in/check-out value from `font-semibold text-gray-800` to `text-base font-bold text-gray-900`
- Leave request panel: add `bg-amber-50/40` to the outer `motion.div` className; change section heading from `text-xs font-bold` to `text-sm font-semibold`

### 7. OrganizationPage (`/organization`)

**Current issues:**
- `grid-cols-[1fr_1fr_220px]` — third column is too narrow
- Column 2 is a single `motion.div` — needs to become a flex column to hold two stacked cards
- Dept form inputs have no labels

**Changes:**
- Layout: change `grid-cols-[1fr_1fr_220px]` to `grid-cols-[1fr_1fr]`
- Column 2: change the Work Schedule `motion.div` to a plain `<div className="overflow-y-auto flex flex-col gap-3">` wrapper containing: (a) the Work Schedule card (same content, wrapped in its own `motion.div`) and (b) the Policy Notes card (moved from the old column 3, same content)
- Dept list items: add `<span className="w-2 h-2 rounded-full flex-shrink-0" style={{background: DEPT_COLORS[index % DEPT_COLORS.length]}} />` before the dept name; change dept name from `text-xs font-semibold` to `text-sm font-semibold`; define `DEPT_COLORS = ['#818cf8','#34d399','#fbbf24','#f87171','#38bdf8','#a78bfa']`
- Dept add form inputs: add `<label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 block mb-1">` above each input ("Dept name", "Dept head")
- Work schedule: add a visual timeline strip below the time inputs — `<div className="h-3 rounded-full bg-surface-100 overflow-hidden mt-3 mb-1 relative flex">` with two colored child `<div>`s: work-hours block (`bg-primary-200`, width proportional) and lunch block (`bg-amber-200`, narrower). Use static fixed widths: work block `w-[88%]`, lunch block `w-[12%]` — these are visual approximations, not calculated from actual time values.
- Metric cards: apply global MetricCard sizing upgrade

### 8. ReportsPage (`/reports`)

**Current issues:**
- Three metric cards: "Report types: 3" (fully static), "Visible rows: {dynamic}" (useful), "Export ready: CSV" (static filler)
- Filter bar uses `<select>` for report type
- Table rows have no visual connection to chart colors

**Changes:**
- Replace the `grid grid-cols-3 gap-3` metric card row with a `flex items-center gap-3` insight chip strip (no individual card shadows):
  - Chip 1 (keep dynamic): `<div className="flex items-center gap-2 rounded-xl bg-primary-50 px-4 py-2.5"><ChartColumn size={14} className="text-primary-500" /><span className="text-xs font-semibold text-primary-700">{rows.length} rows</span></div>`
  - Chip 2 (static/mock insight — intentional placeholder): `<div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5"><ArrowUpRight size={14} className="text-emerald-500" /><span className="text-xs font-semibold text-emerald-700">↑ 12% vs last sprint</span></div>` — import `ArrowUpRight` from lucide-react. This string is hardcoded mock data; do not attempt to derive it dynamically.
  - Chip 3 (export): `<div className="flex items-center gap-2 rounded-xl bg-surface-100 px-4 py-2.5"><Download size={14} className="text-gray-500" /><span className="text-xs font-semibold text-gray-600">Export ready</span></div>`
- Report type selector: replace the `<select>` with pill-toggle tabs. A `<div className="flex gap-1 rounded-xl bg-surface-100 p-1">` container with three `<button>` children. Active: `bg-white shadow-sm rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-600`. Inactive: `px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors`.
- Date range: keep existing `<select>`
- Table name cell: change to `<td className="px-4 py-2.5"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full flex-shrink-0" style={{background: keys[0]?.fill ?? '#9ca3af'}} /><span className="font-medium text-gray-900">{row.name}</span></div></td>` — using the first key's fill color as the dot color

### 9. SettingsPage (`/settings`)

**Current issues:**
- Profile card has no avatar
- Toggle rows at `py-2.5`
- No section eyebrow labels on left column cards

**Changes:**
- Profile card: add `<div className="flex flex-col items-center mb-4">` at the top containing `<Avatar name="Anima Agrawal" color={memberColors[0]} size="lg" />` and `<p className="text-[10px] text-gray-400 mt-1">Profile photo</p>` below it (import `Avatar` and `memberColors`)
- Toggle rows in Security and Notifications sections: change `py-2.5` to `py-3`; add a `<p className="text-xs text-gray-400 mt-0.5">` description line below each label:
  - Biometric Unlock → "Use Face ID or fingerprint"
  - Two-Factor Auth → "Require code on sign in"
  - Task Reminders → "Get notified before deadlines"
  - Attendance Reminders → "Daily check-in prompts"
  - Leave Approvals → "Instant approval alerts"
  - Mentions → "When someone tags you"
  - Email Notifications → "Digest sent to your inbox"
- Left column card groups: add `<p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Profile</p>` / `"Appearance"` / `"Security"` eyebrow above each card's outer wrapper (outside the `motion.div`, inside the scrollable `div`)
- Workspace panel status dots: for each of the three status rows, inline the specific color class directly — no dynamic lookup needed. Theme row: `bg-primary-400`; Notifications row: `bg-emerald-400`; Security row: `bg-amber-400`. Example: `<span className="inline-block h-2 w-2 rounded-full mr-1.5 bg-primary-400" />`

---

## What Is NOT Changing

- `PageHeader` component — frozen
- `KanbanBoard`, `KanbanColumn`, `TaskCard` — Home page unchanged
- `Sidebar.tsx`, `Header.tsx`, `App.tsx` — layout shell unchanged
- `Avatar.tsx` — used as-is; only `size` prop changes at call sites
- `AppContext` / theme toggle — Settings dark mode still works
- Routing, state management, mock data
- Framer Motion animation definitions — preserved
- Tailwind config / design tokens — no new custom tokens

---

## Success Criteria

| Page | Acceptance Criterion |
|------|---------------------|
| MetricCard | Hint text is `text-xs`; icon box is `h-10 w-10` |
| Dashboard | Attendance Trend chart has `<Legend>`; each activity item has a timestamp |
| Messages | Top header bar removed; sidebar has integrated title+unread+actions header |
| Tasks | Rows are `py-3.5`; badges are `text-xs px-2.5 py-1`; zebra striping visible |
| Members | Cards have `border-l-4` role-colored accent; detail panel has gradient cover band |
| Teams | Each team card has unique color accent; capacity bar is `h-2.5` with `%` label |
| Attendance | Calendar cells use `h-9 w-full` (not `aspect-square`); legend labels are `text-xs` |
| Organization | Layout is 2-column; Policy Notes stacked below Work Schedule in col 2 |
| Reports | Report type is pill-toggle tabs (not `<select>`); table rows have color dot |
| Settings | Profile card has Avatar; toggle rows have description lines in `text-xs` |
