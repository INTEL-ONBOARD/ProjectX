import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, Shield, Briefcase, UserCheck, UserPlus, Download, MoreVertical, X, Send, Trash2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { useMembersContext } from '../context/MembersContext';
import { useProjects } from '../context/ProjectContext';
import InviteMemberModal from '../components/modals/InviteMemberModal';
import { downloadCsv } from '../utils/exportCsv';
import { User } from '../types';

const statusColor = { online: '#68B266', away: '#FFA500', offline: '#D1D5DB' };
const statusLabel = { online: 'Online', away: 'Away', offline: 'Offline' };

const roleStyles: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'bg-primary-50', text: 'text-primary-600' },
  manager: { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]' },
  member: { bg: 'bg-surface-200', text: 'text-gray-500' },
};

const MembersPage: React.FC = () => {
  const { members, getMemberColor, addMember, removeMember } = useMembersContext();
  const { scrubAssignee, allTasks } = useProjects();

  const totalTasks = allTasks.length;
  const memberTaskCounts: Record<string, { assigned: number; total: number }> = {};
  members.forEach(m => {
    const assigned = allTasks.filter(t => t.assignees.includes(m.id)).length;
    memberTaskCounts[m.id] = { assigned, total: totalTasks };
  });
  const navigate = useNavigate();

  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const adminCount = members.filter(m => m.role === 'admin').length;
  const managerCount = members.filter(m => m.role === 'manager').length;
  const memberCount = members.filter(m => m.role === 'member').length;
  const onlineCount = members.filter(m => m.status === 'active').length;

  const metrics = [
    { label: 'Total Members', value: String(members.length), trend: `${members.length} in team`, trendUp: true, color: '', accent: true, icon: Users, barPct: 100 },
    { label: 'Admins', value: String(adminCount), trend: `${members.length > 0 ? Math.round((adminCount / members.length) * 100) : 0}%`, trendUp: true, color: '#5030E5', accent: false, icon: Shield, barPct: members.length > 0 ? (adminCount / members.length) * 100 : 0 },
    { label: 'Managers', value: String(managerCount), trend: `${members.length > 0 ? Math.round((managerCount / members.length) * 100) : 0}%`, trendUp: true, color: '#D97706', accent: false, icon: Briefcase, barPct: members.length > 0 ? (managerCount / members.length) * 100 : 0 },
    { label: 'Active Members', value: String(onlineCount), trend: `${onlineCount} online`, trendUp: true, color: '#68B266', accent: false, icon: UserCheck, barPct: members.length > 0 ? (onlineCount / members.length) * 100 : 0 },
  ];

  const adminPct = members.length > 0 ? (adminCount / members.length) * 100 : 0;
  const manPct = members.length > 0 ? (managerCount / members.length) * 100 : 0;
  const donutGradient = `conic-gradient(#5030E5 0% ${adminPct}%, #D97706 ${adminPct}% ${adminPct + manPct}%, #68B266 ${adminPct + manPct}% 100%)`;

  const locationCounts: Record<string, number> = {};
  members.forEach(m => {
    const loc = m.location ?? 'Unknown';
    locationCounts[loc] = (locationCounts[loc] ?? 0) + 1;
  });

  const handleExport = () => {
    const header = ['Name', 'Email', 'Role', 'Designation', 'Status'];
    const rows = members.map(m => [m.name, m.email ?? '', m.role, m.designation ?? '', m.status ?? 'active']);
    downloadCsv('members.csv', [header, ...rows]);
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
            eyebrow="Home / Members"
            title="Members"
            description={`${members.length} team members`}
            actions={
              <>
                <motion.button onClick={handleExport} className="flex items-center gap-2 bg-white text-gray-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-surface-100 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Download size={16} /> Export
                </motion.button>
                <motion.button onClick={() => setShowInvite(true)} className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <UserPlus size={16} /> Invite Member
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
          {/* Main: Team Directory table */}
          <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <h2 className="font-bold text-gray-900 text-sm">Team Directory</h2>
              <button onClick={handleExport} className="text-xs text-primary-500 font-semibold hover:text-primary-700">Export CSV</button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100">
                  {['Member', 'Role', 'Location', 'Workload', 'Tasks', 'Status', ''].map((h, idx) => (
                    <th key={idx} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((member, i) => {
                  const color = getMemberColor(member.id);
                  const role = roleStyles[member.role] ?? roleStyles.member;
                  const tc = memberTaskCounts[member.id] ?? { assigned: 0, total: 5 };
                  const pct = tc.total > 0 ? (tc.assigned / tc.total) * 100 : 0;
                  const status: 'online' | 'offline' = member.status === 'active' ? 'online' : 'offline';
                  const isConfirmingRemove = confirmRemoveId === member.id;
                  return (
                    <motion.tr
                      key={member.id}
                      className="border-b border-surface-100 hover:bg-surface-50 transition-colors cursor-pointer"
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                      onClick={() => setSelectedMember(member)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={member.name} color={color} size="lg" />
                          <div>
                            <div className="font-bold text-xs text-gray-900">{member.name}</div>
                            <div className="text-[10px] text-gray-400">{member.designation ?? '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${role.bg} ${role.text}`}>
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{member.location ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                          </div>
                          <span className="text-[10px] text-gray-400 shrink-0">{tc.assigned}/{tc.total}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-900">{tc.assigned}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor[status] }} />
                          <span className="text-xs font-medium" style={{ color: statusColor[status] }}>{statusLabel[status]}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="relative flex items-center justify-end">
                          {isConfirmingRemove ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-500 whitespace-nowrap">Remove {member.name.split(' ')[0]}?</span>
                              <button
                                className="text-[10px] font-bold text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 transition-colors"
                                onClick={() => {
                                  removeMember(member.id).catch(console.error);
                                  scrubAssignee(member.id).catch(console.error);
                                  setConfirmRemoveId(null);
                                }}
                              >
                                Confirm
                              </button>
                              <button
                                className="text-[10px] font-bold text-gray-500 hover:text-gray-700 px-1.5 py-0.5 rounded bg-surface-100 hover:bg-surface-200 transition-colors"
                                onClick={() => setConfirmRemoveId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="p-1 rounded hover:bg-surface-200 text-gray-400 hover:text-gray-600 transition-colors"
                              onClick={() => setConfirmRemoveId(member.id === confirmRemoveId ? null : member.id)}
                            >
                              <MoreVertical size={14} />
                            </button>
                          )}
                        </div>
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
            {/* Role Distribution */}
            <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0, ease: [0.4, 0, 0.2, 1] }}>
              <h3 className="font-bold text-gray-900 text-sm mb-3">Role Distribution</h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full shrink-0" style={{ background: donutGradient }} />
                <div className="flex flex-col gap-1.5">
                  {[{ label: 'Admin', count: adminCount, color: '#5030E5' }, { label: 'Manager', count: managerCount, color: '#D97706' }, { label: 'Member', count: memberCount, color: '#68B266' }].map(d => (
                    <div key={d.label} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-gray-500 flex-1">{d.label}</span>
                      <span className="font-bold text-gray-900">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Location Split */}
            <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}>
              <h3 className="font-bold text-gray-900 text-sm mb-3">Location Split</h3>
              {Object.entries(locationCounts).map(([loc, count]) => (
                <div key={loc} className="flex items-center gap-2 py-2 border-b border-surface-100 last:border-0">
                  <span className="text-xs text-gray-500 flex-1">{loc}</span>
                  <div className="w-16 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary-400" style={{ width: `${members.length > 0 ? (count / members.length) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-900 w-4 text-right">{count}</span>
                </div>
              ))}
            </motion.div>

            {/* Availability */}
            <motion.div className="bg-white rounded-2xl border border-surface-200 p-4"
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.16, ease: [0.4, 0, 0.2, 1] }}>
              <h3 className="font-bold text-gray-900 text-sm mb-3">Availability</h3>
              {(['online', 'offline'] as const).map(s => {
                const count = members.filter(m => (m.status === 'active' ? 'online' : 'offline') === s).length;
                return (
                  <div key={s} className="flex items-center gap-2 py-2 border-b border-surface-100 last:border-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor[s] }} />
                    <span className="text-xs text-gray-500 flex-1 capitalize">{s}</span>
                    <span className="text-xs font-bold text-gray-900">{count}</span>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Profile side panel */}
      <AnimatePresence>
        {selectedMember && (
          <motion.div className="fixed inset-0 top-16 z-50 flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex-1 bg-black/30" onClick={() => setSelectedMember(null)} />
            <motion.div
              className="w-[420px] bg-white h-full overflow-y-auto border-l border-surface-200 flex flex-col"
              initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Profile</span>
                <button onClick={() => setSelectedMember(null)}><X size={16} /></button>
              </div>
              {/* Content */}
              <div className="px-5 py-6 flex flex-col items-center gap-4">
                <Avatar name={selectedMember.name} color={getMemberColor(selectedMember.id)} size="lg" />
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">{selectedMember.name}</div>
                  <div className="text-sm text-gray-500">{selectedMember.designation ?? '—'}</div>
                </div>
                <div className="w-full flex flex-col gap-2 mt-2">
                  <div className="flex justify-between py-2 border-b border-surface-100">
                    <span className="text-xs text-gray-400">Email</span>
                    <span className="text-xs font-semibold text-gray-700">{selectedMember.email ?? '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-surface-100">
                    <span className="text-xs text-gray-400">Role</span>
                    <span className="text-xs font-semibold text-gray-700 capitalize">{selectedMember.role}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-surface-100">
                    <span className="text-xs text-gray-400">Status</span>
                    <span className={`text-xs font-semibold ${selectedMember.status === 'active' ? 'text-[#68B266]' : 'text-gray-400'}`}>{selectedMember.status ?? 'active'}</span>
                  </div>
                </div>
                <motion.button
                  onClick={() => navigate('/messages', { state: { memberId: selectedMember.id } })}
                  className="w-full flex items-center justify-center gap-2 bg-primary-500 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-primary-600 transition-colors mt-2"
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                >
                  <Send size={15} /> Send Message
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite modal */}
      <AnimatePresence>
        {showInvite && (
          <InviteMemberModal
            onClose={() => setShowInvite(false)}
            onSubmit={member => addMember(member).catch(console.error)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MembersPage;
