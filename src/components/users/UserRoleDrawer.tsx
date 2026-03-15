import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Save, User as UserIcon, Mail, MapPin, Briefcase, Phone,
    Building2, FileText, Shield, Activity, Calendar, Hash,
    Clock, TrendingUp, CheckCircle2, XCircle, Coffee, Home,
} from 'lucide-react';
import { User } from '../../types';
import { RoleDoc } from '../../context/RolesContext';
import { useMembersContext } from '../../context/MembersContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { useProjects } from '../../context/ProjectContext';
import { AppContext } from '../../context/AppContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authApi = () => (window as any).electronAPI.auth;

interface Props {
    member: User | null;
    roles: RoleDoc[];
    onClose: () => void;
}

type Section = 'profile' | 'role' | 'activity' | 'attendance';

const SECTIONS: { id: Section; label: string }[] = [
    { id: 'profile',    label: 'Profile' },
    { id: 'role',       label: 'Role & Status' },
    { id: 'activity',   label: 'Activity' },
    { id: 'attendance', label: 'Attendance' },
];

const Field: React.FC<{
    label: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}> = ({ label, icon, children }) => (
    <div>
        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            {icon}
            {label}
        </label>
        {children}
    </div>
);

const inputCls = "w-full border border-surface-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white transition-colors";
const readonlyCls = "w-full bg-surface-50 rounded-lg px-3 py-2 text-sm text-gray-500 border border-surface-100";

