import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '..', 'src');

const files = {};

// ─────────────────────────────────────────────────────────────────────────────
// PageHeader – compact single-row strip
// ─────────────────────────────────────────────────────────────────────────────
files['components/ui/PageHeader.tsx'] = `import React from 'react';
import { motion } from 'framer-motion';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, description, actions, meta }) => (
  <motion.div
    className="flex flex-shrink-0 items-center justify-between rounded-2xl border border-white/70 bg-white/95 px-5 py-3 shadow-card backdrop-blur-sm"
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
  >
    <div className="flex min-w-0 items-center gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-0.5 text-[10px] font-bold uppercase leading-none tracking-[0.2em] text-primary-400">{eyebrow}</p>}
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-bold leading-tight tracking-tight text-gray-900">{title}</h1>
          {description && <p className="hidden max-w-xs truncate text-xs text-gray-400 lg:block">{description}</p>}
        </div>
      </div>
      {meta && <div className="flex items-center gap-2">{meta}</div>}
    </div>
    {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
  </motion.div>
);

export default PageHeader;
`;

// ─────────────────────────────────────────────────────────────────────────────
// MetricCard – compact
// ─────────────────────────────────────────────────────────────────────────────
files['components/ui/MetricCard.tsx'] = `import React from 'react';
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
    className="rounded-xl border border-surface-200 bg-white px-4 py-3 shadow-card"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
        {hint && <p className="mt-0.5 truncate text-[11px] text-gray-400">{hint}</p>}
      </div>
      <div className={\`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl \${iconClassName}\`}>
        <Icon size={17} />
      </div>
    </div>
  </motion.div>
);

export default MetricCard;
`;

// ─────────────────────────────────────────────────────────────────────────────
// DashboardPage – no outer scroll, compact grids
// ─────────────────────────────────────────────────────────────────────────────
files['pages/DashboardPage.tsx'] = `import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Users, CheckCircle, AlertCircle, TrendingUp, ArrowUpRight, Clock3, Sparkles } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import MetricCard from '../components/ui/MetricCard';

const spring = { type: 'spring' as const, stiffness: 340, damping: 32 };

const DashboardPage: React.FC = () => {
  const projectData = [
    { name: 'Mobile', completed: 75, pending: 25 },
    { name: 'Website', completed: 60, pending: 40 },
    { name: 'Design', completed: 90, pending: 10 },
    { name: 'API', completed: 85, pending: 15 },
  ];
  const attendanceData = [
    { date: 'Mon', present: 28, absent: 2 },
    { date: 'Tue', present: 29, absent: 1 },
    { date: 'Wed', present: 27, absent: 3 },
    { date: 'Thu', present: 30, absent: 0 },
    { date: 'Fri', present: 28, absent: 2 },
  ];
  const taskStatusData = [
    { name: 'To Do', value: 15, color: '#5030E5' },
    { name: 'In Progress', value: 28, color: '#FFA500' },
    { name: 'Done', value: 42, color: '#8BC34A' },
  ];
  const stats = [
    { label: 'Team Members', value: '30', icon: Users, color: 'bg-blue-100 text-blue-600' },
    { label: 'Completed Tasks', value: '342', icon: CheckCircle, color: 'bg-green-100 text-green-600' },
    { label: 'Pending Tasks', value: '43', icon: AlertCircle, color: 'bg-red-100 text-red-600' },
    { label: 'Avg Attendance', value: '93%', icon: TrendingUp, color: 'bg-purple-100 text-purple-600' },
  ];
  const initiatives = [
    { title: 'Sprint Review', detail: '4:00 PM today', tag: 'Today', tagCls: 'bg-primary-50 text-primary-600' },
    { title: 'Client Demo', detail: 'Website redesign deck', tag: 'Tomorrow', tagCls: 'bg-amber-50 text-amber-600' },
    { title: 'Hiring Sync', detail: 'Frontend scorecard', tag: 'This week', tagCls: 'bg-emerald-50 text-emerald-600' },
  ];
  const activity = [
    'Priya moved Moodboard to In Progress',
    'Rohan approved the research outline',
    'Thursday attendance closed at 93%',
    'Two new comments on Mobile App Design',
  ];

  return (
    <motion.div
      className="flex h-full flex-col overflow-hidden px-4 py-3 gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
    >
      <PageHeader
        eyebrow="Overview"
        title="Operations Dashboard"
        description="Track delivery, team momentum, and attendance."
        actions={
          <>
            <button className="rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-surface-100 transition-colors">Weekly sync</button>
            <button className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 transition-colors">
              <Sparkles size={13} />Generate summary
            </button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.04 }}>
            <MetricCard label={s.label} value={s.value} icon={s.icon} iconClassName={s.color} />
          </motion.div>
        ))}
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[1fr_280px] gap-3">
        {/* Left column */}
        <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
          {/* Bar chart */}
          <motion.div
            className="flex-1 min-h-0 rounded-xl bg-white p-4 shadow-card"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.08 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">Project Throughput</p>
                <p className="text-xs text-gray-400">Completed vs remaining</p>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                <ArrowUpRight size={11} />+12% sprint
              </span>
            </div>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={projectData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12 }} />
                <Bar dataKey="completed" radius={[6, 6, 0, 0]} fill="#5030E5" />
                <Bar dataKey="pending" radius={[6, 6, 0, 0]} fill="#FFA500" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Bottom two charts */}
          <div className="grid grid-cols-2 gap-3 flex-shrink-0" style={{ height: '44%' }}>
            <motion.div className="rounded-xl bg-white p-4 shadow-card flex flex-col" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.12 }}>
              <p className="text-sm font-semibold text-gray-900 mb-1">Task Status</p>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius="45%" outerRadius="70%" paddingAngle={3} dataKey="value">
                      {taskStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: 'none', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-3 mt-1">
                {taskStatusData.map(d => (
                  <div key={d.name} className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-[10px] text-gray-500">{d.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div className="rounded-xl bg-white p-4 shadow-card flex flex-col" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.16 }}>
              <p className="text-sm font-semibold text-gray-900 mb-1">Attendance Trend</p>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: 'none', fontSize: 12 }} />
                    <Line type="monotone" dataKey="present" stroke="#8BC34A" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="absent" stroke="#E84C3D" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
          <motion.div
            className="rounded-xl bg-gray-900 p-4 text-white shadow-card flex-shrink-0"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.1 }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50 mb-1">Focus Window</p>
            <p className="text-sm font-bold leading-snug">3 initiatives need attention</p>
            <div className="mt-3 space-y-2">
              {initiatives.map(item => (
                <div key={item.title} className="rounded-xl bg-white/8 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">{item.title}</p>
                    <span className={\`rounded-full px-2 py-0.5 text-[10px] font-semibold \${item.tagCls}\`}>{item.tag}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-white/60">{item.detail}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="flex-1 min-h-0 overflow-y-auto rounded-xl bg-white p-4 shadow-card"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.14 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock3 size={14} className="text-gray-400" />
              <p className="text-sm font-semibold text-gray-900">Recent Activity</p>
            </div>
            <div className="space-y-2">
              {activity.map((item, i) => (
                <motion.div
                  key={item}
                  className="flex items-start gap-2 rounded-lg bg-surface-100 px-3 py-2"
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.2 + i * 0.04 }}
                >
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                  <p className="text-xs text-gray-600 leading-relaxed">{item}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;
`;

