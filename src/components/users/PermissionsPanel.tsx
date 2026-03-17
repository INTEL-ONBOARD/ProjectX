import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { useRoles } from '../../context/RolesContext';
import { useRolePerms } from '../../context/RolePermsContext';
import { useToast } from '../ui/Toast';

const ALL_ROUTES = [
    { id: '/',           label: 'Task Board'  },
    { id: '/dashboard',  label: 'Dashboard'   },
    { id: '/messages',   label: 'Messages'    },
    { id: '/tasks',      label: 'Tasks'       },
    { id: '/sprints',    label: 'Sprints'     },
    { id: '/teams',      label: 'Projects'    },
    { id: '/members',    label: 'Members'     },
    { id: '/attendance', label: 'Attendance'  },
    { id: '/reports',    label: 'Reports'     },
    { id: '/users',      label: 'Users'       },
    { id: '/settings',   label: 'Settings'    },
];

const Toggle: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <button
        type="button"
        onClick={disabled ? undefined : onChange}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-primary-500' : 'bg-surface-200'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
);

interface Props {
    selectedRoleId: string | null;
}

export const PermissionsPanel: React.FC<Props> = ({ selectedRoleId }) => {
    const { roles } = useRoles();
    const { getAllowedRoutes, setRolePerms } = useRolePerms();
    const { showToast } = useToast();

    const role = roles.find(r => r.appId === selectedRoleId) ?? null;
    const isAdmin = role?.name === 'admin';

    const [localRoutes, setLocalRoutes] = useState<string[]>([]);

    useEffect(() => {
        setLocalRoutes(role ? getAllowedRoutes(role.name) : []);
    }, [role?.appId, getAllowedRoutes]);

    if (!role) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-3 min-h-[200px]">
                <Lock size={32} />
                <p className="text-sm font-medium text-gray-400">Select a role to manage permissions</p>
            </div>
        );
    }

    const applyChange = async (newRoutes: string[]) => {
        const prev = localRoutes;
        setLocalRoutes(newRoutes);
        try {
            await setRolePerms(role.name, newRoutes);
        } catch {
            setLocalRoutes(prev);
            showToast('Failed to save permissions.', 'error');
        }
    };

    const toggleRoute = (routeId: string) => {
        if (routeId === '/settings' || isAdmin) return;
        let next = localRoutes.includes(routeId)
            ? localRoutes.filter(r => r !== routeId)
            : [...localRoutes, routeId];
        if (!next.includes('/settings')) next.push('/settings');
        applyChange(next);
    };

    const grantAll = () => applyChange(ALL_ROUTES.map(r => r.id));
    const revokeAll = () => applyChange(['/settings']);

    return (
        <div className="flex-1 overflow-y-auto max-w-lg">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ background: role.color }}
                    >
                        {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                    </span>
                    {isAdmin && <span className="text-xs text-gray-400">Admin always has full access</span>}
                </div>
                {!isAdmin && (
                    <div className="flex gap-2">
                        <button onClick={grantAll} className="text-xs font-semibold text-primary-500 hover:text-primary-700 px-2 py-1 rounded bg-primary-50 hover:bg-primary-100 transition-colors">Grant All</button>
                        <button onClick={revokeAll} className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1 rounded bg-surface-100 hover:bg-surface-200 transition-colors">Revoke All</button>
                    </div>
                )}
            </div>

            <div className="rounded-2xl border border-surface-200 overflow-hidden">
                {ALL_ROUTES.map((route, i) => {
                    const isLocked = isAdmin || route.id === '/settings';
                    const isOn = isLocked || localRoutes.includes(route.id);
                    return (
                        <div
                            key={route.id}
                            className={`flex items-center justify-between px-5 py-3.5 ${i < ALL_ROUTES.length - 1 ? 'border-b border-surface-100' : ''} ${!isLocked ? 'hover:bg-surface-50 transition-colors' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-700">{route.label}</span>
                                <span className="text-xs text-gray-400">{route.id}</span>
                                {route.id === '/settings' && <span className="text-[10px] text-gray-300">always on</span>}
                            </div>
                            {isLocked ? (
                                <Lock size={13} className="text-gray-300" />
                            ) : (
                                <Toggle checked={isOn} onChange={() => toggleRoute(route.id)} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
