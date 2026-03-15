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
        <div className="w-[280px] shrink-0 flex flex-col border-r border-surface-100 pr-4 mr-6">
            <div className="flex-1 overflow-y-auto space-y-1">
                {roles.map(role => {
                    const count = members.filter(m => m.role === role.name).length;
                    const isSelected = role.appId === selectedRoleId;
                    return (
                        <button
                            key={role.appId}
                            onClick={() => onSelect(role.appId)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors border ${
                                isSelected
                                    ? 'bg-primary-50 border-primary-200 text-primary-700'
                                    : 'border-transparent hover:bg-surface-50 text-gray-700'
                            }`}
                        >
                            <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ background: role.color }}
                            />
                            <span className="flex-1 text-sm font-medium truncate">
                                {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                            </span>
                            <span className="text-xs text-gray-400 shrink-0">{count}</span>
                        </button>
                    );
                })}
                {roles.length === 0 && (
                    <p className="text-xs text-gray-400 px-3 py-4">No roles defined.</p>
                )}
            </div>

            {showAddRole && (
                <button
                    onClick={onAddRole}
                    disabled={addRoleDisabled}
                    className="mt-4 flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-xl hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Plus size={14} />
                    Add Role
                </button>
            )}
        </div>
    );
};