// ─────────────────────────────────────────────────────────────────────────────
// MessagesPage – full-height split-pane, no outer scroll
// ─────────────────────────────────────────────────────────────────────────────
files['pages/MessagesPage.tsx'] = `import React, { useMemo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Send, Paperclip, MoreHorizontal, Phone, Video, Plus, Hash } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { memberColors } from '../data/mockData';

const spring = { type: 'spring' as const, stiffness: 340, damping: 32 };

const conversations = [
  {
    id: 'c1', name: 'Design Team', lastMessage: 'Updated the onboarding illustrations.', time: '2m', unread: 3, members: 4,
    messages: [
      { id: 'm1', author: 'Priya Singh', text: 'I uploaded the revised mobile app moodboard.', mine: false },
      { id: 'm2', author: 'Anima Agrawal', text: "Looks good. Let's lock this for tomorrow's review.", mine: true },
      { id: 'm3', author: 'Arjun Patel', text: "I'll update the handoff notes in the task card.", mine: false },
    ],
  },
  {
    id: 'c2', name: 'Rohan Kumar', lastMessage: 'Can you review the research task today?', time: '14m', unread: 1, members: 2,
    messages: [
      { id: 'm4', author: 'Rohan Kumar', text: 'Can you review the research task today?', mine: false },
      { id: 'm5', author: 'Anima Agrawal', text: 'Yes, I will leave notes before lunch.', mine: true },
    ],
  },
  {
    id: 'c3', name: 'Sprint Planning', lastMessage: 'Meeting moved to 4:00 PM.', time: '1h', unread: 0, members: 6,
    messages: [
      { id: 'm6', author: 'PM Bot', text: 'Meeting moved to 4:00 PM.', mine: false },
      { id: 'm7', author: 'Anima Agrawal', text: 'Noted. I will update the board before the call.', mine: true },
    ],
  },
  {
    id: 'c4', name: 'Backend Team', lastMessage: 'API endpoints finalized.', time: '3h', unread: 0, members: 5,
    messages: [
      { id: 'm8', author: 'Dev', text: 'API endpoints finalized. Please review the docs.', mine: false },
      { id: 'm9', author: 'Anima Agrawal', text: 'Will check after standup.', mine: true },
    ],
  },
];

const MessagesPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(conversations[0].id);
  const [draft, setDraft] = useState('');
  const [msgState, setMsgState] = useState(conversations);
  const bottomRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => msgState.filter(c => c.name.toLowerCase().includes(query.toLowerCase())),
    [query, msgState]
  );
  const selected = msgState.find(c => c.id === selectedId) ?? msgState[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages.length]);

  const handleSend = () => {
    if (!draft.trim()) return;
    setMsgState(cur => cur.map(c => c.id !== selected.id ? c : {
      ...c, lastMessage: draft, time: 'now', unread: 0,
      messages: [...c.messages, { id: String(Date.now()), author: 'You', text: draft, mine: true }],
    }));
    setDraft('');
  };

  return (
    <motion.div
      className="flex h-full flex-col overflow-hidden px-4 py-3 gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
    >
      {/* Header bar */}
      <div className="flex flex-shrink-0 items-center justify-between rounded-2xl border border-white/70 bg-white/95 px-5 py-3 shadow-card">
        <div className="flex items-center gap-3">
          <Hash size={16} className="text-primary-400" />
          <h1 className="text-lg font-bold tracking-tight text-gray-900">Messages</h1>
          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-600">{msgState.reduce((n,c)=>n+c.unread,0)} unread</span>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 transition-colors">
          <Plus size={13} />New channel
        </button>
      </div>

      {/* Split pane */}
      <div className="flex-1 min-h-0 grid grid-cols-[260px_1fr] gap-3">
        {/* Sidebar */}
        <div className="flex flex-col rounded-xl bg-white shadow-card overflow-hidden">
          <div className="p-3 flex-shrink-0 border-b border-surface-200">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full rounded-lg bg-surface-100 py-2 pl-8 pr-3 text-xs text-gray-700 outline-none"
                placeholder="Search conversations"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {filtered.map((c, i) => (
              <motion.button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={\`w-full rounded-xl p-3 text-left transition-colors \${selectedId === c.id ? 'bg-primary-50 border border-primary-100' : 'hover:bg-surface-100 border border-transparent'}\`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...spring, delay: i * 0.04 }}
                whileHover={{ x: 1 }}
              >
                <div className="flex items-center gap-2.5">
                  <Avatar name={c.name} color={memberColors[i % memberColors.length]} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-xs font-semibold text-gray-900">{c.name}</p>
                      <span className="flex-shrink-0 text-[10px] text-gray-400">{c.time}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="truncate text-[11px] text-gray-500 flex-1">{c.lastMessage}</p>
                      {c.unread > 0 && <span className="ml-1 rounded-full bg-primary-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{c.unread}</span>}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selected.id}
            className="flex flex-col rounded-xl bg-white shadow-card overflow-hidden"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={spring}
          >
            {/* Chat header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-surface-200 px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={selected.name} color={memberColors[0]} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
                  <p className="text-[11px] text-gray-400">{selected.members} members</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="rounded-lg p-1.5 text-gray-400 hover:bg-surface-100 hover:text-gray-600 transition-colors"><Phone size={15} /></button>
                <button className="rounded-lg p-1.5 text-gray-400 hover:bg-surface-100 hover:text-gray-600 transition-colors"><Video size={15} /></button>
                <button className="rounded-lg p-1.5 text-gray-400 hover:bg-surface-100 hover:text-gray-600 transition-colors"><MoreHorizontal size={15} /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              <AnimatePresence>
                {selected.messages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    className={\`flex gap-2.5 \${msg.mine ? 'justify-end' : ''}\`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: i * 0.05 }}
                  >
                    {!msg.mine && <Avatar name={msg.author} color={memberColors[(i + 1) % memberColors.length]} size="sm" />}
                    <div className={\`max-w-[65%] rounded-2xl px-3.5 py-2.5 \${msg.mine ? 'bg-primary-500 text-white' : 'bg-surface-100 text-gray-700'}\`}>
                      <p className={\`mb-0.5 text-[10px] font-semibold \${msg.mine ? 'text-white/70' : 'text-gray-500'}\`}>{msg.author}</p>
                      <p className="text-xs leading-relaxed">{msg.text}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 border-t border-surface-200 px-4 py-3">
              <div className="flex items-center gap-2 rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                <button className="text-gray-400 hover:text-gray-600 transition-colors"><Paperclip size={15} /></button>
                <input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  className="flex-1 bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400"
                  placeholder="Write a message... (Enter to send)"
                />
                <motion.button
                  onClick={handleSend}
                  className="rounded-lg bg-primary-500 p-1.5 text-white hover:bg-primary-600 transition-colors disabled:opacity-40"
                  disabled={!draft.trim()}
                  whileTap={{ scale: 0.9 }}
                >
                  <Send size={13} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default MessagesPage;
`;

