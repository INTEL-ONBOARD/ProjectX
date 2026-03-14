import React, { useContext, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Users, MapPin, BarChart2, FolderKanban, Code2, Palette, Settings2, SearchCode, X, Plus, ChevronDown } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { AppContext } from '../context/AppContext';
import { useMembersContext } from '../context/MembersContext';
import { useProjects } from '../context/ProjectContext';
import { PROJECT_COLORS } from '../data/mockData';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbApi = () => (window as any).electronAPI.db;

const roleStyles: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'bg-primary-50', text: 'text-primary-600' },
  manager: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]' },
  member: { bg: 'bg-surface-200', text: 'text-gray-500' },
};

interface DeptEntry {
  id?: string;
  name: string;
  icon: React.ElementType;
  color: string;
  memberIds: string[];
}

// ── Department Directory ───────────────────────────────────────────────────────
interface User { id: string; name: string; role: string; designation?: string; }

const DepartmentDirectory: React.FC<{
  deptRoster: DeptEntry[];
  members: User[];
  getMemberColor: (id: string) => string;
  onAddMember: (idx: number) => void;
}> = ({ deptRoster, members, getMemberColor, onAddMember }) => {
  const [expanded, setExpanded] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(deptRoster.map((_, i) => [i, true]))
  );

  const toggle = (i: number) => setExpanded(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
        <h2 className="font-bold text-gray-900 text-sm">Department Directory</h2>
        <span className="text-xs text-gray-400">{deptRoster.length} departments</span>
      </div>
      <div className="overflow-y-auto flex-1 divide-y divide-surface-100">
        {deptRoster.map((dept, deptIndex) => {
          const Icon = dept.icon;
          const deptMembers = dept.memberIds
            .map(id => members.find(m => m.id === id))
            .filter((m): m is User => m !== undefined);
          const isOpen = expanded[deptIndex] ?? true;

          return (
            <div key={deptIndex}>
              {/* Dept header row */}
              <button
                onClick={() => toggle(deptIndex)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-surface-50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: dept.color + '18' }}>
                  <Icon size={15} style={{ color: dept.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-sm">{dept.name}</div>
                  <div className="text-xs text-gray-400">{deptMembers.length} member{deptMembers.length !== 1 ? 's' : ''}</div>
                </div>
                {/* Stacked avatars preview */}
                <div className="flex items-center mr-1">
                  {deptMembers.slice(0, 4).map((m, j) => (
                    <div key={m.id} className="w-6 h-6 rounded-full border-2 border-white -ml-1.5 first:ml-0 shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: getMemberColor(m.id), zIndex: 10 - j }}>
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {deptMembers.length > 4 && (
                    <div className="w-6 h-6 rounded-full border-2 border-white -ml-1.5 bg-surface-200 flex items-center justify-center text-[9px] font-bold text-gray-500">
                      +{deptMembers.length - 4}
                    </div>
                  )}
                </div>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={14} className="text-gray-400" />
                </motion.div>
              </button>

              {/* Expanded member grid */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="px-5 pb-4 pt-1">
                      {deptMembers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-5 rounded-xl border border-dashed border-surface-200 gap-1.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: dept.color + '12' }}>
                            <Icon size={14} style={{ color: dept.color }} />
                          </div>
                          <p className="text-xs text-gray-400">No members assigned</p>
                          <button
                            onClick={e => { e.stopPropagation(); onAddMember(deptIndex); }}
                            className="text-xs font-semibold px-3 py-1 rounded-lg transition-colors"
                            style={{ color: dept.color, background: dept.color + '12' }}
                          >
                            + Add first member
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {deptMembers.map((m) => {
                            const role = roleStyles[m.role] ?? roleStyles.member;
                            return (
                              <div key={m.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-50 hover:bg-surface-100 transition-colors">
                                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                                  style={{ background: getMemberColor(m.id) }}>
                                  {m.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-gray-800 truncate">{m.name}</div>
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md inline-block ${role.bg} ${role.text}`}>
                                    {m.role.charAt(0).toUpperCase()}{m.role.slice(1)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          <button
                            onClick={e => { e.stopPropagation(); onAddMember(deptIndex); }}
                            className="flex items-center justify-center gap-1 p-2.5 rounded-xl border border-dashed border-surface-200 hover:border-primary-300 hover:bg-primary-50 text-gray-400 hover:text-primary-500 transition-colors text-xs font-medium"
                          >
                            <Plus size={12} /> Add
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const OrganizationPage: React.FC = () => {
  const { currentUser } = useContext(AppContext);
  const { members, getMemberColor } = useMembersContext();
  const { allTasks } = useProjects();

  const subordinates = members.filter(m => m.id !== currentUser?.id);
  const locationCount = new Set(members.map(m => m.location).filter(Boolean)).size || members.length;
  const avgWorkload = members.length > 0 ? (allTasks.length / members.length).toFixed(1) : '0.0';

  const [deptRoster, setDeptRoster] = useState<DeptEntry[]>([]);

  useEffect(() => {
    dbApi().getDepts()
        .then((docs: Array<{ id: string; name: string; color: string; memberIds: string[] }>) => {
            setDeptRoster(docs.map(d => ({ id: d.id, name: d.name, color: d.color, memberIds: d.memberIds, icon: FolderKanban })));
        })
        .catch((err: unknown) => console.error('[OrganizationPage] Failed to load departments:', err));
  }, []);

  const metrics = [
    { label: 'Total Members', value: String(members.length), trend: 'In org', trendUp: true, color: '', accent: true, icon: Users, barPct: 100 },
    { label: 'Departments', value: String(deptRoster.length), trend: 'Roles', trendUp: true, color: '#5030E5', accent: false, icon: Building2, barPct: 100 },
    { label: 'Locations', value: String(locationCount), trend: 'Cities', trendUp: true, color: '#30C5E5', accent: false, icon: MapPin, barPct: 100 },
    { label: 'Avg Workload', value: avgWorkload, trend: 'tasks/member', trendUp: true, color: '#FFA500', accent: false, icon: BarChart2, barPct: Math.min(100, parseFloat(avgWorkload) * 10) },
  ];

  const [showAddDept, setShowAddDept] = useState(false);
  const [addMemberToDept, setAddMemberToDept] = useState<number | null>(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptColor, setNewDeptColor] = useState(PROJECT_COLORS[0]);

  return (
  <motion.div
    className="flex-1 flex flex-col overflow-hidden px-8 bg-white"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    transition={{ duration: 0.3, delay: 0.1 }}
  >
    <div className="flex flex-col h-full">
      <div className="pt-8 pb-5 shrink-0">
        <PageHeader
          eyebrow="Home / Organization"
          title="Organization"
          description="Team structure"
          actions={
            <motion.button onClick={() => setShowAddDept(true)} className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Plus size={16} /> New Department
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
      <div className="grid grid-cols-[1fr_300px] gap-5 flex-1 min-h-0 pb-6">
        {/* Main: Department Directory */}
        <DepartmentDirectory
          deptRoster={deptRoster}
          members={members}
          getMemberColor={getMemberColor}
          onAddMember={setAddMemberToDept}
        />

        {/* Side panels */}
        <div className="flex flex-col gap-4 overflow-y-auto min-h-0">
          {/* Department Roster */}
          <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Department Roster</h3>
            {deptRoster.map((d, deptIndex) => {
              const Icon = d.icon;
              const deptMembers = d.memberIds
                .map(id => members.find(m => m.id === id))
                .filter((m): m is NonNullable<typeof m> => m !== undefined);
              return (
                <div key={deptIndex} className="flex items-center gap-2.5 py-2 border-b border-surface-100 last:border-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: d.color + '18' }}>
                    <Icon size={14} style={{ color: d.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-gray-400">{d.name}</div>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {deptMembers.map(m => (
                        <Avatar key={m.id} name={m.name} color={getMemberColor(m.id)} size="sm" />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setAddMemberToDept(deptIndex)}
                    className="w-6 h-6 rounded-full flex items-center justify-center bg-surface-100 hover:bg-primary-50 text-gray-400 hover:text-primary-500 transition-colors shrink-0"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              );
            })}
          </motion.div>

          {/* Reporting Lines */}
          <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}>
            <h3 className="font-bold text-gray-900 text-sm mb-3">Reporting Lines</h3>
            <div className="text-xs text-gray-700 font-semibold mb-2">{currentUser?.name ?? ''}</div>
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

    {/* Add Department Modal */}
    <AnimatePresence>
      {showAddDept && (
        <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setShowAddDept(false)}
        >
          <motion.div className="bg-white rounded-2xl w-full max-w-sm mx-4 p-6"
            onClick={e => e.stopPropagation()}
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-gray-900">New Department</span>
              <button onClick={() => setShowAddDept(false)}><X size={16} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <input
                value={newDeptName}
                onChange={e => setNewDeptName(e.target.value)}
                placeholder="Department name"
                className="border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400"
              />
              <div className="flex gap-2">
                {PROJECT_COLORS.map(c => (
                  <button key={c} type="button"
                    onClick={() => setNewDeptColor(c)}
                    className={`w-8 h-8 rounded-full transition-all ${newDeptColor === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                onClick={() => {
                  if (!newDeptName.trim()) return;
                  const deptName = newDeptName.trim();
                  dbApi().createDept({ name: deptName, color: newDeptColor, memberIds: [] })
                      .then((d: { id: string; name: string; color: string; memberIds: string[] }) => {
                          setDeptRoster(prev => [...prev, { id: d.id, icon: FolderKanban, name: d.name, color: d.color, memberIds: [] }]);
                      })
                      .catch((err: unknown) => console.error('[OrganizationPage] Failed to create department:', err));
                  setNewDeptName('');
                  setNewDeptColor(PROJECT_COLORS[0]);
                  setShowAddDept(false);
                }}
                className="w-full bg-primary-500 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-600 transition-colors"
              >
                Create Department
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Add Member to Dept Overlay */}
    <AnimatePresence>
      {addMemberToDept !== null && (
        <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setAddMemberToDept(null)}
        >
          <motion.div className="bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
              <span className="font-semibold text-sm text-gray-900">Add Member to Dept</span>
              <button onClick={() => setAddMemberToDept(null)}><X size={16} /></button>
            </div>
            {members
              .filter(m => !deptRoster[addMemberToDept]?.memberIds.includes(m.id))
              .map(m => (
                <button key={m.id}
                  onClick={() => {
                    const dept = addMemberToDept !== null ? deptRoster[addMemberToDept] : null;
                    const newMemberIds = [...(dept?.memberIds ?? []), m.id];
                    setDeptRoster(prev => prev.map((d, i) =>
                      i === addMemberToDept ? { ...d, memberIds: newMemberIds } : d
                    ));
                    if (dept?.id) {
                        dbApi().updateDept(dept.id, { memberIds: newMemberIds })
                            .catch((err: unknown) => console.error('[OrganizationPage] Failed to update department:', err));
                    }
                    setAddMemberToDept(null);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors"
                >
                  <Avatar name={m.name} color={getMemberColor(m.id)} size="sm" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{m.name}</div>
                    <div className="text-xs text-gray-400">{m.designation ?? ''}</div>
                  </div>
                </button>
              ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
  );
};

export default OrganizationPage;
