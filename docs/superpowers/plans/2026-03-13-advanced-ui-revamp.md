# Advanced UI Revamp Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revamp all 9 page components with advanced desktop-grade UIs — fixed-width containers, 4-metric strips, rich tables with avatars/badges/progress bars, two-column bodies with side panels.

**Architecture:** Each page is modified in-place (no new files). All pages wrap content in `max-w-[860px] mx-auto`. Metric strips use custom `motion.div` cards (not MetricCard). Two-column grid `grid-cols-[1fr_280px]` for main table + side panels. No new dependencies.

**Tech Stack:** React 18, TypeScript, Tailwind CSS (custom tokens: primary-*, surface-*, shadow-card), Framer Motion, Lucide React.

**Spec:** `docs/superpowers/specs/2026-03-13-advanced-ui-revamp-design.md`

---

## Chunk 1: Dashboard, Tasks, Messages

### Task 1: DashboardPage

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

**Context:**
- Existing: 2×2 MetricCard grid + Recent Activity card. Fully stretched width.
- Target: `max-w-[860px] mx-auto` wrapper, 4-metric gradient strip, two-column body (Recent Activity left + Sprint Overview / Task Status donut / Team panel right).
- Imports needed: `motion` from framer-motion, `Users, CheckSquare, Clock, TrendingUp, CheckCircle, Plus, MessageSquare` from lucide-react, `PageHeader` from `../components/ui/PageHeader`, `Avatar` from `../components/ui/Avatar`, `teamMembers, memberColors, doneTasks, todoTasks, inProgressTasks` from `../data/mockData`.
- Color tokens: `from-primary-500 to-primary-400` for accent card, `#68B266` for done, `#D8727D` for pending, `#30C5E5` for attendance.
- Animation: page wrapper `opacity 0→1 duration 0.3 delay 0.1`; metric cards `opacity/y-16 stagger index*0.08`; table rows `opacity/y-8 stagger index*0.05`; side panels `opacity/x-12 stagger index*0.08`.

- [ ] **Step 1: Replace DashboardPage.tsx with the full implementation**

Write `src/pages/DashboardPage.tsx`:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Users, CheckSquare, Clock, TrendingUp, CheckCircle, Plus, MessageSquare } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { teamMembers, memberColors, doneTasks, todoTasks, inProgressTasks } from '../data/mockData';

const designations: Record<string, string> = {
  u1: 'Project Manager', u2: 'Frontend Developer', u3: 'UI Designer',
  u4: 'Backend Developer', u5: 'QA Engineer', u6: 'DevOps Engineer',
};
const onlineStatus: Record<string, 'online' | 'away' | 'offline'> = {
  u1: 'online', u2: 'online', u3: 'away', u4: 'online', u5: 'online', u6: 'offline',
};
const statusColor = { online: '#68B266', away: '#FFA500', offline: '#D1D5DB' };

const activityItems = [
  { icon: CheckCircle, bg: 'bg-[#83C29D33]', color: 'text-[#68B266]', text: 'Mobile App Design marked as Done', time: '2m ago' },
  { icon: Plus, bg: 'bg-primary-50', color: 'text-primary-500', text: 'Wireframes task created', time: '1h ago' },
  { icon: Users, bg: 'bg-[#30C5E533]', color: 'text-[#30C5E5]', text: 'Priya Singh joined the team', time: '3h ago' },
  { icon: MessageSquare, bg: 'bg-surface-200', color: 'text-gray-400', text: '12 new comments on Brainstorming', time: '5h ago' },
  { icon: Clock, bg: 'bg-[#DFA87433]', color: 'text-[#D58D49]', text: 'Research task moved to In Progress', time: 'Yesterday' },
];

const totalTasks = todoTasks.length + inProgressTasks.length + doneTasks.length;
const doneCount = doneTasks.length;
const todoCount = todoTasks.length;
const inProgressCount = inProgressTasks.length;
const sprintPct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

const metrics = [
  { label: 'Team Members', value: String(teamMembers.length), trend: 'Active this sprint', trendUp: true, color: '', accent: true, icon: Users, barPct: 100 },
  { label: 'Tasks Completed', value: String(doneCount), trend: '↑ 1 today', trendUp: true, color: '#68B266', accent: false, icon: CheckSquare, barPct: totalTasks > 0 ? (doneCount / totalTasks) * 100 : 0 },
  { label: 'Tasks Pending', value: String(todoCount), trend: '2 overdue', trendUp: false, color: '#D8727D', accent: false, icon: Clock, barPct: totalTasks > 0 ? (todoCount / totalTasks) * 100 : 0 },
  { label: 'Attendance Rate', value: '88%', trend: 'Weekly avg', trendUp: true, color: '#30C5E5', accent: false, icon: TrendingUp, barPct: 88 },
];

const donutItems = [
  { label: 'To Do', count: todoCount, color: '#5030E5' },
  { label: 'In Progress', count: inProgressCount, color: '#FFA500' },
  { label: 'Done', count: doneCount, color: '#68B266' },
];
const donutGradient = (() => {
  if (totalTasks === 0) return '#e5e7eb';
  const todoPct = (todoCount / totalTasks) * 100;
  const progPct = (inProgressCount / totalTasks) * 100;
  return `conic-gradient(#5030E5 0% ${todoPct}%, #FFA500 ${todoPct}% ${todoPct + progPct}%, #68B266 ${todoPct + progPct}% 100%)`;
})();