// ─────────────────────────────────────────────────────────────────────────────
// TasksPage – compact table with fixed header, scrollable body
// ─────────────────────────────────────────────────────────────────────────────
files['pages/TasksPage.tsx'] = `import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, PlusCircle, LayoutGrid, ListFilter, CheckCircle2, Clock3, AlertTriangle, X } from 'lucide-react';
import { doneTasks, inProgressTasks, todoTasks } from '../data/mockData';
import { Priority, Task, TaskStatus } from '../types';
import PageHeader from '../components/ui/PageHeader';
import MetricCard from '../components/ui/MetricCard';
import TaskModal from '../components/modals/TaskModal';

const spring = { type: 'spring' as const, stiffness: 340, damping: 32 };
const initialTasks = [...todoTasks, ...inProgressTasks, ...doneTasks];

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

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState({ title: '', description: '', status: 'todo' as TaskStatus, priority: 'low' as Priority });

  const filtered = useMemo(() => tasks.filter(t => {
    const matchSearch = \`\${t.title} \${t.description}\`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  }), [tasks, search, statusFilter, priorityFilter]);

  const stats = [
    { label: 'All Tasks', value: String(tasks.length), icon: LayoutGrid, iconClassName: 'bg-primary-50 text-primary-600' },
    { label: 'Completed', value: String(tasks.filter(t => t.status === 'done').length), icon: CheckCircle2, iconClassName: 'bg-emerald-50 text-emerald-600' },
    { label: 'In Progress', value: String(tasks.filter(t => t.status === 'in-progress').length), icon: Clock3, iconClassName: 'bg-amber-50 text-amber-600' },
    { label: 'High Priority', value: String(tasks.filter(t => t.priority === 'high').length), icon: AlertTriangle, iconClassName: 'bg-rose-50 text-rose-600' },
  ];

  const handleCreate = () => {
    if (!draft.title.trim()) return;
    setTasks(cur => [{ id: \`task-\${cur.length + 1}\`, title: draft.title, description: draft.description, status: draft.status, priority: draft.priority, assignees: ['u1'], comments: 0, files: 0 }, ...cur]);
    setDraft({ title: '', description: '', status: 'todo', priority: 'low' });
    setIsCreating(false);
  };

  return (
    <motion.div
      className="flex h-full flex-col overflow-hidden px-4 py-3 gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
    >
      <PageHeader
        eyebrow="Execution"
        title="Tasks"
        description="Filter, inspect, and create work items."
        meta={<span className="rounded-full bg-surface-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">{filtered.length} tasks</span>}
        actions={
          <button
            onClick={() => setIsCreating(c => !c)}
            className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 transition-colors"
          >
            {isCreating ? <X size={13} /> : <PlusCircle size={13} />}
            {isCreating ? 'Cancel' : 'New Task'}
          </button>
        }
      />

      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.04 }}>
            <MetricCard label={s.label} value={s.value} icon={s.icon} iconClassName={s.iconClassName} />
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div
            className="flex-shrink-0 grid grid-cols-[1fr_2fr_auto_auto_auto] gap-2 rounded-xl bg-white p-3 shadow-card items-center"
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={spring}
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter bar */}
      <div className="flex flex-shrink-0 items-center gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="w-56 rounded-xl bg-white py-2 pl-8 pr-3 text-xs shadow-card outline-none" placeholder="Search tasks…" />
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs text-gray-600 shadow-card">
          <SlidersHorizontal size={13} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | TaskStatus)} className="bg-transparent outline-none cursor-pointer">
            <option value="all">All statuses</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs text-gray-600 shadow-card">
          <ListFilter size={13} />
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as 'all' | Priority)} className="bg-transparent outline-none cursor-pointer">
            <option value="all">All priority</option>
            <option value="low">Low</option>
            <option value="high">High</option>
          </select>
        </div>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-xl bg-white shadow-card flex flex-col">
        <table className="w-full text-left text-xs">
          <thead className="flex-shrink-0 bg-surface-100">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-500">Task</th>
              <th className="px-4 py-3 font-semibold text-gray-500">Status</th>
              <th className="px-4 py-3 font-semibold text-gray-500">Priority</th>
              <th className="px-4 py-3 font-semibold text-gray-500 text-right">Comments</th>
              <th className="px-4 py-3 font-semibold text-gray-500 text-right">Files</th>
            </tr>
          </thead>
        </table>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <tbody>
              <AnimatePresence>
                {filtered.map((task, i) => (
                  <motion.tr
                    key={task.id}
                    className="cursor-pointer border-b border-surface-100 hover:bg-primary-50/40 transition-colors"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ ...spring, delay: i * 0.03 }}
                    onClick={() => setSelectedTask(task)}
                  >
                    <td className="px-4 py-3 w-[40%]">
                      <p className="font-semibold text-gray-900 truncate">{task.title}</p>
                      {task.description && <p className="text-[11px] text-gray-400 truncate mt-0.5">{task.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={\`rounded-full px-2 py-0.5 text-[11px] font-semibold \${statusStyle[task.status] ?? 'bg-surface-100 text-gray-500'}\`}>
                        {task.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={\`rounded-full px-2 py-0.5 text-[11px] font-semibold \${priorityStyle[task.priority] ?? 'bg-surface-100 text-gray-500'}\`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{task.comments}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{task.files}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex h-32 items-center justify-center text-sm text-gray-400">No tasks match the current filters</div>
          )}
        </div>
      </div>

      <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
    </motion.div>
  );
};

export default TasksPage;
`;

