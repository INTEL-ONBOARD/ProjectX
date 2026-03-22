import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users2, Shield, UserCheck, KeyRound, MoreVertical, Eye, UserCog, Trash2, ChevronLeft, ChevronRight as ChevronRightIcon, Clock, Briefcase as BriefcaseIcon, ChevronRight } from 'lucide-react';
import { format, startOfWeek, addDays as dateFnsAddDays } from 'date-fns';
import { useRoles } from '../context/RolesContext';
import { useMembersContext } from '../context/MembersContext';
import { useRolePerms } from '../context/RolePermsContext';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { usePresence } from '../context/PresenceContext';
import { User } from '../types';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { UserRoleDrawer } from '../components/users/UserRoleDrawer';
import { RoleListPanel } from '../components/users/RoleListPanel';
import { RoleDetailPanel } from '../components/users/RoleDetailPanel';
import { PermissionsPanel } from '../components/users/PermissionsPanel';
import { AppContext, AttendanceRecord } from '../context/AppContext';
import { useProjects } from '../context/ProjectContext';

const roleStyles: Record<string, { bg: string; text: string }> = {
    admin:   { bg: 'bg-primary-50',       text: 'text-primary-600' },
    manager: { bg: 'bg-[#FFFBEB]',        text: 'text-[#D97706]'  },
    member:  { bg: 'bg-surface-200',      text: 'text-gray-500'   },
};

const statusColor = { active: '#68B266', inactive: '#D1D5DB' };
const statusLabel = { active: 'Active', inactive: 'Inactive' };

const TABS = ['Users', 'Roles', 'Permissions', 'Attendance'] as const;
type Tab = typeof TABS[number];

// ─── Attendance Tab ──────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    present:    { label: 'Present',  bg: '#68B26615', text: '#68B266', dot: '#68B266' },
    wfh:        { label: 'WFH',      bg: '#30C5E515', text: '#30C5E5', dot: '#30C5E5' },
    'half-day': { label: 'Half',     bg: '#9C27B015', text: '#9C27B0', dot: '#9C27B0' },
    'on-leave': { label: 'Leave',    bg: '#FFA50015', text: '#FFA500', dot: '#FFA500' },
    absent:     { label: 'Absent',   bg: '#D8727D15', text: '#D8727D', dot: '#D8727D' },
    holiday:    { label: 'Holiday',  bg: '#6366f115', text: '#6366f1', dot: '#6366f1' },
};

