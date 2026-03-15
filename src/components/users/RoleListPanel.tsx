import React from 'react';
import { Plus } from 'lucide-react';
import { RoleDoc } from '../../context/RolesContext';
import { User } from '../../types';

interface Props {
    roles: RoleDoc[];
    members: User[];
    selectedRoleId: string | null;
    onSelect: (appId: string) => void;
    showAddRole?: boolean;
    addRoleDisabled?: boolean;
    onAddRole?: () => void;
}

export const RoleListPanel: React.FC<Props> = ({
    roles, members, selectedRoleId, onSelect,
    showAddRole = false, addRoleDisabled = false, onAddRole,
}) => {
    return (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {roles.map(role => {
                    const count = members.filter(m => m.role === role.name).length;
                    const isSelected = role.appId === selectedRoleId;
                    return (
                        <button
                            key={role.appId}
                            onClick={() => onSelect(role.appId)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                                isSelected
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'hover:bg-surface-50 text-gray-700'
                            }`}
                        >
                            <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ background: role.color }}
                            />
                            <span className="flex-1 text-xs font-semibold truncate">
                                {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                            </span>
                            <span className="text-[10px] text-gray-400 shrink-0 font-medium">{count}</span>
                        </button>
                    );
                })}
                {roles.length === 0 && (
                    <p className="text-xs text-gray-400 px-3 py-4">No roles defined.</p>
                )}
            </div>

            {showAddRole && (
                <div className="p-2 border-t border-surface-100 shrink-0">
                    <button
                        onClick={onAddRole}
                        disabled={addRoleDisabled}
                        className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold text-primary-600 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg"
                    >
                        <Plus size={13} />
                        Add Role
                    </button>
                </div>
            )}
        </div>
    );
};