// ─────────────────────────────────────────────────────────────────────────────
// MembersPage – grid + detail panel, no outer scroll
// ─────────────────────────────────────────────────────────────────────────────
files['pages/MembersPage.tsx'] = `import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MapPin, Search, UserPlus, Briefcase, ShieldCheck, X } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { teamMembers, memberColors } from '../data/mockData';
import PageHeader from '../components/ui/PageHeader';

const spring = { type: 'spring' as const, stiffness: 340, damping: 32 };

const MembersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'manager' | 'member'>('all');
  const [selectedId, setSelectedId] = useState(teamMembers[0]?.id ?? '');
  const [inviteName, setInviteName] = useState('');
  const [members, setMembers] = useState(teamMembers);

  const filtered = useMemo(() => members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) &&
    (roleFilter === 'all' || m.role === roleFilter)
  ), [members, search, roleFilter]);

  const selected = members.find(m => m.id === selectedId) ?? filtered[0] ?? members[0];

  const handleInvite = () => {
    if (!inviteName.trim()) return;
    const nm = { id: \`m-\${members.length + 1}\`, name: inviteName, avatar: '', role: 'member' as const, location: 'Remote' };
    setMembers(c => [nm, ...c]);
    setInviteName('');
    setSelectedId(nm.id);
  };

  return (
    <motion.div
      className="flex h-full flex-col overflow-hidden px-4 py-3 gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
    >
      <PageHeader
        eyebrow="People"
        title="Members"
        description="Review roles and invite collaborators."
        meta={<span className="rounded-full bg-surface-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">{members.length} people</span>}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 shadow-card border border-surface-200">
              <UserPlus size={13} className="text-primary-500 flex-shrink-0" />
              <input
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                className="w-32 text-xs outline-none"
                placeholder="Invite by name"
              />
              {inviteName && <button onClick={() => setInviteName('')}><X size={11} className="text-gray-400" /></button>}
            </div>
            <button onClick={handleInvite} className="rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 transition-colors">Add</button>
          </div>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-shrink-0 items-center gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="w-52 rounded-xl bg-white py-2 pl-8 pr-3 text-xs shadow-card outline-none" placeholder="Search members…" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as typeof roleFilter)} className="rounded-xl bg-white px-3 py-2 text-xs shadow-card outline-none cursor-pointer">
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="member">Member</option>
        </select>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_260px] gap-3">
        {/* Member grid */}
        <div className="overflow-y-auto rounded-xl">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            <AnimatePresence>
              {filtered.map((m, idx) => (
                <motion.div
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={\`cursor-pointer rounded-xl bg-white p-4 shadow-card transition-shadow \${selected?.id === m.id ? 'ring-2 ring-primary-200' : 'hover:shadow-card-hover'}\`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ ...spring, delay: idx * 0.04 }}
                  whileHover={{ y: -2, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={m.name} color={memberColors[idx % 6]} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{m.designation ?? m.role}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500"><Mail size={11} className="text-gray-400 flex-shrink-0" /><span className="truncate">{m.name.toLowerCase().replace(' ', '.')}@techcorp.com</span></div>
                    {m.location && <div className="flex items-center gap-1.5 text-xs text-gray-500"><MapPin size={11} className="text-gray-400 flex-shrink-0" /><span>{m.location}</span></div>}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-surface-100 pt-2.5">
                    <span className="rounded-full bg-surface-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 capitalize">{m.role}</span>
                    <span className="text-[10px] text-primary-500 font-medium">{idx % 2 === 0 ? 'Frontend' : idx % 3 === 0 ? 'Backend' : 'Design'}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Detail panel */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selected.id}
              className="rounded-xl bg-white shadow-card overflow-y-auto p-4"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={spring}
            >
              <div className="flex flex-col items-center text-center pb-4 border-b border-surface-100">
                <Avatar name={selected.name} color={memberColors[0]} size="lg" />
                <p className="mt-2 text-sm font-bold text-gray-900">{selected.name}</p>
                <p className="text-xs text-gray-500">{selected.designation ?? 'Cross-functional'}</p>
                <span className="mt-1.5 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-600 capitalize">{selected.role}</span>
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-gray-600"><Mail size={13} className="text-gray-400" />{selected.name.toLowerCase().replace(' ', '.')}@techcorp.com</div>
                <div className="flex items-center gap-2 text-gray-600"><MapPin size={13} className="text-gray-400" />{selected.location ?? 'Hybrid'}</div>
                <div className="flex items-center gap-2 text-gray-600"><Briefcase size={13} className="text-gray-400" />{selected.role === 'admin' ? 'Operations lead' : selected.role === 'manager' ? 'Team coordination' : 'Individual delivery'}</div>
                <div className="flex items-center gap-2 text-gray-600"><ShieldCheck size={13} className="text-gray-400" />Access: {selected.role}</div>
              </div>
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Current Focus</p>
                {['Mobile App polish', 'Sprint docs', 'Stakeholder updates'].map(item => (
                  <div key={item} className="mb-1.5 rounded-lg border border-surface-200 px-3 py-2 text-xs text-gray-600">{item}</div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default MembersPage;
`;

// ─────────────────────────────────────────────────────────────────────────────
// TeamsPage – compact cards + detail panel
// ─────────────────────────────────────────────────────────────────────────────
files['pages/TeamsPage.tsx'] = `import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Users, UserRoundCheck, Search, Layers3, Target } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { teamMembers, memberColors } from '../data/mockData';
import PageHeader from '../components/ui/PageHeader';
import MetricCard from '../components/ui/MetricCard';

const spring = { type: 'spring' as const, stiffness: 340, damping: 32 };

const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState([
    { id: 't1', name: 'Frontend', lead: 'Rohan Kumar', memberCount: 5, members: teamMembers.slice(0, 5) },
    { id: 't2', name: 'Backend', lead: 'Priya Singh', memberCount: 4, members: teamMembers.slice(1, 5) },
    { id: 't3', name: 'Design', lead: 'Arjun Patel', memberCount: 3, members: teamMembers.slice(0, 3) },
  ]);
  const [selectedId, setSelectedId] = useState('t1');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState({ name: '', lead: '' });

  const filtered = useMemo(() =>
    teams.filter(t => t.name.toLowerCase().includes(query.toLowerCase()) || t.lead.toLowerCase().includes(query.toLowerCase())),
    [query, teams]
  );
  const selected = teams.find(t => t.id === selectedId) ?? teams[0];

  const handleAdd = () => {
    if (!draft.name.trim() || !draft.lead.trim()) return;
    const nt = { id: \`t\${Date.now()}\`, name: draft.name, lead: draft.lead, memberCount: 1, members: [teamMembers[0]] };
    setTeams(c => [nt, ...c]);
    setSelectedId(nt.id);
    setDraft({ name: '', lead: '' });
  };

  const handleDelete = (id: string) => {
    setTeams(c => c.filter(t => t.id !== id));
    if (selectedId === id) {
      const next = teams.find(t => t.id !== id);
      if (next) setSelectedId(next.id);
    }
  };

  return (
    <motion.div
      className="flex h-full flex-col overflow-hidden px-4 py-3 gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
    >
      <PageHeader
        eyebrow="Delivery Units"
        title="Teams"
        description="Manage pods, leads, and staffing balance."
        meta={<span className="rounded-full bg-surface-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">{teams.length} teams</span>}
        actions={
          <div className="flex items-center gap-2">
            <input value={draft.name} onChange={e => setDraft(c => ({ ...c, name: e.target.value }))} className="w-24 rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-xs outline-none" placeholder="Team name" />
            <input value={draft.lead} onChange={e => setDraft(c => ({ ...c, lead: e.target.value }))} className="w-28 rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-xs outline-none" placeholder="Lead name" />
            <motion.button onClick={handleAdd} className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 transition-colors" whileTap={{ scale: 0.95 }}>
              <Plus size={13} />Add
            </motion.button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        <MetricCard label="Active Teams" value={String(teams.length)} hint="Product, eng, ops" icon={Users} iconClassName="bg-primary-50 text-primary-600" />
        <MetricCard label="Team Leads" value={String(teams.length)} hint="All teams have leads" icon={UserRoundCheck} iconClassName="bg-emerald-50 text-emerald-600" />
        <MetricCard label="Avg Headcount" value={(teams.reduce((s, t) => s + t.memberCount, 0) / teams.length).toFixed(1)} hint="Per active team" icon={Layers3} iconClassName="bg-amber-50 text-amber-600" />
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} className="w-52 rounded-xl bg-white py-2 pl-8 pr-3 text-xs shadow-card outline-none" placeholder="Search teams…" />
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[1fr_260px] gap-3">
        <div className="overflow-y-auto rounded-xl">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            <AnimatePresence>
              {filtered.map((team, idx) => (
                <motion.div
                  key={team.id}
                  onClick={() => setSelectedId(team.id)}
                  className={\`cursor-pointer rounded-xl bg-white p-4 shadow-card \${selected?.id === team.id ? 'ring-2 ring-primary-200' : 'hover:shadow-card-hover'}\`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ ...spring, delay: idx * 0.04 }}
                  whileHover={{ y: -2, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{team.name}</p>
                      <p className="text-xs text-gray-500">Lead: {team.lead}</p>
                    </div>
                    <motion.button
                      className="rounded-lg p-1 text-gray-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                      onClick={e => { e.stopPropagation(); handleDelete(team.id); }}
                      whileTap={{ scale: 0.9 }}
                    ><Trash2 size={13} /></motion.button>
                  </div>
                  <div className="flex items-center gap-2 py-2 border-y border-surface-100 mb-3">
                    <Users size={13} className="text-gray-400" />
                    <span className="text-xs text-gray-600">{team.memberCount} members</span>
                  </div>
                  <div className="flex -space-x-1.5">
                    {team.members.slice(0, 4).map((m, i) => (
                      <div key={m.id} style={{ zIndex: 4 - i }}>
                        <Avatar name={m.name} color={memberColors[i % 6]} size="sm" />
                      </div>
                    ))}
                    {team.memberCount > 4 && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-200 text-[10px] font-semibold text-gray-600">+{team.memberCount - 4}</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selected.id}
              className="rounded-xl bg-white shadow-card overflow-y-auto p-4"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={spring}
            >
              <p className="text-sm font-bold text-gray-900">{selected.name}</p>
              <p className="text-xs text-gray-500 mb-4">Led by {selected.lead}</p>
              <div className="rounded-xl bg-surface-100 p-3 mb-4">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span>Capacity</span>
                  <span className="font-semibold">{selected.memberCount}/6</span>
                </div>
                <div className="h-1.5 rounded-full bg-white overflow-hidden">
                  <motion.div
                    className="h-1.5 rounded-full bg-primary-500"
                    initial={{ width: 0 }}
                    animate={{ width: \`\${Math.min((selected.memberCount / 6) * 100, 100)}%\` }}
                    transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Priorities</p>
              {['Weekly delivery planning', 'Resolve review blockers', 'Maintain 90%+ attendance'].map(item => (
                <div key={item} className="mb-1.5 flex items-center gap-2 rounded-lg border border-surface-200 px-3 py-2">
                  <Target size={11} className="text-primary-400 flex-shrink-0" />
                  <span className="text-xs text-gray-600">{item}</span>
                </div>
              ))}
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mt-4 mb-2">Members</p>
              <div className="space-y-1.5">
                {selected.members.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <Avatar name={m.name} color={memberColors[i % 6]} size="sm" />
                    <span className="text-xs text-gray-700 truncate">{m.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default TeamsPage;
`;

