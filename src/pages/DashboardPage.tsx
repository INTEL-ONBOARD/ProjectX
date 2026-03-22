import React, { useContext, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, CheckSquare, Clock, TrendingUp, Plus, AlertTriangle, UserX, Timer } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { AppContext } from '../context/AppContext';
import { useProjects } from '../context/ProjectContext';
import { useMembersContext } from '../context/MembersContext';
import { usePresence } from '../context/PresenceContext';

const statusColor = { online: '#68B266', away: '#FFA500', offline: '#D1D5DB' };

const TODAY = new Date().toISOString().split('T')[0];
const STALE_DAYS = 3;

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

  // ── Today's digest stats ────────────────────────────────────────────────────
  const todayDigest = useMemo(() => {
    let completedToday = 0;
    let movedToday = 0;
    const activeActors = new Set<string>();
    for (const task of allTasks) {
      for (const entry of task.activity ?? []) {
        if (!entry.timestamp.startsWith(TODAY)) continue;
        activeActors.add(entry.actorId);
        if (entry.type === 'status_changed' && entry.to === 'done') completedToday++;
        if (entry.type === 'status_changed') movedToday++;
      }
    }
    return { completedToday, movedToday, activeMembers: activeActors.size };
  }, [allTasks]);

  // ── Needs Attention list ─────────────────────────────────────────────────────
  const needsAttention = useMemo(() => {
    const items: { id: string; title: string; reason: 'overdue' | 'stale' | 'unassigned'; dueDate?: string; assignees: string[] }[] = [];
    for (const task of allTasks) {
      if (task.status === 'done') continue;
      const isOverdue = !!task.dueDate && task.dueDate < TODAY;
      const isUnassigned = !task.assignees || task.assignees.length === 0;
      // stale: last status change was >STALE_DAYS ago and task is in-progress
      const isStale = (() => {
        if (task.status !== 'in-progress') return false;
        const lastStatusChange = (task.activity ?? [])
          .filter(a => a.type === 'status_changed')
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
        if (!lastStatusChange) return false;
        const diffDays = (Date.now() - new Date(lastStatusChange.timestamp).getTime()) / 86_400_000;
        return diffDays > STALE_DAYS;
      })();
      if (isOverdue) items.push({ id: task.id, title: task.title, reason: 'overdue', dueDate: task.dueDate, assignees: task.assignees ?? [] });
      else if (isStale) items.push({ id: task.id, title: task.title, reason: 'stale', dueDate: task.dueDate, assignees: task.assignees ?? [] });
      else if (isUnassigned) items.push({ id: task.id, title: task.title, reason: 'unassigned', dueDate: task.dueDate, assignees: [] });
    }
    // overdue first, stale second, unassigned third
    const order = { overdue: 0, stale: 1, unassigned: 2 };
    return items.sort((a, b) => order[a.reason] - order[b.reason]).slice(0, 6);
  }, [allTasks]);

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
    className="flex-1 flex flex-col overflow-hidden bg-[#F8F9FB]"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
  >
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <div className="px-8 pt-7 pb-4 shrink-0 bg-[#F8F9FB]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-gray-400 mb-0.5">Home / Dashboard</p>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1>
          </div>
          <motion.button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-2 bg-primary-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-primary-600 transition-colors shadow-sm"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          >
            <Plus size={14} /> New Report
          </motion.button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-8">

        {/* ── Row 1: 4 metric cards ── */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.label}
                className={`rounded-2xl p-5 ${m.accent ? 'bg-gradient-to-br from-primary-500 to-primary-600' : 'bg-white border border-gray-100 shadow-sm'}`}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${m.accent ? 'bg-white/20' : ''}`}
                    style={!m.accent ? { background: m.color + '18' } : {}}>
                    <Icon size={17} className={m.accent ? 'text-white' : ''} style={!m.accent ? { color: m.color } : {}} />
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.accent ? 'bg-white/20 text-white/90' : m.trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {m.trend}
                  </span>
                </div>
                <div className={`text-3xl font-black tracking-tight ${m.accent ? 'text-white' : 'text-gray-900'}`}>{m.value}</div>
                <div className={`text-[11px] mt-1 font-medium ${m.accent ? 'text-white/70' : 'text-gray-400'}`}>{m.label}</div>
                <div className={`mt-3 h-1.5 rounded-full overflow-hidden ${m.accent ? 'bg-white/20' : 'bg-gray-100'}`}>
                  <motion.div className={`h-full rounded-full ${m.accent ? 'bg-white/50' : ''}`}
                    style={{ ...(!m.accent ? { background: m.color } : {}) }}
                    initial={{ width: 0 }} animate={{ width: `${m.barPct}%` }}
                    transition={{ duration: 0.7, delay: 0.2 + i * 0.06 }} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Row 2: Today's Digest + Task Status + Team ── */}
        <div className="grid grid-cols-[1fr_200px_220px] gap-4 mb-4">

          {/* Today's Digest */}
          <motion.div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Today's Digest</h2>
                <p className="text-[10px] text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 divide-x divide-gray-50 px-0">
              {[
                { label: 'Completed', value: todayDigest.completedToday, icon: CheckSquare, color: '#10B981', bg: '#10B98110' },
                { label: 'Moved',     value: todayDigest.movedToday,     icon: Clock,        color: '#0EA5E9', bg: '#0EA5E910' },
                { label: 'Active',    value: todayDigest.activeMembers,  icon: Users,        color: '#8B5CF6', bg: '#8B5CF610' },
                { label: 'Overdue',   value: overdueCount,               icon: AlertTriangle,color: '#EF4444', bg: '#EF444410' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="flex flex-col items-center justify-center py-5 gap-1">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1" style={{ background: bg }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <div className="text-xl font-black" style={{ color }}>{value}</div>
                  <div className="text-[10px] text-gray-400 font-medium">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Task Status donut */}
          <motion.div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Task Status</h3>
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-20 h-20">
                <div className="w-20 h-20 rounded-full" style={{ background: donutGradient }} />
                <div className="absolute inset-[6px] rounded-full bg-white flex flex-col items-center justify-center">
                  <div className="text-sm font-black text-gray-900">{completionPct}%</div>
                  <div className="text-[9px] text-gray-400">done</div>
                </div>
              </div>
              <div className="w-full flex flex-col gap-1.5">
                {donutItems.map(d => (
                  <div key={d.label} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-gray-500 flex-1 text-[11px]">{d.label}</span>
                    <span className="font-bold text-gray-800 text-[11px]">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Team */}
          <motion.div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Team</h3>
              <button onClick={() => navigate('/members')} className="text-[11px] text-primary-500 font-semibold hover:text-primary-700">View all →</button>
            </div>
            <div className="flex flex-col gap-0">
              {members.map((member) => {
                const color = getMemberColor(member.id);
                const ps = getStatus(member.id);
                const ls = formatLastSeen(member.id);
                return (
                  <div key={member.id} className="flex items-center gap-2.5 py-2 border-b border-gray-50 last:border-0">
                    <div className="relative shrink-0">
                      <Avatar name={member.name} color={color} size="sm" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: statusColor[ps] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-gray-900 truncate">{member.name}</div>
                      <div className="text-[9px] text-gray-400 truncate">
                        {ps === 'online' ? 'Online now' : ps === 'away' ? 'Away' : ls ? `Seen ${ls}` : 'Offline'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ── Row 3: Needs Attention + Upcoming Tasks ── */}
        <div className="grid grid-cols-[1fr_1fr] gap-4">

          {/* Needs Attention */}
          <motion.div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.25 }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900">Needs Attention</h2>
                {needsAttention.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">{needsAttention.length}</span>
                )}
              </div>
              <button onClick={() => navigate('/tasks')} className="text-[11px] text-primary-500 font-semibold hover:text-primary-700">View tasks →</button>
            </div>
            <div className="px-5 py-1">
              {needsAttention.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <CheckSquare size={18} className="text-green-500" />
                  </div>
                  <p className="text-xs text-gray-400 font-medium">All clear!</p>
                </div>
              ) : needsAttention.map((item) => {
                const meta = {
                  overdue:    { label: 'Overdue',    color: '#EF4444', bg: '#FEF2F2', icon: AlertTriangle },
                  stale:      { label: 'Stale',      color: '#F59E0B', bg: '#FFFBEB', icon: Timer },
                  unassigned: { label: 'Unassigned', color: '#8B5CF6', bg: '#F5F3FF', icon: UserX },
                }[item.reason];
                const Icon = meta.icon;
                return (
                  <div key={item.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: meta.bg }}>
                      <Icon size={12} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 truncate">{item.title}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                        {item.dueDate && <span className="text-[10px] text-gray-400">· {item.dueDate}</span>}
                      </div>
                    </div>
                    <div className="flex -space-x-1.5 shrink-0">
                      {item.assignees.length === 0
                        ? <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"><UserX size={9} className="text-gray-400" /></div>
                        : item.assignees.slice(0, 2).map(uid => {
                            const m = members.find(m => m.id === uid);
                            return m ? <Avatar key={uid} name={m.name} color={getMemberColor(uid)} size="sm" /> : null;
                          })
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Upcoming Tasks */}
          <motion.div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
              <h2 className="text-sm font-bold text-gray-900">Upcoming Tasks</h2>
              <button onClick={() => navigate('/tasks')} className="text-[11px] text-primary-500 font-semibold hover:text-primary-700">View all →</button>
            </div>
            <div className="px-5 py-1">
              {todoTasks.slice(0, 8).map((task, i) => (
                <motion.div key={task.id}
                  className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: 0.3 + i * 0.04 }}>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-primary-400" />
                  <span className="text-xs text-gray-700 flex-1 truncate">{task.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    task.priority === 'high' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                  }`}>{task.priority === 'high' ? 'High' : 'Med'}</span>
                </motion.div>
              ))}
              {todoTasks.length === 0 && (
                <p className="text-xs text-gray-400 py-10 text-center">No upcoming tasks</p>
              )}
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  </motion.div>
  );
};


export default DashboardPage;
