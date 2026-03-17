import React, { useState, useRef, useEffect, useMemo, useCallback, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, BarChart3, TrendingUp, Users, AlertCircle, ChevronDown, FileDown } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { useProjects } from '../context/ProjectContext';
import { useMembersContext } from '../context/MembersContext';
import { useAuth } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';
import { downloadCsv } from '../utils/exportCsv';
import { STATUS_META as STATUS_META_LOOKUP } from '../constants/taskMeta';
import { AttendanceChart } from '../components/charts/AttendanceChart';

const TODAY = new Date().toISOString().split('T')[0];

const STATUS_COLOR_MAP: Record<string, string> = {
  'todo': '#5030E5',
  'in-progress': '#FFA500',
  'ready-for-qa': '#30C5E5',
  'deployment-pending': '#9C27B0',
  'blocker': '#D8727D',
  'on-hold': '#EAB308',
  'done': '#68B266',
};

const STATUS_META = (Object.entries(STATUS_META_LOOKUP) as [string, { label: string; bg: string; text: string; dot: string }][]).map(
  ([key, val]) => ({ key, label: val.label, color: STATUS_COLOR_MAP[key] ?? '#9CA3AF' })
) as readonly { key: string; label: string; color: string }[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const userPrefsApi = () => (window as any).electronAPI.userPrefs as {
  get: (userId: string) => Promise<{ taskBreakdownSnapshot?: Record<string, number> } | null>;
  set: (prefs: object) => Promise<void>;
};

const ReportsPage: React.FC = () => {
  const { projects: ctxProjects, allTasks: ctxAllTasks } = useProjects();
  const { members, getMemberColor } = useMembersContext();
  const { user } = useAuth();
  const { attendanceRecords } = useContext(AppContext);

  const previousCounts = useRef<Record<string, number>>({});
  const [snapshotLoaded, setSnapshotLoaded] = useState(false);

  // Load snapshot from MongoDB on mount
  useEffect(() => {
    if (!user) return;
    userPrefsApi().get(user.id)
      .then(prefs => {
        if (prefs?.taskBreakdownSnapshot) {
          previousCounts.current = prefs.taskBreakdownSnapshot;
        }
        setSnapshotLoaded(true);
      })
      .catch(() => { setSnapshotLoaded(true); });
  }, [user?.id]);

  const allTasks = ctxAllTasks;
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter(t => t.status === 'done');
  const completionRate = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;
  const completionTrend = completionRate >= 80 ? '↑ On track' : completionRate >= 50 ? '→ In progress' : completionRate > 0 ? '↓ Needs focus' : 'No tasks yet';
  const completionTrendUp = completionRate >= 50;
  const overdueCount = allTasks.filter(t => t.dueDate && t.dueDate < TODAY && t.status !== 'done').length;

  const perProjectStats = useMemo(() => ctxProjects.map(project => {
    const tasks = ctxAllTasks.filter(t => t.projectId === project.id);
    const total = tasks.length;
    const statuses = STATUS_META.map(s => {
      const matched = tasks.filter(t => t.status === s.key);
      const count = matched.length;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const overdueCount = matched.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < TODAY).length;
      const snapshotKey = `${project.id}:${s.key}`;
      const prev = previousCounts.current[snapshotKey] ?? null;
      const delta = prev === null ? null : count - prev;
      return { ...s, count, pct, overdueCount, delta };
    });
    const summaryBar = STATUS_META.map(s => ({
      color: s.color,
      widthPct: total > 0 ? (tasks.filter(t => t.status === s.key).length / total) * 100 : 0,
    }));
    return { project, statuses, total, summaryBar };
  }), [ctxProjects, ctxAllTasks]);

  const saveSnapshotRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!user || !snapshotLoaded) return;
    const counts: Record<string, number> = {};
    perProjectStats.forEach(({ project, statuses }) =>
      statuses.forEach(s => { counts[`${project.id}:${s.key}`] = s.count; })
    );
    previousCounts.current = counts;
    // Debounce: only persist to DB if stats haven't changed for 1s
    if (saveSnapshotRef.current) clearTimeout(saveSnapshotRef.current);
    saveSnapshotRef.current = setTimeout(() => {
      userPrefsApi().set({ userId: user.id, taskBreakdownSnapshot: counts }).catch(() => {});
    }, 1000);
    return () => { if (saveSnapshotRef.current) clearTimeout(saveSnapshotRef.current); };
  }, [perProjectStats, user?.id, snapshotLoaded]);

  const [openProjects, setOpenProjects] = useState<Set<string>>(new Set());
  const toggleProject = (id: string) =>
    setOpenProjects(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
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
            <>
              <button
                onClick={() => (window as any).electronAPI.printToPDF()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors"
              >
                <FileDown size={13} />
                Export PDF
              </button>
              <motion.button onClick={handleExport} className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Download size={16} /> Download Report
              </motion.button>
            </>
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
        {/* Main: Task Breakdown accordion */}
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h2 className="font-bold text-gray-900 text-sm">Task Breakdown</h2>
            <span className="text-xs text-gray-400">{ctxProjects.length} projects</span>
          </div>

          {/* Column header */}
          <div className="grid grid-cols-[1fr_auto] px-5 pt-3 pb-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Project</span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right">Tasks</span>
          </div>

          <div className="px-3 pb-4">
            {perProjectStats.map(({ project, statuses, total, summaryBar }, i) => {
              const isOpen = openProjects.has(project.id);
              return (
                <motion.div
                  key={project.id}
                  className="mb-1 rounded-xl overflow-hidden border border-transparent hover:border-surface-200 transition-colors"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.06, ease: [0.4, 0, 0.2, 1] }}
                >
                  {/* Collapsed header row */}
                  <button
                    onClick={() => toggleProject(project.id)}
                    className="w-full flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-surface-50 rounded-xl transition-colors text-left"
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                    <span className="text-xs font-medium text-gray-700 w-28 shrink-0 truncate">{project.name}</span>

                    {/* Stacked status bar */}
                    <div className="flex-1 h-2 rounded-full overflow-hidden bg-surface-200 flex">
                      {summaryBar.map((seg, si) =>
                        seg.widthPct > 0 ? (
                          <div
                            key={si}
                            className="h-full"
                            style={{ width: `${seg.widthPct}%`, backgroundColor: seg.color }}
                          />
                        ) : null
                      )}
                    </div>

                    <span className="text-[10px] font-semibold text-gray-400 w-8 text-right shrink-0">
                      {total > 0 ? `${Math.round((statuses.find(s => s.key === 'done')?.count ?? 0) / total * 100)}%` : '0%'}
                    </span>
                    <span className="text-xs font-semibold text-gray-600 w-6 text-right shrink-0">{total}</span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      className="shrink-0 ml-1"
                    >
                      <ChevronDown size={14} className="text-gray-400" />
                    </motion.div>
                  </button>

                  {/* Expanded status table */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="mx-3 mb-3 rounded-xl border border-surface-100 overflow-hidden">
                          {/* Table header */}
                          <div className="grid grid-cols-[1fr_40px_36px_52px_36px] px-3 py-2 bg-surface-50 border-b border-surface-100">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Status</span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right">#</span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right">%</span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right">Overdue</span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right">Δ</span>
                          </div>

                          {/* Status rows */}
                          {statuses.map((s, si) => {
                            const deltaLabel = s.delta === null
                              ? <span className="text-gray-300">new</span>
                              : s.delta === 0
                              ? <span className="text-gray-300">—</span>
                              : s.delta > 0
                              ? <span className="text-[#68B266] font-semibold">+{s.delta}</span>
                              : <span className="text-[#D8727D] font-semibold">{s.delta}</span>;

                            return (
                              <div
                                key={s.key}
                                className={`grid grid-cols-[1fr_40px_36px_52px_36px] px-3 py-2 text-xs ${si < statuses.length - 1 ? 'border-b border-surface-100' : ''}`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                  <span className="text-gray-600 truncate">{s.label}</span>
                                </div>
                                <span className="text-right font-semibold text-gray-800">{s.count}</span>
                                <span className="text-right text-gray-400">{s.pct}%</span>
                                <div className="text-right">
                                  {s.overdueCount > 0 ? (
                                    <span className="inline-block bg-red-50 text-[#D8727D] font-semibold px-1.5 py-0.5 rounded text-[10px]">
                                      {s.overdueCount}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </div>
                                <div className="text-right">{deltaLabel}</div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {ctxProjects.length === 0 && (
              <div className="text-center py-10 text-xs text-gray-400">No projects yet</div>
            )}
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
              const monthStart = new Date(TODAY.slice(0, 8) + '01');
              const todayDate = new Date(TODAY);
              const daysElapsed = Math.max(1, Math.round((todayDate.getTime() - monthStart.getTime()) / 86400000) + 1);
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
                ['Days left this month', String(daysLeft)],
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

          {/* Attendance Trends */}
          <motion.div className="rounded-2xl p-5 bg-white border border-surface-200"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.24, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-semibold text-base mb-1">Attendance Trends</h3>
            <p className="text-sm mb-4 text-gray-400">Monthly attendance rate over the last 6 months</p>
            <AttendanceChart records={attendanceRecords ?? []} memberCount={members.length} />

            {/* Top absentees */}
            {members.length > 0 && (() => {
              const absences = members.map(m => ({
                member: m,
                count: (attendanceRecords ?? []).filter((r: any) => r.userId === m.id && r.status === 'absent').length,
              })).sort((a, b) => b.count - a.count).slice(0, 5).filter(x => x.count > 0);
              return absences.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-gray-400">
                    Most Absences
                  </p>
                  <div className="space-y-1.5">
                    {absences.map(({ member, count }) => (
                      <div key={member.id} className="flex items-center justify-between text-sm">
                        <span>{member.name}</span>
                        <span className="text-red-500 font-medium">{count} day{count !== 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </motion.div>
        </div>
      </div>
    </div>
  </motion.div>
  );
};

export default ReportsPage;