// ─────────────────────────────────────────────────────────────────────────────
// AttendancePage – compact calendar + side panel
// ─────────────────────────────────────────────────────────────────────────────
files['pages/AttendancePage.tsx'] = `import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, AlertCircle, Calendar, FileText, ChevronLeft, ChevronRight, PlaneTakeoff } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths } from 'date-fns';
import PageHeader from '../components/ui/PageHeader';
import MetricCard from '../components/ui/MetricCard';

const spring = { type: 'spring' as const, stiffness: 340, damping: 32 };

interface AttDay {
  date: string;
  status: 'present' | 'absent' | 'leave' | 'holiday' | 'wfh';
  checkIn?: string;
  checkOut?: string;
}

const statusCfg = {
  present: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Present' },
  absent:  { cls: 'bg-rose-100 text-rose-700 border-rose-200', label: 'Absent' },
  leave:   { cls: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Leave' },
  holiday: { cls: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Holiday' },
  wfh:     { cls: 'bg-purple-100 text-purple-700 border-purple-200', label: 'WFH' },
};

const AttendancePage: React.FC = () => {
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const [viewMonth, setViewMonth] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [attendance, setAttendance] = useState<AttDay[]>([
    { date: todayKey, status: 'present', checkIn: '09:15', checkOut: '18:30' },
    { date: format(addDays(today, -1), 'yyyy-MM-dd'), status: 'present', checkIn: '09:00', checkOut: '18:00' },
    { date: format(addDays(today, -2), 'yyyy-MM-dd'), status: 'leave' },
    { date: format(addDays(today, -3), 'yyyy-MM-dd'), status: 'wfh', checkIn: '09:30', checkOut: '17:45' },
  ]);
  const [leaveForm, setLeaveForm] = useState({ start: format(addDays(today, 1), 'yyyy-MM-dd'), end: format(addDays(today, 2), 'yyyy-MM-dd'), reason: '' });
  const [banner, setBanner] = useState('');

  const todayRec = attendance.find(a => a.date === todayKey);
  const selectedRec = attendance.find(a => a.date === format(selectedDate, 'yyyy-MM-dd'));
  const daysInMonth = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
  const firstDow = getDay(startOfMonth(viewMonth));

  const stats = useMemo(() => ({
    present: attendance.filter(a => a.status === 'present').length,
    leave: attendance.filter(a => a.status === 'leave').length,
    wfh: attendance.filter(a => a.status === 'wfh').length,
  }), [attendance]);

  const handleCheckToggle = () => {
    const now = format(new Date(), 'HH:mm');
    setAttendance(cur => {
      const ex = cur.find(a => a.date === todayKey);
      if (!ex) return [{ date: todayKey, status: 'present', checkIn: now }, ...cur];
      if (!ex.checkOut) return cur.map(a => a.date === todayKey ? { ...a, checkOut: now } : a);
      return cur;
    });
    setBanner(!todayRec ? 'Checked in.' : !todayRec.checkOut ? 'Checked out.' : 'Already closed today.');
    setTimeout(() => setBanner(''), 3000);
  };

  const handleLeave = () => {
    if (!leaveForm.reason.trim()) return;
    setAttendance(cur => [{ date: leaveForm.start, status: 'leave' }, ...cur]);
    setLeaveForm(c => ({ ...c, reason: '' }));
    setBanner('Leave request submitted.');
    setTimeout(() => setBanner(''), 3000);
  };

  return (
    <motion.div
      className="flex h-full flex-col overflow-hidden px-4 py-3 gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
    >
      <PageHeader
        eyebrow="Time & Presence"
        title="Attendance"
        description="Track check-ins and submit leave requests."
        meta={
          <AnimatePresence>
            {banner && (
              <motion.span
                key={banner}
                className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={spring}
              >{banner}</motion.span>
            )}
          </AnimatePresence>
        }
        actions={
          <motion.button
            onClick={handleCheckToggle}
            className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <Clock size={13} />
            {todayRec?.checkIn && !todayRec?.checkOut ? 'Check Out' : 'Check In'}
          </motion.button>
        }
      />

      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        <MetricCard label="Present Days" value={String(stats.present)} hint="This visible period" icon={CheckCircle} iconClassName="bg-emerald-50 text-emerald-600" />
        <MetricCard label="Leave Days" value={String(stats.leave)} hint="Approved & pending" icon={PlaneTakeoff} iconClassName="bg-amber-50 text-amber-600" />
        <MetricCard label="WFH Days" value={String(stats.wfh)} hint="Remote attendance" icon={Clock} iconClassName="bg-primary-50 text-primary-600" />
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[1fr_240px] gap-3">
        {/* Calendar */}
        <motion.div
          className="rounded-xl bg-white shadow-card p-4 flex flex-col overflow-hidden"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring}
        >
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <p className="text-sm font-bold text-gray-900">{format(viewMonth, 'MMMM yyyy')}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setViewMonth(c => subMonths(c, 1))} className="rounded-lg bg-surface-100 p-1.5 hover:bg-surface-200 transition-colors"><ChevronLeft size={14} /></button>
              <button onClick={() => setViewMonth(c => addMonths(c, 1))} className="rounded-lg bg-surface-100 p-1.5 hover:bg-surface-200 transition-colors"><ChevronRight size={14} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 flex-shrink-0 mb-1">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 flex-1 content-start">
            {Array(firstDow).fill(null).map((_, i) => <div key={\`empty-\${i}\`} />)}
            {daysInMonth.map(day => {
              const key = format(day, 'yyyy-MM-dd');
              const rec = attendance.find(a => a.date === key);
              const isSelected = format(selectedDate, 'yyyy-MM-dd') === key;
              const isToday = format(today, 'yyyy-MM-dd') === key;
              const cfg = rec ? statusCfg[rec.status] : null;
              return (
                <motion.button
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={\`aspect-square rounded-lg border text-[11px] font-medium flex items-center justify-center transition-all \${
                    isSelected ? 'ring-2 ring-primary-400 ring-offset-1' : ''
                  } \${cfg ? \`\${cfg.cls}\` : 'bg-surface-50 border-surface-200 text-gray-400'} \${isToday ? 'font-bold' : ''}\`}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                >
                  {format(day, 'd')}
                </motion.button>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-shrink-0 items-center gap-3 mt-3 pt-3 border-t border-surface-100">
            {Object.entries(statusCfg).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1">
                <div className={\`h-2 w-2 rounded-sm border \${v.cls}\`} />
                <span className="text-[10px] text-gray-500">{v.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right panel */}
        <div className="flex flex-col gap-3 overflow-y-auto">
          {/* Today card */}
          <motion.div className="rounded-xl bg-white shadow-card p-4 flex-shrink-0" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.06 }}>
            <p className="text-xs font-bold text-gray-900 mb-3">Today — {format(today, 'MMM d')}</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Check in</span><span className="font-semibold text-gray-800">{todayRec?.checkIn ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Check out</span><span className="font-semibold text-gray-800">{todayRec?.checkOut ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span>
                {todayRec ? <span className={\`rounded-full px-2 py-0.5 text-[10px] font-semibold \${statusCfg[todayRec.status].cls}\`}>{statusCfg[todayRec.status].label}</span>
                  : <span className="text-gray-400">Not started</span>}
              </div>
            </div>
          </motion.div>

          {/* Selected day */}
          <AnimatePresence mode="wait">
            <motion.div
              key={format(selectedDate, 'yyyy-MM-dd')}
              className="rounded-xl bg-white shadow-card p-4 flex-shrink-0"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={spring}
            >
              <p className="text-xs font-bold text-gray-900 mb-3">Selected — {format(selectedDate, 'MMM d')}</p>
              <div className="space-y-1.5 text-xs">
                {selectedRec ? (
                  <>
                    <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={\`rounded-full px-2 py-0.5 text-[10px] font-semibold \${statusCfg[selectedRec.status].cls}\`}>{statusCfg[selectedRec.status].label}</span></div>
                    {selectedRec.checkIn && <div className="flex justify-between"><span className="text-gray-500">Check in</span><span className="font-semibold">{selectedRec.checkIn}</span></div>}
                    {selectedRec.checkOut && <div className="flex justify-between"><span className="text-gray-500">Check out</span><span className="font-semibold">{selectedRec.checkOut}</span></div>}
                  </>
                ) : <p className="text-gray-400">No record</p>}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Leave request */}
          <motion.div className="rounded-xl bg-white shadow-card p-4 flex-shrink-0" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.12 }}>
            <div className="flex items-center gap-1.5 mb-3">
              <FileText size={13} className="text-gray-400" />
              <p className="text-xs font-bold text-gray-900">Request Leave</p>
            </div>
            <div className="space-y-2">
              <input type="date" value={leaveForm.start} onChange={e => setLeaveForm(c => ({ ...c, start: e.target.value }))} className="w-full rounded-lg border border-surface-200 px-3 py-1.5 text-xs outline-none" />
              <input type="date" value={leaveForm.end} onChange={e => setLeaveForm(c => ({ ...c, end: e.target.value }))} className="w-full rounded-lg border border-surface-200 px-3 py-1.5 text-xs outline-none" />
              <textarea
                value={leaveForm.reason}
                onChange={e => setLeaveForm(c => ({ ...c, reason: e.target.value }))}
                className="w-full rounded-lg border border-surface-200 px-3 py-2 text-xs outline-none resize-none"
                rows={2}
                placeholder="Reason for leave…"
              />
              <button onClick={handleLeave} className="w-full rounded-lg border border-primary-400 py-2 text-xs font-semibold text-primary-600 hover:bg-primary-50 transition-colors">Submit Request</button>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default AttendancePage;
`;

