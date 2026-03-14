import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, FolderKanban, BarChart2, Settings2, Users, ChevronRight, Building2 } from 'lucide-react';
import { RoleDoc } from '../../context/RolesContext';
import { useRolePerms } from '../../context/RolePermsContext';
import { useToast } from '../ui/Toast';

const ALL_PERM_ROUTES = [
    { id: '/',             label: 'Task Board',   icon: FolderKanban },
    { id: '/dashboard',    label: 'Dashboard',    icon: BarChart2    },
    { id: '/messages',     label: 'Messages',     icon: Settings2    },
    { id: '/tasks',        label: 'Tasks',        icon: FolderKanban },
    { id: '/teams',        label: 'Projects',     icon: FolderKanban },
    { id: '/members',      label: 'Members',      icon: Users        },
    { id: '/attendance',   label: 'Attendance',   icon: ChevronRight },
    { id: '/reports',      label: 'Reports',      icon: BarChart2    },
    { id: '/organization', label: 'Organization', icon: Building2    },
    { id: '/settings',     label: 'Settings',     icon: Settings2    },
];

// Toggle component
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
    roles: RoleDoc[];
}

export const PermissionsMatrix: React.FC<Props> = ({ roles }) => {
    const { perms, setRolePerms } = useRolePerms();
    const { showToast } = useToast();
    // localRoutes: optimistic overrides keyed by role name
    const [localRoutes, setLocalRoutes] = useState<Record<string, string[] | null>>({});
    const [saving, setSaving] = useState<Record<string, boolean>>({});

    const getRoutes = (roleName: string): string[] =>
        localRoutes[roleName] ?? perms.find(p => p.role === roleName)?.allowedRoutes ?? ['/settings'];

    const applyOptimistic = async (roleName: string, next: string[]) => {
        const prev = getRoutes(roleName);
        setLocalRoutes(r => ({ ...r, [roleName]: next }));
        setSaving(s => ({ ...s, [roleName]: true }));
        try {
            await setRolePerms(roleName, next);
            setLocalRoutes(r => ({ ...r, [roleName]: null }));
        } catch {
            setLocalRoutes(r => ({ ...r, [roleName]: prev }));
            showToast('Failed to save permissions.', 'error');
        } finally {
            setSaving(s => ({ ...s, [roleName]: false }));
        }
    };

    const toggle = (roleName: string, routeId: string) => {
        if (routeId === '/settings') return;
        const current = getRoutes(roleName);
        let next = current.includes(routeId) ? current.filter(r => r !== routeId) : [...current, routeId];
        if (!next.includes('/settings')) next.push('/settings');
        applyOptimistic(roleName, next);
    };

    const grantAll = (roleName: string) => {
        applyOptimistic(roleName, ALL_PERM_ROUTES.map(r => r.id));
    };

    const revokeAll = (roleName: string) => {
        applyOptimistic(roleName, ['/settings']);
    };

    return (
        <div className="overflow-x-auto rounded-2xl border border-surface-200">
            <table className="w-full min-w-max">
                <thead>
                    <tr className="border-b border-surface-100 bg-surface-50">
                        <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider w-40">Page</th>
                        {roles.map(role => {
                            const isAdminRole = role.name === 'admin';
                            const allowed = getRoutes(role.name);
                            return (
                                <th key={role.appId} className="px-4 py-3 text-center min-w-[130px]">
                                    <div className="flex flex-col items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white" style={{ background: role.color }}>
                                            {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                                        </span>
                                        {/* Progress bar */}
                                        <div className="flex items-center gap-1 w-full max-w-[80px]">
                                            <div className="flex-1 h-1 bg-surface-200 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full"
                                                    style={{ background: role.color }}
                                                    animate={{ width: `${Math.round((allowed.length / ALL_PERM_ROUTES.length) * 100)}%` }}
                                                    transition={{ duration: 0.4 }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-gray-400 shrink-0">{allowed.length}/{ALL_PERM_ROUTES.length}</span>
                                        </div>
                                        {saving[role.name] && <span className="text-[10px] text-gray-400 animate-pulse">Saving…</span>}
                                        {!isAdminRole && (
                                            <div className="flex gap-1">
                                                <button onClick={() => grantAll(role.name)} className="text-[10px] font-semibold text-primary-500 hover:text-primary-700 px-1.5 py-0.5 rounded bg-primary-50 hover:bg-primary-100 transition-colors">Grant All</button>
                                                <button onClick={() => revokeAll(role.name)} className="text-[10px] font-semibold text-gray-500 hover:text-gray-700 px-1.5 py-0.5 rounded bg-surface-100 hover:bg-surface-200 transition-colors">Revoke All</button>
                                            </div>
                                        )}
                                    </div>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {ALL_PERM_ROUTES.map(route => (
                        <tr key={route.id} className="border-b border-surface-100 last:border-0 hover:bg-surface-50 transition-colors">
                            <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-700 font-medium">{route.label}</span>
                                    <span className="text-xs text-gray-400">{route.id}</span>
                                    {route.id === '/settings' && <span className="text-[10px] text-gray-300">always on</span>}
                                </div>
                            </td>
                            {roles.map(role => {
                                const isAdminRole = role.name === 'admin';
                                const isLocked = isAdminRole || route.id === '/settings';
                                const isOn = isLocked || getRoutes(role.name).includes(route.id);
                                return (
                                    <td key={role.appId} className="px-4 py-3 text-center">
                                        {isLocked ? (
                                            <div className="flex justify-center"><Lock size={13} className="text-gray-300" /></div>
                                        ) : (
                                            <div className="flex justify-center">
                                                <Toggle checked={isOn} onChange={() => toggle(role.name, route.id)} />
                                            </div>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
