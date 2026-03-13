import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Clock, TrendingUp, AlertCircle, Plus, Download, X, ImagePlus, Calendar, User, Tag, ChevronDown } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { AvatarGroup } from '../components/ui/Avatar';
import { teamMembers, memberColors, projects } from '../data/mockData';
import { Task, TaskStatus } from '../types';
import { useProjects } from '../context/ProjectContext';

const dueDates: Record<string, { label: string; overdue: boolean }> = {
  t1: { label: 'Dec 22', overdue: false }, t2: { label: 'Dec 15', overdue: true },
  t3: { label: 'Dec 28', overdue: false }, t4: { label: 'Dec 18', overdue: true },
  t5: { label: 'Dec 20', overdue: false }, t6: { label: 'Done', overdue: false },
  t7: { label: 'Done', overdue: false },
};
const taskProjects: Record<string, string> = {
  t1: 'p2', t2: 'p4', t3: 'p4', t4: 'p1', t5: 'p3', t6: 'p1', t7: 'p3',
};
const taskDescriptions: Record<string, string> = {
  t1: 'Design and implement mobile app screens including onboarding flow, dashboard, and settings pages following brand guidelines.',
  t2: 'Create low-fidelity wireframes for the main user flows. Deliverables include homepage, product listing, and checkout.',
  t3: 'Build interactive prototypes for user testing sessions. Focus on navigation patterns and key interaction points.',
  t4: 'Develop user research plan, conduct interviews with 10 participants, and synthesize findings into actionable insights.',
  t5: 'Set up project infrastructure including CI/CD pipeline, staging environment, and deployment workflow documentation.',
  t6: 'Review and finalize brand asset library including colors, typography, icons, and component documentation.',
  t7: 'Conduct usability testing sessions with target users and document findings with severity ratings and recommendations.',
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

const tabs = ['All', 'To Do', 'In Progress', 'Done'];

const emptyNew = { title: '', description: '', priority: 'low', status: 'todo', assignee: '', image: null as string | null, projectId: '' };

const TasksPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects: contextProjects, allTasks, createTask, moveTask: updateTaskStatus } = useProjects();
  const [activeTab, setActiveTab] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({ ...emptyNew });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const detailFileRef = useRef<HTMLInputElement>(null);
  const [detailImage, setDetailImage] = useState<string | null>(null);
  const totalTasks = allTasks.length;

  const getStatus = (task: Task): TaskStatus => task.status;

  const filteredTasks = activeTab === 0 ? allTasks
    : activeTab === 1 ? allTasks.filter(t => getStatus(t) === 'todo')
    : activeTab === 2 ? allTasks.filter(t => getStatus(t) === 'in-progress')
    : allTasks.filter(t => getStatus(t) === 'done');

  const assigneeCounts: Record<string, number> = {};
  allTasks.forEach(t => t.assignees.forEach(id => { assigneeCounts[id] = (assigneeCounts[id] ?? 0) + 1; }));
  const topAssignees = Object.entries(assigneeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const doneCount = allTasks.filter(t => getStatus(t) === 'done').length;
  const todoCount = allTasks.filter(t => getStatus(t) === 'todo').length;
  const inProgCount = allTasks.filter(t => getStatus(t) === 'in-progress').length;

  const donutItems = [
    { label: 'High', count: allTasks.filter(t => t.priority === 'high').length, color: '#D8727D' },
    { label: 'Low', count: allTasks.filter(t => t.priority === 'low').length, color: '#D58D49' },
    { label: 'Done', count: doneCount, color: '#68B266' },
  ];
  const donutGradient = (() => {
    const high = donutItems[0].count; const low = donutItems[1].count;
    if (totalTasks === 0) return '#e5e7eb';
    const h = (high / totalTasks) * 100; const l = (low / totalTasks) * 100;
    return `conic-gradient(#D8727D 0% ${h}%, #D58D49 ${h}% ${h + l}%, #68B266 ${h + l}% 100%)`;
  })();

  const sprintPct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  const metrics = [
    { label: 'Total Tasks', value: String(totalTasks), trend: '↑ 2 this week', trendUp: true, color: '', accent: true, icon: CheckSquare, barPct: 100 },
    { label: 'In Progress', value: String(inProgCount), trend: 'Active now', trendUp: true, color: '#FFA500', accent: false, icon: Clock, barPct: totalTasks > 0 ? (inProgCount / totalTasks) * 100 : 0 },
    { label: 'Completed', value: String(doneCount), trend: '↑ 1 today', trendUp: true, color: '#68B266', accent: false, icon: TrendingUp, barPct: totalTasks > 0 ? (doneCount / totalTasks) * 100 : 0 },
    { label: 'Pending', value: String(todoCount), trend: '2 overdue', trendUp: false, color: '#D8727D', accent: false, icon: AlertCircle, barPct: totalTasks > 0 ? (todoCount / totalTasks) * 100 : 0 },
  ];

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>, cb: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => cb(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const selectedStatus = selectedTask ? getStatus(selectedTask) : 'todo';
  const selectedStatusStyle = statusStyles[selectedStatus];

  return (
    <motion.div
      className="flex-1 flex flex-col overflow-hidden px-8 bg-white"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="flex flex-col h-full">
        <div className="pt-8 pb-5 shrink-0">
          <PageHeader
            eyebrow="Home / Tasks"
            title="Tasks"
            description={`${totalTasks} tasks across 4 projects`}
            actions={
              <>
                <motion.button onClick={() => {
                  const csv = [
                    'Title,Status,Priority,Assignees,Comments,Files',
                    ...allTasks.map(t => `"${t.title}","${t.status}","${t.priority}","${t.assignees.join(';')}",${t.comments},${t.files}`)
                  ].join('\n');
                  const a = Object.assign(document.createElement('a'), {
                    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
                    download: 'tasks.csv',
                  });
                  a.click();
                }} className="flex items-center gap-2 bg-white text-gray-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-surface-100 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Download size={16} /> Export
                </motion.button>
                <motion.button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Plus size={16} /> New Task
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
          {/* Main: Tasks table */}
          <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <h2 className="font-bold text-gray-900 text-sm">All Tasks</h2>
              <button onClick={() => navigate('/')} className="text-xs text-primary-500 font-semibold hover:text-primary-700 transition-colors">Board view →</button>
            </div>
            {/* Tabs */}
            <div className="px-5 pt-3">
              <div className="flex gap-1 bg-surface-100 rounded-lg p-1 mb-3 w-fit">
                {tabs.map((t, i) => {
                  const count = i === 0 ? totalTasks : i === 1 ? todoCount : i === 2 ? inProgCount : doneCount;
                  return (
                    <button key={t} onClick={() => setActiveTab(i)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === i ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      {t} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100">
                  {['Task', 'Project', 'Priority', 'Assignees', 'Due', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, i) => {
                  const priority = priorityStyles[task.priority] ?? priorityStyles.low;
                  const currentStatus = getStatus(task);
                  const status = statusStyles[currentStatus] ?? statusStyles.todo;
                  const due = dueDates[task.id];
                  const projId = taskProjects[task.id];
                  const project = projects.find(p => p.id === projId);
                  const names = task.assignees.map(id => teamMembers.find(m => m.id === id)?.name ?? 'Unknown');
                  const colors = task.assignees.map(id => memberColors[teamMembers.findIndex(m => m.id === id)] ?? memberColors[0]);
                  return (
                    <motion.tr
                      key={task.id}
                      className="border-b border-surface-100 hover:bg-surface-50 transition-colors cursor-pointer"
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                      onClick={() => { setSelectedTask(task); setDetailImage(null); setShowStatusDrop(false); }}
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
          </div>

          {/* Side panels */}
          <div className="flex flex-col gap-4 overflow-y-auto min-h-0">
            {/* Sprint Summary */}
            <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
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
              {[['Start date', sprintMeta.start], ['End date', sprintMeta.end], ['Velocity', sprintMeta.velocity], ['Blockers', String(sprintMeta.blockers)]].map(([label, val]) => (
                <div key={label} className="flex justify-between py-2 border-b border-surface-100 last:border-0 text-xs">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-bold ${label === 'Blockers' ? 'text-[#D8727D]' : 'text-gray-900'}`}>{val}</span>
                </div>
              ))}
            </motion.div>

            {/* Priority Breakdown donut */}
            <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
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
            <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
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

      {/* ── Task Detail Panel ── */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            className="fixed inset-0 top-16 z-50 flex"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="flex-1 bg-black/30" onClick={() => setSelectedTask(null)} />
            <motion.div
              className="w-[420px] bg-white h-full overflow-y-auto border-l border-surface-200 flex flex-col"
              initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Task Detail</span>
                <button onClick={() => setSelectedTask(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-surface-100 hover:text-gray-600 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 px-5 py-4 flex flex-col gap-4">
                {/* Title + priority */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h2 className="font-bold text-gray-900 text-base leading-snug">{selectedTask.title}</h2>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md shrink-0 ${(priorityStyles[selectedTask.priority] ?? priorityStyles.low).bg} ${(priorityStyles[selectedTask.priority] ?? priorityStyles.low).text}`}>
                      {(priorityStyles[selectedTask.priority] ?? priorityStyles.low).label}
                    </span>
                  </div>
                  {/* Project */}
                  {(() => {
                    const proj = projects.find(p => p.id === taskProjects[selectedTask.id]);
                    return proj ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color }} />
                        <span className="text-xs text-gray-400">{proj.name}</span>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Status updater */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1"><Tag size={11} /> Status</div>
                  <div className="relative">
                    <button
                      onClick={() => setShowStatusDrop(v => !v)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border ${selectedStatusStyle.bg} ${selectedStatusStyle.text} border-transparent hover:opacity-80 transition-opacity`}
                    >
                      {selectedStatusStyle.label}
                      <ChevronDown size={12} className={`transition-transform ${showStatusDrop ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showStatusDrop && (
                        <motion.div
                          className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-card-hover border border-surface-100 overflow-hidden z-10 w-40"
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                        >
                          {(['todo', 'in-progress', 'done'] as TaskStatus[]).map(s => {
                            const st = statusStyles[s];
                            return (
                              <button
                                key={s}
                                onClick={() => { updateTaskStatus(selectedTask.id, s); setShowStatusDrop(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold hover:bg-surface-50 transition-colors"
                              >
                                <span className={`w-2 h-2 rounded-full ${s === 'todo' ? 'bg-primary-500' : s === 'in-progress' ? 'bg-[#FFA500]' : 'bg-[#68B266]'}`} />
                                <span className={st.text}>{st.label}</span>
                                {getStatus(selectedTask) === s && <span className="ml-auto text-primary-500">✓</span>}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Assignees */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1"><User size={11} /> Assignees</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.assignees.map(id => {
                      const member = teamMembers.find(m => m.id === id);
                      if (!member) return null;
                      const color = memberColors[teamMembers.findIndex(m => m.id === id)] ?? memberColors[0];
                      return (
                        <div key={id} className="flex items-center gap-1.5 bg-surface-100 rounded-full px-2.5 py-1">
                          <Avatar name={member.name} color={color} size="sm" />
                          <span className="text-xs font-semibold text-gray-700">{member.name.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Due date */}
                {dueDates[selectedTask.id] && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 mb-1 flex items-center gap-1"><Calendar size={11} /> Due Date</div>
                    <span className={`text-sm font-semibold ${dueDates[selectedTask.id].overdue ? 'text-[#D8727D]' : 'text-gray-700'}`}>
                      {dueDates[selectedTask.id].label}
                      {dueDates[selectedTask.id].overdue && <span className="ml-1.5 text-[10px] bg-[#D8727D22] text-[#D8727D] px-1.5 py-0.5 rounded-full">Overdue</span>}
                    </span>
                  </div>
                )}

                {/* Description */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-1.5">Description</div>
                  <p className="text-sm text-gray-600 leading-relaxed">{taskDescriptions[selectedTask.id] ?? 'No description provided.'}</p>
                </div>

                {/* Attachment */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-1.5">Attachment</div>
                  {detailImage ? (
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={detailImage} alt="attachment" className="w-full h-40 object-cover rounded-xl" />
                      <button
                        onClick={() => setDetailImage(null)}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => detailFileRef.current?.click()}
                      className="w-full h-24 border-2 border-dashed border-surface-300 rounded-xl flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-primary-300 hover:text-primary-400 transition-colors"
                    >
                      <ImagePlus size={20} />
                      <span className="text-xs font-medium">Upload image</span>
                    </button>
                  )}
                  <input ref={detailFileRef} type="file" accept="image/*" className="hidden" onChange={e => handleImagePick(e, setDetailImage)} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-surface-50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-gray-900">{selectedTask.comments}</div>
                    <div className="text-[10px] text-gray-400">Comments</div>
                  </div>
                  <div className="bg-surface-50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-gray-900">{selectedTask.files}</div>
                    <div className="text-[10px] text-gray-400">Files</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── New Task Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 top-16 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowModal(false)} />
            <motion.div
              className="relative bg-white rounded-2xl shadow-card-hover w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-gray-900 text-base">New Task</h2>
                <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-surface-100 hover:text-gray-600 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {/* Title */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Task Title</label>
                  <input
                    type="text" placeholder="Enter task title…"
                    value={newTask.title}
                    onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                    className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-400 transition-colors"
                  />
                </div>
                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
                  <textarea
                    placeholder="Describe the task…"
                    value={newTask.description}
                    onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
                    rows={3}
                    className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-400 transition-colors resize-none"
                  />
                </div>
                {/* Priority + Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}
                      className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary-400 transition-colors bg-white"
                    >
                      <option value="low">Low</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
                    <select
                      value={newTask.status}
                      onChange={e => setNewTask(p => ({ ...p, status: e.target.value }))}
                      className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary-400 transition-colors bg-white"
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>
                {/* Assignee */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Assignee</label>
                  <select
                    value={newTask.assignee}
                    onChange={e => setNewTask(p => ({ ...p, assignee: e.target.value }))}
                    className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary-400 transition-colors bg-white"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                {/* Project */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Project</label>
                  <select
                    value={newTask.projectId}
                    onChange={e => setNewTask(p => ({ ...p, projectId: e.target.value }))}
                    className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary-400 transition-colors bg-white"
                  >
                    <option value="">No project</option>
                    {contextProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                {/* Image upload */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Image (optional)</label>
                  {newTask.image ? (
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={newTask.image} alt="preview" className="w-full h-32 object-cover rounded-xl" />
                      <button
                        onClick={() => setNewTask(p => ({ ...p, image: null }))}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full h-20 border-2 border-dashed border-surface-300 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary-300 hover:text-primary-400 transition-colors"
                    >
                      <ImagePlus size={18} />
                      <span className="text-xs font-medium">Click to upload</span>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleImagePick(e, url => setNewTask(p => ({ ...p, image: url })))} />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => { setShowModal(false); setNewTask({ ...emptyNew }); }} className="flex-1 py-2 rounded-xl text-sm font-semibold text-gray-500 bg-surface-100 hover:bg-surface-200 transition-colors">
                  Cancel
                </button>
                <motion.button
                  onClick={() => {
                    createTask({
                      title: newTask.title,
                      description: newTask.description,
                      priority: newTask.priority as any,
                      status: newTask.status as any,
                      assignees: newTask.assignee ? [newTask.assignee] : [],
                      comments: 0,
                      files: 0,
                      projectId: newTask.projectId || undefined,
                    });
                    setShowModal(false);
                    setNewTask({ ...emptyNew });
                  }}
                  disabled={!newTask.title.trim()}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  whileHover={{ scale: newTask.title.trim() ? 1.02 : 1 }} whileTap={{ scale: newTask.title.trim() ? 0.98 : 1 }}
                >
                  Create Task
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TasksPage;