const DashboardPage: React.FC = () => (
  <motion.div
    className="flex-1 overflow-y-auto px-8 pb-8"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3, delay: 0.1 }}
  >
    <div className="max-w-[860px] mx-auto">
      {/* Header */}
      <div className="py-6">
        <PageHeader
          eyebrow="Home / Dashboard"
          title="Dashboard"
          description="Project overview"
          actions={
            <motion.button
              className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              <Plus size={16} /> New Report
            </motion.button>
          }
        />
      </div>

      {/* 4-metric strip */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              className={`rounded-xl p-4 shadow-card ${m.accent ? 'bg-gradient-to-br from-primary-500 to-primary-400 text-white' : 'bg-white border border-surface-200'}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.accent ? 'bg-white/15' : ''}`} style={!m.accent ? { background: m.color + '20' } : {}}>
                  <Icon size={16} className={m.accent ? 'text-white' : ''} style={!m.accent ? { color: m.color } : {}} />
                </div>
                <span className={`text-xs font-semibold ${m.accent ? 'text-white/70' : m.trendUp ? 'text-[#68B266]' : 'text-[#D8727D]'}`}>{m.trend}</span>
              </div>
              <div className={`text-3xl font-extrabold tracking-tight ${m.accent ? 'text-white' : ''}`} style={!m.accent ? { color: m.color } : {}}>{m.value}</div>
              <div className={`text-xs mt-1 ${m.accent ? 'text-white/70' : 'text-gray-400'}`}>{m.label}</div>
              <div className={`mt-3 h-1 rounded-full overflow-hidden ${m.accent ? 'bg-white/20' : 'bg-surface-200'}`}>
                <div className={`h-full rounded-full ${m.accent ? 'bg-white/60' : ''}`} style={{ width: `${m.barPct}%`, ...(!m.accent ? { background: m.color } : {}) }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-[1fr_280px] gap-4">
        {/* Main: Recent Activity */}
        <div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h2 className="font-bold text-gray-900 text-sm">Recent Activity</h2>
            <span className="text-xs text-primary-500 font-semibold">View all →</span>
          </div>
          <div className="px-5">
            {activityItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  className="flex items-center gap-3 py-3.5 border-b border-surface-100 last:border-0"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.bg}`}>
                    <Icon size={14} className={item.color} />
                  </div>
                  <span className="text-sm text-gray-700 flex-1">{item.text}</span>
                  <span className="text-xs text-gray-400 shrink-0">{item.time}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Side panels */}
        <div className="flex flex-col gap-4">
          {/* Sprint Overview */}
          <motion.div
            className="bg-white rounded-2xl shadow-card border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0, ease: [0.4, 0, 0.2, 1] }}
          >
            <h3 className="font-bold text-gray-900 text-sm mb-3">Sprint Overview</h3>
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Progress</span><span className="font-bold text-primary-500">{sprintPct}%</span>
              </div>
              <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
                  initial={{ width: 0 }} animate={{ width: `${sprintPct}%` }}
                  transition={{ duration: 0.6, delay: 0.3, ease: [0.4, 0, 0.2, 1] }} />
              </div>
            </div>
            {[['Total Tasks', totalTasks], ['Completed', doneCount], ['Remaining', todoCount + inProgressCount]].map(([label, val]) => (
              <div key={String(label)} className="flex justify-between py-2 border-b border-surface-100 last:border-0 text-xs">
                <span className="text-gray-500">{label}</span>
                <span className="font-bold text-gray-900">{val}</span>
              </div>
            ))}
          </motion.div>

          {/* Task Status donut */}
          <motion.div
            className="bg-white rounded-2xl shadow-card border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}
          >
            <h3 className="font-bold text-gray-900 text-sm mb-3">Task Status</h3>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full shrink-0" style={{ background: donutGradient }} />
              <div className="flex flex-col gap-1.5">
                {donutItems.map(d => (
                  <div key={d.label} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-gray-500 flex-1">{d.label}</span>
                    <span className="font-bold text-gray-900">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Team */}
          <motion.div
            className="bg-white rounded-2xl shadow-card border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.16, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-sm">Team</h3>
              <span className="text-xs text-primary-500 font-semibold">View all →</span>
            </div>
            {teamMembers.map((member, i) => {
              const color = memberColors[teamMembers.findIndex(m => m.id === member.id)] ?? memberColors[0];
              const status = onlineStatus[member.id] ?? 'online';
              return (
                <div key={member.id} className="flex items-center gap-2.5 py-2 border-b border-surface-100 last:border-0">
                  <Avatar name={member.name} color={color} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-900 truncate">{member.name}</div>
                    <div className="text-[10px] text-gray-400 truncate">{designations[member.id]}</div>
                  </div>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor[status] }} />
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  </motion.div>
);

export default DashboardPage;
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: `✓ built in` with no TypeScript errors. If errors appear, fix them before proceeding.

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`, open `http://localhost:5173/#/dashboard`.
Expected: Fixed-width centered content, 4 metric cards (first purple gradient), two-column body with Recent Activity left and 3 side panels right.

---

### Task 2: TasksPage

**Files:**
- Modify: `src/pages/TasksPage.tsx`

**Context:**
- Existing: single flat list of tasks in one white card.
- Target: 4-metric strip + two-column (rich table with Project/Priority/Assignees/Due/Status columns left; Sprint Summary / Priority donut / Top Assignees right).
- All data resolved via hardcoded maps (`dueDates`, `taskProjects`, `sprintMeta`). `AvatarGroup` used for assignees. Due date shown red if `overdue: true`.

- [ ] **Step 1: Replace TasksPage.tsx with the full implementation**

Write `src/pages/TasksPage.tsx`:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Clock, TrendingUp, AlertCircle, Plus, Download } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { AvatarGroup } from '../components/ui/Avatar';
import { teamMembers, memberColors, todoTasks, inProgressTasks, doneTasks, projects } from '../data/mockData';
import { Task } from '../types';

const dueDates: Record<string, { label: string; overdue: boolean }> = {
  t1: { label: 'Dec 22', overdue: false }, t2: { label: 'Dec 15', overdue: true },
  t3: { label: 'Dec 28', overdue: false }, t4: { label: 'Dec 18', overdue: true },
  t5: { label: 'Dec 20', overdue: false }, t6: { label: 'Done', overdue: false },
  t7: { label: 'Done', overdue: false },
};
const taskProjects: Record<string, string> = {
  t1: 'p2', t2: 'p4', t3: 'p4', t4: 'p1', t5: 'p3', t6: 'p1', t7: 'p3',
};
const sprintMeta = { start: 'Dec 1, 2020', end: 'Dec 31, 2020', velocity: '2.3 tasks/day', blockers: 2 };

const priorityStyles: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-[#DFA87433]', text: 'text-[#D58D49]', label: 'Low' },
  high: { bg: 'bg-[#D8727D33]', text: 'text-[#D8727D]', label: 'High' },
  completed: { bg: 'bg-[#83C29D33]', text: 'text-[#68B266]', label: 'Done' },
};
const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  'todo': { bg: 'bg-primary-50', text: 'text-primary-600', label: 'To Do' },
  'in-progress': { bg: 'bg-[#FFA50020]', text: 'text-[#FFA500]', label: 'In Progress' },
  'done': { bg: 'bg-[#83C29D33]', text: 'text-[#68B266]', label: 'Done' },
};

const allTasks: Task[] = [...todoTasks, ...inProgressTasks, ...doneTasks];
const totalTasks = allTasks.length;