// ─────────────────────────────────────────────────────────────────────────────
// OrganizationPage – compact form + departments
// ─────────────────────────────────────────────────────────────────────────────
files['pages/OrganizationPage.tsx'] = `import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Clock, Building2, Save, Users2, BriefcaseBusiness, CheckCircle2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import MetricCard from '../components/ui/MetricCard';

const spring = { type: 'spring' as const, stiffness: 340, damping: 32 };

interface Dept { id: string; name: string; head: string; }

const OrganizationPage: React.FC = () => {
  const [depts, setDepts] = useState<Dept[]>([
    { id: 'd1', name: 'Engineering', head: 'Rohan Kumar' },
    { id: 'd2', name: 'Design', head: 'Priya Singh' },
    { id: 'd3', name: 'Marketing', head: 'Arjun Patel' },
    { id: 'd4', name: 'HR', head: 'Neha Sharma' },
  ]);
  const [work, setWork] = useState({ workStart: '09:00', workEnd: '18:00', lunchStart: '13:00', lunchEnd: '14:00' });
  const [org, setOrg] = useState({ name: 'TechCorp Inc.', address: '123 Tech Street, San Francisco, CA', email: 'admin@techcorp.com' });
  const [draftDept, setDraftDept] = useState({ name: '', head: '' });
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const handleAddDept = () => {
    if (!draftDept.name.trim() || !draftDept.head.trim()) return;
    setDepts(c => [...c, { id: \`d\${Date.now()}\`, name: draftDept.name, head: draftDept.head }]);
    setDraftDept({ name: '', head: '' });
  };

  const inputCls = "w-full rounded-lg border border-surface-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 transition-all";

  return (
    <motion.div
      className="flex h-full flex-col overflow-hidden px-4 py-3 gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
    >
      <PageHeader
        eyebrow="Administration"
        title="Organization"
        description="Company profile, schedules, and departments."
        meta={
          <AnimatePresence>
            {saved && (
              <motion.span
                className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={spring}
              >
                <CheckCircle2 size={11} />Saved
              </motion.span>
            )}
          </AnimatePresence>
        }
        actions={
          <button onClick={handleSave} className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 transition-colors">
            <Save size={13} />Save changes
          </button>
        }
      />

      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        <MetricCard label="Employees" value="142" hint="Headcount" icon={Users2} iconClassName="bg-primary-50 text-primary-600" />
        <MetricCard label="Teams" value="8" hint="Active" icon={BriefcaseBusiness} iconClassName="bg-amber-50 text-amber-600" />
        <MetricCard label="Projects" value="12" hint="This quarter" icon={Building2} iconClassName="bg-emerald-50 text-emerald-600" />
        <MetricCard label="Departments" value={String(depts.length)} hint="Configured" icon={Clock} iconClassName="bg-rose-50 text-rose-600" />
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[1fr_1fr_220px] gap-3">
        {/* Profile + Departments */}
        <div className="overflow-y-auto space-y-3">
          <motion.div className="rounded-xl bg-white shadow-card p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={14} className="text-gray-400" />
              <p className="text-sm font-semibold text-gray-900">Organization Profile</p>
            </div>
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Name</label>
                <input type="text" value={org.name} onChange={e => setOrg(c => ({ ...c, name: e.target.value }))} className={\`mt-1 \${inputCls}\`} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Address</label>
                <input type="text" value={org.address} onChange={e => setOrg(c => ({ ...c, address: e.target.value }))} className={\`mt-1 \${inputCls}\`} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Contact Email</label>
                <input type="email" value={org.email} onChange={e => setOrg(c => ({ ...c, email: e.target.value }))} className={\`mt-1 \${inputCls}\`} />
              </div>
            </div>
          </motion.div>

          <motion.div className="rounded-xl bg-white shadow-card p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.06 }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900">Departments</p>
              <button onClick={handleAddDept} className="flex items-center gap-1 rounded-lg bg-primary-500 px-2 py-1 text-xs font-semibold text-white hover:bg-primary-600 transition-colors"><Plus size={11} />Add</button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input value={draftDept.name} onChange={e => setDraftDept(c => ({ ...c, name: e.target.value }))} className={inputCls} placeholder="Dept name" />
              <input value={draftDept.head} onChange={e => setDraftDept(c => ({ ...c, head: e.target.value }))} className={inputCls} placeholder="Dept head" />
            </div>
            <div className="space-y-1.5">
              <AnimatePresence>
                {depts.map(d => (
                  <motion.div
                    key={d.id}
                    className="flex items-center justify-between rounded-lg bg-surface-100 px-3 py-2"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8, height: 0 }}
                    transition={spring}
                  >
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{d.name}</p>
                      <p className="text-[11px] text-gray-500">Head: {d.head}</p>
                    </div>
                    <button onClick={() => setDepts(c => c.filter(x => x.id !== d.id))} className="rounded-lg p-1 text-gray-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"><Trash2 size={12} /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Work Schedule */}
        <motion.div className="overflow-y-auto rounded-xl bg-white shadow-card p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.08 }}>
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
                <input type="time" value={work[key]} onChange={e => setWork(c => ({ ...c, [key]: e.target.value }))} className={\`mt-1 \${inputCls}\`} />
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
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

        {/* Notes */}
        <motion.div className="rounded-xl bg-white shadow-card p-4 overflow-y-auto" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.1 }}>
          <p className="text-sm font-semibold text-gray-900 mb-3">Policy Notes</p>
          {['Attendance tracked from work start time.', 'Lunch window standardized for payroll.', 'Dept heads auto-receive leave approvals.', 'Schedule applies to all employees.'].map(item => (
            <div key={item} className="mb-2 rounded-xl bg-surface-100 px-3 py-2.5 text-xs text-gray-600 leading-relaxed">{item}</div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default OrganizationPage;
`;

