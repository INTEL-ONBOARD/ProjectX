import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, Users, Check, ChevronDown, Search, RefreshCw,
    LayoutGrid, BarChart3, MessageSquare, CheckSquare,
    Clock3, Building2, Settings, FileText,
} from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { useRolePerms } from '../context/RolePermsContext';

// ── IPC ─────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authApi = () => (window as any).electronAPI.auth as {
    getAll: () => Promise<AuthUserRow[]>;
    updateRole: (userId: string, role: string) => Promise<boolean>;
};

// ── Types ────────────────────────────────────────────────────────────────────
interface AuthUserRow {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'member';
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ROLE_OPTIONS: AuthUserRow['role'][] = ['admin', 'manager', 'member'];

const ROLE_STYLE: Record<AuthUserRow['role'], { pill: string; dot: string; label: string }> = {
    admin:   { pill: 'bg-primary-50 text-primary-600 border-primary-200',  dot: 'bg-primary-500',  label: 'Admin' },
    manager: { pill: 'bg-[#FFFBEB] text-[#D97706] border-[#FCD34D]',       dot: 'bg-[#D97706]',    label: 'Manager' },
    member:  { pill: 'bg-surface-100 text-gray-500 border-surface-200',    dot: 'bg-gray-300',     label: 'Member' },
};

const ALL_ROUTES = [
    { id: '/',             label: 'Task Board',   icon: LayoutGrid,    description: 'Kanban task board' },
    { id: '/dashboard',    label: 'Dashboard',    icon: BarChart3,     description: 'Analytics & overview' },
    { id: '/messages',     label: 'Messages',     icon: MessageSquare, description: 'Team messaging' },
    { id: '/tasks',        label: 'Tasks',        icon: CheckSquare,   description: 'Task list view' },
    { id: '/teams',        label: 'Projects',     icon: Users,         description: 'Project management' },
    { id: '/members',      label: 'Members',      icon: Users,         description: 'Team directory' },
    { id: '/attendance',   label: 'Attendance',   icon: Clock3,        description: 'Attendance tracking' },
    { id: '/reports',      label: 'Reports',      icon: FileText,      description: 'Reports & exports' },
    { id: '/organization', label: 'Organization', icon: Building2,     description: 'Org settings' },
    { id: '/settings',     label: 'Settings',     icon: Settings,      description: 'Personal settings' },
];

const PERM_ROLES: { key: 'manager' | 'member'; label: string; color: string; badgeCls: string }[] = [
    { key: 'manager', label: 'Manager',       color: '#D97706', badgeCls: 'bg-[#FFFBEB] text-[#D97706] border-[#FCD34D]' },
    { key: 'member',  label: 'Member / Guest', color: '#9CA3AF', badgeCls: 'bg-surface-100 text-gray-500 border-surface-200' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

const RoleDropdown: React.FC<{
    userId: string;
    current: AuthUserRow['role'];
    isSelf: boolean;
    onChange: (userId: string, role: AuthUserRow['role']) => void;
}> = ({ userId, current, isSelf, onChange }) => {
    const [open, setOpen] = useState(false);
    const s = ROLE_STYLE[current];

    if (isSelf) {
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.pill}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label}
                <span className="text-[9px] opacity-40 ml-0.5">you</span>
            </span>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all hover:shadow-sm ${s.pill}`}
            >
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label}
                <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.96 }}
                            transition={{ duration: 0.1 }}
                            className="absolute right-0 mt-1.5 z-20 bg-white rounded-xl shadow-xl border border-surface-200 py-1.5 min-w-[130px] overflow-hidden"
                        >
                            {ROLE_OPTIONS.map(role => {
                                const rs = ROLE_STYLE[role];
                                return (
                                    <button
                                        key={role}
                                        onClick={() => { onChange(userId, role); setOpen(false); }}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-surface-50 ${role === current ? 'font-bold' : 'font-medium text-gray-700'}`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${rs.dot}`} />
                                        <span className={role === current ? `text-${rs.dot}` : ''}>{rs.label}</span>
                                        {role === current && <Check size={10} className="ml-auto text-primary-500" />}
                                    </button>
                                );
                            })}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const TAB_ITEMS = [
    { id: 'users',       label: 'Users',            icon: Users },
    { id: 'permissions', label: 'Role Permissions',  icon: Shield },
] as const;

type Tab = typeof TAB_ITEMS[number]['id'];

const AdminPage: React.FC = () => {
    const { user: authUser } = useAuth();
    const { showToast } = useToast();
    const { perms, setRolePerms } = useRolePerms();
    const isAdmin = authUser?.role === 'admin';

    const [tab, setTab] = useState<Tab>('users');

    // ── Users state ──
    const [users, setUsers] = useState<AuthUserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | AuthUserRow['role']>('all');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await authApi().getAll();
            setUsers(data);
        } catch (err) {
            console.error('[AdminPage] Failed to load users:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleRoleChange = async (userId: string, newRole: AuthUserRow['role']) => {
        try {
            await authApi().updateRole(userId, newRole);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            showToast(`Role updated to ${ROLE_STYLE[newRole].label}.`, 'success');
        } catch {
            showToast('Failed to update role.', 'error');
        }
    };

    const filtered = users.filter(u => {
        const q = search.toLowerCase();
        return (filter === 'all' || u.role === filter) &&
               (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    });

    const adminCount   = users.filter(u => u.role === 'admin').length;
    const managerCount = users.filter(u => u.role === 'manager').length;
    const memberCount  = users.filter(u => u.role === 'member').length;

    // ── Permissions state ──
    const [saving, setSaving] = useState<string | null>(null);

    const togglePerm = async (role: 'manager' | 'member', routeId: string) => {
        if (!isAdmin || routeId === '/settings') return;
        const current = perms.find(p => p.role === role)?.allowedRoutes ?? ['/settings'];
        const next = current.includes(routeId) ? current.filter(r => r !== routeId) : [...current, routeId];
        setSaving(role);
        try { await setRolePerms(role, next); }
        finally { setSaving(null); }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 overflow-y-auto bg-white">
            {/* ── Top header ── */}
            <div className="px-6 pt-6 pb-0">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">Admin Panel</h1>
                        <p className="text-sm text-gray-400 mt-0.5">Manage users and configure role access</p>
                    </div>
                    {tab === 'users' && (
                        <button
                            onClick={load}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-200 text-xs font-semibold text-gray-500 hover:bg-surface-50 transition-colors"
                        >
                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    )}
                </div>

                {/* Tab bar */}
                <div className="flex gap-1 border-b border-surface-100">
                    {TAB_ITEMS.map(t => {
                        const Icon = t.icon;
                        const active = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                                    active ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                                {t.label}
                                {active && (
                                    <motion.div
                                        layoutId="admin-tab-indicator"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Tab content ── */}
            <AnimatePresence mode="wait">
                {tab === 'users' && (
                    <motion.div
                        key="users"
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
                        className="px-6 py-5"
                    >
                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-3 mb-5">
                            {[
                                { label: 'Total',    value: users.length,  cls: 'text-gray-800',   bg: 'bg-surface-50 border-surface-200' },
                                { label: 'Admins',   value: adminCount,    cls: 'text-primary-600', bg: 'bg-primary-50 border-primary-100' },
                                { label: 'Managers', value: managerCount,  cls: 'text-[#D97706]',   bg: 'bg-[#FFFBEB] border-[#FCD34D]/40' },
                                { label: 'Members',  value: memberCount,   cls: 'text-gray-500',    bg: 'bg-surface-100 border-surface-200' },
                            ].map(s => (
                                <div key={s.label} className={`rounded-2xl px-4 py-3 border ${s.bg}`}>
                                    <div className={`text-2xl font-bold ${s.cls}`}>{s.value}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Search + filter */}
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Search name or email…"
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-xl focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all bg-white"
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                {(['all', 'admin', 'manager', 'member'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                                            filter === f ? 'bg-primary-500 text-white shadow-sm' : 'bg-surface-100 text-gray-500 hover:bg-surface-200'
                                        }`}
                                    >
                                        {f === 'all' ? 'All' : ROLE_STYLE[f].label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Table */}
                        <div className="rounded-2xl border border-surface-200 overflow-hidden">
                            <div className="grid grid-cols-[36px_1fr_1fr_140px_140px] gap-3 px-4 py-2.5 bg-surface-50 border-b border-surface-100">
                                {['', 'Name', 'Email', 'Current Role', 'Change Role'].map((h, i) => (
                                    <div key={i} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</div>
                                ))}
                            </div>

                            {loading ? (
                                <div className="py-14 text-center text-sm text-gray-400">Loading users…</div>
                            ) : filtered.length === 0 ? (
                                <div className="py-14 text-center text-sm text-gray-400">No users found.</div>
                            ) : (
                                <div className="divide-y divide-surface-100">
                                    {filtered.map((u, i) => (
                                        <motion.div
                                            key={u.id}
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            transition={{ delay: i * 0.025 }}
                                            className="grid grid-cols-[36px_1fr_1fr_140px_140px] gap-3 px-4 py-3 items-center hover:bg-surface-50/60 transition-colors"
                                        >
                                            <Avatar name={u.name} color="#5030E5" size="sm" />
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-gray-900 truncate">{u.name}</div>
                                                {u.id === authUser?.id && (
                                                    <div className="text-[10px] text-primary-400 font-medium">You</div>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-400 truncate">{u.email}</div>
                                            <div>
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${ROLE_STYLE[u.role].pill}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${ROLE_STYLE[u.role].dot}`} />
                                                    {ROLE_STYLE[u.role].label}
                                                </span>
                                            </div>
                                            <div>
                                                <RoleDropdown
                                                    userId={u.id}
                                                    current={u.role}
                                                    isSelf={u.id === authUser?.id}
                                                    onChange={handleRoleChange}
                                                />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {tab === 'permissions' && (
                    <motion.div
                        key="permissions"
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
                        className="px-6 py-5 flex flex-col gap-5"
                    >
                        {PERM_ROLES.map((role, ri) => {
                            const allowed = perms.find(p => p.role === role.key)?.allowedRoutes ?? ['/settings'];
                            const pct = Math.round((allowed.length / ALL_ROUTES.length) * 100);
                            return (
                                <motion.div
                                    key={role.key}
                                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: ri * 0.06 }}
                                    className="rounded-2xl border border-surface-200 overflow-hidden"
                                >
                                    {/* Card header */}
                                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100 bg-surface-50/50">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${role.badgeCls}`}>
                                                {role.label}
                                            </span>
                                            {saving === role.key && (
                                                <span className="text-[11px] text-gray-400 animate-pulse">Saving…</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-20 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full rounded-full"
                                                        style={{ backgroundColor: role.color }}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ duration: 0.5 }}
                                                    />
                                                </div>
                                                <span className="text-[11px] text-gray-400 font-medium">
                                                    {allowed.length}/{ALL_ROUTES.length}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Route grid */}
                                    <div className="p-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                                        {ALL_ROUTES.map(route => {
                                            const RouteIcon = route.icon;
                                            const isChecked = allowed.includes(route.id);
                                            const isLocked  = route.id === '/settings';
                                            return (
                                                <button
                                                    key={route.id}
                                                    type="button"
                                                    disabled={!isAdmin || isLocked}
                                                    onClick={() => togglePerm(role.key, route.id)}
                                                    className={`group relative flex flex-col items-center gap-2 px-3 py-3.5 rounded-xl border text-center transition-all ${
                                                        isChecked
                                                            ? 'border-primary-300 bg-primary-50 shadow-sm'
                                                            : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50'
                                                    } ${(!isAdmin || isLocked) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                >
                                                    {/* Check badge */}
                                                    <div className={`absolute top-2 right-2 w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${
                                                        isChecked ? 'bg-primary-500 opacity-100' : 'bg-surface-200 opacity-0 group-hover:opacity-60'
                                                    }`}>
                                                        <Check size={8} className="text-white" strokeWidth={3} />
                                                    </div>

                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                                        isChecked ? 'bg-primary-100' : 'bg-surface-100'
                                                    }`}>
                                                        <RouteIcon size={15} className={isChecked ? 'text-primary-500' : 'text-gray-400'} strokeWidth={1.8} />
                                                    </div>
                                                    <div>
                                                        <div className={`text-[11px] font-semibold leading-tight ${isChecked ? 'text-primary-700' : 'text-gray-600'}`}>
                                                            {route.label}
                                                        </div>
                                                        {isLocked && (
                                                            <div className="text-[9px] text-gray-300 mt-0.5">always on</div>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            );
                        })}

                        {/* Admin note */}
                        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-primary-50 border border-primary-100">
                            <Shield size={13} className="text-primary-400 shrink-0" />
                            <p className="text-xs text-primary-600">
                                <span className="font-bold">Admin</span> always has full access to every page and cannot be restricted.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminPage;