// Top 3 assignees by task count
const assigneeCounts: Record<string, number> = {};
allTasks.forEach(t => t.assignees.forEach(id => { assigneeCounts[id] = (assigneeCounts[id] ?? 0) + 1; }));
const topAssignees = Object.entries(assigneeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

const donutItems = [
  { label: 'High', count: allTasks.filter(t => t.priority === 'high').length, color: '#D8727D' },
  { label: 'Low', count: allTasks.filter(t => t.priority === 'low').length, color: '#D58D49' },
  { label: 'Done', count: doneTasks.length, color: '#68B266' },
];
const donutGradient = (() => {
  const high = donutItems[0].count; const low = donutItems[1].count; const done = donutItems[2].count;
  if (totalTasks === 0) return '#e5e7eb';
  const h = (high / totalTasks) * 100; const l = (low / totalTasks) * 100;
  return `conic-gradient(#D8727D 0% ${h}%, #D58D49 ${h}% ${h + l}%, #68B266 ${h + l}% 100%)`;
})();

const sprintPct = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;

const metrics = [
  { label: 'Total Tasks', value: String(totalTasks), trend: '↑ 2 this week', trendUp: true, color: '', accent: true, icon: CheckSquare, barPct: 100 },
  { label: 'In Progress', value: String(inProgressTasks.length), trend: 'Active now', trendUp: true, color: '#FFA500', accent: false, icon: Clock, barPct: totalTasks > 0 ? (inProgressTasks.length / totalTasks) * 100 : 0 },
  { label: 'Completed', value: String(doneTasks.length), trend: '↑ 1 today', trendUp: true, color: '#68B266', accent: false, icon: TrendingUp, barPct: totalTasks > 0 ? (doneTasks.length / totalTasks) * 100 : 0 },
  { label: 'Pending', value: String(todoTasks.length), trend: '2 overdue', trendUp: false, color: '#D8727D', accent: false, icon: AlertCircle, barPct: totalTasks > 0 ? (todoTasks.length / totalTasks) * 100 : 0 },
];

const tabs = ['All', 'To Do', 'In Progress', 'Done'];

const TasksPage: React.FC = () => (
  <motion.div
    className="flex-1 overflow-y-auto px-8 pb-8"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    transition={{ duration: 0.3, delay: 0.1 }}
  >
    <div className="max-w-[860px] mx-auto">
      <div className="py-6">
        <PageHeader
          eyebrow="Home / Tasks"
          title="Tasks"
          description={`${totalTasks} tasks across 4 projects`}
          actions={
            <>
              <motion.button className="flex items-center gap-2 bg-white border border-surface-200 text-gray-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-surface-100 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Download size={16} /> Export
              </motion.button>
              <motion.button className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Plus size={16} /> New Task
              </motion.button>
            </>
          }
        />
      </div>

      {/* 4-metric strip */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              className={`rounded-xl p-4 shadow-card ${m.accent ? 'bg-gradient-to-br from-primary-500 to-primary-400 text-white' : 'bg-white border border-surface-200'}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.accent ? 'bg-white/15' : ''}`} style={!m.accent ? { background: m.color + '20' } : {}}>
                  <Icon size={16} className={m.accent ? 'text-white' : ''} style={!m.accent ? { color: m.color } : {}} />
                </div>
                <span className={`text-xs font-semibold ${m.accent ? 'text-white/70' : m.trendUp ? 'text-[#68B266]' : 'text-[#D8727D]'}`}>{m.trend}</span>
              </div>
              <div className={`text-3xl font-extrabold tracking-tight ${m.accent ? 'text-white' : ''}`} style={!m.accent ? { color: m.color } : {}}>{m.value}</div>
              <div className={`text-xs mt-1 ${m.accent ? 'text-white/70' : 'text-gray-400'}`}>{m.label}</div>
              <div className={`mt-3 h-1 rounded-full overflow-hidden ${m.accent ? 'bg-white/20' : 'bg-surface-200'}`}>
                <div className="h-full rounded-full" style={{ width: `${m.barPct}%`, background: m.accent ? 'rgba(255,255,255,0.6)' : m.color }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-[1fr_280px] gap-4">
        {/* Main: Tasks table */}
        <div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h2 className="font-bold text-gray-900 text-sm">All Tasks</h2>
            <span className="text-xs text-primary-500 font-semibold">Board view →</span>
          </div>
          {/* Tabs */}
          <div className="px-5 pt-3">
            <div className="flex gap-1 bg-surface-100 rounded-lg p-1 mb-3 w-fit">
              {tabs.map((t, i) => (
                <div key={t} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${i === 0 ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}>{t}{i === 0 ? ` (${totalTasks})` : ''}</div>
              ))}
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                {['Task', 'Project', 'Priority', 'Assignees', 'Due', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allTasks.map((task, i) => {
                const priority = priorityStyles[task.priority];
                const status = statusStyles[task.status];
                const due = dueDates[task.id];
                const projId = taskProjects[task.id];
                const project = projects.find(p => p.id === projId);
                const names = task.assignees.map(id => teamMembers.find(m => m.id === id)?.name ?? 'Unknown');
                const colors = task.assignees.map(id => memberColors[teamMembers.findIndex(m => m.id === id)] ?? memberColors[0]);
                return (
                  <motion.tr
                    key={task.id}
                    className="border-b border-surface-100 hover:bg-surface-50 transition-colors"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 text-xs">{task.title}</div>
                      <div className="text-[10px] text-gray-400">{task.comments} comments · {task.files} files</div>
                    </td>
                    <td className="px-4 py-3">
                      {project && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                          <span className="text-xs text-gray-500 truncate max-w-[80px]">{project.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${priority.bg} ${priority.text}`}>{priority.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <AvatarGroup names={names} colors={colors} size="sm" max={3} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${due?.overdue ? 'text-[#D8727D]' : 'text-gray-400'}`}>{due?.label ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>{status.label}</span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Side panels */}
        <div className="flex flex-col gap-4">
          {/* Sprint Summary */}
          <motion.div className="bg-white rounded-2xl shadow-card border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Sprint Summary</h3>
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Progress</span><span className="font-bold text-primary-500">{sprintPct}%</span>
              </div>
              <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
                  initial={{ width: 0 }} animate={{ width: `${sprintPct}%` }}
                  transition={{ duration: 0.6, delay: 0.3, ease: [0.4, 0, 0.2, 1] }} />
              </div>
            </div>
            {[['Start date', sprintMeta.start], ['End date', sprintMeta.end], ['Velocity', sprintMeta.velocity], ['Blockers', sprintMeta.blockers]].map(([label, val]) => (
              <div key={String(label)} className="flex justify-between py-2 border-b border-surface-100 last:border-0 text-xs">
                <span className="text-gray-500">{label}</span>
                <span className={`font-bold ${label === 'Blockers' ? 'text-[#D8727D]' : 'text-gray-900'}`}>{val}</span>
              </div>
            ))}
          </motion.div>

          {/* Priority Breakdown donut */}
          <motion.div className="bg-white rounded-2xl shadow-card border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Priority Breakdown</h3>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full shrink-0" style={{ background: donutGradient }} />
              <div className="flex flex-col gap-1.5">
                {donutItems.map(d => (
                  <div key={d.label} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-gray-500 flex-1">{d.label}</span>
                    <span className="font-bold text-gray-900">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Top Assignees */}
          <motion.div className="bg-white rounded-2xl shadow-card border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.16, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Top Assignees</h3>
            {topAssignees.map(([id, count]) => {
              const member = teamMembers.find(m => m.id === id);
              if (!member) return null;
              const color = memberColors[teamMembers.findIndex(m => m.id === id)] ?? memberColors[0];
              const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
              return (
                <div key={id} className="flex items-center gap-2 py-2 border-b border-surface-100 last:border-0">
                  <Avatar name={member.name} color={color} size="sm" />
                  <span className="text-xs text-gray-700 flex-1 truncate">{member.name.split(' ')[0]}</span>
                  <div className="w-16 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="text-xs font-bold text-gray-900 w-4 text-right">{count}</span>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  </motion.div>
);

export default TasksPage;
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: `✓ built in` with no TypeScript errors.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:5173/#/tasks`.
Expected: Fixed-width, 4 metrics, table with 6 columns (Task/Project/Priority/Assignees/Due/Status), 3 side panels.

---

### Task 3: MessagesPage

**Files:**
- Modify: `src/pages/MessagesPage.tsx`

**Context:**
- Existing: left panel conversation list + right panel empty state.
- Target: Same structure but enriched — unread pill badges, designation subtitles (via `designations` map), right panel shows mock chat bubbles instead of empty state, read-only input bar at bottom.
- No metric strip (layout exception). Still uses `max-w-[860px] mx-auto`.

- [ ] **Step 1: Replace MessagesPage.tsx with the full implementation**

Write `src/pages/MessagesPage.tsx`:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Send } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { teamMembers, memberColors, currentUser } from '../data/mockData';

const designations: Record<string, string> = {
  u1: 'Project Manager', u2: 'Frontend Developer', u3: 'UI Designer',
  u4: 'Backend Developer', u5: 'QA Engineer', u6: 'DevOps Engineer',
};
const lastMessages: Record<string, { text: string; time: string; unread: number }> = {
  u2: { text: 'Can you review the PR?', time: '2m', unread: 2 },
  u3: { text: 'The design looks great!', time: '1h', unread: 0 },
  u4: { text: 'Meeting at 3pm?', time: '3h', unread: 1 },
  u5: { text: 'Pushed the latest build', time: 'Yesterday', unread: 0 },
  u6: { text: 'Check the new wireframes', time: 'Mon', unread: 0 },
};
const mockChat = [
  { from: 'u2', text: 'Hey, can you review the PR I just pushed?', time: '10:32 AM' },
  { from: 'u1', text: 'Sure! Give me 10 minutes.', time: '10:35 AM' },
  { from: 'u2', text: 'No rush, just the auth middleware changes.', time: '10:36 AM' },
  { from: 'u1', text: 'Looks good overall. Left one comment on line 42.', time: '10:48 AM' },
  { from: 'u2', text: 'Can you review the PR?', time: '10:50 AM' },
];

const rohan = teamMembers.find(m => m.id === 'u2')!;
const rohanColor = memberColors[teamMembers.findIndex(m => m.id === 'u2')] ?? memberColors[0];

const MessagesPage: React.FC = () => {
  const conversations = teamMembers.filter(m => m.id !== currentUser.id);
  const totalUnread = Object.values(lastMessages).reduce((s, m) => s + m.unread, 0);

  return (
    <motion.div
      className="flex-1 overflow-y-auto px-8 pb-8"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="max-w-[860px] mx-auto">
        <div className="py-6">
          <PageHeader
            eyebrow="Home / Messages"
            title="Messages"
            description="Team conversations"
            actions={
              <motion.button className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Plus size={16} /> New Message
              </motion.button>
            }
          />
        </div>

        <div className="flex bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
          {/* Left panel */}
          <div className="w-72 border-r border-surface-200 flex flex-col shrink-0">
            <div className="p-3">
              <input
                type="text" readOnly placeholder="Search conversations..."
                className="w-full bg-surface-100 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
              />
            </div>
            {totalUnread > 0 && (
              <div className="px-4 pb-1">
                <span className="text-[10px] font-bold text-primary-500">{totalUnread} unread</span>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              {conversations.map((member, i) => {
                const color = memberColors[teamMembers.findIndex(m => m.id === member.id)] ?? memberColors[0];
                const msg = lastMessages[member.id];
                const isActive = member.id === 'u2';
                return (
                  <motion.div
                    key={member.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isActive ? 'bg-primary-50' : 'hover:bg-surface-100'}`}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <Avatar name={member.name} color={color} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate">{member.name}</div>
                      <div className="text-[10px] text-gray-400 truncate">{designations[member.id]}</div>
                      <div className="text-xs text-gray-400 truncate">{msg?.text}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-gray-400">{msg?.time}</span>
                      {msg?.unread > 0 && (
                        <span className="w-4 h-4 rounded-full bg-primary-500 text-white text-[9px] font-bold flex items-center justify-center">{msg.unread}</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col">
            {/* Top bar */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-surface-200">
              <Avatar name={rohan.name} color={rohanColor} size="md" />
              <div>
                <div className="font-bold text-sm text-gray-900">{rohan.name}</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#68B266]" />
                  <span className="text-xs text-gray-400">{designations['u2']} · Online</span>
                </div>
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {mockChat.map((msg, i) => {
                const isOwn = msg.from === currentUser.id;
                const sender = teamMembers.find(m => m.id === msg.from)!;
                const senderColor = memberColors[teamMembers.findIndex(m => m.id === msg.from)] ?? memberColors[0];
                return (
                  <motion.div
                    key={i}
                    className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.06, ease: [0.4, 0, 0.2, 1] }}
                  >
                    {!isOwn && <Avatar name={sender.name} color={senderColor} size="sm" />}
                    <div className={`max-w-[65%]`}>
                      <div className={`px-3.5 py-2.5 text-sm rounded-2xl ${isOwn ? 'bg-primary-500 text-white rounded-br-sm' : 'bg-surface-100 text-gray-800 rounded-bl-sm'}`}>
                        {msg.text}
                      </div>
                      <div className={`text-[10px] text-gray-400 mt-1 ${isOwn ? 'text-right' : ''}`}>{msg.time}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Input bar */}
            <div className="px-5 py-3 border-t border-surface-200 flex items-center gap-3">
              <input
                type="text" readOnly placeholder="Type a message..."
                className="flex-1 bg-surface-100 rounded-xl px-4 py-2.5 text-sm text-gray-400 focus:outline-none"
              />
              <button className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center text-white shrink-0">
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MessagesPage;
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: `✓ built in` with no TypeScript errors.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:5173/#/messages`.
Expected: Left panel with conversation list (unread badges, designation subtitles, first item highlighted), right panel with chat bubbles (own messages right/purple, others left/gray), read-only input bar at bottom.

---

## Chunk 2: Members, Teams, Attendance

### Task 4: MembersPage

**Files:**
- Modify: `src/pages/MembersPage.tsx`

**Context:**
- Existing: 2-column grid of member cards.
- Target: 4-metric strip + two-column body (rich table with Workload bars + online status left; Role donut / Location split / Availability right).
- Uses `designations`, `locations`, `memberTaskCounts`, `onlineStatus` maps — no direct access to `member.designation` or `member.location`.

- [ ] **Step 1: Replace MembersPage.tsx with the full implementation**

Write `src/pages/MembersPage.tsx`:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, Briefcase, UserCheck, UserPlus, Download } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { teamMembers, memberColors } from '../data/mockData';

const designations: Record<string, string> = {
  u1: 'Project Manager', u2: 'Frontend Developer', u3: 'UI Designer',
  u4: 'Backend Developer', u5: 'QA Engineer', u6: 'DevOps Engineer',
};
const locations: Record<string, string> = {
  u1: '🏙 U.P, India', u2: '🌆 Mumbai', u3: '🌍 Remote',
  u4: '🌍 Remote', u5: '🏙 Bangalore', u6: '🌍 Remote',
};
const memberTaskCounts: Record<string, { assigned: number; total: number }> = {
  u1: { assigned: 4, total: 5 }, u2: { assigned: 3, total: 5 },
  u3: { assigned: 3, total: 5 }, u4: { assigned: 2, total: 5 },
  u5: { assigned: 2, total: 5 }, u6: { assigned: 0, total: 5 },
};
const onlineStatus: Record<string, 'online' | 'away' | 'offline'> = {
  u1: 'online', u2: 'online', u3: 'away', u4: 'online', u5: 'online', u6: 'offline',
};
const statusColor = { online: '#68B266', away: '#FFA500', offline: '#D1D5DB' };
const statusLabel = { online: 'Online', away: 'Away', offline: 'Offline' };

const roleStyles: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'bg-primary-50', text: 'text-primary-600' },
  manager: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]' },
  member: { bg: 'bg-surface-200', text: 'text-gray-500' },
};

const adminCount = teamMembers.filter(m => m.role === 'admin').length;
const managerCount = teamMembers.filter(m => m.role === 'manager').length;
const memberCount = teamMembers.filter(m => m.role === 'member').length;
const onlineCount = Object.values(onlineStatus).filter(s => s === 'online').length;

const metrics = [
  { label: 'Total Members', value: String(teamMembers.length), trend: '↑ 1 new', trendUp: true, color: '', accent: true, icon: Users, barPct: 100 },
  { label: 'Admins', value: String(adminCount), trend: `${Math.round((adminCount / teamMembers.length) * 100)}%`, trendUp: true, color: '#5030E5', accent: false, icon: Shield, barPct: (adminCount / teamMembers.length) * 100 },
  { label: 'Managers', value: String(managerCount), trend: `${Math.round((managerCount / teamMembers.length) * 100)}%`, trendUp: true, color: '#D97706', accent: false, icon: Briefcase, barPct: (managerCount / teamMembers.length) * 100 },
  { label: 'Active Members', value: String(onlineCount), trend: `${onlineCount} online`, trendUp: true, color: '#68B266', accent: false, icon: UserCheck, barPct: (onlineCount / teamMembers.length) * 100 },
];

const donutGradient = (() => {
  const total = teamMembers.length;
  const adminPct = (adminCount / total) * 100;
  const manPct = (managerCount / total) * 100;
  return `conic-gradient(#5030E5 0% ${adminPct}%, #D97706 ${adminPct}% ${adminPct + manPct}%, #68B266 ${adminPct + manPct}% 100%)`;
})();

const locationCounts: Record<string, number> = {};
teamMembers.forEach(m => {
  const loc = locations[m.id].replace(/^.+ /, '');
  locationCounts[loc] = (locationCounts[loc] ?? 0) + 1;
});

const MembersPage: React.FC = () => (
  <motion.div
    className="flex-1 overflow-y-auto px-8 pb-8"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    transition={{ duration: 0.3, delay: 0.1 }}
  >
    <div className="max-w-[860px] mx-auto">
      <div className="py-6">
        <PageHeader
          eyebrow="Home / Members"
          title="Members"
          description={`${teamMembers.length} team members`}
          actions={
            <>
              <motion.button className="flex items-center gap-2 bg-white border border-surface-200 text-gray-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-surface-100 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Download size={16} /> Export
              </motion.button>
              <motion.button className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <UserPlus size={16} /> Invite Member
              </motion.button>
            </>
          }
        />
      </div>

      {/* 4-metric strip */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              className={`rounded-xl p-4 shadow-card ${m.accent ? 'bg-gradient-to-br from-primary-500 to-primary-400 text-white' : 'bg-white border border-surface-200'}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.accent ? 'bg-white/15' : ''}`} style={!m.accent ? { background: m.color + '20' } : {}}>
                  <Icon size={16} className={m.accent ? 'text-white' : ''} style={!m.accent ? { color: m.color } : {}} />
                </div>
                <span className={`text-xs font-semibold ${m.accent ? 'text-white/70' : 'text-[#68B266]'}`}>{m.trend}</span>
              </div>
              <div className={`text-3xl font-extrabold tracking-tight ${m.accent ? 'text-white' : ''}`} style={!m.accent ? { color: m.color } : {}}>{m.value}</div>
              <div className={`text-xs mt-1 ${m.accent ? 'text-white/70' : 'text-gray-400'}`}>{m.label}</div>
              <div className={`mt-3 h-1 rounded-full overflow-hidden ${m.accent ? 'bg-white/20' : 'bg-surface-200'}`}>
                <div className="h-full rounded-full" style={{ width: `${m.barPct}%`, background: m.accent ? 'rgba(255,255,255,0.6)' : m.color }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-[1fr_280px] gap-4">
        {/* Main: Team Directory table */}
        <div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h2 className="font-bold text-gray-900 text-sm">Team Directory</h2>
            <span className="text-xs text-primary-500 font-semibold">Export CSV</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                {['Member', 'Role', 'Location', 'Workload', 'Tasks', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member, i) => {
                const color = memberColors[teamMembers.findIndex(m => m.id === member.id)] ?? memberColors[0];
                const role = roleStyles[member.role];
                const tc = memberTaskCounts[member.id] ?? { assigned: 0, total: 5 };
                const pct = tc.total > 0 ? (tc.assigned / tc.total) * 100 : 0;
                const status = onlineStatus[member.id] ?? 'online';
                return (
                  <motion.tr
                    key={member.id}
                    className="border-b border-surface-100 hover:bg-surface-50 transition-colors"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={member.name} color={color} size="lg" />
                        <div>
                          <div className="font-bold text-xs text-gray-900">{member.name}</div>
                          <div className="text-[10px] text-gray-400">{designations[member.id]}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${role.bg} ${role.text}`}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{locations[member.id]}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{tc.assigned}/{tc.total}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-900">{tc.assigned}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor[status] }} />
                        <span className="text-xs font-medium" style={{ color: statusColor[status] }}>{statusLabel[status]}</span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Side panels */}
        <div className="flex flex-col gap-4">
          {/* Role Distribution */}
          <motion.div className="bg-white rounded-2xl shadow-card border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Role Distribution</h3>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full shrink-0" style={{ background: donutGradient }} />
              <div className="flex flex-col gap-1.5">
                {[{ label: 'Admin', count: adminCount, color: '#5030E5' }, { label: 'Manager', count: managerCount, color: '#D97706' }, { label: 'Member', count: memberCount, color: '#68B266' }].map(d => (
                  <div key={d.label} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-gray-500 flex-1">{d.label}</span>
                    <span className="font-bold text-gray-900">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Location Split */}
          <motion.div className="bg-white rounded-2xl shadow-card border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Location Split</h3>
            {Object.entries(locationCounts).map(([loc, count]) => (
              <div key={loc} className="flex items-center gap-2 py-2 border-b border-surface-100 last:border-0">
                <span className="text-xs text-gray-500 flex-1">{loc}</span>
                <div className="w-16 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-primary-400" style={{ width: `${(count / teamMembers.length) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-gray-900 w-4 text-right">{count}</span>
              </div>
            ))}
          </motion.div>

          {/* Availability */}
          <motion.div className="bg-white rounded-2xl shadow-card border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.16, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Availability</h3>
            {(['online', 'away', 'offline'] as const).map(s => {
              const count = Object.values(onlineStatus).filter(v => v === s).length;
              return (
                <div key={s} className="flex items-center gap-2 py-2 border-b border-surface-100 last:border-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor[s] }} />
                  <span className="text-xs text-gray-500 flex-1 capitalize">{s}</span>
                  <span className="text-xs font-bold text-gray-900">{count}</span>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  </motion.div>
);

export default MembersPage;
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: `✓ built in` with no TypeScript errors.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:5173/#/members`.
Expected: Fixed-width, 4 metrics (first purple gradient), table with 6 columns including workload bars and online dots, 3 right side panels.

---

### Task 5: TeamsPage

**Files:**
- Modify: `src/pages/TeamsPage.tsx`

**Context:**
- Existing: vertical list of 4 project cards.
- Target: 4-metric strip + two-column body (projects table with progress bars left; Project Breakdown donut / Member Load right).
- `teamMembersMap` stores user IDs (not names). Color resolution via `findIndex`. Names derived via `teamMembers.find`.

- [ ] **Step 1: Replace TeamsPage.tsx with the full implementation**

Write `src/pages/TeamsPage.tsx`:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, CheckSquare, TrendingUp, Activity, Plus } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { AvatarGroup } from '../components/ui/Avatar';
import { projects, teamMembers, memberColors } from '../data/mockData';

const teamMembersMap: Record<string, string[]> = {
  p1: ['u1', 'u2', 'u3'],
  p2: ['u4', 'u5'],
  p3: ['u1', 'u6', 'u3'],
  p4: ['u2', 'u4', 'u5', 'u6'],
};
const taskCounts: Record<string, number> = { p1: 7, p2: 5, p3: 3, p4: 4 };
const completedCounts: Record<string, number> = { p1: 2, p2: 1, p3: 1, p4: 0 };

const totalTasks = Object.values(taskCounts).reduce((s, v) => s + v, 0);
const totalCompleted = Object.values(completedCounts).reduce((s, v) => s + v, 0);
const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

// Member load: how many projects each member appears in
const memberLoad: Record<string, number> = {};
Object.values(teamMembersMap).forEach(ids => ids.forEach(id => { memberLoad[id] = (memberLoad[id] ?? 0) + 1; }));
const maxLoad = Math.max(...Object.values(memberLoad));

const donutGradient = (() => {
  if (totalTasks === 0) return '#e5e7eb';
  let pct = 0;
  const stops = projects.map(p => {
    const start = pct;
    pct += (taskCounts[p.id] / totalTasks) * 100;
    return `${p.color} ${start}% ${pct}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
})();

const metrics = [
  { label: 'Total Projects', value: String(projects.length), trend: 'Active', trendUp: true, color: '', accent: true, icon: FolderOpen, barPct: 100 },
  { label: 'Total Tasks', value: String(totalTasks), trend: 'All projects', trendUp: true, color: '#5030E5', accent: false, icon: CheckSquare, barPct: 100 },
  { label: 'Completed', value: String(totalCompleted), trend: '↑ 1 today', trendUp: true, color: '#68B266', accent: false, icon: TrendingUp, barPct: totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0 },
  { label: 'Completion Rate', value: `${completionRate}%`, trend: 'This sprint', trendUp: true, color: '#FFA500', accent: false, icon: Activity, barPct: completionRate },
];

const tabs = ['All', 'Active', 'Completed'];

const TeamsPage: React.FC = () => (
  <motion.div
    className="flex-1 overflow-y-auto px-8 pb-8"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    transition={{ duration: 0.3, delay: 0.1 }}
  >
    <div className="max-w-[860px] mx-auto">
      <div className="py-6">
        <PageHeader
          eyebrow="Home / Teams"
          title="Teams"
          description="Project teams"
          actions={
            <motion.button className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Plus size={16} /> New Team
            </motion.button>
          }
        />
      </div>

      {/* 4-metric strip */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              className={`rounded-xl p-4 shadow-card ${m.accent ? 'bg-gradient-to-br from-primary-500 to-primary-400 text-white' : 'bg-white border border-surface-200'}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.accent ? 'bg-white/15' : ''}`} style={!m.accent ? { background: m.color + '20' } : {}}>
                  <Icon size={16} className={m.accent ? 'text-white' : ''} style={!m.accent ? { color: m.color } : {}} />
                </div>
                <span className={`text-xs font-semibold ${m.accent ? 'text-white/70' : 'text-[#68B266]'}`}>{m.trend}</span>
              </div>
              <div className={`text-3xl font-extrabold tracking-tight ${m.accent ? 'text-white' : ''}`} style={!m.accent ? { color: m.color } : {}}>{m.value}</div>
              <div className={`text-xs mt-1 ${m.accent ? 'text-white/70' : 'text-gray-400'}`}>{m.label}</div>
              <div className={`mt-3 h-1 rounded-full overflow-hidden ${m.accent ? 'bg-white/20' : 'bg-surface-200'}`}>
                <div className="h-full rounded-full" style={{ width: `${m.barPct}%`, background: m.accent ? 'rgba(255,255,255,0.6)' : m.color }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-[1fr_280px] gap-4">
        {/* Main: Projects table */}
        <div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h2 className="font-bold text-gray-900 text-sm">All Projects</h2>
          </div>
          <div className="px-5 pt-3">
            <div className="flex gap-1 bg-surface-100 rounded-lg p-1 mb-3 w-fit">
              {tabs.map((t, i) => (
                <div key={t} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${i === 0 ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}>{t}</div>
              ))}
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                {['Project', 'Members', 'Tasks', 'Done', 'Progress', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((project, i) => {
                const ids = teamMembersMap[project.id] ?? [];
                const names = ids.map(id => teamMembers.find(m => m.id === id)?.name ?? 'Unknown');
                const colors = ids.map(id => memberColors[teamMembers.findIndex(m => m.id === id)] ?? memberColors[0]);
                const total = taskCounts[project.id] ?? 0;
                const done = completedCounts[project.id] ?? 0;
                const pct = total > 0 ? (done / total) * 100 : 0;
                return (
                  <motion.tr
                    key={project.id}
                    className="border-b border-surface-100 hover:bg-surface-50 transition-colors"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                        <span className="font-bold text-xs text-gray-900">{project.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><AvatarGroup names={names} colors={colors} size="sm" max={4} /></td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-700">{total}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-[#68B266]">{done}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: project.color }} />
                        </div>
                        <span className="text-[10px] text-gray-400">{Math.round(pct)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {/* All projects shown as Active — mockData has no status field */}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#83C29D33] text-[#68B266]">Active</span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Side panels */}
        <div className="flex flex-col gap-4">
          {/* Project Breakdown donut */}
          <motion.div className="bg-white rounded-2xl shadow-card border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Project Breakdown</h3>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full shrink-0" style={{ background: donutGradient }} />
              <div className="flex flex-col gap-1.5">
                {projects.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="text-gray-500 flex-1 truncate">{p.name}</span>
                    <span className="font-bold text-gray-900">{taskCounts[p.id]}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Member Load */}
          <motion.div className="bg-white rounded-2xl shadow-card border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Member Load</h3>
            {Object.entries(memberLoad).map(([id, count]) => {
              const member = teamMembers.find(m => m.id === id);
              if (!member) return null;
              const color = memberColors[teamMembers.findIndex(m => m.id === id)] ?? memberColors[0];
              return (
                <div key={id} className="flex items-center gap-2 py-2 border-b border-surface-100 last:border-0 text-xs">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-gray-500 flex-1 truncate">{member.name.split(' ')[0]}</span>
                  <div className="w-14 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(count / maxLoad) * 100}%`, background: color }} />
                  </div>
                  <span className="font-bold text-gray-900 w-8 text-right">{count} proj</span>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  </motion.div>
);

export default TeamsPage;
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: `✓ built in` with no TypeScript errors.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:5173/#/teams`.
Expected: 4 metrics, projects table with progress bars, Project Breakdown donut and Member Load side panels.

---

### Task 6: AttendancePage

**Files:**
- Modify: `src/pages/AttendancePage.tsx`

**Context:**
- Existing: table with attendance dots and rate badge.
- Target: 4-metric strip + two-column body (attendance table with `designations` map for Role column left; Attendance Summary / Daily Breakdown right).
- Uses `designations[member.id]` — never `member.designation`.

- [ ] **Step 1: Replace AttendancePage.tsx with the full implementation**

Write `src/pages/AttendancePage.tsx`:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Download, TrendingUp, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { teamMembers, memberColors } from '../data/mockData';

const designations: Record<string, string> = {
  u1: 'Project Manager', u2: 'Frontend Developer', u3: 'UI Designer',
  u4: 'Backend Developer', u5: 'QA Engineer', u6: 'DevOps Engineer',
};
const attendanceData: Record<string, boolean[]> = {
  u1: [true, true, true, true, true],
  u2: [true, true, false, true, true],
  u3: [true, true, true, true, false],
  u4: [true, false, true, true, true],
  u5: [true, true, true, false, true],
  u6: [false, true, true, true, true],
};
const rateStyles: Record<string, { bg: string; text: string }> = {
  '100%': { bg: 'bg-[#83C29D33]', text: 'text-[#68B266]' },
  '80%': { bg: 'bg-[#DFA87433]', text: 'text-[#D58D49]' },
};
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const totalPresent = Object.values(attendanceData).flat().filter(Boolean).length;
const totalAbsent = Object.values(attendanceData).flat().filter(v => !v).length;
const perfectCount = Object.values(attendanceData).filter(d => d.every(Boolean)).length;
const avgRate = Math.round((totalPresent / (teamMembers.length * 5)) * 100);

// Daily totals: how many present each day
const dailyPresent = days.map((_, di) =>
  Object.values(attendanceData).filter(d => d[di]).length
);

const metrics = [
  { label: 'Team Avg Rate', value: `${avgRate}%`, trend: 'This week', trendUp: true, color: '', accent: true, icon: TrendingUp, barPct: avgRate },
  { label: 'Perfect Attendance', value: String(perfectCount), trend: '100% rate', trendUp: true, color: '#68B266', accent: false, icon: CheckCircle, barPct: (perfectCount / teamMembers.length) * 100 },
  { label: 'One Absence', value: String(teamMembers.length - perfectCount), trend: '80% rate', trendUp: false, color: '#D58D49', accent: false, icon: AlertCircle, barPct: ((teamMembers.length - perfectCount) / teamMembers.length) * 100 },
  { label: 'Days Tracked', value: '5', trend: 'Mon–Fri', trendUp: true, color: '#30C5E5', accent: false, icon: Calendar, barPct: 100 },
];

const AttendancePage: React.FC = () => (
  <motion.div
    className="flex-1 overflow-y-auto px-8 pb-8"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    transition={{ duration: 0.3, delay: 0.1 }}
  >
    <div className="max-w-[860px] mx-auto">
      <div className="py-6">
        <PageHeader
          eyebrow="Home / Attendance"
          title="Attendance"
          description="Weekly overview"
          actions={
            <motion.button className="flex items-center gap-2 bg-white border border-surface-200 text-gray-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-surface-100 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Download size={16} /> Export
            </motion.button>
          }
        />
      </div>

      {/* 4-metric strip */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              className={`rounded-xl p-4 shadow-card ${m.accent ? 'bg-gradient-to-br from-primary-500 to-primary-400 text-white' : 'bg-white border border-surface-200'}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.accent ? 'bg-white/15' : ''}`} style={!m.accent ? { background: m.color + '20' } : {}}>
                  <Icon size={16} className={m.accent ? 'text-white' : ''} style={!m.accent ? { color: m.color } : {}} />
                </div>
                <span className={`text-xs font-semibold ${m.accent ? 'text-white/70' : m.trendUp ? 'text-[#68B266]' : 'text-[#D8727D]'}`}>{m.trend}</span>
              </div>
              <div className={`text-3xl font-extrabold tracking-tight ${m.accent ? 'text-white' : ''}`} style={!m.accent ? { color: m.color } : {}}>{m.value}</div>
              <div className={`text-xs mt-1 ${m.accent ? 'text-white/70' : 'text-gray-400'}`}>{m.label}</div>
              <div className={`mt-3 h-1 rounded-full overflow-hidden ${m.accent ? 'bg-white/20' : 'bg-surface-200'}`}>
                <div className="h-full rounded-full" style={{ width: `${m.barPct}%`, background: m.accent ? 'rgba(255,255,255,0.6)' : m.color }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-[1fr_280px] gap-4">
        {/* Main: Attendance table */}
        <div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h2 className="font-bold text-gray-900 text-sm">Weekly Attendance</h2>
            <span className="text-xs text-gray-400">Dec 1–5, 2020</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50">Member</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50">Role</th>
                {days.map(d => (
                  <th key={d} className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50">{d}</th>
                ))}
                <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50">Rate</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member, i) => {
                const color = memberColors[teamMembers.findIndex(m => m.id === member.id)] ?? memberColors[0];
                const dayData = attendanceData[member.id] ?? [];
                const presentCount = dayData.filter(Boolean).length;
                const rate = presentCount === 5 ? '100%' : '80%';
                const rateStyle = rateStyles[rate];
                return (
                  <motion.tr
                    key={member.id}
                    className="border-b border-surface-100 hover:bg-surface-50 transition-colors"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={member.name} color={color} size="sm" />
                        <span className="font-semibold text-xs text-gray-900">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{designations[member.id]}</td>
                    {dayData.map((present, di) => (
                      <td key={di} className="px-3 py-3 text-center">
                        <div className={`w-2.5 h-2.5 rounded-full mx-auto ${present ? 'bg-[#68B266]' : 'bg-[#D8727D]'}`} />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${rateStyle?.bg ?? ''} ${rateStyle?.text ?? ''}`}>{rate}</span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Side panels */}
        <div className="flex flex-col gap-4">
          {/* Attendance Summary */}
          <motion.div className="bg-white rounded-2xl shadow-card border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Attendance Summary</h3>
            {[['Present days', totalPresent], ['Absent days', totalAbsent], ['Perfect streak', perfectCount]].map(([label, val]) => (
              <div key={String(label)} className="flex justify-between py-2 border-b border-surface-100 last:border-0 text-xs">
                <span className="text-gray-500">{label}</span>
                <span className="font-bold text-gray-900">{val}</span>
              </div>
            ))}
          </motion.div>

          {/* Daily Breakdown */}
          <motion.div className="bg-white rounded-2xl shadow-card border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Daily Breakdown</h3>
            {days.map((day, di) => {
              const present = dailyPresent[di];
              const pct = (present / teamMembers.length) * 100;
              const allPresent = present === teamMembers.length;
              return (
                <div key={day} className="flex items-center gap-2 py-2 border-b border-surface-100 last:border-0 text-xs">
                  <span className="text-gray-500 w-8 shrink-0">{day}</span>
                  <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: allPresent ? '#68B266' : '#FFA500' }} />
                  </div>
                  <span className="font-bold text-gray-900 w-8 text-right">{present}/{teamMembers.length}</span>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  </motion.div>
);

export default AttendancePage;
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: `✓ built in` with no TypeScript errors.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:5173/#/attendance`.
Expected: 4 metrics, attendance table with green/red dots, Rate badges, two side panels.

---

## Chunk 3: Reports, Organization, Settings

### Task 7: ReportsPage

**Files:**
- Modify: `src/pages/ReportsPage.tsx`

**Context:**
- Existing: 3-metric grid + animated bar chart card.
- Target: 4-metric strip (Completion Rate accent) + two-column body (Task Breakdown bars + By Project section left; Priority donut / Team Velocity right).

- [ ] **Step 1: Replace ReportsPage.tsx with the full implementation**

Write `src/pages/ReportsPage.tsx`:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Download, BarChart3, TrendingUp, Users, AlertCircle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { teamMembers, todoTasks, inProgressTasks, doneTasks, projects } from '../data/mockData';
import { Task } from '../types';

const taskProjects: Record<string, string> = {
  t1: 'p2', t2: 'p4', t3: 'p4', t4: 'p1', t5: 'p3', t6: 'p1', t7: 'p3',
};

const allTasks: Task[] = [...todoTasks, ...inProgressTasks, ...doneTasks];
const totalTasks = allTasks.length;
const completionRate = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;
const overdueCount = 2;

const bars = [
  { label: 'To Do', count: todoTasks.length, color: '#5030E5' },
  { label: 'In Progress', count: inProgressTasks.length, color: '#FFA500' },
  { label: 'Done', count: doneTasks.length, color: '#68B266' },
];

// Tasks per project
const projectTaskCounts: Record<string, number> = {};
allTasks.forEach(t => {
  const pid = taskProjects[t.id];
  if (pid) projectTaskCounts[pid] = (projectTaskCounts[pid] ?? 0) + 1;
});

const highCount = allTasks.filter(t => t.priority === 'high').length;
const lowCount = allTasks.filter(t => t.priority === 'low').length;
const doneCount = doneTasks.length;
const donutGradient = (() => {
  if (totalTasks === 0) return '#e5e7eb';
  const h = (highCount / totalTasks) * 100;
  const l = (lowCount / totalTasks) * 100;
  return `conic-gradient(#D8727D 0% ${h}%, #D58D49 ${h}% ${h + l}%, #68B266 ${h + l}% 100%)`;
})();

const metrics = [
  { label: 'Completion Rate', value: `${completionRate}%`, trend: '↓ vs last sprint', trendUp: false, color: '', accent: true, icon: TrendingUp, barPct: completionRate },
  { label: 'Total Tasks', value: String(totalTasks), trend: 'All projects', trendUp: true, color: '#5030E5', accent: false, icon: BarChart3, barPct: 100 },
  { label: 'Active Members', value: String(teamMembers.length), trend: 'Contributing', trendUp: true, color: '#68B266', accent: false, icon: Users, barPct: 100 },
  { label: 'Overdue', value: String(overdueCount), trend: 'Need attention', trendUp: false, color: '#D8727D', accent: false, icon: AlertCircle, barPct: totalTasks > 0 ? (overdueCount / totalTasks) * 100 : 0 },
];

const ReportsPage: React.FC = () => (
  <motion.div
    className="flex-1 overflow-y-auto px-8 pb-8"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    transition={{ duration: 0.3, delay: 0.1 }}
  >
    <div className="max-w-[860px] mx-auto">
      <div className="py-6">
        <PageHeader
          eyebrow="Home / Reports"
          title="Reports"
          description="Project analytics"
          actions={
            <motion.button className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Download size={16} /> Download Report
            </motion.button>
          }
        />
      </div>

      {/* 4-metric strip */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              className={`rounded-xl p-4 shadow-card ${m.accent ? 'bg-gradient-to-br from-primary-500 to-primary-400 text-white' : 'bg-white border border-surface-200'}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.accent ? 'bg-white/15' : ''}`} style={!m.accent ? { background: m.color + '20' } : {}}>
                  <Icon size={16} className={m.accent ? 'text-white' : ''} style={!m.accent ? { color: m.color } : {}} />
                </div>
                <span className={`text-xs font-semibold ${m.accent ? 'text-white/70' : m.trendUp ? 'text-[#68B266]' : 'text-[#D8727D]'}`}>{m.trend}</span>
              </div>
              <div className={`text-3xl font-extrabold tracking-tight ${m.accent ? 'text-white' : ''}`} style={!m.accent ? { color: m.color } : {}}>{m.value}</div>
              <div className={`text-xs mt-1 ${m.accent ? 'text-white/70' : 'text-gray-400'}`}>{m.label}</div>
              <div className={`mt-3 h-1 rounded-full overflow-hidden ${m.accent ? 'bg-white/20' : 'bg-surface-200'}`}>
                <div className="h-full rounded-full" style={{ width: `${m.barPct}%`, background: m.accent ? 'rgba(255,255,255,0.6)' : m.color }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-[1fr_280px] gap-4">
        {/* Main: Task Breakdown + By Project */}
        <div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h2 className="font-bold text-gray-900 text-sm">Task Breakdown</h2>
          </div>
          <div className="px-5 py-4">
            {bars.map((bar, i) => (
              <motion.div key={bar.label} className="flex items-center gap-4 mb-4 last:mb-0"
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}>
                <span className="text-xs text-gray-600 w-24 shrink-0">{bar.label}</span>
                <div className="flex-1 bg-surface-200 rounded-full h-2.5 overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: bar.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${totalTasks > 0 ? (bar.count / totalTasks) * 100 : 0}%` }}
                    transition={{ duration: 0.6, delay: i * 0.1 + 0.3, ease: [0.4, 0, 0.2, 1] }} />
                </div>
                <span className="text-xs text-gray-500 w-6 text-right shrink-0">{bar.count}</span>
              </motion.div>
            ))}

            <div className="mt-5 pt-4 border-t border-surface-100">
              <h3 className="font-bold text-gray-900 text-xs mb-3">By Project</h3>
              {projects.map((project, i) => {
                const count = projectTaskCounts[project.id] ?? 0;
                const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                return (
                  <motion.div key={project.id} className="flex items-center gap-3 mb-3 last:mb-0"
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.06 + 0.3, ease: [0.4, 0, 0.2, 1] }}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                    <span className="text-xs text-gray-600 w-28 shrink-0 truncate">{project.name}</span>
                    <div className="flex-1 bg-surface-200 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: project.color }} />
                    </div>
                    <span className="text-xs text-gray-500 w-4 text-right shrink-0">{count}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Side panels */}
        <div className="flex flex-col gap-4">
          {/* Priority Breakdown donut */}
          <motion.div className="bg-white rounded-2xl shadow-card border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Priority Breakdown</h3>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full shrink-0" style={{ background: donutGradient }} />
              <div className="flex flex-col gap-1.5">
                {[{ label: 'High', count: highCount, color: '#D8727D' }, { label: 'Low', count: lowCount, color: '#D58D49' }, { label: 'Done', count: doneCount, color: '#68B266' }].map(d => (
                  <div key={d.label} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-gray-500 flex-1">{d.label}</span>
                    <span className="font-bold text-gray-900">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Team Velocity */}
          <motion.div className="bg-white rounded-2xl shadow-card border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Team Velocity</h3>
            {[['Tasks / day', '2.3'], ['Sprint days left', '26'], ['Projected done', 'Dec 31']].map(([label, val]) => (
              <div key={String(label)} className="flex justify-between py-2 border-b border-surface-100 last:border-0 text-xs">
                <span className="text-gray-500">{label}</span>
                <span className="font-bold text-gray-900">{val}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  </motion.div>
);

export default ReportsPage;
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: `✓ built in` with no TypeScript errors.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:5173/#/reports`.
Expected: 4 metrics (Completion Rate accent), animated bar chart, By Project section, two side panels.

---

### Task 8: OrganizationPage

**Files:**
- Modify: `src/pages/OrganizationPage.tsx`

**Context:**
- Existing: root node + connector + subordinate flex row.
- Target: 4-metric strip + two-column body (upgraded org chart left; Department Roster / Reporting Lines right).
- Uses `designations[member.id]` — never `member.designation`.

- [ ] **Step 1: Replace OrganizationPage.tsx with the full implementation**

Write `src/pages/OrganizationPage.tsx`:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, MapPin, BarChart2, UserPlus } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { currentUser, teamMembers, memberColors } from '../data/mockData';

const designations: Record<string, string> = {
  u1: 'Project Manager', u2: 'Frontend Developer', u3: 'UI Designer',
  u4: 'Backend Developer', u5: 'QA Engineer', u6: 'DevOps Engineer',
};
const roleStyles: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'bg-primary-50', text: 'text-primary-600' },
  manager: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]' },
  member: { bg: 'bg-surface-200', text: 'text-gray-500' },
};

const subordinates = teamMembers.filter(m => m.id !== currentUser.id);
const locationCount = 3;
const avgWorkload = '2.3';

const metrics = [
  { label: 'Total Members', value: String(teamMembers.length), trend: 'In org', trendUp: true, color: '', accent: true, icon: Users, barPct: 100 },
  { label: 'Departments', value: '5', trend: 'Roles', trendUp: true, color: '#5030E5', accent: false, icon: Building2, barPct: 100 },
  { label: 'Locations', value: String(locationCount), trend: 'Cities', trendUp: true, color: '#30C5E5', accent: false, icon: MapPin, barPct: (locationCount / 5) * 100 },
  { label: 'Avg Workload', value: avgWorkload, trend: 'tasks/member', trendUp: true, color: '#FFA500', accent: false, icon: BarChart2, barPct: 46 },
];

const deptRoster = [
  { icon: '🏗', role: 'Project Manager', member: 'Anima Agrawal' },
  { icon: '💻', role: 'Frontend Developer', member: 'Rohan Kumar' },
  { icon: '🎨', role: 'UI Designer', member: 'Priya Singh' },
  { icon: '⚙️', role: 'Backend Developer', member: 'Arjun Patel' },
  { icon: '🔍', role: 'QA Engineer', member: 'Neha Sharma' },
];

const OrganizationPage: React.FC = () => (
  <motion.div
    className="flex-1 overflow-y-auto px-8 pb-8"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    transition={{ duration: 0.3, delay: 0.1 }}
  >
    <div className="max-w-[860px] mx-auto">
      <div className="py-6">
        <PageHeader
          eyebrow="Home / Organization"
          title="Organization"
          description="Team structure"
          actions={
            <motion.button className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <UserPlus size={16} /> Add Member
            </motion.button>
          }
        />
      </div>

      {/* 4-metric strip */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              className={`rounded-xl p-4 shadow-card ${m.accent ? 'bg-gradient-to-br from-primary-500 to-primary-400 text-white' : 'bg-white border border-surface-200'}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.accent ? 'bg-white/15' : ''}`} style={!m.accent ? { background: m.color + '20' } : {}}>
                  <Icon size={16} className={m.accent ? 'text-white' : ''} style={!m.accent ? { color: m.color } : {}} />
                </div>
                <span className={`text-xs font-semibold ${m.accent ? 'text-white/70' : 'text-[#68B266]'}`}>{m.trend}</span>
              </div>
              <div className={`text-3xl font-extrabold tracking-tight ${m.accent ? 'text-white' : ''}`} style={!m.accent ? { color: m.color } : {}}>{m.value}</div>
              <div className={`text-xs mt-1 ${m.accent ? 'text-white/70' : 'text-gray-400'}`}>{m.label}</div>
              <div className={`mt-3 h-1 rounded-full overflow-hidden ${m.accent ? 'bg-white/20' : 'bg-surface-200'}`}>
                <div className="h-full rounded-full" style={{ width: `${m.barPct}%`, background: m.accent ? 'rgba(255,255,255,0.6)' : m.color }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-[1fr_280px] gap-4">
        {/* Main: Org Chart */}
        <div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h2 className="font-bold text-gray-900 text-sm">Org Chart</h2>
          </div>
          <div className="p-8">
            {/* Root node */}
            <motion.div className="flex justify-center mb-0"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}>
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200 rounded-2xl p-5 text-center w-44">
                <Avatar name={currentUser.name} color={memberColors[0]} size="xl" className="mx-auto" />
                <div className="font-bold text-gray-900 text-sm mt-2">{currentUser.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{designations[currentUser.id]}</div>
                <span className="bg-primary-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 inline-block">Admin</span>
              </div>
            </motion.div>

            {/* Connector */}
            <div className="mx-auto w-px h-10 bg-surface-300" />

            {/* Horizontal line */}
            <div className="relative h-px bg-surface-300 mx-8 mb-0" />

            {/* Subordinate nodes */}
            <div className="flex flex-wrap justify-center gap-3 mt-0">
              {subordinates.map((member, i) => {
                const color = memberColors[teamMembers.findIndex(m => m.id === member.id)] ?? memberColors[0];
                const role = roleStyles[member.role];
                return (
                  <motion.div
                    key={member.id}
                    className="bg-white border border-surface-200 rounded-xl p-4 text-center w-40 hover:shadow-card-hover transition-shadow"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.06, ease: [0.4, 0, 0.2, 1] }}
                    whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  >
                    <Avatar name={member.name} color={color} size="lg" className="mx-auto" />
                    <div className="font-semibold text-gray-800 text-xs mt-2">{member.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{designations[member.id]}</div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md mt-1.5 inline-block ${role.bg} ${role.text}`}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Side panels */}
        <div className="flex flex-col gap-4">
          {/* Department Roster */}
          <motion.div className="bg-white rounded-2xl shadow-card border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Department Roster</h3>
            {deptRoster.map((d, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2 border-b border-surface-100 last:border-0">
                <span className="text-base">{d.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-400">{d.role}</div>
                  <div className="text-xs font-semibold text-gray-900 truncate">{d.member}</div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Reporting Lines */}
          <motion.div className="bg-white rounded-2xl shadow-card border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Reporting Lines</h3>
            <div className="text-xs text-gray-700 font-semibold mb-2">{currentUser.name}</div>
            <div className="flex flex-col gap-1.5 pl-3 border-l-2 border-primary-200">
              {subordinates.map(m => (
                <div key={m.id} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="text-primary-300">→</span> {m.name}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  </motion.div>
);

export default OrganizationPage;
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: `✓ built in` with no TypeScript errors.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:5173/#/organization`.
Expected: 4 metrics, org chart with root node + connector + subordinate cards with role badges, two side panels.

---

### Task 9: SettingsPage

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

**Context:**
- Existing: 3 stacked white cards (Profile / Notifications / Appearance).
- Target: No metric strip (layout exception). Two-column grid — Profile + Notifications left; Appearance + Account right. Profile card has Avatar header row. Account card has storage progress bar.

- [ ] **Step 1: Replace SettingsPage.tsx with the full implementation**

Write `src/pages/SettingsPage.tsx`:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { currentUser, memberColors } from '../data/mockData';

const Toggle: React.FC<{ on: boolean }> = ({ on }) => (
  <div className={`w-9 h-5 rounded-full relative transition-colors ${on ? 'bg-primary-500' : 'bg-surface-300'}`}>
    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${on ? 'right-0.5' : 'left-0.5'}`} />
  </div>
);

const SettingsPage: React.FC = () => (
  <motion.div
    className="flex-1 overflow-y-auto px-8 pb-8"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    transition={{ duration: 0.3, delay: 0.1 }}
  >
    <div className="max-w-[860px] mx-auto">
      <div className="py-6">
        <PageHeader
          eyebrow="Home / Settings"
          title="Settings"
          description="Account & preferences"
          actions={
            <motion.button className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Save size={16} /> Save Changes
            </motion.button>
          }
        />
      </div>

      <div className="mt-0 grid grid-cols-[1fr_280px] gap-4">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Profile card */}
          <motion.div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <h2 className="font-bold text-gray-900 text-sm">Profile</h2>
              <span className="text-xs text-primary-500 font-semibold">Edit</span>
            </div>
            {/* Avatar header */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-surface-100">
              <Avatar name={currentUser.name} color={memberColors[0]} size="xl" />
              <div>
                <div className="font-bold text-gray-900">{currentUser.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}</div>
                <span className="bg-primary-50 text-primary-600 text-xs font-semibold px-2 py-0.5 rounded-md mt-1 inline-block">Admin</span>
              </div>
            </div>
            {/* Rows */}
            {[
              { label: 'Name', value: currentUser.name },
              { label: 'Location', value: currentUser.location ?? 'Not set' },
              { label: 'Role', value: currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) },
              { label: 'Joined', value: 'December 2020' },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-surface-100 last:border-0">
                <span className="text-sm font-medium text-gray-500">{row.label}</span>
                <span className="text-sm font-semibold text-gray-900">{row.value}</span>
              </div>
            ))}
          </motion.div>

          {/* Notifications card */}
          <motion.div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.16, ease: [0.4, 0, 0.2, 1] }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <h2 className="font-bold text-gray-900 text-sm">Notifications</h2>
            </div>
            <p className="text-xs text-gray-400 px-5 pt-3 pb-1">Control what updates you receive</p>
            {[
              { label: 'Task updates', sublabel: 'Get notified when tasks change', on: true },
              { label: 'Team mentions', sublabel: 'Alerts when someone mentions you', on: true },
              { label: 'Weekly digest', sublabel: 'Summary email every Monday', on: false },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-surface-100 last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-900">{row.label}</div>
                  <div className="text-xs text-gray-400">{row.sublabel}</div>
                </div>
                <Toggle on={row.on} />
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Appearance card */}
          <motion.div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <h2 className="font-bold text-gray-900 text-sm">Appearance</h2>
            </div>
            {[
              { label: 'Theme', value: 'Light' },
              { label: 'Language', value: 'English' },
              { label: 'Timezone', value: 'IST +5:30' },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-surface-100 last:border-0">
                <span className="text-sm font-medium text-gray-500">{row.label}</span>
                <span className="bg-surface-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">{row.value}</span>
              </div>
            ))}
          </motion.div>

          {/* Account card */}
          <motion.div className="bg-white rounded-2xl shadow-card border border-surface-200 overflow-hidden"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.16, ease: [0.4, 0, 0.2, 1] }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <h2 className="font-bold text-gray-900 text-sm">Account</h2>
            </div>
            {/* Plan */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-surface-100">
              <span className="text-sm font-medium text-gray-500">Plan</span>
              <div className="flex items-center gap-2">
                <span className="bg-surface-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">Free</span>
                <span className="text-xs font-semibold text-primary-500">Upgrade</span>
              </div>
            </div>
            {/* Storage */}
            <div className="px-5 py-3 border-b border-surface-100">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-gray-500">Storage</span>
                <span className="text-gray-400">2.3 GB / 5 GB</span>
              </div>
              <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary-400 rounded-full" style={{ width: '46%' }} />
              </div>
            </div>
            {/* Last login */}
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm font-medium text-gray-500">Last login</span>
              <span className="text-sm font-semibold text-gray-900">Today, 9:41 AM</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  </motion.div>
);

export default SettingsPage;
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: `✓ built in` with no TypeScript errors.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:5173/#/settings`.
Expected: Two-column layout, Profile card with Avatar header + 4 rows, Notifications card with toggles, Appearance and Account cards on right.

---

## Final Verification

- [ ] **Run full build**

Run: `npm run build`
Expected: `✓ built in` — 2170+ modules, no TypeScript errors, no warnings about missing exports.

- [ ] **Spot-check all routes in browser**

Run: `npm run dev`, then visit each route and confirm:
- `/#/dashboard` — 4 metrics, Recent Activity + 3 side panels
- `/#/tasks` — 4 metrics, 6-column table, Sprint Summary + donut + Top Assignees
- `/#/messages` — chat layout, bubbles, unread badges
- `/#/members` — table with workload bars + online dots, 3 side panels
- `/#/teams` — projects table with progress bars, donut + member load
- `/#/attendance` — table with green/red dots, Daily Breakdown
- `/#/reports` — animated bar chart, By Project, donut + velocity
- `/#/organization` — org chart, Department Roster + Reporting Lines
- `/#/settings` — two-column, Profile + Notifications left, Appearance + Account right
- `/#/` (home KanbanBoard) — unchanged

- [ ] **Confirm no content stretches full width**

On each page, confirm the content area is constrained and centered, with visible `bg-surface-100` gutters on left and right at typical desktop widths (1280px+).
