import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Users2, Shield, UserCheck, KeyRound, UserPlus, MoreVertical } from 'lucide-react';
import { useRoles } from '../context/RolesContext';
import { useMembersContext } from '../context/MembersContext';
import { useRolePerms } from '../context/RolePermsContext';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { UserRoleDrawer } from '../components/users/UserRoleDrawer';
import { RoleListPanel } from '../components/users/RoleListPanel';
import { RoleDetailPanel } from '../components/users/RoleDetailPanel';
import { PermissionsPanel } from '../components/users/PermissionsPanel';

const roleStyles: Record<string, { bg: string; text: string }> = {
    admin:   { bg: 'bg-primary-50',       text: 'text-primary-600' },
    manager: { bg: 'bg-[#FFFBEB]',        text: 'text-[#D97706]'  },
    member:  { bg: 'bg-surface-200',      text: 'text-gray-500'   },
};

const statusColor = { active: '#68B266', inactive: '#D1D5DB' };
const statusLabel = { active: 'Active', inactive: 'Inactive' };

const TABS = ['Users', 'Roles', 'Permissions'] as const;
type Tab = typeof TABS[number];

// ─── Users Tab ──────────────────────────────────────────────────────────────

const UsersTab: React.FC = () => {
    const { members, getMemberColor } = useMembersContext();
    const { roles } = useRoles();
    const [drawerMember, setDrawerMember] = useState<User | null>(null);
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

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
                                        <td className="px-4 py-3">
                                            <span
                                                className={`text-xs font-semibold px-2 py-0.5 rounded-md ${role.bg} ${role.text}`}
                                                style={!roleStyles[member.role] ? { background: getRoleColor(member.role) + '20', color: getRoleColor(member.role) } : {}}
                                            >
                                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor[status] }} />
                                                <span className="text-xs font-medium" style={{ color: statusColor[status] }}>{statusLabel[status]}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => setMenuOpenId(menuOpenId === member.id ? null : member.id)}
                                                className="p-1 rounded-md hover:bg-surface-100 text-gray-300 hover:text-gray-500 transition-colors"
                                            >
                                                <MoreVertical size={14} />
                                            </button>
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
                    actions={
                        authUser?.role === 'admin' ? (
                            <motion.button
                                onClick={() => { setActiveTab('Roles'); handleAddRole(); }}
                                className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors"
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            >
                                <UserPlus size={16} /> Add Role
                            </motion.button>
                        ) : undefined
                    }
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
        </motion.div>
    );
};

export default UsersPage;
