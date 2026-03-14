import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2, Users, User, MapPin, BarChart2, FolderKanban, Settings2, X, Plus,
  ChevronDown, Shield, Check, Search, RefreshCw, ChevronRight,
} from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { useMembersContext } from '../context/MembersContext';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { useRolePerms } from '../context/RolePermsContext';
import { useToast } from '../components/ui/Toast';
import { PROJECT_COLORS } from '../data/mockData';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbApi   = () => (window as any).electronAPI.db;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authApi = () => (window as any).electronAPI.auth as {
  getAll: () => Promise<AuthUserRow[]>;
  updateRole: (id: string, role: string) => Promise<boolean>;
};

// ── Types ─────────────────────────────────────────────────────────────────────
const roleStyles: Record<string, { bg: string; text: string; dot: string }> = {
  admin:   { bg: 'bg-primary-50',   text: 'text-primary-600', dot: 'bg-primary-500' },
  manager: { bg: 'bg-[#FFFBEB]',    text: 'text-[#D97706]',   dot: 'bg-[#D97706]'   },
  member:  { bg: 'bg-surface-200',  text: 'text-gray-500',    dot: 'bg-gray-300'    },
};

interface DeptEntry { id?: string; name: string; icon: React.ElementType; color: string; memberIds: string[]; }
interface OrgUser   { id: string; name: string; role: string; designation?: string; location?: string; }
interface AuthUserRow { id: string; name: string; email: string; role: 'admin' | 'manager' | 'member'; }

