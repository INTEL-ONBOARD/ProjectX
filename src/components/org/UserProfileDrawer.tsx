import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Save } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useMembersContext } from '../../context/MembersContext';
import { useAuth } from '../../context/AuthContext';
import { useRoles } from '../../context/RolesContext';
import { useProjects } from '../../context/ProjectContext';
import { useToast } from '../ui/Toast';
import { User } from '../../types';
import { useNavigate } from 'react-router-dom';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authApi = () => (window as any).electronAPI.auth as {
    updateRole: (userId: string, role: string) => Promise<boolean>;
    updateName: (userId: string, newName: string) => Promise<void>;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbApi = () => (window as any).electronAPI.db;

interface AuthUserRow { id: string; name: string; email: string; role: string; }

interface Props {
    user: AuthUserRow;
    member: User | undefined;
    getMemberColor: (id: string) => string;
    onClose: () => void;
    onSaved: (userId: string, changes: Partial<AuthUserRow & User>) => void;
}

const roleStyles: Record<string, { bg: string; text: string; dot: string }> = {
    admin:   { bg: 'bg-primary-50',  text: 'text-primary-600', dot: 'bg-primary-500' },
    manager: { bg: 'bg-[#FFFBEB]',   text: 'text-[#D97706]',   dot: 'bg-[#D97706]'  },
    member:  { bg: 'bg-surface-200', text: 'text-gray-500',    dot: 'bg-gray-300'   },
};
const getRoleStyle = (role: string) => roleStyles[role] ?? { bg: 'bg-surface-100', text: 'text-gray-600', dot: 'bg-gray-400' };

export const UserProfileDrawer: React.FC<Props> = ({ user, member, getMemberColor, onClose, onSaved }) => {
    const { updateMember } = useMembersContext();
    const { user: authUser, updateDisplayName } = useAuth();
    const { roles } = useRoles();
    const { allTasks } = useProjects();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [name, setName]           = useState(user.name);
    const [designation, setDesig]   = useState(member?.designation ?? '');
    const [location, setLocation]   = useState(member?.location ?? '');
    const [status, setStatus]       = useState<'active' | 'inactive'>(member?.status ?? 'active');
    const [role, setRole]           = useState(user.role);
    const [saving, setSaving]       = useState(false);

    const isSelf = user.id === authUser?.id;
    const isAdmin = authUser?.role === 'admin';

    const assignedTasks = allTasks.filter(t => t.assignees.includes(user.id));
    const totalTasks = allTasks.length;
    const barPct = totalTasks > 0 ? Math.min(100, (assignedTasks.length / totalTasks) * 100) : 0;

    const handleSave = async () => {
        setSaving(true);
        try {
            // Name — update both User and AuthUser collections
            if (name !== user.name) {
                await dbApi().updateMember(user.id, { name });
                await authApi().updateName(user.id, name);
                if (isSelf) updateDisplayName(name);
            }
            // Profile fields
            if (member) {
                await dbApi().updateMember(user.id, { designation, location, status });
            }
            // Role — update member first, then sync auth; revert if auth sync fails
            if (role !== user.role && !isSelf) {
                await dbApi().updateMember(user.id, { role });
                await updateMember(user.id, { role });
                try {
                    await authApi().updateRole(user.id, role);
                } catch {
                    // Revert if auth sync fails
                    await dbApi().updateMember(user.id, { role: user.role }).catch(() => {});
                    await updateMember(user.id, { role: user.role }).catch(() => {});
                    showToast('Role update failed: auth sync error. Role reverted.', 'error');
                    return;
                }
            }
            onSaved(user.id, { name, designation, location, status, role });
            showToast('Profile updated.', 'success');
            onClose();
        } catch {
            showToast('Failed to save changes.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const rs = getRoleStyle(role);

    return (
        <motion.div
            className="fixed inset-0 top-16 z-50 flex"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
            <motion.div
                className="flex-1 cursor-pointer"
                style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.div
                className="w-[420px] bg-white h-full overflow-y-auto border-l border-surface-200 flex flex-col"
                initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
                transition={{ duration: 0.3 }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">User Profile</span>
                    <button onClick={onClose} className="p-1 rounded hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Avatar + name */}
                <div className="px-5 py-5 flex flex-col items-center gap-3 border-b border-surface-100 shrink-0">
                    <Avatar name={user.name} color={getMemberColor(user.id)} size="lg" />
                    <div className="text-center">
                        <div className="text-base font-bold text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                    </div>
                </div>

                {/* Editable fields */}
                <div className="px-5 py-4 flex flex-col gap-3 flex-1">
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Name</label>
                        <input
                            value={name} onChange={e => setName(e.target.value)}
                            className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Designation</label>
                        <input
                            value={designation} onChange={e => setDesig(e.target.value)}
                            placeholder="e.g. Senior Engineer"
                            className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Location</label>
                        <input
                            value={location} onChange={e => setLocation(e.target.value)}
                            placeholder="e.g. Nairobi"
                            className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Status</label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setStatus('active')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${status === 'active' ? 'bg-[#ECFDF3] text-[#16A34A] border-[#BBF7D0]' : 'bg-surface-100 text-gray-400 border-surface-200'}`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" /> Active
                            </button>
                            <button
                                onClick={() => setStatus('inactive')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${status === 'inactive' ? 'bg-surface-200 text-gray-600 border-surface-300' : 'bg-surface-100 text-gray-400 border-surface-200'}`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Inactive
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Role</label>
                        {isAdmin && !isSelf ? (
                            <select
                                value={role} onChange={e => setRole(e.target.value)}
                                className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 bg-white transition-all"
                            >
                                {roles.map(r => (
                                    <option key={r.appId} value={r.name}>{r.name.charAt(0).toUpperCase() + r.name.slice(1)}</option>
                                ))}
                            </select>
                        ) : (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${rs.bg} ${rs.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${rs.dot}`} />{role}{isSelf && <span className="opacity-40 text-[9px]">you</span>}
                            </span>
                        )}
                    </div>

                    {/* Workload */}
                    <div className="pt-1 border-t border-surface-100">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Workload</label>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-primary-400 transition-all" style={{ width: `${barPct}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-600 shrink-0">{assignedTasks.length} tasks</span>
                        </div>
                    </div>

                    {/* Task list */}
                    {assignedTasks.length > 0 && (
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Assigned Tasks</label>
                            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                                {assignedTasks.map(t => (
                                    <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-50 text-xs">
                                        <span className="flex-1 text-gray-700 font-medium truncate">{t.title}</span>
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${t.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-surface-200 text-gray-500'}`}>{t.status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-5 py-4 border-t border-surface-100 shrink-0 flex gap-3">
                    <motion.button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 bg-primary-500 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors"
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    >
                        <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
                    </motion.button>
                    <motion.button
                        onClick={() => navigate('/messages', { state: { memberId: user.id } })}
                        className="flex items-center gap-2 border border-surface-200 text-gray-600 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-surface-50 transition-colors"
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    >
                        <Send size={14} />
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
};