// ─────────────────────────────────────────────────────────────────────────────
// ReportsPage – compact chart + table in split layout
// ─────────────────────────────────────────────────────────────────────────────
files['pages/ReportsPage.tsx'] = `import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Filter, Calendar, FileSpreadsheet, ChartColumn, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageHeader from '../components/ui/PageHeader';
import MetricCard from '../components/ui/MetricCard';

const spring = { type: 'spring' as const, stiffness: 340, damping: 32 };
type ReportType = 'project' | 'team' | 'attendance';
type ReportRow = { name: string; completed?: number; pending?: number; velocity?: number; present?: number; absent?: number; leave?: number; };

const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('project');
  const [dateRange, setDateRange] = useState('month');

  const data: Record<ReportType, ReportRow[]> = {
    project: [
      { name: 'Mobile App', completed: 38, pending: 7 },
      { name: 'Website', completed: 19, pending: 13 },
      { name: 'Design System', completed: 25, pending: 3 },
      { name: 'API Backend', completed: 32, pending: 6 },
    ],
    team: [
      { name: 'Frontend', velocity: 28, completed: 85, pending: 15 },
      { name: 'Backend', velocity: 32, completed: 88, pending: 12 },
      { name: 'Design', velocity: 24, completed: 92, pending: 8 },
      { name: 'QA', velocity: 20, completed: 95, pending: 5 },
    ],
    attendance: [
      { name: 'Frontend', present: 155, absent: 5, leave: 10 },
      { name: 'Backend', present: 152, absent: 8, leave: 10 },
      { name: 'Design', present: 148, absent: 10, leave: 12 },
      { name: 'QA', present: 150, absent: 8, leave: 12 },
    ],
  };

  const chartKeys: Record<ReportType, Array<{ key: keyof ReportRow; fill: string }>> = {
    project: [{ key: 'completed', fill: '#5030E5' }, { key: 'pending', fill: '#FFA500' }],
    team: [{ key: 'velocity', fill: '#8BC34A' }, { key: 'pending', fill: '#E84C3D' }],
    attendance: [{ key: 'present', fill: '#8BC34A' }, { key: 'absent', fill: '#E84C3D' }, { key: 'leave', fill: '#FFA500' }],
  };

  const rows = data[reportType];
  const keys = chartKeys[reportType];

  const handleExport = () => {
    const cols = ['name', ...keys.map(k => k.key)] as Array<keyof ReportRow>;
    const csv = [cols.join(','), ...rows.map(r => cols.map(c => r[c] ?? '').join(','))].join('\\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: \`\${reportType}-report.csv\` }).click();
    URL.revokeObjectURL(url);
  };

  const titles: Record<ReportType, string> = { project: 'Project Progress', team: 'Team Performance', attendance: 'Attendance Summary' };

  return (
    <motion.div
      className="flex h-full flex-col overflow-hidden px-4 py-3 gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
    >
      <PageHeader
        eyebrow="Insights"
        title="Reports"
        description="Slice data and export for stakeholders."
        actions={
          <motion.button onClick={handleExport} className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 transition-colors" whileTap={{ scale: 0.95 }}>
            <Download size={13} />Export CSV
          </motion.button>
        }
      />

      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        <MetricCard label="Report types" value="3" hint="Project, team, attendance" icon={FileSpreadsheet} iconClassName="bg-primary-50 text-primary-600" />
        <MetricCard label="Visible rows" value={String(rows.length)} hint="Current filter" icon={ChartColumn} iconClassName="bg-amber-50 text-amber-600" />
        <MetricCard label="Export ready" value="CSV" hint="Download enabled" icon={ShieldCheck} iconClassName="bg-emerald-50 text-emerald-600" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-card">
        <Filter size={13} className="text-gray-400" />
        <select value={reportType} onChange={e => setReportType(e.target.value as ReportType)} className="rounded-lg border border-surface-200 px-2 py-1.5 text-xs outline-none cursor-pointer">
          <option value="project">Project Report</option>
          <option value="team">Team Performance</option>
          <option value="attendance">Attendance Report</option>
        </select>
        <Calendar size={13} className="text-gray-400 ml-3" />
        <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="rounded-lg border border-surface-200 px-2 py-1.5 text-xs outline-none cursor-pointer">
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Chart + Table */}
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_300px] gap-3">
        {/* Chart */}
        <motion.div
          className="rounded-xl bg-white shadow-card p-4 flex flex-col"
          key={reportType}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}
        >
          <p className="text-sm font-semibold text-gray-900 mb-3">{titles[reportType]}</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {keys.map(k => <Bar key={String(k.key)} dataKey={k.key} fill={k.fill} radius={[4, 4, 0, 0]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          className="rounded-xl bg-white shadow-card overflow-hidden flex flex-col"
          initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.06 }}
        >
          <div className="flex-shrink-0 bg-surface-100 px-4 py-3">
            <p className="text-xs font-semibold text-gray-700">Detailed Breakdown</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-surface-100">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500">{reportType === 'project' ? 'Project' : 'Team'}</th>
                  {keys.map(c => <th key={String(c.key)} className="px-4 py-2.5 text-right font-semibold text-gray-500 capitalize">{String(c.key)}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <motion.tr
                    key={row.name}
                    className="border-b border-surface-50 hover:bg-surface-50 transition-colors"
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.04 }}
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-900">{row.name}</td>
                    {keys.map(c => <td key={String(c.key)} className="px-4 py-2.5 text-right text-gray-600">{row[c.key] ?? 0}</td>)}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ReportsPage;
`;