export const UserRoleDrawer: React.FC<Props> = ({ member, roles, onClose }) => {
    const { updateMember } = useMembersContext();
    const { user: authUser } = useAuth();
    const { showToast } = useToast();
    const { allTasks } = useProjects();
    const { attendanceRecords } = useContext(AppContext);

    const [section, setSection] = useState<Section>('profile');
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        designation: '',
        department: '',
        location: '',
        bio: '',
        role: '',
        status: 'active' as 'active' | 'inactive',
    });

    useEffect(() => {
        if (member) {
            setForm({
                name: member.name ?? '',
                email: member.email ?? '',
                phone: member.phone ?? '',
                designation: member.designation ?? '',
                department: member.department ?? '',
                location: member.location ?? '',
                bio: member.bio ?? '',
                role: member.role ?? '',
                status: member.status ?? 'active',
            });
            setSection('profile');
        }
    }, [member?.id]);

    const isSelf = member?.id === authUser?.id;

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value }));

    const handleSave = async () => {
        if (!member) return;
        setSaving(true);
        try {
            const changes: Partial<Omit<User, 'id'>> = {
                name: form.name.trim() || member.name,
                email: form.email.trim() || undefined,
                phone: form.phone.trim() || undefined,
                designation: form.designation.trim() || undefined,
                department: form.department.trim() || undefined,
                location: form.location.trim() || undefined,
                bio: form.bio.trim() || undefined,
                status: form.status,
            };
            if (!isSelf && form.role !== member.role) {
                changes.role = form.role;
                await updateMember(member.id, changes);
                try {
                    await authApi().updateRole(member.id, form.role);
                } catch {
                    // Revert member role if auth sync fails
                    await updateMember(member.id, { role: member.role }).catch(() => {});
                    showToast('Role update failed: auth sync error. Role reverted.', 'error');
                    return;
                }
            } else {
                await updateMember(member.id, changes);
            }
            showToast(`${member.name} updated successfully.`, 'success');
            onClose();
        } catch {
            showToast('Failed to save changes. Please try again.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Activity stats
    const assignedTasks  = allTasks.filter(t => member && t.assignees.includes(member.id));
    const completedTasks = assignedTasks.filter(t => t.status === 'done');
    const inProgressTasks = assignedTasks.filter(t => t.status === 'in-progress');
    const blockerTasks   = assignedTasks.filter(t => t.status === 'blocker');
    const completionRate = assignedTasks.length > 0 ? Math.round((completedTasks.length / assignedTasks.length) * 100) : 0;

    // Attendance stats
    const memberAttendance = attendanceRecords
        .filter(r => r.userId === member?.id)
        .sort((a, b) => b.date.localeCompare(a.date)); // newest first

    const attPresent  = memberAttendance.filter(r => r.status === 'present').length;
    const attAbsent   = memberAttendance.filter(r => r.status === 'absent').length;
    const attWfh      = memberAttendance.filter(r => r.status === 'wfh').length;
    const attOnLeave  = memberAttendance.filter(r => r.status === 'on-leave').length;
    const attHalfDay  = memberAttendance.filter(r => r.status === 'half-day').length;
    const attTotal    = memberAttendance.length;
    const attRate     = attTotal > 0 ? Math.round(((attPresent + attWfh + attHalfDay * 0.5) / attTotal) * 100) : 0;

    const computeWorkHours = (checkIn?: string, checkOut?: string): string => {
        if (!checkIn || !checkOut) return '—';
        const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
        if (diff <= 0) return '—';
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        return `${hrs}h ${mins}m`;
    };

    const totalWorkMs = memberAttendance.reduce((acc, r) => {
        if (!r.checkIn || !r.checkOut) return acc;
        const diff = new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime();
        return diff > 0 ? acc + diff : acc;
    }, 0);
    const avgWorkMs = attTotal > 0 ? totalWorkMs / attTotal : 0;
    const avgHrs = Math.floor(avgWorkMs / 3600000);
    const avgMins = Math.floor((avgWorkMs % 3600000) / 60000);
    const avgWorkLabel = avgWorkMs > 0 ? `${avgHrs}h ${avgMins}m` : '—';

    const initials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const roleColor = (r: string) => {
        const found = roles.find(x => x.name === r);
        return found?.color ?? '#9ca3af';
    };

    return (
        <AnimatePresence>
            {member && (
                <>
                    <motion.div
                        className="fixed inset-x-0 bottom-0 top-16 bg-black/20 z-40"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="fixed top-16 right-0 h-[calc(100vh-4rem)] w-[460px] bg-white shadow-2xl z-50 flex flex-col"
                        initial={{ x: 460 }} animate={{ x: 0 }} exit={{ x: 460 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 shrink-0">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                                    style={{ backgroundColor: roleColor(member.role) }}
                                >
                                    {initials(member.name)}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm leading-tight">{member.name}</p>
                                    <p className="text-[11px] text-gray-400">{member.email ?? '—'}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-gray-400 transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Section tabs */}
                        <div className="flex border-b border-surface-100 shrink-0 px-6">
                            {SECTIONS.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setSection(s.id)}
                                    className={`py-3 px-1 mr-5 text-xs font-semibold border-b-2 transition-colors ${
                                        section === s.id
                                            ? 'border-primary-500 text-primary-600'
                                            : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                            {/* ── Profile tab ── */}
                            {section === 'profile' && (
                                <>
                                    <Field label="Full Name" icon={<UserIcon size={10} />}>
                                        <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Full name" />
                                    </Field>
                                    <Field label="Email" icon={<Mail size={10} />}>
                                        <input className={inputCls} value={form.email} onChange={set('email')} placeholder="email@example.com" type="email" />
                                    </Field>
                                    <Field label="Phone" icon={<Phone size={10} />}>
                                        <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="+1 234 567 890" />
                                    </Field>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="Designation" icon={<Briefcase size={10} />}>
                                            <input className={inputCls} value={form.designation} onChange={set('designation')} placeholder="e.g. Senior Dev" />
                                        </Field>
                                        <Field label="Department" icon={<Building2 size={10} />}>
                                            <input className={inputCls} value={form.department} onChange={set('department')} placeholder="e.g. Engineering" />
                                        </Field>
                                    </div>
                                    <Field label="Location" icon={<MapPin size={10} />}>
                                        <input className={inputCls} value={form.location} onChange={set('location')} placeholder="City, Country" />
                                    </Field>
                                    <Field label="Bio" icon={<FileText size={10} />}>
                                        <textarea
                                            className={`${inputCls} resize-none`}
                                            rows={3}
                                            value={form.bio}
                                            onChange={set('bio')}
                                            placeholder="Short bio…"
                                        />
                                    </Field>

                                    {/* Read-only meta */}
                                    <div className="pt-1 border-t border-surface-100 grid grid-cols-2 gap-3">
                                        <Field label="Member ID" icon={<Hash size={10} />}>
                                            <div className={readonlyCls}>{member.id}</div>
                                        </Field>
                                        <Field label="Joined" icon={<Calendar size={10} />}>
                                            <div className={readonlyCls}>
                                                {member.joinedAt
                                                    ? new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                    : '—'}
                                            </div>
                                        </Field>
                                    </div>
                                </>
                            )}

                            {/* ── Role & Status tab ── */}
                            {section === 'role' && (
                                <>
                                    <Field label="Role" icon={<Shield size={10} />}>
                                        {isSelf ? (
                                            <p className="text-sm text-gray-400 italic py-2">You cannot change your own role.</p>
                                        ) : (
                                            <select className={inputCls} value={form.role} onChange={set('role')}>
                                                {roles.map(r => (
                                                    <option key={r.appId} value={r.name}>
                                                        {r.name.charAt(0).toUpperCase() + r.name.slice(1)}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                        {!isSelf && form.role && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <span
                                                    className="inline-block w-2.5 h-2.5 rounded-full"
                                                    style={{ backgroundColor: roleColor(form.role) }}
                                                />
                                                <span className="text-xs text-gray-500">
                                                    {roles.find(r => r.name === form.role)?.name ?? form.role}
                                                </span>
                                            </div>
                                        )}
                                    </Field>

                                    <Field label="Account Status" icon={<Activity size={10} />}>
                                        <select className={inputCls} value={form.status} onChange={set('status')}>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </Field>

                                    {/* Current state badges */}
                                    <div className="pt-2 border-t border-surface-100">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Current State</p>
                                        <div className="flex gap-2 flex-wrap">
                                            <span
                                                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                                style={{ backgroundColor: roleColor(member.role) + '20', color: roleColor(member.role) }}
                                            >
                                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                            </span>
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                                member.status === 'active'
                                                    ? 'bg-green-50 text-green-600'
                                                    : 'bg-gray-100 text-gray-400'
                                            }`}>
                                                {member.status === 'active' ? '● Active' : '○ Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ── Activity tab ── */}
                            {section === 'activity' && (
                                <>
                                    {/* Stats grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'Assigned Tasks', value: assignedTasks.length, color: '#5030E5' },
                                            { label: 'Completed',      value: completedTasks.length, color: '#68B266' },
                                            { label: 'In Progress',    value: inProgressTasks.length, color: '#FFA500' },
                                            { label: 'Blockers',       value: blockerTasks.length, color: '#D8727D' },
                                        ].map(stat => (
                                            <div key={stat.label} className="bg-surface-50 rounded-xl p-3 border border-surface-100">
                                                <div className="text-2xl font-extrabold" style={{ color: stat.color }}>{stat.value}</div>
                                                <div className="text-[10px] text-gray-400 mt-0.5">{stat.label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Completion rate bar */}
                                    <div className="bg-surface-50 rounded-xl p-4 border border-surface-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-semibold text-gray-600">Completion Rate</span>
                                            <span className="text-xs font-bold text-gray-800">{completionRate}%</span>
                                        </div>
                                        <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full bg-[#68B266]"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${completionRate}%` }}
                                                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                                            />
                                        </div>
                                    </div>

                                    {/* Task list */}
                                    {assignedTasks.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Assigned Tasks</p>
                                            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                                {assignedTasks.map(t => {
                                                    const statusColors: Record<string, string> = {
                                                        'done': '#68B266', 'in-progress': '#FFA500',
                                                        'blocker': '#D8727D', 'todo': '#5030E5',
                                                        'ready-for-qa': '#30C5E5', 'deployment-pending': '#9C27B0',
                                                    };
                                                    return (
                                                        <div key={t.id} className="flex items-center gap-2 px-3 py-2 bg-surface-50 rounded-lg border border-surface-100 text-xs">
                                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusColors[t.status] ?? '#9ca3af' }} />
                                                            <span className="flex-1 text-gray-700 truncate">{t.title}</span>
                                                            <span className="text-gray-400 shrink-0 capitalize">{t.status.replace(/-/g, ' ')}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {assignedTasks.length === 0 && (
                                        <div className="text-center py-8 text-xs text-gray-400">No tasks assigned yet</div>
                                    )}
                                </>
                            )}

                            {/* ── Attendance tab ── */}
                            {section === 'attendance' && (
                                <>
                                    {/* Summary stats */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'Attendance Rate', value: `${attRate}%`, color: '#68B266', icon: <TrendingUp size={14} /> },
                                            { label: 'Avg Work Hours', value: avgWorkLabel, color: '#5030E5', icon: <Clock size={14} /> },
                                            { label: 'Present Days',   value: attPresent,   color: '#68B266', icon: <CheckCircle2 size={14} /> },
                                            { label: 'Absent Days',    value: attAbsent,    color: '#D8727D', icon: <XCircle size={14} /> },
                                            { label: 'Work From Home',  value: attWfh,       color: '#30C5E5', icon: <Home size={14} /> },
                                            { label: 'On Leave',       value: attOnLeave,   color: '#FFA500', icon: <Coffee size={14} /> },
                                        ].map(stat => (
                                            <div key={stat.label} className="bg-surface-50 rounded-xl p-3 border border-surface-100 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: stat.color + '20' }}>
                                                    <span style={{ color: stat.color }}>{stat.icon}</span>
                                                </div>
                                                <div>
                                                    <div className="text-lg font-extrabold" style={{ color: stat.color }}>{stat.value}</div>
                                                    <div className="text-[10px] text-gray-400 leading-tight">{stat.label}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Attendance rate bar */}
                                    <div className="bg-surface-50 rounded-xl p-4 border border-surface-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-semibold text-gray-600">Attendance Rate</span>
                                            <span className="text-xs font-bold text-gray-800">{attRate}%</span>
                                        </div>
                                        <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{ background: '#68B266' }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${attRate}%` }}
                                                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-1.5">
                                            <span className="text-[10px] text-gray-400">{attTotal} records total</span>
                                            {attHalfDay > 0 && <span className="text-[10px] text-gray-400">{attHalfDay} half-day{attHalfDay !== 1 ? 's' : ''}</span>}
                                        </div>
                                    </div>

                                    {/* Recent records */}
                                    {memberAttendance.length > 0 ? (
                                        <div>
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent Records</p>
                                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                                {memberAttendance.slice(0, 30).map(r => {
                                                    const statusMeta: Record<string, { color: string; label: string }> = {
                                                        present:    { color: '#68B266', label: 'Present' },
                                                        absent:     { color: '#D8727D', label: 'Absent' },
                                                        wfh:        { color: '#30C5E5', label: 'WFH' },
                                                        'on-leave': { color: '#FFA500', label: 'On Leave' },
                                                        'half-day': { color: '#9C27B0', label: 'Half Day' },
                                                        holiday:    { color: '#6366f1', label: 'Holiday' },
                                                    };
                                                    const meta = statusMeta[r.status] ?? { color: '#9ca3af', label: r.status };
                                                    const workHours = computeWorkHours(r.checkIn, r.checkOut);
                                                    const checkInTime = r.checkIn ? new Date(r.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null;
                                                    const checkOutTime = r.checkOut ? new Date(r.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null;
                                                    return (
                                                        <div key={r.id} className="px-3 py-2 bg-surface-50 rounded-lg border border-surface-100 text-xs">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                                                                    <span className="font-semibold text-gray-700">
                                                                        {new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                                    </span>
                                                                </div>
                                                                <span className="font-semibold px-2 py-0.5 rounded-md text-[10px]" style={{ background: meta.color + '20', color: meta.color }}>
                                                                    {meta.label}
                                                                </span>
                                                            </div>
                                                            {(checkInTime || checkOutTime) && (
                                                                <div className="mt-1.5 flex items-center gap-3 text-[10px] text-gray-400">
                                                                    {checkInTime && <span>In: <span className="text-gray-600 font-medium">{checkInTime}</span></span>}
                                                                    {checkOutTime && <span>Out: <span className="text-gray-600 font-medium">{checkOutTime}</span></span>}
                                                                    {workHours !== '—' && <span className="ml-auto text-gray-500 font-medium">{workHours}</span>}
                                                                </div>
                                                            )}
                                                            {r.notes && (
                                                                <div className="mt-1 text-[10px] text-gray-400 italic">{r.notes}</div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-xs text-gray-400">No attendance records yet</div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        {section !== 'activity' && section !== 'attendance' && (
                            <div className="px-6 py-4 border-t border-surface-100 shrink-0">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
                                >
                                    <Save size={14} />
                                    {saving ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