function addDays(date: Date, n: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function workHours(checkIn?: string, checkOut?: string): string {
    if (!checkIn || !checkOut) return '';
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    if (diff <= 0) return '';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h${m > 0 ? ` ${m}m` : ''}`;
}

const AttendanceTab: React.FC = () => {
    const { attendanceRecords } = useContext(AppContext);
    const { members } = useMembersContext();
    const { allTasks } = useProjects();

    // Week navigation — start on Monday of current week
    const getMonday = (d: Date): Date => {
        const day = d.getDay();
        const diff = (day === 0 ? -6 : 1 - day);
        return addDays(d, diff);
    };

    const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
    const [filterUserId, setFilterUserId] = useState<string>('all');

    const days: Date[] = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const prevWeek = () => setWeekStart(d => addDays(d, -7));
    const nextWeek = () => setWeekStart(d => addDays(d, 7));
    const goToday  = () => setWeekStart(getMonday(new Date()));

    const isCurrentWeek = toDateStr(weekStart) === toDateStr(getMonday(new Date()));
    const todayStr = toDateStr(new Date());

    const displayedMembers = filterUserId === 'all'
        ? members
        : members.filter(m => m.id === filterUserId);

    // Index records: userId+date → record
    const recordMap = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach(r => recordMap.set(`${r.userId}|${r.date}`, r));

    // Workload per user
    const workloadMap = new Map<string, { total: number; done: number; inProgress: number }>();
    members.forEach(m => {
        const assigned = allTasks.filter(t => t.assignees.includes(m.id));
        workloadMap.set(m.id, {
            total:      assigned.length,
            done:       assigned.filter(t => t.status === 'done').length,
            inProgress: assigned.filter(t => t.status === 'in-progress').length,
        });
    });

    // Summary row counts for header
    const weekAttSummary = days.map(day => {
        const ds = toDateStr(day);
        let present = 0, absent = 0, wfh = 0;
        members.forEach(m => {
            const r = recordMap.get(`${m.id}|${ds}`);
            if (!r) return;
            if (r.status === 'present') present++;
            else if (r.status === 'absent') absent++;
            else if (r.status === 'wfh') wfh++;
        });
        return { present, absent, wfh };
    });

    return (
        <div className="flex-1 min-h-0 flex flex-col">
            {/* Controls */}
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors text-gray-500">
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-medium w-44 text-center text-gray-800">
                        {format(weekStart, 'MMM d')} – {format(dateFnsAddDays(weekStart, 6), 'MMM d, yyyy')}
                    </span>
                    <button
                        onClick={nextWeek}
                        disabled={isCurrentWeek}
                        className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-500"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>

                <select
                    value={filterUserId}
                    onChange={e => setFilterUserId(e.target.value)}
                    className="text-xs border border-surface-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary-200"
                >
                    <option value="all">All Members</option>
                    {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mb-3 shrink-0 flex-wrap">
                {Object.entries(STATUS_META).map(([key, s]) => (
                    <div key={key} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: s.dot }} />
                        <span className="text-[10px] text-gray-400">{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 bg-white rounded-2xl border border-surface-200 overflow-auto">
                <table className="w-full border-collapse" style={{ minWidth: 780 }}>
                    <thead>
                        {/* Day summary row */}
                        <tr className="border-b border-surface-100">
                            <th className="sticky left-0 z-10 bg-surface-50 px-4 py-2 text-left min-w-[160px] border-r border-surface-100">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Member</span>
                            </th>
                            {days.map((day, i) => {
                                const ds = toDateStr(day);
                                const isToday = ds === todayStr;
                                const s = weekAttSummary[i];
                                return (
                                    <th key={ds} className={`px-2 py-2 text-center min-w-[100px] border-r border-surface-100 last:border-r-0 ${isToday ? 'bg-primary-50' : 'bg-surface-50'}`}>
                                        <div className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-primary-500' : 'text-gray-400'}`}>
                                            {dayLabels[i]}
                                        </div>
                                        <div className={`text-xs font-extrabold mt-0.5 ${isToday ? 'text-primary-600' : 'text-gray-600'}`}>
                                            {day.getDate()}
                                        </div>
                                        {members.length > 0 && (
                                            <div className="flex justify-center gap-1 mt-1">
                                                {s.present > 0 && <span className="text-[9px] font-bold px-1 rounded" style={{ background: '#68B26615', color: '#68B266' }}>{s.present}</span>}
                                                {s.wfh > 0    && <span className="text-[9px] font-bold px-1 rounded" style={{ background: '#30C5E515', color: '#30C5E5' }}>{s.wfh}</span>}
                                                {s.absent > 0 && <span className="text-[9px] font-bold px-1 rounded" style={{ background: '#D8727D15', color: '#D8727D' }}>{s.absent}</span>}
                                            </div>
                                        )}
                                    </th>
                                );
                            })}
                            <th className="px-3 py-2 text-center min-w-[120px] bg-surface-50">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Workload</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedMembers.map((member, mi) => {
                            const wl = workloadMap.get(member.id) ?? { total: 0, done: 0, inProgress: 0 };
                            const completionPct = wl.total > 0 ? Math.round((wl.done / wl.total) * 100) : 0;

                            // Weekly hours for this member
                            const weekHours = days.reduce((acc, day) => {
                                const r = recordMap.get(`${member.id}|${toDateStr(day)}`);
                                if (!r?.checkIn || !r?.checkOut) return acc;
                                const diff = new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime();
                                return diff > 0 ? acc + diff : acc;
                            }, 0);
                            const weekHoursLabel = weekHours > 0
                                ? `${Math.floor(weekHours / 3600000)}h ${Math.floor((weekHours % 3600000) / 60000)}m`
                                : '—';

                            return (
                                <motion.tr
                                    key={member.id}
                                    className="border-b border-surface-100 last:border-0 hover:bg-surface-50/50 transition-colors"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25, delay: mi * 0.04, ease: [0.4, 0, 0.2, 1] }}
                                >
                                    {/* Member cell */}
                                    <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-surface-100 hover:bg-surface-50/50">
                                        <div className="flex items-center gap-2.5">
                                            <Avatar name={member.name} color="#9ca3af" size="md" />
                                            <div>
                                                <div className="text-xs font-bold text-gray-800 leading-tight">{member.name}</div>
                                                <div className="text-[10px] text-gray-400 mt-0.5">{member.designation ?? member.role}</div>
                                                <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <Clock size={9} />
                                                    {weekHoursLabel} this week
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Day cells */}
                                    {days.map(day => {
                                        const ds = toDateStr(day);
                                        const isToday = ds === todayStr;
                                        const record = recordMap.get(`${member.id}|${ds}`);
                                        const meta = record ? STATUS_META[record.status] : null;
                                        const hours = record ? workHours(record.checkIn, record.checkOut) : '';

                                        return (
                                            <td key={ds} className={`px-2 py-3 text-center border-r border-surface-100 last:border-r-0 ${isToday ? 'bg-primary-50/30' : ''}`}>
                                                {meta ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span
                                                            className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                                                            style={{ background: meta.bg, color: meta.text }}
                                                        >
                                                            {meta.label}
                                                        </span>
                                                        {hours && (
                                                            <span className="text-[9px] text-gray-400 font-medium">{hours}</span>
                                                        )}
                                                        {record?.checkIn && (
                                                            <span className="text-[9px] text-gray-400">
                                                                {new Date(record.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-gray-400">—</span>
                                                )}
                                            </td>
                                        );
                                    })}

                                    {/* Workload cell */}
                                    <td className="px-3 py-3 text-center">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                <BriefcaseIcon size={10} />
                                                <span className="font-semibold text-gray-700">{wl.total}</span>
                                                <span>tasks</span>
                                            </div>
                                            {wl.total > 0 && (
                                                <>
                                                    <div className="w-16 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-[#68B266] transition-all"
                                                            style={{ width: `${completionPct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[9px] text-gray-400">{completionPct}% done</span>
                                                    {wl.inProgress > 0 && (
                                                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#FFA50015', color: '#FFA500' }}>
                                                            {wl.inProgress} active
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </motion.tr>
                            );
                        })}
                        {displayedMembers.length === 0 && (
                            <tr>
                                <td colSpan={9} className="py-16 text-center text-xs text-gray-400">No members found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ─── Users Tab ──────────────────────────────────────────────────────────────

const UsersTab: React.FC = () => {
    const { members, getMemberColor, removeMember, refetchMembers } = useMembersContext();
    const { roles } = useRoles();
    const { showToast } = useToast();
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
    const [drawerMember, setDrawerMember] = useState<User | null>(null);
    const [drawerSection, setDrawerSection] = useState<'profile' | 'role' | 'activity' | 'attendance'>('profile');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
    useEffect(() => {
        refetchMembers().catch(console.error);
    }, []);

    const handleRemove = async (id: string) => {
        setConfirmRemoveId(null);
        try {
            await removeMember(id);
            await refetchMembers();
        } catch (err: unknown) {
            showToast('Failed to remove member.', 'error');
            await refetchMembers().catch(console.error);
        }
    };

    const getRoleStyle = (roleName: string) => roleStyles[roleName] ?? roleStyles.member;
    const getRoleColor = (roleName: string) => roles.find(r => r.name === roleName)?.color ?? '#9ca3af';

    const adminCount   = members.filter(m => m.role === 'admin').length;
    const activeCount  = members.filter(m => m.status === 'active').length;
    const rolesCount   = roles.length;

    const metrics = [
        { label: 'Total Members', value: String(members.length), trend: `${members.length} in team`, color: '', accent: true,  icon: Users2,    barPct: 100 },
        { label: 'Admins',        value: String(adminCount),     trend: `${members.length > 0 ? Math.round((adminCount / members.length) * 100) : 0}%`, color: '#5030E5', accent: false, icon: Shield,    barPct: members.length > 0 ? (adminCount / members.length) * 100 : 0 },
        { label: 'Active',        value: String(activeCount),    trend: `${activeCount} online`,    color: '#68B266', accent: false, icon: UserCheck, barPct: members.length > 0 ? (activeCount / members.length) * 100 : 0 },
        { label: 'Roles',         value: String(rolesCount),     trend: `${rolesCount} defined`,    color: '#8B5CF6', accent: false, icon: KeyRound,  barPct: 100 },
    ];

    return (
        <>
            {/* Metric strip */}
            <div className="grid grid-cols-4 gap-5 mb-5 shrink-0">
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

            {/* Member table */}
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden flex flex-col min-h-0 flex-1">
                <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
                    <h2 className="font-bold text-gray-900 text-sm">All Members</h2>
                    <span className="text-xs text-gray-400">{members.length} total</span>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-surface-100">
                                {['Member', 'Email', 'Role', 'Status', ''].map((h, idx) => (
                                    <th key={idx} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((member, i) => {
                                const color = getMemberColor(member.id);
                                const role = getRoleStyle(member.role);
                                const status: 'active' | 'inactive' = member.status === 'active' ? 'active' : 'inactive';
                                return (
                                    <motion.tr
                                        key={member.id}
                                        className="border-b border-surface-100 last:border-0 hover:bg-surface-50 transition-colors cursor-pointer"
                                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.35, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                                        onClick={() => setDrawerMember(member)}
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
                                        <td className="px-4 py-3 text-xs text-gray-500">{member.email ?? '—'}</td>
                                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                            <span
                                                className={`text-xs font-semibold px-2 py-0.5 rounded-md cursor-pointer hover:opacity-75 transition-opacity ${role.bg} ${role.text}`}
                                                style={!roleStyles[member.role] ? { background: getRoleColor(member.role) + '20', color: getRoleColor(member.role) } : {}}
                                                onClick={() => { setDrawerSection('role'); setDrawerMember(member); }}
                                            >
                                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor[status] }} />
                                                <div>
                                                    <span className="text-xs font-medium" style={{ color: statusColor[status] }}>{statusLabel[status]}</span>
                                                    {(() => {
                                                        const ps = getStatus(member.id);
                                                        const ls = formatLastSeen(member.id);
                                                        if (ps === 'online') return <div className="text-[10px] text-green-500 font-medium">Online now</div>;
                                                        if (ps === 'away') return <div className="text-[10px] text-orange-400 font-medium">Away</div>;
                                                        if (ls) return <div className="text-[10px] text-gray-400">last seen {ls}</div>;
                                                        return null;
                                                    })()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                            <div className="relative inline-flex items-center justify-end">
                                                {confirmRemoveId === member.id ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] text-gray-500 whitespace-nowrap">Remove {member.name.split(' ')[0]}?</span>
                                                        <button
                                                            className="text-[10px] font-bold text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 transition-colors"
                                                            onClick={() => handleRemove(member.id)}
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
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                                                const MENU_HEIGHT = 120;
                                                                const top = rect.bottom + 4 + MENU_HEIGHT > window.innerHeight
                                                                    ? rect.top - MENU_HEIGHT - 4
                                                                    : rect.bottom + 4;
                                                                setMenuAnchor({ top, right: window.innerWidth - rect.right });
                                                                setMenuOpenId(menuOpenId === member.id ? null : member.id);
                                                            }}
                                                            className="p-1 rounded-md hover:bg-surface-100 text-gray-300 hover:text-gray-500 transition-colors"
                                                        >
                                                            <MoreVertical size={14} />
                                                        </button>
                                                        {menuOpenId === member.id && (
                                                            <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
                                                        )}
                                                        <AnimatePresence>
                                                            {menuOpenId === member.id && menuAnchor && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                                                    transition={{ duration: 0.12 }}
                                                                    style={{ position: 'fixed', top: menuAnchor.top, right: menuAnchor.right }}
                                                                    className="z-50 bg-white border border-surface-200 rounded-xl shadow-lg py-1 w-40"
                                                                >
                                                                    <button
                                                                        onClick={() => { setMenuOpenId(null); setDrawerSection('profile'); setDrawerMember(member); }}
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-surface-50 transition-colors"
                                                                    >
                                                                        <Eye size={13} className="text-gray-400" />
                                                                        View Profile
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setMenuOpenId(null); setDrawerSection('role'); setDrawerMember(member); }}
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-surface-50 transition-colors"
                                                                    >
                                                                        <UserCog size={13} className="text-gray-400" />
                                                                        Change Role
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setMenuOpenId(null); setConfirmRemoveId(member.id); }}
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                        Remove
                                                                    </button>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                            {members.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-16 text-center">
                                        <Users2 size={32} className="text-gray-200 mx-auto mb-3" />
                                        <p className="text-sm text-gray-400 font-medium">No members yet</p>
                                        <p className="text-xs text-gray-300 mt-1">Invite someone to get started</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <UserRoleDrawer
                member={drawerMember}
                roles={roles}
                onClose={() => setDrawerMember(null)}
                initialSection={drawerSection}
            />
        </>
    );
};

// ─── Roles Tab ───────────────────────────────────────────────────────────────

interface RolesTabProps {
    selectedRoleId: string | null;
    onSelect: (id: string) => void;
    onDeleteComplete: () => void;
    onAddRole: () => void;
    addingRole: boolean;
}

const RolesTab: React.FC<RolesTabProps> = ({ selectedRoleId, onSelect, onDeleteComplete, onAddRole, addingRole }) => {
    const { roles } = useRoles();
    const { members } = useMembersContext();
    return (
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-surface-200 flex overflow-hidden">
            {/* Left sidebar */}
            <div className="w-[220px] shrink-0 border-r border-surface-100 flex flex-col">
                <div className="px-4 py-3.5 border-b border-surface-100 shrink-0">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Roles</p>
                </div>
                <RoleListPanel
                    roles={roles}
                    members={members}
                    selectedRoleId={selectedRoleId}
                    onSelect={onSelect}
                    showAddRole
                    addRoleDisabled={addingRole}
                    onAddRole={onAddRole}
                />
            </div>
            {/* Detail panel */}
            <div className="flex-1 overflow-y-auto p-6">
                <RoleDetailPanel selectedRoleId={selectedRoleId} onDeleteComplete={onDeleteComplete} />
            </div>
        </div>
    );
};

// ─── Permissions Tab ─────────────────────────────────────────────────────────

interface PermissionsTabProps {
    selectedRoleId: string | null;
    onSelect: (id: string) => void;
}

const PermissionsTab: React.FC<PermissionsTabProps> = ({ selectedRoleId, onSelect }) => {
    const { roles } = useRoles();
    const { members } = useMembersContext();
    return (
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-surface-200 flex overflow-hidden">
            {/* Left sidebar */}
            <div className="w-[220px] shrink-0 border-r border-surface-100 flex flex-col">
                <div className="px-4 py-3.5 border-b border-surface-100 shrink-0">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Roles</p>
                </div>
                <RoleListPanel
                    roles={roles}
                    members={members}
                    selectedRoleId={selectedRoleId}
                    onSelect={onSelect}
                />
            </div>
            {/* Permissions panel */}
            <div className="flex-1 overflow-y-auto p-6">
                <PermissionsPanel selectedRoleId={selectedRoleId} />
            </div>
        </div>
    );
};

// ─── Page ────────────────────────────────────────────────────────────────────

const UsersPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('Users');
    const { roles, addRole } = useRoles();
    const { members } = useMembersContext();
    const { addRolePerms } = useRolePerms();
    const { showToast } = useToast();
    const { user: authUser } = useAuth();
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [addingRole, setAddingRole] = useState(false);

    const handleAddRole = async () => {
        if (addingRole) return;
        setAddingRole(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const db = (window as any).electronAPI.db;
            const newRole = await db.createRole({ name: 'New Role', color: '#6366f1' });
            addRole(newRole);
            await db.setRolePerms({ role: newRole.name, allowedRoutes: ['/settings'] });
            addRolePerms({ role: newRole.name, allowedRoutes: ['/settings'] });
            setSelectedRoleId(newRole.appId);
        } catch {
            showToast('Failed to create role.', 'error');
        } finally {
            setAddingRole(false);
        }
    };

    return (
        <motion.div
            className="flex-1 flex flex-col overflow-hidden px-8 bg-white"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
        >
            <div className="pt-8 pb-5 shrink-0">
                <PageHeader
                    eyebrow="Home / Users"
                    title="Users & Roles"
                    description={`${members.length} team member${members.length !== 1 ? 's' : ''}`}
                    actions={undefined}
                />
            </div>

            <div className="shrink-0 border-b border-surface-200 mb-6">
                <div className="flex items-center gap-1">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === tab ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <motion.span
                                    layoutId="users-tab-ind"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-t"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'Users' && (
                <div className="flex-1 min-h-0 overflow-y-auto pb-6 flex flex-col">
                    <UsersTab />
                </div>
            )}
            {activeTab === 'Roles' && (
                <div className="flex-1 min-h-0 pb-6 flex flex-col">
                    <RolesTab
                        selectedRoleId={selectedRoleId}
                        onSelect={setSelectedRoleId}
                        onDeleteComplete={() => setSelectedRoleId(null)}
                        onAddRole={handleAddRole}
                        addingRole={addingRole}
                    />
                </div>
            )}
            {activeTab === 'Permissions' && (
                <div className="flex-1 min-h-0 pb-6 flex flex-col">
                    <PermissionsTab
                        selectedRoleId={selectedRoleId}
                        onSelect={setSelectedRoleId}
                    />
                </div>
            )}
            {activeTab === 'Attendance' && (
                <div className="flex-1 min-h-0 pb-6 flex flex-col">
                    <AttendanceTab />
                </div>
            )}
        </motion.div>
    );
};

export default UsersPage;
