import React from 'react';
import { motion } from 'framer-motion';
import { Download, BarChart3, TrendingUp, Users, AlertCircle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { useProjects } from '../context/ProjectContext';
import { useMembersContext } from '../context/MembersContext';
import { downloadCsv } from '../utils/exportCsv';
const TODAY = new Date().toISOString().split('T')[0];

const ReportsPage: React.FC = () => {
  const { projects: ctxProjects, allTasks: ctxAllTasks } = useProjects();
  const { members, getMemberColor } = useMembersContext();

  const allTasks = ctxAllTasks;
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter(t => t.status === 'done');
  const todoTasks = allTasks.filter(t => t.status === 'todo');
  const inProgressTasks = allTasks.filter(t => t.status === 'in-progress');
  const readyForQaTasks = allTasks.filter(t => t.status === 'ready-for-qa');
  const deploymentPendingTasks = allTasks.filter(t => t.status === 'deployment-pending');
  const blockerTasks = allTasks.filter(t => t.status === 'blocker');
  const completionRate = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;
  const completionTrend = completionRate >= 80 ? '↑ On track' : completionRate >= 50 ? '→ In progress' : completionRate > 0 ? '↓ Needs focus' : 'No tasks yet';
  const completionTrendUp = completionRate >= 50;
  const overdueCount = allTasks.filter(t => t.dueDate && t.dueDate < TODAY && t.status !== 'done').length;

  const bars = [
    { label: 'To Do',               count: todoTasks.length,              color: '#5030E5' },
    { label: 'In Progress',         count: inProgressTasks.length,        color: '#FFA500' },
    { label: 'Ready for QA',        count: readyForQaTasks.length,        color: '#30C5E5' },
    { label: 'Deployment Pending',  count: deploymentPendingTasks.length, color: '#9C27B0' },
    { label: 'Blocker',             count: blockerTasks.length,           color: '#D8727D' },
    { label: 'Done',                count: doneTasks.length,              color: '#68B266' },
  ];

  const projectTaskCounts: Record<string, number> = {};
  allTasks.forEach(t => {
    if (t.projectId) projectTaskCounts[t.projectId] = (projectTaskCounts[t.projectId] ?? 0) + 1;
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
    { label: 'Completion Rate', value: `${completionRate}%`, trend: completionTrend, trendUp: completionTrendUp, color: '', accent: true, icon: TrendingUp, barPct: completionRate },
    { label: 'Total Tasks', value: String(totalTasks), trend: 'All projects', trendUp: true, color: '#5030E5', accent: false, icon: BarChart3, barPct: 100 },
    { label: 'Active Members', value: String(members.length), trend: 'Contributing', trendUp: true, color: '#68B266', accent: false, icon: Users, barPct: 100 },
    { label: 'Overdue', value: String(overdueCount), trend: 'Need attention', trendUp: false, color: '#D8727D', accent: false, icon: AlertCircle, barPct: totalTasks > 0 ? (overdueCount / totalTasks) * 100 : 0 },
  ];

  const memberContributions = members.map(m => ({
    member: m,
    color: getMemberColor(m.id),
    count: allTasks.filter(t => t.assignees.includes(m.id)).length,
  }));
  const maxContribution = Math.max(1, ...memberContributions.map(c => c.count));

  const handleExport = () => {
    const header = ['Project', 'Total Tasks', 'Completed', 'In Progress', 'To Do', 'Completion Rate'];
    const rows = ctxProjects.map(p => {
      const tasks = ctxAllTasks.filter(t => t.projectId === p.id);
      const total = tasks.length;
      const done = tasks.filter(t => t.status === 'done').length;
      const inProg = tasks.filter(t => t.status === 'in-progress').length;
      const todo = tasks.filter(t => t.status === 'todo').length;
      const rate = total > 0 ? `${Math.round((done / total) * 100)}%` : '0%';
      return [p.name, String(total), String(done), String(inProg), String(todo), rate];
    });
    downloadCsv('reports.csv', [header, ...rows]);
  };

  return (
  <motion.div
    className="flex-1 flex flex-col overflow-hidden px-8 bg-white"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    transition={{ duration: 0.3, delay: 0.1 }}
  >
    <div className="flex flex-col h-full">
      <div className="pt-8 pb-5 shrink-0">
        <PageHeader
          eyebrow="Home / Reports"
          title="Reports"
          description="Project analytics"
          actions={
            <motion.button onClick={handleExport} className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Download size={16} /> Download Report
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
      <div className="grid grid-cols-[1fr_300px] gap-5 flex-1 min-h-0 pb-6">
        {/* Main: Task Breakdown + By Project */}
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden overflow-y-auto">
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
              {ctxProjects.map((project, i) => {
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
        <div className="flex flex-col gap-4 overflow-y-auto min-h-0">
          {/* Priority Breakdown donut */}
          <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
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
          <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Team Velocity</h3>
            {(() => {
              const sprintStart = new Date(TODAY.slice(0, 8) + '01');
              const todayDate = new Date(TODAY);
              const daysElapsed = Math.max(1, Math.round((todayDate.getTime() - sprintStart.getTime()) / 86400000) + 1);
              const velocity = doneTasks.length / daysElapsed;
              const lastDay = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
              const daysLeft = Math.max(0, Math.round((lastDay.getTime() - todayDate.getTime()) / 86400000));
              const remaining = totalTasks - doneTasks.length;
              const projectedDays = velocity > 0 ? Math.ceil(remaining / velocity) : null;
              const projectedDate = projectedDays !== null
                ? new Date(todayDate.getTime() + projectedDays * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '—';
              return [
                ['Tasks / day', velocity.toFixed(1)],
                ['Sprint days left', String(daysLeft)],
                ['Projected done', projectedDate],
              ].map(([label, val]) => (
                <div key={String(label)} className="flex justify-between py-2 border-b border-surface-100 last:border-0 text-xs">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-bold text-gray-900">{val}</span>
                </div>
              ));
            })()}
          </motion.div>

          {/* Member Contributions */}
          <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.16, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Member Contributions</h3>
            {memberContributions.map(({ member, color, count }) => {
              const pct = (count / maxContribution) * 100;
              return (
                <div key={member.id} className="flex items-center gap-2 py-2 border-b border-surface-100 last:border-0 text-xs">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-gray-500 flex-1 truncate">{member.name.split(' ')[0]}</span>
                  <div className="w-14 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="font-bold text-gray-900 w-4 text-right">{count}</span>
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

export default ReportsPage;
