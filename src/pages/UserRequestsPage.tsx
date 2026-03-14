import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, RefreshCw, Search, Check, ChevronDown } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authApi = () => (window as any).electronAPI.auth as {
    getAll: () => Promise<AuthUserRow[]>;
    updateRole: (userId: string, role: string) => Promise<boolean>;
};

interface AuthUserRow {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'member';
}

const ROLES: AuthUserRow['role'][] = ['admin', 'manager', 'member'];

const roleStyle: Record<AuthUserRow['role'], string> = {
    admin:   'bg-primary-50 text-primary-600 border-primary-200',
    manager: 'bg-[#FFFBEB] text-[#D97706] border-[#FCD34D]',
    member:  'bg-surface-100 text-gray-500 border-surface-200',
};

const RoleDropdown: React.FC<{
    userId: string;
    current: AuthUserRow['role'];
    isSelf: boolean;
    onChange: (userId: string, role: AuthUserRow['role']) => void;
}> = ({ userId, current, isSelf, onChange }) => {
    const [open, setOpen] = useState(false);

    if (isSelf) {
        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${roleStyle[current]}`}>
                {current} <span className="text-[9px] opacity-50">(you)</span>
            </span>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border capitalize cursor-pointer hover:opacity-80 transition-opacity ${roleStyle[current]}`}
            >
                {current}
                <ChevronDown size={11} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 mt-1 bg-white rounded-xl shadow-lg border border-surface-200 z-20 py-1 min-w-[120px]"
                    >
                        {ROLES.map(role => (
                            <button
                                key={role}
                                onClick={() => { onChange(userId, role); setOpen(false); }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium capitalize hover:bg-surface-50 transition-colors ${role === current ? 'text-primary-600 font-semibold' : 'text-gray-700'}`}
                            >
                                {role}
                                {role === current && <Check size={11} className="text-primary-500" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const UserRequestsPage: React.FC = () => {
    const { user: authUser } = useAuth();
    const { showToast } = useToast();
    const isAdmin = authUser?.role === 'admin';

    const [users, setUsers] = useState<AuthUserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'member' | 'manager' | 'admin'>('all');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await authApi().getAll();
            setUsers(data);
        } catch (err) {
            console.error('[UserRequestsPage] Failed to load users:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleRoleChange = async (userId: string, newRole: AuthUserRow['role']) => {
        try {
            await authApi().updateRole(userId, newRole);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            showToast(`Role updated to ${newRole}.`, 'success');
        } catch {
            showToast('Failed to update role.', 'error');
        }
    };

    const filtered = users.filter(u => {
        const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                            u.email.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || u.role === filter;
        return matchSearch && matchFilter;
    });

    const memberCount  = users.filter(u => u.role === 'member').length;
    const managerCount = users.filter(u => u.role === 'manager').length;
    const adminCount   = users.filter(u => u.role === 'admin').length;

    return (
        <div className="flex-1 overflow-y-auto bg-white px-6 py-6">
            <PageHeader
                title="User Management"
                description="Manage registered users and assign roles"
            />

            {/* Stats */}
            <div className="mt-5 grid grid-cols-4 gap-3">
                {[
                    { label: 'Total Users',  value: users.length,  color: 'text-gray-700',    bg: 'bg-surface-50' },
                    { label: 'Admins',       value: adminCount,    color: 'text-primary-600',  bg: 'bg-primary-50' },
                    { label: 'Managers',     value: managerCount,  color: 'text-[#D97706]',    bg: 'bg-[#FFFBEB]' },
                    { label: 'Members',      value: memberCount,   color: 'text-gray-500',     bg: 'bg-surface-100' },
                ].map(stat => (
                    <div key={stat.label} className={`${stat.bg} rounded-2xl px-4 py-3 border border-surface-200`}>
                        <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="mt-5 flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or email…"
                        className="w-full pl-9 pr-4 py-2 text-sm border border-surface-200 rounded-xl focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    {(['all', 'member', 'manager', 'admin'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                                filter === f
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-surface-100 text-gray-500 hover:bg-surface-200'
                            }`}
                        >
                            {f === 'all' ? 'All' : f}
                        </button>
                    ))}
                </div>
                <button
                    onClick={load}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-surface-100 transition-colors ml-auto"
                    title="Refresh"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Table */}
            <div className="mt-4 bg-white rounded-2xl border border-surface-200 overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[auto_1fr_1fr_1fr_120px] gap-4 px-5 py-3 border-b border-surface-100 bg-surface-50">
                    <div className="w-8" />
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Name</div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Email</div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Registered as</div>
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Role</div>
                </div>

                {loading ? (
                    <div className="py-12 text-center text-sm text-gray-400">Loading users…</div>
                ) : filtered.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-400">No users found.</div>
                ) : (
                    <div className="divide-y divide-surface-100">
                        {filtered.map((u, i) => (
                            <motion.div
                                key={u.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="grid grid-cols-[auto_1fr_1fr_1fr_120px] gap-4 px-5 py-3.5 items-center hover:bg-surface-50 transition-colors"
                            >
                                <Avatar name={u.name} color="#5030E5" size="sm" />
                                <div>
                                    <div className="text-sm font-semibold text-gray-900">{u.name}</div>
                                    {u.id === authUser?.id && (
                                        <div className="text-[10px] text-primary-400 font-medium">You</div>
                                    )}
                                </div>
                                <div className="text-sm text-gray-500 truncate">{u.email}</div>
                                <div>
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${roleStyle[u.role]}`}>
                                        {u.role}
                                    </span>
                                </div>
                                <div>
                                    {isAdmin ? (
                                        <RoleDropdown
                                            userId={u.id}
                                            current={u.role}
                                            isSelf={u.id === authUser?.id}
                                            onChange={handleRoleChange}
                                        />
                                    ) : (
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${roleStyle[u.role]}`}>
                                            {u.role}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserRequestsPage;