// ── Dept Directory ────────────────────────────────────────────────────────────
const DepartmentDirectory: React.FC<{
  deptRoster: DeptEntry[];
  members: OrgUser[];
  getMemberColor: (id: string) => string;
  onAddMember: (idx: number) => void;
}> = ({ deptRoster, members, getMemberColor, onAddMember }) => {
  const [expanded, setExpanded] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(deptRoster.map((_, i) => [i, true]))
  );
  const toggle = (i: number) => setExpanded(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
        <h2 className="font-bold text-gray-900 text-sm">Department Directory</h2>
        <span className="text-xs text-gray-400">{deptRoster.length} departments</span>
      </div>
      <div className="overflow-y-auto flex-1 divide-y divide-surface-100">
        {deptRoster.map((dept, deptIndex) => {
          const Icon = dept.icon;
          const deptMembers = dept.memberIds.map(id => members.find(m => m.id === id)).filter((m): m is OrgUser => m !== undefined);
          const isOpen = expanded[deptIndex] ?? true;
          return (
            <div key={deptIndex}>
              <button onClick={() => toggle(deptIndex)} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-surface-50 transition-colors text-left">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: dept.color + '18' }}>
                  <Icon size={15} style={{ color: dept.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-sm">{dept.name}</div>
                  <div className="text-xs text-gray-400">{deptMembers.length} member{deptMembers.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="flex items-center mr-1">
                  {deptMembers.slice(0, 4).map((m, j) => (
                    <div key={m.id} className="w-6 h-6 rounded-full border-2 border-white -ml-1.5 first:ml-0 shrink-0 flex items-center justify-center text-[9px] font-bold text-white" style={{ background: getMemberColor(m.id), zIndex: 10 - j }}>
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {deptMembers.length > 4 && <div className="w-6 h-6 rounded-full border-2 border-white -ml-1.5 bg-surface-200 flex items-center justify-center text-[9px] font-bold text-gray-500">+{deptMembers.length - 4}</div>}
                </div>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={14} className="text-gray-400" /></motion.div>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
                    <div className="px-5 pb-4 pt-1">
                      {deptMembers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-5 rounded-xl border border-dashed border-surface-200 gap-1.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: dept.color + '12' }}><Icon size={14} style={{ color: dept.color }} /></div>
                          <p className="text-xs text-gray-400">No members assigned</p>
                          <button onClick={e => { e.stopPropagation(); onAddMember(deptIndex); }} className="text-xs font-semibold px-3 py-1 rounded-lg transition-colors" style={{ color: dept.color, background: dept.color + '12' }}>+ Add first member</button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {deptMembers.map(m => {
                            const rs = roleStyles[m.role] ?? roleStyles.member;
                            return (
                              <div key={m.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-50 hover:bg-surface-100 transition-colors">
                                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: getMemberColor(m.id) }}>{m.name.charAt(0).toUpperCase()}</div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-gray-800 truncate">{m.name}</div>
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md inline-block ${rs.bg} ${rs.text}`}>{m.role.charAt(0).toUpperCase()}{m.role.slice(1)}</span>
                                </div>
                              </div>
                            );
                          })}
                          <button onClick={e => { e.stopPropagation(); onAddMember(deptIndex); }} className="flex items-center justify-center gap-1 p-2.5 rounded-xl border border-dashed border-surface-200 hover:border-primary-300 hover:bg-primary-50 text-gray-400 hover:text-primary-500 transition-colors text-xs font-medium"><Plus size={12} /> Add</button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Role dropdown ─────────────────────────────────────────────────────────────
const ROLE_OPTIONS: AuthUserRow['role'][] = ['admin', 'manager', 'member'];

const RoleDropdown: React.FC<{ userId: string; current: AuthUserRow['role']; isSelf: boolean; onChange: (id: string, role: AuthUserRow['role']) => void }> = ({ userId, current, isSelf, onChange }) => {
  const [open, setOpen] = useState(false);
  const rs = roleStyles[current];
  if (isSelf) return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${rs.bg} ${rs.text} border-current/20`}>
      <span className={`w-1.5 h-1.5 rounded-full ${rs.dot}`} />{current}<span className="opacity-40 text-[9px]">you</span>
    </span>
  );
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border hover:opacity-80 transition-all ${rs.bg} ${rs.text} border-current/20`}>
        <span className={`w-1.5 h-1.5 rounded-full ${rs.dot}`} />
        {current}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: 4, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.96 }} transition={{ duration: 0.1 }}
              className="absolute right-0 mt-1.5 z-20 bg-white rounded-xl shadow-xl border border-surface-200 py-1.5 min-w-[120px]">
              {ROLE_OPTIONS.map(role => {
                const rrs = roleStyles[role];
                return (
                  <button key={role} onClick={() => { onChange(userId, role); setOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-surface-50 transition-colors ${role === current ? 'font-bold' : 'font-medium text-gray-700'}`}>
                    <span className={`w-2 h-2 rounded-full ${rrs.dot}`} />
                    {role.charAt(0).toUpperCase()}{role.slice(1)}
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

// ── Perm routes config ────────────────────────────────────────────────────────
const ALL_PERM_ROUTES = [
  { id: '/',             label: 'Task Board',   icon: FolderKanban,  description: 'Kanban board' },
  { id: '/dashboard',    label: 'Dashboard',    icon: BarChart2,     description: 'Analytics' },
  { id: '/messages',     label: 'Messages',     icon: Settings2,     description: 'Team chat' },
  { id: '/tasks',        label: 'Tasks',        icon: Check,         description: 'Task list' },
  { id: '/teams',        label: 'Projects',     icon: FolderKanban,  description: 'Projects' },
  { id: '/members',      label: 'Members',      icon: Users,         description: 'Directory' },
  { id: '/attendance',   label: 'Attendance',   icon: ChevronRight,  description: 'Attendance' },
  { id: '/reports',      label: 'Reports',      icon: BarChart2,     description: 'Reports' },
  { id: '/organization', label: 'Organization', icon: Building2,     description: 'Org page' },
  { id: '/settings',     label: 'Settings',     icon: Settings2,     description: 'Settings' },
];

const PERM_ROLES: { key: 'manager' | 'member'; label: string; icon: React.ElementType; badgeCls: string; barColor: string }[] = [
  { key: 'manager', label: 'Manager',        icon: Users, badgeCls: 'bg-[#FFFBEB] text-[#D97706] border-[#FCD34D]', barColor: '#D97706' },
  { key: 'member',  label: 'Member / Guest', icon: User,  badgeCls: 'bg-surface-100 text-gray-500 border-surface-200', barColor: '#9CA3AF' },
];

// ── Toggle switch ──────────────────────────────────────────────────────────────
const Toggle: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    onClick={disabled ? undefined : onChange}
    className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-primary-500' : 'bg-surface-200'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
    />
  </button>
);

// ── Main page ─────────────────────────────────────────────────────────────────
type SectionId = 'overview' | 'users' | 'permissions';
interface OrgNavItem { id: SectionId; label: string; icon: React.ElementType; adminOnly?: boolean; }
const NAV_ITEMS: OrgNavItem[] = [
  { id: 'overview',     label: 'Overview',          icon: Building2 },
  { id: 'users',        label: 'Users',             icon: Users,   adminOnly: true },
  { id: 'permissions',  label: 'Role Permissions',  icon: Shield,  adminOnly: true },
];

const OrganizationPage: React.FC = () => {
  const { members, getMemberColor, updateMember } = useMembersContext();
  const { allTasks } = useProjects();
  const { user: authUser } = useAuth();
  const { perms, setRolePerms } = useRolePerms();
  const { showToast } = useToast();
  const isAdmin = authUser?.role === 'admin';

  const [section, setSection] = useState<SectionId>('overview');

  // ── Overview state ──
  const locationCount = new Set(members.map(m => m.location).filter(Boolean)).size;
  const avgWorkload = members.length > 0 ? (allTasks.length / members.length).toFixed(1) : '0.0';
  const [deptRoster, setDeptRoster] = useState<DeptEntry[]>([]);
  const [showAddDept, setShowAddDept] = useState(false);
  const [addMemberToDept, setAddMemberToDept] = useState<number | null>(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptColor, setNewDeptColor] = useState(PROJECT_COLORS[0]);

  useEffect(() => {
    dbApi().getDepts()
      .then((docs: Array<{ id: string; name: string; color: string; memberIds: string[] }>) => {
        setDeptRoster(docs.map(d => ({ id: d.id, name: d.name, color: d.color, memberIds: d.memberIds, icon: FolderKanban })));
      })
      .catch((err: unknown) => console.error('[OrganizationPage] Failed to load departments:', err));
  }, []);

  const metrics = [
    { label: 'Total Members', value: String(members.length),  trend: 'In org',       color: '',       accent: true,  icon: Users,    barPct: 100 },
    { label: 'Departments',   value: String(deptRoster.length), trend: 'Roles',      color: '#5030E5', accent: false, icon: Building2, barPct: 100 },
    { label: 'Locations',     value: String(locationCount),   trend: 'Cities',       color: '#30C5E5', accent: false, icon: MapPin,   barPct: 100 },
    { label: 'Avg Workload',  value: avgWorkload,              trend: 'tasks/member', color: '#FFA500', accent: false, icon: BarChart2, barPct: Math.min(100, parseFloat(avgWorkload) * 10) },
  ];

  // ── Users tab state ──
  const [authUsers, setAuthUsers] = useState<AuthUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AuthUserRow['role']>('all');

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      setAuthUsers(await authApi().getAll());
      setUsersLoaded(true);
    }
    catch (err) { console.error('[OrganizationPage] Failed to load auth users:', err); showToast('Failed to load users.', 'error'); }
    finally { setUsersLoading(false); }
  }, [showToast]);

  // Always re-fetch when visiting the Users section (ensures fresh data)
  useEffect(() => {
    if (section === 'users' && isAdmin) loadUsers();
  }, [section, isAdmin, loadUsers]);

  // Load users once when visiting Permissions section (only needs counts)
  useEffect(() => {
    if (section === 'permissions' && isAdmin && !usersLoaded) loadUsers();
  }, [section, isAdmin, usersLoaded, loadUsers]);

  // Prevent non-admins from reaching admin-only sections via stale state
  useEffect(() => {
    if (!isAdmin && section !== 'overview') setSection('overview');
  }, [isAdmin, section]);

  const handleRoleChange = async (userId: string, newRole: AuthUserRow['role']) => {
    try {
      await authApi().updateRole(userId, newRole);
      setAuthUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      // Sync role into MembersContext so the rest of the app (Members page, task assignees) sees the updated role
      await updateMember(userId, { role: newRole });
      showToast(`Role updated to ${newRole}.`, 'success');
    } catch { showToast('Failed to update role.', 'error'); }
  };

  const filteredUsers = authUsers.filter(u => {
    const q = search.toLowerCase();
    return (roleFilter === 'all' || u.role === roleFilter) &&
           (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  });

  const adminCount   = authUsers.filter(u => u.role === 'admin').length;
  const managerCount = authUsers.filter(u => u.role === 'manager').length;
  const memberCount  = authUsers.filter(u => u.role === 'member').length;

  // ── Permissions tab state ──
  const [savingManager, setSavingManager] = useState(false);
  const [savingMember, setSavingMember]   = useState(false);
  const saving = (role: 'manager' | 'member') => role === 'manager' ? savingManager : savingMember;
  const setSaving = (role: 'manager' | 'member', val: boolean) =>
    role === 'manager' ? setSavingManager(val) : setSavingMember(val);

  // Optimistic local route lists — updated synchronously on each toggle so rapid
  // clicks accumulate correctly instead of racing against async context updates.
  const [localRoutes, setLocalRoutes] = useState<Record<'manager' | 'member', string[] | null>>({ manager: null, member: null });
  const getRoutes = (role: 'manager' | 'member') =>
    localRoutes[role] ?? perms.find(p => p.role === role)?.allowedRoutes ?? ['/settings'];

  const togglePerm = async (role: 'manager' | 'member', routeId: string) => {
    if (routeId === '/settings') return;
    const current = getRoutes(role);
    const next = current.includes(routeId) ? current.filter(r => r !== routeId) : [...current, routeId];
    // Enforce /settings invariant in data
    if (!next.includes('/settings')) next.push('/settings');
    // Update optimistic state synchronously so next rapid click sees this change
    setLocalRoutes(prev => ({ ...prev, [role]: next }));
    setSaving(role, true);
    try {
      await setRolePerms(role, next);
      // Context updated — clear optimistic override so we read from context
      setLocalRoutes(prev => ({ ...prev, [role]: null }));
    }
    finally { setSaving(role, false); }
  };

  const visibleNavItems = NAV_ITEMS.filter(n => !n.adminOnly || isAdmin);

  return (
    <div className="flex flex-row h-full overflow-hidden bg-white">

      {/* ── Left nav panel ── */}
      <div className="w-56 shrink-0 h-full border-r border-surface-200 overflow-y-auto flex flex-col">
        <div className="px-5 pt-6 pb-4 shrink-0">
          <div className="text-sm font-bold text-gray-900">Organization</div>
          <div className="text-xs text-gray-400 mt-0.5">Control Panel</div>
        </div>
        <nav className="px-3 space-y-1 flex-1">
          {visibleNavItems.map(item => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <div key={item.id} className="relative">
                {active && (
                  <motion.div
                    layoutId="org-nav-ind"
                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary-500 rounded-r-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <button
                  onClick={() => setSection(item.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700'
                  }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                  {item.label}
                </button>
              </div>
            );
          })}
        </nav>
      </div>

      {/* ── Right content panel ── */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <AnimatePresence mode="wait">
          {section === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Overview</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Team structure & metrics</p>
                </div>
                {isAdmin && (
                  <motion.button
                    onClick={() => setShowAddDept(true)}
                    className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors"
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  >
                    <Plus size={15} /> New Department
                  </motion.button>
                )}
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-4 gap-5 mt-6">
                {metrics.map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <motion.div
                      key={m.label}
                      className={`rounded-2xl p-5 ${m.accent ? 'bg-gradient-to-br from-primary-500 to-primary-400 text-white' : 'bg-white border border-surface-200'}`}
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.08 }}
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

              {/* Department Directory */}
              <div className="mt-6">
                <DepartmentDirectory
                  deptRoster={deptRoster}
                  members={members}
                  getMemberColor={getMemberColor}
                  onAddMember={setAddMemberToDept}
                />
              </div>
            </motion.div>
          )}

          {section === 'users' && isAdmin && (
            <motion.div key="users" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
    <div className="flex items-center justify-between mb-1">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Users</h2>
        <p className="text-sm text-gray-400 mt-0.5">Manage registered users and assign roles</p>
      </div>
      <button
        onClick={loadUsers}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-surface-100 transition-colors"
        title="Refresh"
      >
        <RefreshCw size={14} className={usersLoading ? 'animate-spin' : ''} />
      </button>
    </div>

    {/* Stat pills */}
    <div className="flex gap-3 mt-6">
      {[
        { label: 'Total',    value: authUsers.length, cls: 'bg-surface-100 text-gray-600 border-surface-200' },
        { label: 'Admins',   value: adminCount,       cls: 'bg-primary-50 text-primary-600 border-primary-200' },
        { label: 'Managers', value: managerCount,     cls: 'bg-[#FFFBEB] text-[#D97706] border-[#FCD34D]' },
        { label: 'Members',  value: memberCount,      cls: 'bg-surface-100 text-gray-500 border-surface-200' },
      ].map(s => (
        <span key={s.label} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${s.cls}`}>
          <span className="font-bold text-sm">{s.value}</span> {s.label}
        </span>
      ))}
    </div>

    {/* Toolbar */}
    <div className="flex items-center gap-2.5 mt-4">
      <div className="relative flex-1 max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-xl focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
        />
      </div>
      <div className="flex items-center gap-1">
        {(['all', 'admin', 'manager', 'member'] as const).map(f => (
          <button
            key={f} onClick={() => setRoleFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${roleFilter === f ? 'bg-primary-500 text-white' : 'bg-surface-100 text-gray-500 hover:bg-surface-200'}`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>
    </div>

    {/* Table */}
    <div className="mt-4 rounded-2xl border border-surface-200 overflow-hidden">
      <div className="grid grid-cols-[32px_1fr_1fr_140px] gap-4 px-5 py-3 bg-surface-50 border-b border-surface-100">
        {['', 'Name', 'Email', 'Role'].map((h, i) => (
          <div key={i} className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</div>
        ))}
      </div>
      {usersLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading users…</div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">No users found.</div>
      ) : (
        <div className="divide-y divide-surface-100">
          {filteredUsers.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.025 }}
              className="grid grid-cols-[32px_1fr_1fr_140px] gap-4 px-5 py-3.5 items-center hover:bg-surface-50 transition-colors"
            >
              <Avatar name={u.name} color={getMemberColor(u.id)} size="sm" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{u.name}</div>
                {u.id === authUser?.id && <div className="text-[10px] text-primary-400 font-medium">You</div>}
              </div>
              <div className="text-sm text-gray-500 truncate">{u.email}</div>
              <RoleDropdown userId={u.id} current={u.role} isSelf={u.id === authUser?.id} onChange={handleRoleChange} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
            </motion.div>
          )}

          {section === 'permissions' && isAdmin && (
            <motion.div key="permissions" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <div className="mb-1">
                <h2 className="text-xl font-bold text-gray-900">Role Permissions</h2>
                <p className="text-sm text-gray-400 mt-0.5">Configure which pages each role can access</p>
              </div>

              <div className="grid grid-cols-2 gap-5 mt-6">
                {PERM_ROLES.map((role, ri) => {
                  const allowed = getRoutes(role.key);
                  const RoleIcon = role.icon;
                  const count = authUsers.filter(u => u.role === role.key).length;
                  return (
                    <motion.div
                      key={role.key}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ri * 0.06 }}
                      className="bg-white rounded-2xl border border-surface-200 overflow-hidden"
                    >
                      {/* Card header */}
                      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
                        <div className="flex items-center gap-2.5">
                          <RoleIcon size={16} className="text-gray-400" />
                          <span className="text-sm font-bold text-gray-900">{role.label}</span>
                          <span className="bg-surface-100 text-gray-500 text-xs rounded-full px-2 py-0.5 font-medium">{count}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {saving(role.key) && <span className="text-xs text-gray-400 animate-pulse">Saving…</span>}
                          {/* Progress */}
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: role.barColor }}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.round((allowed.length / ALL_PERM_ROUTES.length) * 100)}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                            <span className="text-[11px] text-gray-400">{allowed.length}/{ALL_PERM_ROUTES.length}</span>
                          </div>
                        </div>
                      </div>

                      {/* Route toggle rows */}
                      <div className="divide-y divide-surface-100">
                        {ALL_PERM_ROUTES.map(route => {
                          const isOn = allowed.includes(route.id);
                          const isLocked = route.id === '/settings';
                          return (
                            <div key={route.id} className="flex items-center justify-between px-5 py-3">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-sm text-gray-700">{route.label}</span>
                                <span className="text-xs text-gray-400">{route.id}</span>
                                {isLocked && <span className="text-[10px] text-gray-300 ml-1">always on</span>}
                              </div>
                              <Toggle
                                checked={isOn || isLocked}
                                onChange={() => togglePerm(role.key, route.id)}
                                disabled={isLocked}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Admin note */}
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-primary-50 border border-primary-100 mt-5">
                <Shield size={13} className="text-primary-400 shrink-0" />
                <p className="text-xs text-primary-600"><span className="font-bold">Admin</span> always has full access and cannot be restricted.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Add Dept Modal ── */}
      <AnimatePresence>
        {showAddDept && (
          <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddDept(false)}>
            <motion.div className="bg-white rounded-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="flex items-center justify-between mb-4"><span className="font-bold text-gray-900">New Department</span><button onClick={() => setShowAddDept(false)}><X size={16} /></button></div>
              <div className="flex flex-col gap-3">
                <input value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="Department name" className="border border-surface-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400" />
                <div className="flex gap-2">
                  {PROJECT_COLORS.map(c => <button key={c} type="button" onClick={() => setNewDeptColor(c)} className={`w-8 h-8 rounded-full transition-all ${newDeptColor === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: c }} />)}
                </div>
                <button onClick={() => {
                  if (!newDeptName.trim()) return;
                  const deptName = newDeptName.trim();
                  dbApi().createDept({ name: deptName, color: newDeptColor, memberIds: [] })
                    .then((d: { id: string; name: string; color: string; memberIds: string[] }) => {
                      setDeptRoster(prev => [...prev, { id: d.id, icon: FolderKanban, name: d.name, color: d.color, memberIds: [] }]);
                    })
                    .catch((err: unknown) => { console.error('[OrganizationPage] Failed to create department:', err); showToast('Failed to create department.', 'error'); });
                  setNewDeptName(''); setNewDeptColor(PROJECT_COLORS[0]); setShowAddDept(false);
                }} className="w-full bg-primary-500 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-600 transition-colors">
                  Create Department
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Member to Dept Modal ── */}
      <AnimatePresence>
        {addMemberToDept !== null && (
          <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAddMemberToDept(null)}>
            <motion.div className="bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100"><span className="font-semibold text-sm text-gray-900">Add Member to Dept</span><button onClick={() => setAddMemberToDept(null)}><X size={16} /></button></div>
              {members.filter(m => !deptRoster[addMemberToDept]?.memberIds.includes(m.id)).map(m => (
                <button key={m.id} onClick={() => {
                  const dept = addMemberToDept !== null ? deptRoster[addMemberToDept] : null;
                  const newMemberIds = [...(dept?.memberIds ?? []), m.id];
                  setDeptRoster(prev => prev.map((d, i) => i === addMemberToDept ? { ...d, memberIds: newMemberIds } : d));
                  if (dept?.id) dbApi().updateDept(dept.id, { memberIds: newMemberIds }).catch((err: unknown) => { console.error('[OrganizationPage] Failed to update department:', err); showToast('Failed to update department.', 'error'); });
                  setAddMemberToDept(null);
                }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors">
                  <Avatar name={m.name} color={getMemberColor(m.id)} size="sm" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{m.name}</div>
                    <div className="text-xs text-gray-400">{m.designation ?? ''}</div>
                  </div>
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default OrganizationPage;
