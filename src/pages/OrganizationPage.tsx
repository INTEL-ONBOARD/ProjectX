import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Users, MapPin, BarChart2, FolderKanban, Code2, Palette, Settings2, SearchCode, X, Plus } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { currentUser, teamMembers, memberColors } from '../data/mockData';
import { useMembersContext } from '../context/MembersContext';
import { PROJECT_COLORS } from '../data/mockData';

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

interface DeptEntry {
  name: string;
  icon: React.ElementType;
  color: string;
  memberIds: string[];
}

const OrganizationPage: React.FC = () => {
  const { members, getMemberColor } = useMembersContext();

  const [deptRoster, setDeptRoster] = useState<DeptEntry[]>([
    { icon: FolderKanban, name: 'Project Management', color: '#5030E5', memberIds: ['u1'] },
    { icon: Code2,        name: 'Frontend',            color: '#30C5E5', memberIds: ['u2'] },
    { icon: Palette,      name: 'Design',               color: '#FFA500', memberIds: ['u3'] },
    { icon: Settings2,    name: 'Backend',              color: '#68B266', memberIds: ['u4'] },
    { icon: SearchCode,   name: 'QA',                   color: '#D8727D', memberIds: ['u5'] },
  ]);

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
        {/* Main: Org Chart */}
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden overflow-y-auto">
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
                const role = roleStyles[member.role] ?? roleStyles.member;
                return (
                  <motion.div
                    key={member.id}
                    className="bg-white rounded-xl p-4 text-center w-40 border border-surface-200 hover:border-primary-200 transition-colors"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.06, ease: [0.4, 0, 0.2, 1] }}
                    whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  >
                    <Avatar name={member.name} color={color} size="lg" className="mx-auto" />
                    <div className="font-semibold text-gray-800 text-xs mt-2">{member.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{designations[member.id]}</div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md mt-1.5 inline-block ${role.bg} ${role.text}`}>
                      {member.role?.charAt(0).toUpperCase()}{member.role?.slice(1) ?? ''}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

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
                  setDeptRoster(prev => [...prev, { icon: FolderKanban, name: newDeptName.trim(), color: newDeptColor, memberIds: [] }]);
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
                    setDeptRoster(prev => prev.map((d, i) =>
                      i === addMemberToDept ? { ...d, memberIds: [...d.memberIds, m.id] } : d
                    ));
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
