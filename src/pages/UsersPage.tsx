import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Users2 } from 'lucide-react';
import { useRoles } from '../context/RolesContext';
import { useMembersContext } from '../context/MembersContext';
import { useRolePerms } from '../context/RolePermsContext';
import { useToast } from '../components/ui/Toast';
import { User } from '../types';
import { UserRoleDrawer } from '../components/users/UserRoleDrawer';
import { RoleListPanel } from '../components/users/RoleListPanel';
import { RoleDetailPanel } from '../components/users/RoleDetailPanel';

const initials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const TABS = ['Users', 'Roles', 'Permissions'] as const;
type Tab = typeof TABS[number];

const UsersTab: React.FC = () => {
    const { members } = useMembersContext();
    const { roles } = useRoles();
    const [drawerMember, setDrawerMember] = useState<User | null>(null);

    const getRoleColor = (roleName: string) =>
        roles.find(r => r.name === roleName)?.color ?? '#9ca3af';

    return (
        <>
            <div className="overflow-x-auto rounded-2xl border border-surface-200">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-surface-100 bg-surface-50">
                            <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Member</th>
                            <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Email</th>
                            <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Role</th>
                            <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-5 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {members.map(member => (
                            <tr
                                key={member.id}
                                className="border-b border-surface-100 last:border-0 hover:bg-surface-50 transition-colors cursor-pointer"
                                onClick={() => setDrawerMember(member)}
                            >
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xs shrink-0">
                                            {initials(member.name)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">{member.name}</p>
                                            {member.designation && <p className="text-xs text-gray-400">{member.designation}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-sm text-gray-500">{member.email ?? '—'}</td>
                                <td className="px-5 py-3">
                                    <span
                                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                                        style={{ background: getRoleColor(member.role) }}
                                    >
                                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                    </span>
                                </td>
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${member.status === 'active' ? 'bg-green-400' : 'bg-gray-300'}`} />
                                        <span className="text-xs text-gray-500">{member.status === 'active' ? 'Active' : 'Inactive'}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <ChevronRight size={16} className="text-gray-300 ml-auto" />
                                </td>
                            </tr>
                        ))}
                        {members.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">No members found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <UserRoleDrawer
                member={drawerMember}
                roles={roles}
                onClose={() => setDrawerMember(null)}
            />
        </>
    );
};

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
        <div className="flex h-full">
            <RoleListPanel
                roles={roles}
                members={members}
                selectedRoleId={selectedRoleId}
                onSelect={onSelect}
                showAddRole
                addRoleDisabled={addingRole}
                onAddRole={onAddRole}
            />
            <RoleDetailPanel selectedRoleId={selectedRoleId} onDeleteComplete={onDeleteComplete} />
        </div>
    );
};

const UsersPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('Users');
    const { roles, addRole } = useRoles();
    const { members } = useMembersContext();
    const { addRolePerms } = useRolePerms();
    const { showToast } = useToast();
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
            <div className="pt-8 pb-5 shrink-0 flex items-center gap-3">
                <Users2 size={22} className="text-primary-500" />
                <h1 className="text-xl font-bold text-gray-800">Users & Roles</h1>
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

            <div className="flex-1 overflow-y-auto">
                {activeTab === 'Users' && <UsersTab />}
                {activeTab === 'Roles' && (
                    <RolesTab
                        selectedRoleId={selectedRoleId}
                        onSelect={setSelectedRoleId}
                        onDeleteComplete={() => setSelectedRoleId(null)}
                        onAddRole={handleAddRole}
                        addingRole={addingRole}
                    />
                )}
                {activeTab === 'Permissions' && <div className="text-gray-400 text-sm">Permissions tab — coming soon</div>}
            </div>
        </motion.div>
    );
};

export default UsersPage;
