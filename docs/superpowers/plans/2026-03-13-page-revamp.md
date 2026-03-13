# Page Revamp Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revamp all 9 non-home pages in ProjectX to match the home page (KanbanBoard) visual theme — clean, spacious, white cards on `bg-surface-100`, using `PageHeader`, `MetricCard`, `Avatar`/`AvatarGroup` reusable components, Framer Motion animations, and real mock data.

**Architecture:** Each page is a fully self-contained `.tsx` file in `src/pages/`. No shared template component. All pages import from existing components and mock data. No new dependencies or interactive state.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS (custom tokens: `primary`, `surface`, `column`, `priority`, `shadow-card`), Framer Motion, Lucide React.

**Spec:** `docs/superpowers/specs/2026-03-13-page-revamp-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/pages/DashboardPage.tsx` | Modify (replace stub) | Metric cards + recent activity |
| `src/pages/TasksPage.tsx` | Modify (replace stub) | Flat task list with priority/status |
| `src/pages/MessagesPage.tsx` | Modify (replace stub) | Two-column conversation layout |
| `src/pages/MembersPage.tsx` | Modify (replace stub) | Member card grid |
| `src/pages/TeamsPage.tsx` | Modify (replace stub) | Project team list |
| `src/pages/AttendancePage.tsx` | Modify (replace stub) | Weekly attendance table |
| `src/pages/ReportsPage.tsx` | Modify (replace stub) | Metric cards + bar chart |
| `src/pages/OrganizationPage.tsx` | Modify (replace stub) | Org chart flexbox layout |
| `src/pages/SettingsPage.tsx` | Modify (replace stub) | Profile/notifications/appearance cards |

No files are created. No files other than these 9 are modified.

---

## Chunk 1: Dashboard, Tasks, Messages

### Task 1: DashboardPage

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

- [ ] **Step 1: Write the full DashboardPage component**

Replace the stub at `src/pages/DashboardPage.tsx` with:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Users, CheckSquare, Clock, TrendingUp, CheckCircle, Plus, MessageSquare } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import MetricCard from '../components/ui/MetricCard';
import { teamMembers, doneTasks, todoTasks } from '../data/mockData';

const activityItems = [
  { icon: CheckCircle, color: 'text-[#68B266]', text: 'Mobile App Design marked as Done', time: '2m ago' },
  { icon: Plus, color: 'text-primary-500', text: 'Wireframes task created', time: '1h ago' },
  { icon: Users, color: 'text-[#30C5E5]', text: 'Priya Singh joined the team', time: '3h ago' },
  { icon: MessageSquare, color: 'text-gray-400', text: '12 new comments on Brainstorming', time: '5h ago' },
  { icon: Clock, color: 'text-[#FFA500]', text: 'Research task moved to In Progress', time: 'Yesterday' },
];