// ─────────────────────────────────────────────────────────────────────────────
// SettingsPage – compact two-column, no outer scroll
// ─────────────────────────────────────────────────────────────────────────────
files['pages/SettingsPage.tsx'] = `import React, { useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Bell, Lock, Save, HardDrive, Database, Zap, FileText, Monitor, CheckCircle2 } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import PageHeader from '../components/ui/PageHeader';

const spring = { type: 'spring' as const, stiffness: 340, damping: 32 };

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={\`relative inline-flex h-5 w-9 items-center rounded-full transition-colors \${checked ? 'bg-primary-500' : 'bg-gray-200'}\`}
  >
    <motion.span
      className="absolute h-3.5 w-3.5 rounded-full bg-white shadow-sm"
      animate={{ x: checked ? 18 : 2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  </button>
);

const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useContext(AppContext);
  const [notifs, setNotifs] = useState({ taskReminders: true, attendanceReminders: true, leaveApprovals: true, mentions: true, email: true });
  const [security, setSecurity] = useState({ biometric: true, twoFactor: false });
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const inputCls = "w-full rounded-lg border border-surface-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary-200 transition-all";

  return (
    <motion.div
      className="flex h-full flex-col overflow-hidden px-4 py-3 gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
    >
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Appearance, notifications, and security controls."
        meta={
          <AnimatePresence>
            {saved && (
              <motion.span
                className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={spring}
              >
                <CheckCircle2 size={11} />Saved
              </motion.span>
            )}
          </AnimatePresence>
        }
        actions={
          <motion.button onClick={handleSave} className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 transition-colors" whileTap={{ scale: 0.95 }}>
            <Save size={13} />Save Changes
          </motion.button>
        }
      />

      <div className="flex-1 min-h-0 grid grid-cols-[1fr_1fr_240px] gap-3">
        {/* Left: Profile + Appearance + Security */}
        <div className="overflow-y-auto space-y-3">
          <motion.div className="rounded-xl bg-white shadow-card p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
            <p className="text-sm font-semibold text-gray-900 mb-3">Profile</p>
            <div className="space-y-2.5">
              {[{ label: 'Name', type: 'text', val: 'Anima Agrawal' },{ label: 'Email', type: 'email', val: 'anima@techcorp.com' },{ label: 'Designation', type: 'text', val: 'Project Manager' }].map(f => (
                <div key={f.label}>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{f.label}</label>
                  <input type={f.type} defaultValue={f.val} className={\`mt-1 \${inputCls}\`} />
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div className="rounded-xl bg-white shadow-card p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.05 }}>
            <div className="flex items-center gap-2 mb-3">
              {theme === 'dark' ? <Moon size={14} className="text-gray-400" /> : <Sun size={14} className="text-gray-400" />}
              <p className="text-sm font-semibold text-gray-900">Appearance</p>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-surface-100 px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-gray-800">Dark Mode</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Currently: {theme}</p>
              </div>
              <Toggle checked={theme === 'dark'} onChange={v => setTheme(v ? 'dark' : 'light')} />
            </div>
          </motion.div>

          <motion.div className="rounded-xl bg-white shadow-card p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.1 }}>
            <div className="flex items-center gap-2 mb-3">
              <Lock size={14} className="text-gray-400" />
              <p className="text-sm font-semibold text-gray-900">Security</p>
            </div>
            <div className="space-y-2">
              {([['biometric', 'Biometric Unlock'], ['twoFactor', 'Two-Factor Auth']] as const).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-xl bg-surface-100 px-4 py-3">
                  <p className="text-xs font-semibold text-gray-800">{label}</p>
                  <Toggle checked={security[key]} onChange={v => setSecurity(c => ({ ...c, [key]: v }))} />
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Middle: Notifications */}
        <div className="overflow-y-auto space-y-3">
          <motion.div className="rounded-xl bg-white shadow-card p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.04 }}>
            <div className="flex items-center gap-2 mb-3">
              <Bell size={14} className="text-gray-400" />
              <p className="text-sm font-semibold text-gray-900">Notifications</p>
            </div>
            <div className="space-y-1.5">
              {([['taskReminders', 'Task Reminders'], ['attendanceReminders', 'Attendance Reminders'], ['leaveApprovals', 'Leave Approvals'], ['mentions', 'Mentions'], ['email', 'Email Notifications']] as const).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-xl bg-surface-100 px-4 py-2.5">
                  <p className="text-xs font-medium text-gray-700">{label}</p>
                  <Toggle checked={notifs[key]} onChange={v => setNotifs(c => ({ ...c, [key]: v }))} />
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div className="rounded-xl bg-white shadow-card p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.08 }}>
            <div className="flex items-center gap-2 mb-3">
              <Database size={14} className="text-gray-400" />
              <p className="text-sm font-semibold text-gray-900">Data Management</p>
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'Backup Database', icon: HardDrive, cls: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
                { label: 'Restore from Backup', icon: Zap, cls: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' },
                { label: 'Export All Data', icon: FileText, cls: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
              ].map(({ label, icon: Icon, cls }) => (
                <motion.button key={label} className={\`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors \${cls}\`} whileHover={{ x: 2 }}>
                  <Icon size={13} />{label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right: Workspace status */}
        <motion.div
          className="rounded-xl bg-white shadow-card p-4 overflow-y-auto"
          initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.06 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Monitor size={14} className="text-gray-400" />
            <p className="text-sm font-semibold text-gray-900">Workspace</p>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Theme', val: theme, cls: 'text-primary-600' },
              { label: 'Notifications', val: \`\${Object.values(notifs).filter(Boolean).length}/5 on\`, cls: 'text-emerald-600' },
              { label: 'Security', val: \`\${Object.values(security).filter(Boolean).length}/2 active\`, cls: 'text-amber-600' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between rounded-xl bg-surface-100 px-3 py-2.5">
                <span className="text-xs text-gray-600">{s.label}</span>
                <span className={\`text-xs font-semibold \${s.cls}\`}>{s.val}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1.5">
            {['Theme switching is session-persistent.', 'Notification toggles apply immediately.', 'Backup/export available from this screen.'].map(item => (
              <p key={item} className="rounded-xl bg-surface-100 px-3 py-2 text-[11px] leading-relaxed text-gray-500">{item}</p>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SettingsPage;
`;

// Write all files
let count = 0;
for (const [rel, content] of Object.entries(files)) {
    const abs = join(src, rel);
    writeFileSync(abs, content, 'utf8');
    count++;
    console.log(`✓ ${rel}`);
}
console.log(`\nWrote ${count} files.`);
