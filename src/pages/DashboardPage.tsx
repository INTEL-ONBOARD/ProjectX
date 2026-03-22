import React, { useContext, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, CheckSquare, Clock, TrendingUp, Plus } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { AppContext } from '../context/AppContext';
import { useProjects } from '../context/ProjectContext';
import { useMembersContext } from '../context/MembersContext';
import { usePresence } from '../context/PresenceContext';
import { ACTIVITY_LABELS } from '../constants/taskMeta';

const statusColor = { online: '#68B266', away: '#FFA500', offline: '#D1D5DB' };


const TODAY = new Date().toISOString().split('T')[0];

const FEED_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'created', label: 'Created' },
  { key: 'status_changed', label: 'Status' },
  { key: 'assignee_added', label: 'Assigned' },
  { key: 'priority_changed', label: 'Priority' },
];

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { attendanceRecords, selectedWeekStart } = useContext(AppContext);
  const { allTasks } = useProjects();
  const { members, getMemberColor } = useMembersContext();
  const { getStatus, getLastSeen } = usePresence();

  const formatLastSeen = (userId: string): string => {
    const ls = getLastSeen(userId);
    if (!ls) return '';
    const diffMs = Date.now() - new Date(ls).getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return 'yesterday';
    return `${diffDay}d ago`;
  };
  const todoTasks = allTasks.filter(t => t.status === 'todo');
  const doneTasks = allTasks.filter(t => t.status === 'done');
  const inProgressTasks = allTasks.filter(t => t.status === 'in-progress');
  const totalTasks = allTasks.length;
  const doneCount = doneTasks.length;
  const todoCount = todoTasks.length;
  const inProgressCount = inProgressTasks.length;
  const completionPctOverall = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  const weekEnd = (() => { const d = new Date(selectedWeekStart); d.setDate(d.getDate() + 6); return d.toISOString().split('T')[0]; })();
  const weekRecords = attendanceRecords.filter(r => r.date >= selectedWeekStart && r.date <= weekEnd);
  const weekTrackedDays = new Set(weekRecords.map(r => r.date)).size;
  const denominator = members.length * (weekTrackedDays > 0 ? weekTrackedDays : 5);
  const presentSlots = weekRecords.filter(r => r.status === 'present' || r.status === 'wfh').length;
  const attendanceRate = denominator > 0 ? Math.round((presentSlots / denominator) * 100) : 0;

  const overdueCount = allTasks.filter(t => t.dueDate && t.dueDate < TODAY && t.status !== 'done').length;
  const completionPct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  const metrics = [
    { label: 'Team Members', value: String(members.length), trend: 'Active members', trendUp: true, color: '', accent: true, icon: Users, barPct: 100 },
    { label: 'Tasks Completed', value: String(doneCount), trend: `${completionPct}% complete`, trendUp: true, color: '#68B266', accent: false, icon: CheckSquare, barPct: totalTasks > 0 ? (doneCount / totalTasks) * 100 : 0 },
    { label: 'Tasks Pending', value: String(todoCount), trend: overdueCount > 0 ? `${overdueCount} overdue` : 'On track', trendUp: overdueCount === 0, color: '#D8727D', accent: false, icon: Clock, barPct: totalTasks > 0 ? (todoCount / totalTasks) * 100 : 0 },
    { label: 'Attendance Rate', value: `${attendanceRate}%`, trend: 'Weekly avg', trendUp: true, color: '#30C5E5', accent: false, icon: TrendingUp, barPct: attendanceRate },
  ];

  const [activityFilter, setActivityFilter] = useState<string>('all');

  const activityFeed = useMemo(() => {
    const entries: { taskTitle: string; actorName: string; type: string; timestamp: string; taskId: string }[] = [];
    outer: for (const task of allTasks) {
      for (const entry of task.activity ?? []) {
        entries.push({ taskTitle: task.title, actorName: entry.actorName, type: entry.type, timestamp: entry.timestamp, taskId: task.id });
        if (entries.length >= 200) break outer;
      }
    }
    return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 15);
  }, [allTasks]);

  const filteredFeed = activityFilter === 'all'
    ? activityFeed
    : activityFeed.filter(item => item.type === activityFilter);

  const activityLabel = ACTIVITY_LABELS;

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

  return (
  <motion.div
    className="flex-1 flex flex-col overflow-hidden px-8 bg-white"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3, delay: 0.1 }}
  >
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="pt-8 pb-5 shrink-0">
        <PageHeader
          eyebrow="Home / Dashboard"
          title="Dashboard"
          description="Project overview"
          actions={
            <motion.button
              onClick={() => navigate('/reports')}
              className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              <Plus size={16} /> New Report
            </motion.button>
          }
        />
      </div>

      {/* 4-metric strip */}
      <div className="grid grid-cols-4 gap-5 mb-4 shrink-0">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              className={`rounded-2xl p-5 ${m.accent ? 'bg-gradient-to-br from-primary-500 to-primary-400 text-white' : 'bg-white border border-surface-200'}`}
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
      <div className="grid grid-cols-[1fr_300px] gap-5 flex-1 min-h-0 pb-6">
        {/* Main: Recent Activity + Upcoming Tasks */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden shrink-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <h2 className="font-bold text-gray-900 text-sm">Recent Activity</h2>
              <button onClick={() => navigate('/tasks')} className="text-xs text-primary-500 font-semibold hover:text-primary-700">View all →</button>
            </div>
            <div className="px-5">
              <div className="flex gap-1.5 flex-wrap mb-3 pt-3">
                {FEED_FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setActivityFilter(f.key)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      activityFilter === f.key
                        ? 'bg-primary-500 text-white'
                        : 'bg-surface-100 text-gray-500 hover:bg-surface-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {filteredFeed.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No activity yet</p>
              ) : filteredFeed.map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2">
                  <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-primary-600">{item.actorName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700">
                      <span className="font-semibold">{item.actorName}</span>
                      {' '}{activityLabel[item.type] ?? item.type}{' '}
                      <span className="font-medium text-gray-900 truncate">"{item.taskTitle.slice(0, 35)}{item.taskTitle.length > 35 ? '…' : ''}"</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{new Date(item.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Tasks */}
          <motion.div className="bg-white rounded-2xl border border-surface-200 overflow-hidden shrink-0"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <h2 className="font-bold text-gray-900 text-sm">Upcoming Tasks</h2>
              <button onClick={() => navigate('/tasks')} className="text-xs text-primary-500 font-semibold hover:text-primary-700">View all →</button>
            </div>
            <div className="px-5">
              {todoTasks.map((task, i) => (
                <motion.div key={task.id}
                  className="flex items-center gap-3 py-3 border-b border-surface-100 last:border-0"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.35 + i * 0.05, ease: [0.4, 0, 0.2, 1] }}>
                  <div className="w-2 h-2 rounded-full shrink-0 bg-primary-400" />
                  <span className="text-sm text-gray-700 flex-1 truncate">{task.title}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    task.priority === 'high' ? 'bg-[#D8727D22] text-[#D8727D]' :
                    task.priority === 'completed' ? 'bg-[#83C29D33] text-[#68B266]' :
                    'bg-[#DFA87433] text-[#D58D49]'
                  }`}>{task.priority === 'high' ? 'High' : task.priority === 'completed' ? 'Done' : 'Low'}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Side panels */}
        <div className="flex flex-col gap-4 overflow-y-auto min-h-0">
          {/* Task Overview */}
          <motion.div
            className="bg-white rounded-2xl border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0, ease: [0.4, 0, 0.2, 1] }}
          >
            <h3 className="font-bold text-gray-900 text-sm mb-3">Task Overview</h3>
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Progress</span><span className="font-bold text-primary-500">{completionPctOverall}%</span>
              </div>
              <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
                  initial={{ width: 0 }} animate={{ width: `${completionPctOverall}%` }}
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
            className="bg-white rounded-2xl border border-surface-200 p-4"
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
            className="bg-white rounded-2xl border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.16, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-sm">Team</h3>
              <button onClick={() => navigate('/members')} className="text-xs text-primary-500 font-semibold hover:text-primary-700">View all →</button>
            </div>
            {members.map((member) => {
              const color = getMemberColor(member.id);
              return (
                <div key={member.id} className="flex items-center gap-2.5 py-2 border-b border-surface-100 last:border-0">
                  <Avatar name={member.name} color={color} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-900 truncate">{member.name}</div>
                    <div className="text-[10px] text-gray-400 truncate">{member.designation ?? ''}</div>
                    {(() => {
                      const ps = getStatus(member.id);
                      const ls = formatLastSeen(member.id);
                      if (ps === 'offline' && ls) return <div className="text-[10px] text-gray-400">last seen {ls}</div>;
                      return null;
                    })()}
                  </div>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor[getStatus(member.id)] }} />
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  </motion.div>
  );
};


export default DashboardPage;