const DashboardPage: React.FC = () => {
  return (
    <motion.div
      className="flex-1 overflow-y-auto px-8 pb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="py-6">
        <PageHeader
          title="Dashboard"
          description="Project overview"
          actions={
            <motion.button
              className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={16} />
              New Report
            </motion.button>
          }
        />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <MetricCard
          label="Team Members"
          value={String(teamMembers.length)}
          hint="Active this sprint"
          icon={Users}
          iconClassName="bg-primary-50 text-primary-500"
        />
        <MetricCard
          label="Tasks Completed"
          value={String(doneTasks.length)}
          hint="This sprint"
          icon={CheckSquare}
          iconClassName="bg-[#83C29D33] text-[#68B266]"
        />
        <MetricCard
          label="Tasks Pending"
          value={String(todoTasks.length)}
          hint="Needs attention"
          icon={Clock}
          iconClassName="bg-[#DFA87433] text-[#D58D49]"
        />
        <MetricCard
          label="Attendance Rate"
          value="94%"
          hint="Weekly average"
          icon={TrendingUp}
          iconClassName="bg-[#30C5E533] text-[#30C5E5]"
        />
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div>
          {activityItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                className="flex items-center gap-3 py-3 border-b border-surface-200 last:border-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.06, ease: [0.4, 0, 0.2, 1] }}
              >
                <Icon size={16} className={item.color} />
                <span className="text-sm text-gray-700 flex-1">{item.text}</span>
                <span className="text-xs text-gray-400 shrink-0">{item.time}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;
```

- [ ] **Step 2: Verify the app builds without errors**

Run: `cd /Users/kkwenuja/Desktop/ProjectX && npm run build 2>&1 | tail -20`
Expected: no TypeScript errors, build succeeds

- [ ] **Step 3: Commit**

```bash
cd /Users/kkwenuja/Desktop/ProjectX
git add src/pages/DashboardPage.tsx
git commit -m "feat: revamp DashboardPage with metric cards and recent activity"
```

---

### Task 2: TasksPage

**Files:**
- Modify: `src/pages/TasksPage.tsx`

- [ ] **Step 1: Write the full TasksPage component**

Replace the stub at `src/pages/TasksPage.tsx` with:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { AvatarGroup } from '../components/ui/Avatar';
import { teamMembers, memberColors, todoTasks, inProgressTasks, doneTasks } from '../data/mockData';
import { Task } from '../types';

const priorityStyles: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-[#DFA87433]', text: 'text-[#D58D49]', label: 'Low' },
  high: { bg: 'bg-[#D8727D33]', text: 'text-[#D8727D]', label: 'High' },
  completed: { bg: 'bg-[#83C29D33]', text: 'text-[#68B266]', label: 'Completed' },
};

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  'todo': { bg: 'bg-primary-50', text: 'text-primary-600', label: 'To Do' },
  'in-progress': { bg: 'bg-[#FFA50020]', text: 'text-[#FFA500]', label: 'In Progress' },
  'done': { bg: 'bg-[#83C29D33]', text: 'text-[#68B266]', label: 'Done' },
};

const allTasks: Task[] = [...todoTasks, ...inProgressTasks, ...doneTasks];

const TasksPage: React.FC = () => {
  return (
    <motion.div
      className="flex-1 overflow-y-auto px-8 pb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="py-6">
        <PageHeader
          title="Tasks"
          description="All tasks across projects"
          actions={
            <motion.button
              className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={16} />
              New Task
            </motion.button>
          }
        />
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {allTasks.map((task, index) => {
          const priority = priorityStyles[task.priority];
          const status = statusStyles[task.status];
          const names = task.assignees.map(id => teamMembers.find(m => m.id === id)?.name ?? 'Unknown');
          const colors = task.assignees.map(id => memberColors[teamMembers.findIndex(m => m.id === id)] ?? memberColors[0]);

          return (
            <motion.div
              key={task.id}
              className="flex items-center gap-4 px-5 py-4 border-b border-surface-200 last:border-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05, ease: [0.4, 0, 0.2, 1] }}
            >
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-md shrink-0 ${priority.bg} ${priority.text}`}>
                {priority.label}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm">{task.title}</div>
                {task.description && (
                  <div className="text-xs text-gray-400 truncate">{task.description}</div>
                )}
              </div>
              <AvatarGroup names={names} colors={colors} size="sm" max={3} />
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default TasksPage;
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/kkwenuja/Desktop/ProjectX && npm run build 2>&1 | tail -20`
Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
cd /Users/kkwenuja/Desktop/ProjectX
git add src/pages/TasksPage.tsx
git commit -m "feat: revamp TasksPage with flat task list"
```

---

### Task 3: MessagesPage

**Files:**
- Modify: `src/pages/MessagesPage.tsx`

- [ ] **Step 1: Write the full MessagesPage component**

Replace the stub at `src/pages/MessagesPage.tsx` with:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Plus, MessageSquare } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { teamMembers, memberColors, currentUser } from '../data/mockData';

const lastMessages: Record<string, { text: string; time: string }> = {
  u2: { text: "Can you review the PR?", time: "2m" },
  u3: { text: "The design looks great!", time: "1h" },
  u4: { text: "Meeting at 3pm?", time: "3h" },
  u5: { text: "Pushed the latest build", time: "Yesterday" },
  u6: { text: "Check the new wireframes", time: "Mon" },
};

const MessagesPage: React.FC = () => {
  const conversations = teamMembers.filter(m => m.id !== currentUser.id);

  return (
    <motion.div
      className="flex-1 overflow-y-auto px-8 pb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="py-6">
        <PageHeader
          title="Messages"
          description="Team conversations"
          actions={
            <motion.button
              className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={16} />
              New Message
            </motion.button>
          }
        />
      </div>

      <div className="flex bg-white rounded-2xl shadow-card overflow-hidden h-[calc(100vh-220px)]">
        {/* Left panel — conversation list */}
        <div className="w-80 border-r border-surface-200 flex flex-col shrink-0">
          <div className="m-4">
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full bg-surface-100 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
              readOnly
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((member, index) => {
              const color = memberColors[teamMembers.findIndex(m => m.id === member.id)];
              const msg = lastMessages[member.id];
              return (
                <motion.div
                  key={member.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface-100 cursor-pointer transition-colors"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.06, ease: [0.4, 0, 0.2, 1] }}
                >
                  <Avatar name={member.name} color={color} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900">{member.name}</div>
                    <div className="text-xs text-gray-400 truncate">{msg?.text}</div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-auto">{msg?.time}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right panel — empty state */}
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <MessageSquare size={48} className="text-surface-300" />
          <p className="text-gray-500 font-medium">Select a conversation</p>
          <p className="text-xs text-gray-400">Choose from the list to start messaging</p>
        </div>
      </div>
    </motion.div>
  );
};

export default MessagesPage;
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/kkwenuja/Desktop/ProjectX && npm run build 2>&1 | tail -20`
Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
cd /Users/kkwenuja/Desktop/ProjectX
git add src/pages/MessagesPage.tsx
git commit -m "feat: revamp MessagesPage with two-column conversation layout"
```

---

## Chunk 2: Members, Teams, Attendance

### Task 4: MembersPage

**Files:**
- Modify: `src/pages/MembersPage.tsx`

- [ ] **Step 1: Write the full MembersPage component**

Replace the stub at `src/pages/MembersPage.tsx` with:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { teamMembers, memberColors } from '../data/mockData';

const designations: Record<string, string> = {
  u1: 'Project Manager',
  u2: 'Frontend Developer',
  u3: 'UI Designer',
  u4: 'Backend Developer',
  u5: 'QA Engineer',
  u6: 'DevOps Engineer',
};

const roleStyles: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'bg-primary-50', text: 'text-primary-600' },
  manager: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]' },
  member: { bg: 'bg-surface-200', text: 'text-gray-500' },
};

const MembersPage: React.FC = () => {
  return (
    <motion.div
      className="flex-1 overflow-y-auto px-8 pb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="py-6">
        <PageHeader
          title="Members"
          description={`${teamMembers.length} team members`}
          actions={
            <motion.button
              className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <UserPlus size={16} />
              Invite Member
            </motion.button>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {teamMembers.map((member, index) => {
          const role = roleStyles[member.role];
          return (
            <motion.div
              key={member.id}
              className="bg-white rounded-2xl shadow-card p-5 flex items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.08, ease: [0.4, 0, 0.2, 1] }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
            >
              <Avatar name={member.name} color={memberColors[index]} size="xl" />
              <div>
                <div className="font-bold text-gray-900 text-base">{member.name}</div>
                <div className="text-sm text-gray-500 mt-0.5">{designations[member.id]}</div>
                <div className="text-xs text-gray-400 mt-0.5">{member.location || 'Remote'}</div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md mt-1 inline-block ${role.bg} ${role.text}`}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default MembersPage;
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/kkwenuja/Desktop/ProjectX && npm run build 2>&1 | tail -20`
Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
cd /Users/kkwenuja/Desktop/ProjectX
git add src/pages/MembersPage.tsx
git commit -m "feat: revamp MembersPage with member card grid"
```

---

### Task 5: TeamsPage

**Files:**
- Modify: `src/pages/TeamsPage.tsx`

- [ ] **Step 1: Write the full TeamsPage component**

Replace the stub at `src/pages/TeamsPage.tsx` with:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { AvatarGroup } from '../components/ui/Avatar';
import { projects, teamMembers, memberColors } from '../data/mockData';

const teamMembersMap: Record<string, string[]> = {
  p1: ['Anima Agrawal', 'Rohan Kumar', 'Priya Singh'],
  p2: ['Arjun Patel', 'Neha Sharma'],
  p3: ['Anima Agrawal', 'Vikram Rao', 'Priya Singh'],
  p4: ['Rohan Kumar', 'Arjun Patel', 'Neha Sharma', 'Vikram Rao'],
};

const taskCounts: Record<string, number> = {
  p1: 7, p2: 5, p3: 3, p4: 4,
};

const teamAvatarColors = (names: string[]) =>
  names.map(name => memberColors[teamMembers.findIndex(m => m.name === name)] ?? memberColors[0]);

const TeamsPage: React.FC = () => {
  return (
    <motion.div
      className="flex-1 overflow-y-auto px-8 pb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="py-6">
        <PageHeader
          title="Teams"
          description="Project teams"
          actions={
            <motion.button
              className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={16} />
              New Team
            </motion.button>
          }
        />
      </div>

      <div className="flex flex-col gap-4">
        {projects.map((project, index) => {
          const names = teamMembersMap[project.id] ?? [];
          const colors = teamAvatarColors(names);
          return (
            <motion.div
              key={project.id}
              className="bg-white rounded-2xl shadow-card p-5 flex items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.08, ease: [0.4, 0, 0.2, 1] }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
            >
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
              <span className="font-bold text-gray-900 text-base flex-1">{project.name}</span>
              <AvatarGroup names={names} colors={colors} size="sm" max={4} />
              <span className="bg-surface-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full">
                {taskCounts[project.id]} tasks
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default TeamsPage;
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/kkwenuja/Desktop/ProjectX && npm run build 2>&1 | tail -20`
Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
cd /Users/kkwenuja/Desktop/ProjectX
git add src/pages/TeamsPage.tsx
git commit -m "feat: revamp TeamsPage with project team list"
```

---

### Task 6: AttendancePage

**Files:**
- Modify: `src/pages/AttendancePage.tsx`

- [ ] **Step 1: Write the full AttendancePage component**

Replace the stub at `src/pages/AttendancePage.tsx` with:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { teamMembers, memberColors } from '../data/mockData';

const designations: Record<string, string> = {
  u1: 'Project Manager',
  u2: 'Frontend Developer',
  u3: 'UI Designer',
  u4: 'Backend Developer',
  u5: 'QA Engineer',
  u6: 'DevOps Engineer',
};

// true = present, false = absent
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

const AttendancePage: React.FC = () => {
  return (
    <motion.div
      className="flex-1 overflow-y-auto px-8 pb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="py-6">
        <PageHeader
          title="Attendance"
          description="Weekly overview"
          actions={
            <motion.button
              className="flex items-center gap-2 border border-surface-300 text-gray-700 bg-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-surface-100 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download size={16} />
              Export
            </motion.button>
          }
        />
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <th className="px-5 py-3 text-left">Member</th>
              <th className="px-5 py-3 text-left">Role</th>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                <th key={day} className="px-5 py-3 text-center">{day}</th>
              ))}
              <th className="px-5 py-3 text-center">Rate</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member, index) => {
              const days = attendanceData[member.id] ?? [];
              const presentCount = days.filter(Boolean).length;
              const rate = presentCount === 5 ? '100%' : '80%';
              const rateStyle = rateStyles[rate];
              return (
                <motion.tr
                  key={member.id}
                  className="border-b border-surface-200 last:border-0"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.05, ease: [0.4, 0, 0.2, 1] }}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={member.name} color={memberColors[index]} size="sm" />
                      <span className="font-semibold text-sm text-gray-900">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{designations[member.id]}</td>
                  {days.map((present, i) => (
                    <td key={i} className="px-5 py-3 text-center">
                      <div className={`w-2 h-2 rounded-full mx-auto ${present ? 'bg-[#8BC34A]' : 'bg-[#D8727D]'}`} />
                    </td>
                  ))}
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${rateStyle?.bg ?? ''} ${rateStyle?.text ?? ''}`}>
                      {rate}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default AttendancePage;
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/kkwenuja/Desktop/ProjectX && npm run build 2>&1 | tail -20`
Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
cd /Users/kkwenuja/Desktop/ProjectX
git add src/pages/AttendancePage.tsx
git commit -m "feat: revamp AttendancePage with weekly attendance table"
```

---

## Chunk 3: Reports, Organization, Settings

### Task 7: ReportsPage

**Files:**
- Modify: `src/pages/ReportsPage.tsx`

- [ ] **Step 1: Write the full ReportsPage component**

Replace the stub at `src/pages/ReportsPage.tsx` with:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Download, BarChart3, TrendingUp, Users } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import MetricCard from '../components/ui/MetricCard';
import { teamMembers, todoTasks, inProgressTasks, doneTasks } from '../data/mockData';

const ReportsPage: React.FC = () => {
  const totalTasks = todoTasks.length + inProgressTasks.length + doneTasks.length;

  const bars = [
    { label: 'To Do', count: todoTasks.length, color: 'bg-primary-500' },
    { label: 'In Progress', count: inProgressTasks.length, color: 'bg-[#FFA500]' },
    { label: 'Done', count: doneTasks.length, color: 'bg-[#8BC34A]' },
  ];

  return (
    <motion.div
      className="flex-1 overflow-y-auto px-8 pb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="py-6">
        <PageHeader
          title="Reports"
          description="Project analytics"
          actions={
            <motion.button
              className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download size={16} />
              Download Report
            </motion.button>
          }
        />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard
          label="Total Tasks"
          value={String(totalTasks)}
          hint="Across all projects"
          icon={BarChart3}
          iconClassName="bg-primary-50 text-primary-500"
        />
        <MetricCard
          label="Completion Rate"
          value={totalTasks > 0 ? `${Math.round(doneTasks.length / totalTasks * 100)}%` : '0%'}
          hint="Tasks completed"
          icon={TrendingUp}
          iconClassName="bg-[#83C29D33] text-[#68B266]"
        />
        <MetricCard
          label="Active Members"
          value={String(teamMembers.length)}
          hint="Contributing this sprint"
          icon={Users}
          iconClassName="bg-[#30C5E533] text-[#30C5E5]"
        />
      </div>

      {/* Task breakdown chart */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <h2 className="font-semibold text-gray-900 mb-5">Task Breakdown</h2>
        <div>
          {bars.map((bar, index) => (
            <motion.div
              key={bar.label}
              className="flex items-center gap-4 mb-4 last:mb-0"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: index * 0.08, ease: [0.4, 0, 0.2, 1] }}
            >
              <span className="text-sm text-gray-600 w-28 shrink-0">{bar.label}</span>
              <div className="flex-1 bg-surface-200 rounded-full h-3 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${bar.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${totalTasks > 0 ? (bar.count / totalTasks * 100) : 0}%` }}
                  transition={{ duration: 0.6, delay: index * 0.1 + 0.3, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
              <span className="text-xs text-gray-500 w-8 text-right shrink-0">{bar.count}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ReportsPage;
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/kkwenuja/Desktop/ProjectX && npm run build 2>&1 | tail -20`
Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
cd /Users/kkwenuja/Desktop/ProjectX
git add src/pages/ReportsPage.tsx
git commit -m "feat: revamp ReportsPage with metric cards and animated bar chart"
```

---

### Task 8: OrganizationPage

**Files:**
- Modify: `src/pages/OrganizationPage.tsx`

- [ ] **Step 1: Write the full OrganizationPage component**

Replace the stub at `src/pages/OrganizationPage.tsx` with:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { currentUser, teamMembers, memberColors } from '../data/mockData';

const designations: Record<string, string> = {
  u1: 'Project Manager',
  u2: 'Frontend Developer',
  u3: 'UI Designer',
  u4: 'Backend Developer',
  u5: 'QA Engineer',
  u6: 'DevOps Engineer',
};

const OrganizationPage: React.FC = () => {
  const subordinates = teamMembers.filter(m => m.id !== currentUser.id);

  return (
    <motion.div
      className="flex-1 overflow-y-auto px-8 pb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="py-6">
        <PageHeader
          title="Organization"
          description="Team structure"
          actions={
            <motion.button
              className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <UserPlus size={16} />
              Add Member
            </motion.button>
          }
        />
      </div>

      <div className="bg-white rounded-2xl shadow-card p-8">
        {/* Root node */}
        <motion.div
          className="flex justify-center mb-0"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="bg-primary-50 border-2 border-primary-200 rounded-2xl p-4 text-center w-44">
            <Avatar name={currentUser.name} color={memberColors[0]} size="lg" className="mx-auto" />
            <div className="font-bold text-gray-900 text-sm mt-2">{currentUser.name}</div>
            <div className="text-xs text-gray-400">{designations[currentUser.id]}</div>
            <span className="bg-primary-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block">
              Admin
            </span>
          </div>
        </motion.div>

        {/* Connector line */}
        <div className="mx-auto w-px h-8 bg-surface-300" />

        {/* Subordinate nodes */}
        <div className="flex flex-wrap justify-center gap-4">
          {subordinates.map((member, index) => (
            <motion.div
              key={member.id}
              className="bg-white border border-surface-200 rounded-xl p-3 text-center w-36"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.06, ease: [0.4, 0, 0.2, 1] }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
            >
              <Avatar name={member.name} color={memberColors[index + 1]} size="md" className="mx-auto" />
              <div className="font-semibold text-gray-800 text-xs mt-2">{member.name}</div>
              <div className="text-[10px] text-gray-400">{designations[member.id]}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default OrganizationPage;
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/kkwenuja/Desktop/ProjectX && npm run build 2>&1 | tail -20`
Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
cd /Users/kkwenuja/Desktop/ProjectX
git add src/pages/OrganizationPage.tsx
git commit -m "feat: revamp OrganizationPage with flexbox org chart"
```

---

### Task 9: SettingsPage

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Write the full SettingsPage component**

Replace the stub at `src/pages/SettingsPage.tsx` with:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { currentUser } from '../data/mockData';

const Toggle: React.FC<{ on: boolean }> = ({ on }) => (
  <div className={`w-9 h-5 rounded-full relative ${on ? 'bg-primary-500' : 'bg-surface-300'}`}>
    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 ${on ? 'right-0.5' : 'left-0.5'}`} />
  </div>
);

const SettingsPage: React.FC = () => {
  return (
    <motion.div
      className="flex-1 overflow-y-auto px-8 pb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="py-6">
        <PageHeader
          title="Settings"
          description="Account & preferences"
          actions={
            <motion.button
              className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Save size={16} />
              Save Changes
            </motion.button>
          }
        />
      </div>

      <div className="flex flex-col gap-4">
        {/* Profile card */}
        <motion.div
          className="bg-white rounded-2xl shadow-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
        >
          <h2 className="font-bold text-gray-900 mb-1">Profile</h2>
          <p className="text-xs text-gray-400 mb-5">Manage your account details</p>
          {[
            { label: 'Name', value: currentUser.name },
            { label: 'Location', value: currentUser.location ?? 'Not set' },
            { label: 'Role', value: currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-surface-200 last:border-0">
              <span className="text-sm font-medium text-gray-500">{row.label}</span>
              <span className="text-sm font-semibold text-gray-900">{row.value}</span>
            </div>
          ))}
        </motion.div>

        {/* Notifications card */}
        <motion.div
          className="bg-white rounded-2xl shadow-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18, ease: [0.4, 0, 0.2, 1] }}
        >
          <h2 className="font-bold text-gray-900 mb-1">Notifications</h2>
          <p className="text-xs text-gray-400 mb-5">Control what updates you receive</p>
          {[
            { label: 'Task updates', sublabel: 'Get notified when tasks change', on: true },
            { label: 'Team mentions', sublabel: 'Alerts when someone mentions you', on: true },
            { label: 'Weekly digest', sublabel: 'Summary email every Monday', on: false },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-surface-200 last:border-0">
              <div>
                <div className="text-sm font-medium text-gray-900">{row.label}</div>
                <div className="text-xs text-gray-400">{row.sublabel}</div>
              </div>
              <Toggle on={row.on} />
            </div>
          ))}
        </motion.div>

        {/* Appearance card */}
        <motion.div
          className="bg-white rounded-2xl shadow-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.26, ease: [0.4, 0, 0.2, 1] }}
        >
          <h2 className="font-bold text-gray-900 mb-1">Appearance</h2>
          <p className="text-xs text-gray-400 mb-5">Customize how the app looks</p>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm font-medium text-gray-500">Theme</span>
            <span className="bg-surface-100 text-gray-600 text-xs px-3 py-1 rounded-full">Light</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SettingsPage;
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/kkwenuja/Desktop/ProjectX && npm run build 2>&1 | tail -20`
Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
cd /Users/kkwenuja/Desktop/ProjectX
git add src/pages/SettingsPage.tsx
git commit -m "feat: revamp SettingsPage with profile, notifications, and appearance cards"
```

---

## Final Verification

- [ ] **Run final build to confirm all 9 pages compile cleanly**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && npm run build 2>&1 | tail -30
```
Expected: exit code 0, no TypeScript errors, no missing module errors.

- [ ] **Start dev server and visually spot-check each page**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && npm run dev
```

Navigate to each route and verify:
- `/#/dashboard` — 4 metric cards + recent activity list
- `/#/tasks` — flat task rows with priority badges + status pills
- `/#/messages` — left conversation list + right empty state
- `/#/members` — 2-column card grid with avatars
- `/#/teams` — project list with avatar groups + task counts
- `/#/attendance` — table with day dots + rate badges
- `/#/reports` — 3 metric cards + animated bar chart
- `/#/organization` — root node + subordinate row
- `/#/settings` — 3 stacked cards with toggles

- [ ] **Final commit**

```bash
cd /Users/kkwenuja/Desktop/ProjectX
git add src/pages/ReportsPage.tsx src/pages/OrganizationPage.tsx src/pages/SettingsPage.tsx
git commit -m "feat: complete page revamp — all 9 pages match home page theme"
```
