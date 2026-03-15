import React, { useState, useEffect } from 'react';
import { Trash2, Lock, KeyRound } from 'lucide-react';
import { useRoles } from '../../context/RolesContext';
import { useRolePerms } from '../../context/RolePermsContext';
import { useMembersContext } from '../../context/MembersContext';
import { useToast } from '../ui/Toast';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbApi = () => (window as any).electronAPI.db;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authApi = () => (window as any).electronAPI.auth;

const BUILT_IN = ['admin'];
const PRESET_COLORS = ['#5030E5', '#D97706', '#68B266', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'];

interface Props {
    selectedRoleId: string | null;
    onDeleteComplete: () => void;
}

export const RoleDetailPanel: React.FC<Props> = ({ selectedRoleId, onDeleteComplete }) => {
    const { roles, renameRoleLocal, updateRoleLocal, removeRole } = useRoles();
    const { renameRolePerms, removeRolePerms } = useRolePerms();
    const { members, updateMember } = useMembersContext();
    const { showToast } = useToast();

    const role = roles.find(r => r.appId === selectedRoleId) ?? null;

    const [nameValue, setNameValue] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [colorSaving, setColorSaving] = useState(false);

    useEffect(() => {
        setNameValue(role?.name ?? '');
        setConfirmDelete(false);
    }, [role?.appId]);

    const isBuiltIn = role ? BUILT_IN.includes(role.name) : false;
    const memberCount = role ? members.filter(m => m.role === role.name).length : 0;

    const handleNameBlur = async () => {
        if (!role || nameValue === role.name) return;
        const trimmed = nameValue.trim().toLowerCase();
        if (!trimmed) { setNameValue(role.name); return; }
        const duplicate = roles.some(r => r.name.toLowerCase() === trimmed && r.appId !== role.appId);
        if (duplicate) {
            showToast('A role with that name already exists.', 'error');
            setNameValue(role.name);
            return;
        }
        try {
            const result = await dbApi().renameRole({ appId: role.appId, newName: trimmed }) as { ok: boolean; oldName: string };
            if (!result.ok) throw new Error('rename returned ok:false');
            renameRoleLocal(role.appId, trimmed);
            renameRolePerms(result.oldName, trimmed);
        } catch {
            showToast('Failed to rename role.', 'error');
            setNameValue(role.name);
        }
    };

    const handleColorPick = async (color: string) => {
        if (!role || colorSaving) return;
        setColorSaving(true);
        try {
            await dbApi().updateRoleColor({ appId: role.appId, color });
            updateRoleLocal(role.appId, { color });
        } catch {
            showToast('Failed to update color.', 'error');
        } finally {
            setColorSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!role) return;
        setDeleting(true);
        const affected = members.filter(m => m.role === role.name);
        try {
            for (const m of affected) {
                await updateMember(m.id, { role: 'member' });
                await authApi().updateRole(m.id, 'member');
            }
            await dbApi().deleteRole({ appId: role.appId });
            await dbApi().deleteRolePerms({ roleName: role.name });
            removeRole(role.appId);
            removeRolePerms(role.name);
            showToast(`Role "${role.name}" deleted.`, 'success');
            onDeleteComplete();
        } catch {
            showToast('Delete failed. Some members may have been reassigned already — please check the Users tab.', 'error');
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    if (!role) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-3">
                <KeyRound size={32} />
                <p className="text-sm font-medium text-gray-400">Select a role to edit</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-lg">
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Role Name</label>
                {isBuiltIn ? (
                    <div className="flex items-center gap-2 px-3 py-2 border border-surface-200 rounded-lg bg-surface-50">
                        <Lock size={13} className="text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-500">{role.name.charAt(0).toUpperCase() + role.name.slice(1)}</span>
                        <span className="ml-auto text-xs text-gray-400">Built-in role</span>
                    </div>
                ) : (
                    <input
                        type="text"
                        value={nameValue}
                        onChange={e => setNameValue(e.target.value)}
                        onBlur={handleNameBlur}
                        className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
                    />
                )}
            </div>

            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Color {colorSaving && <span className="text-gray-400 font-normal ml-1">Saving…</span>}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => handleColorPick(c)}
                            disabled={colorSaving}
                            className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 disabled:opacity-50 ${role.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                            style={{ background: c }}
                        />
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="font-medium text-gray-800">{memberCount}</span>
                <span>{memberCount === 1 ? 'member' : 'members'} with this role</span>
            </div>

            {!isBuiltIn && (
                <div className="pt-4 border-t border-surface-100">
                    {!confirmDelete ? (
                        <button
                            onClick={() => setConfirmDelete(true)}
                            className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
                        >
                            <Trash2 size={14} />
                            Delete Role
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                Reassign <strong>{memberCount}</strong> {memberCount === 1 ? 'member' : 'members'} to &ldquo;member&rdquo; and delete this role?
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="px-4 py-2 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                                >
                                    {deleting ? 'Deleting…' : 'Yes, Delete'}
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-surface-200 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
