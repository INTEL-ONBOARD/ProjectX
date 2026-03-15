import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { User } from '../../types';
import { RoleDoc } from '../../context/RolesContext';
import { useMembersContext } from '../../context/MembersContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authApi = () => (window as any).electronAPI.auth;

interface Props {
    member: User | null;
    roles: RoleDoc[];
    onClose: () => void;
}

export const UserRoleDrawer: React.FC<Props> = ({ member, roles, onClose }) => {
    const { updateMember } = useMembersContext();
    const { user: authUser } = useAuth();
    const { showToast } = useToast();
    const [selectedRole, setSelectedRole] = useState<string>(member?.role ?? '');
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        if (member) setSelectedRole(member.role);
    }, [member?.id, member?.role]);

    const isSelf = member?.id === authUser?.id;
    const unchanged = selectedRole === member?.role;

    const handleSave = async () => {
        if (!member || isSelf || unchanged) return;
        setSaving(true);
        try {
            await updateMember(member.id, { role: selectedRole });
            try {
                await authApi().updateRole(member.id, selectedRole);
            } catch {
                showToast('Role updated but auth sync failed. The user may need to re-login.', 'error');
                return;
            }
            showToast(`${member.name}'s role updated to ${selectedRole}.`, 'success');
            onClose();
        } catch {
            showToast('Failed to update role. Please try again.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const initials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <AnimatePresence>
            {member && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/20 z-40"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col"
                        initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-100">
                            <h2 className="text-base font-semibold text-gray-800">Edit User Role</h2>
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg shrink-0">
                                    {initials(member.name)}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800 text-base">{member.name}</p>
                                    <p className="text-sm text-gray-400">{member.email ?? '—'}</p>
                                    {member.designation && <p className="text-xs text-gray-400 mt-0.5">{member.designation}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Role</label>
                                {isSelf ? (
                                    <p className="text-sm text-gray-400 italic">You cannot change your own role.</p>
                                ) : (
                                    <select
                                        value={selectedRole}
                                        onChange={e => setSelectedRole(e.target.value)}
                                        className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                                    >
                                        {roles.map(r => (
                                            <option key={r.appId} value={r.name}>{r.name.charAt(0).toUpperCase() + r.name.slice(1)}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        {!isSelf && (
                            <div className="px-6 py-4 border-t border-surface-100">
                                <button
                                    onClick={handleSave}
                                    disabled={saving || unchanged}
                                    className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
                                >
                                    <Save size={14} />
                                    {saving ? 'Saving…' : 'Save Role'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
