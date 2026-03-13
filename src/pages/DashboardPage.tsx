import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, CheckSquare, Clock, TrendingUp, CheckCircle, Plus, MessageSquare } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { teamMembers, memberColors } from '../data/mockData';
import { AppContext } from '../context/AppContext';
import { useProjects } from '../context/ProjectContext';

const designations: Record<string, string> = {
  u1: 'Project Manager', u2: 'Frontend Developer', u3: 'UI Designer',
  u4: 'Backend Developer', u5: 'QA Engineer', u6: 'DevOps Engineer',
};
const onlineStatus: Record<string, 'online' | 'away' | 'offline'> = {
  u1: 'online', u2: 'online', u3: 'away', u4: 'online', u5: 'online', u6: 'offline',
};
const statusColor = { online: '#68B266', away: '#FFA500', offline: '#D1D5DB' };

const activityItems = [
  { id: 'a1', icon: CheckCircle, bg: 'bg-[#83C29D33]', color: 'text-[#68B266]', text: 'Mobile App Design marked as Done', time: '2m ago' },
  { id: 'a2', icon: Plus, bg: 'bg-primary-50', color: 'text-primary-500', text: 'Wireframes task created', time: '1h ago' },
  { id: 'a3', icon: Users, bg: 'bg-[#30C5E533]', color: 'text-[#30C5E5]', text: 'Priya Singh joined the team', time: '3h ago' },
  { id: 'a4', icon: MessageSquare, bg: 'bg-surface-200', color: 'text-gray-400', text: '12 new comments on Brainstorming', time: '5h ago' },
  { id: 'a5', icon: Clock, bg: 'bg-[#DFA87433]', color: 'text-[#D58D49]', text: 'Research task moved to In Progress', time: 'Yesterday' },
];

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { attendanceRecords } = useContext(AppContext);
  const { allTasks } = useProjects();
  const todoTasks = allTasks.filter(t => t.status === 'todo');
  const doneTasks = allTasks.filter(t => t.status === 'done');
  const inProgressTasks = allTasks.filter(t => t.status === 'in-progress');
  const totalTasks = allTasks.length;
  const doneCount = doneTasks.length;
  const todoCount = todoTasks.length;
  const inProgressCount = inProgressTasks.length;
  const sprintPct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  const totalSlots = teamMembers.length * 5;
  const presentSlots = attendanceRecords.filter(r => r.status === 'present' || r.status === 'wfh').length;
  const attendanceRate = totalSlots > 0 ? Math.round((presentSlots / totalSlots) * 100) : 0;

  const metrics = [
    { label: 'Team Members', value: String(teamMembers.length), trend: 'Active this sprint', trendUp: true, color: '', accent: true, icon: Users, barPct: 100 },
    { label: 'Tasks Completed', value: String(doneCount), trend: '↑ 1 today', trendUp: true, color: '#68B266', accent: false, icon: CheckSquare, barPct: totalTasks > 0 ? (doneCount / totalTasks) * 100 : 0 },
    { label: 'Tasks Pending', value: String(todoCount), trend: '2 overdue', trendUp: false, color: '#D8727D', accent: false, icon: Clock, barPct: totalTasks > 0 ? (todoCount / totalTasks) * 100 : 0 },
    { label: 'Attendance Rate', value: `${attendanceRate}%`, trend: 'Weekly avg', trendUp: true, color: '#30C5E5', accent: false, icon: TrendingUp, barPct: attendanceRate },
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
              {activityItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.id}
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
                    task.priority === 'high' ? 'bg-[#D8727D22] text-[#D8727D]' : 'bg-[#DFA87433] text-[#D58D49]'
                  }`}>{task.priority === 'high' ? 'High' : 'Low'}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Side panels */}
        <div className="flex flex-col gap-4 overflow-y-auto min-h-0">
          {/* Sprint Overview */}
          <motion.div
            className="bg-white rounded-2xl border border-surface-200 p-4"
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
            {teamMembers.map((member, index) => {
              const color = memberColors[index] ?? memberColors[0];
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
};


export default DashboardPage;
