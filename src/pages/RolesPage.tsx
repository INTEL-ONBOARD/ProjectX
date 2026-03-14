import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Check, Info } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { useRolePerms } from '../context/RolePermsContext';
import { useAuth } from '../context/AuthContext';

const ALL_ROUTES = [
    { id: '/',             label: 'Task Board',    description: 'Kanban board for tasks' },
    { id: '/dashboard',    label: 'Dashboard',     description: 'Analytics and overview' },
    { id: '/messages',     label: 'Messages',      description: 'Team messaging' },
    { id: '/tasks',        label: 'Tasks',         description: 'Task list view' },
    { id: '/teams',        label: 'Projects',      description: 'Project management' },
    { id: '/members',      label: 'Members',       description: 'Team directory' },
    { id: '/attendance',   label: 'Attendance',    description: 'Attendance tracking' },
    { id: '/reports',      label: 'Reports',       description: 'Reports and exports' },
    { id: '/organization', label: 'Organization',  description: 'Org settings' },
    { id: '/settings',     label: 'Settings',      description: 'Personal settings' },
];

const ROLES: { key: 'manager' | 'member'; label: string; color: string; bg: string }[] = [
    { key: 'manager', label: 'Manager', color: 'text-[#D97706]', bg: 'bg-[#FFFBEB] border-[#FCD34D]' },
    { key: 'member',  label: 'Member / Guest', color: 'text-gray-500', bg: 'bg-surface-100 border-surface-200' },
];

const RolesPage: React.FC = () => {
    const { perms, setRolePerms } = useRolePerms();
    const { user: authUser } = useAuth();
    const isAdmin = authUser?.role === 'admin';
    const [saving, setSaving] = useState<string | null>(null);

    const toggle = async (role: 'manager' | 'member', routeId: string) => {
        if (!isAdmin || routeId === '/settings') return;
        const current = perms.find(p => p.role === role)?.allowedRoutes ?? ['/settings'];
        const next = current.includes(routeId)
            ? current.filter(r => r !== routeId)
            : [...current, routeId];
        setSaving(role);
        try {
            await setRolePerms(role, next);
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-white px-6 py-6">
            <PageHeader
                title="Roles & Permissions"
                description="Configure which pages each role can access"
            />

            {!isAdmin && (
                <div className="mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#FFF8E6] border border-[#FCD34D] text-sm text-[#D97706]">
                    <Info size={15} />
                    Only admins can edit role permissions.
                </div>
            )}

            <div className="mt-6 flex flex-col gap-6">
                {ROLES.map(role => {
                    const allowed = perms.find(p => p.role === role.key)?.allowedRoutes ?? ['/settings'];
                    return (
                        <motion.div
                            key={role.key}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl border border-surface-200 overflow-hidden"
                        >
                            {/* Role header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
                                <div className="flex items-center gap-3">
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${role.bg} ${role.color}`}>
                                        {role.label}
                                    </div>
                                    {saving === role.key && (
                                        <span className="text-[11px] text-gray-400 animate-pulse">Saving…</span>
                                    )}
                                </div>
                                <span className="text-xs text-gray-400">
                                    {allowed.length} of {ALL_ROUTES.length} pages accessible
                                </span>
                            </div>

                            {/* Route grid */}
                            <div className="p-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                                {ALL_ROUTES.map(route => {
                                    const isChecked = allowed.includes(route.id);
                                    const isLocked = route.id === '/settings';
                                    return (
                                        <button
                                            key={route.id}
                                            type="button"
                                            disabled={!isAdmin || isLocked}
                                            onClick={() => toggle(role.key, route.id)}
                                            className={`flex items-start gap-3 px-3.5 py-3 rounded-xl border text-left transition-all ${
                                                isChecked
                                                    ? 'border-primary-300 bg-primary-50'
                                                    : 'border-surface-200 hover:border-surface-300'
                                            } ${(!isAdmin || isLocked) ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                                        >
                                            <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all ${
                                                isChecked ? 'bg-primary-500 border-primary-500' : 'border-surface-300 bg-white'
                                            }`}>
                                                {isChecked && <Check size={9} className="text-white" strokeWidth={3} />}
                                            </div>
                                            <div>
                                                <div className={`text-xs font-semibold ${isChecked ? 'text-primary-700' : 'text-gray-600'}`}>
                                                    {route.label}
                                                    {isLocked && <span className="ml-1.5 text-[9px] text-gray-300 font-normal">always on</span>}
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-0.5">{route.description}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    );
                })}

                {/* Admin note */}
                <div className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 flex items-start gap-2.5">
                    <Shield size={14} className="text-primary-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-primary-700">
                        <span className="font-semibold">Admin</span> always has access to all pages and cannot be restricted.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RolesPage;
