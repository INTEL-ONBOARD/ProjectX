# Organization Page Revamp — Design Spec

**Goal:** Replace the tab-based Organization page with a settings-style two-column layout that serves as an admin control panel, with Overview, Users, and Role Permissions sections.

**Architecture:** Two-column layout — fixed left nav + scrollable right content. Non-admins see only Overview. Admin-only sections (Users, Role Permissions) are hidden from the left nav for non-admins. All existing context wiring (`AppContext`, `MembersContext`, `ProjectContext`, `AuthContext`, `RolePermsContext`) is preserved.

**Tech Stack:** React 18, TypeScript, Framer Motion, Tailwind CSS, Lucide React, existing context providers.

---

## Layout

### Two-Column Shell

The page root is `flex flex-row h-full overflow-hidden`.

- **Left panel** (fixed `w-56 shrink-0`): full parent height (`h-full`), `border-r border-surface-200`, white background, `overflow-y-auto`.
  - Page title at top (`px-5 pt-6 pb-4`): "Organization" bold (`text-sm font-bold text-gray-900`) + subtitle "Control Panel" (`text-xs text-gray-400 mt-0.5`).
  - Nav list (`px-3 space-y-1`): three items — Overview, Users, Role Permissions.
  - Each nav item: `relative flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm font-medium transition-colors`.
  - Active: `bg-primary-50 text-primary-600`. Inactive: `text-gray-500 hover:bg-surface-100 hover:text-gray-700`.
  - Active left-edge pill: `absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary-500 rounded-r-full`, Framer Motion `layoutId="org-nav-ind"` (unique — Sidebar uses `"nav-indicator"`).
  - `visibleNavItems = NAV_ITEMS.filter(n => !n.adminOnly || isAdmin)`.

- **Right panel** (`flex-1 overflow-y-auto px-8 py-6`): renders active section content.
  - Section header: `<h2 className="text-xl font-bold text-gray-900">` + `<p className="text-sm text-gray-400 mt-0.5">` description.
  - Content `mt-6`.

---

## Nav Items Definition

Do NOT use the global `NavItem` type (it has `icon: string`). Define locally:

```ts
interface OrgNavItem { id: SectionId; label: string; icon: React.ElementType; adminOnly?: boolean; }
type SectionId = 'overview' | 'users' | 'permissions';

const NAV_ITEMS: OrgNavItem[] = [
  { id: 'overview',     label: 'Overview',          icon: Building2 },
  { id: 'users',        label: 'Users',             icon: Users,   adminOnly: true },
  { id: 'permissions',  label: 'Role Permissions',  icon: Shield,  adminOnly: true },
];
```

State: `const [section, setSection] = useState<SectionId>('overview')`.

---

## Local API Cast

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbApi   = () => (window as any).electronAPI.db;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authApi = () => (window as any).electronAPI.auth as {
  getAll:     () => Promise<AuthUserRow[]>;
  updateRole: (id: string, role: string) => Promise<boolean>;
};
```

---

## Non-Admin Guard

A single `useEffect` covers both admin-only sections:
```ts
useEffect(() => {
  if (!isAdmin && section !== 'overview') setSection('overview');
}, [isAdmin, section]);
```

---

## loadUsers Function

```ts
const loadUsers = useCallback(async () => {
  setUsersLoading(true);
  try {
    setAuthUsers(await authApi().getAll());
    setUsersLoaded(true);   // ← must set this to prevent reload loop
  } catch (err) {
    console.error('[OrganizationPage] Failed to load auth users:', err);
  } finally {
    setUsersLoading(false);
  }
}, []);
```

`usersLoaded` is set to `true` inside `loadUsers` on success. The Users section effect intentionally always re-fetches when the section is revisited (no `!usersLoaded` guard) — this ensures fresh data. The `!usersLoaded` guard is used only in the permissions section effect to prevent side-loading users repeatedly:

```ts
// Lazy load for Users section (re-fetches on each visit)
useEffect(() => { if (section === 'users' && isAdmin) loadUsers(); }, [section, isAdmin, loadUsers]);

// Load users when Permissions section is first visited (only once)
useEffect(() => {
  if (section === 'permissions' && isAdmin && !usersLoaded) loadUsers();
}, [section, isAdmin, usersLoaded, loadUsers]);
```

---

## Overview Section

Visible to all roles.

**Stat cards** (`grid grid-cols-4 gap-4 mt-2`):
- Total Members — `members.length`
- Departments — `deptRoster.length`
- Locations — `new Set(members.map(m => m.location).filter(Boolean)).size || members.length`
- Avg Workload — `members.length > 0 ? (allTasks.length / members.length).toFixed(1) : '0.0'` tasks/member

Each card: `bg-surface-50 rounded-2xl border border-surface-200 px-4 py-3`, value (`text-2xl font-bold text-gray-900`) + label (`text-xs text-gray-400 mt-0.5`) + trend sub-label (`text-[10px] text-gray-400`).

**Department Directory** (`mt-6`):
- `dbApi().getDepts()` on mount → `Array<{ id: string; name: string; color: string; memberIds: string[] }>`.
- Mapped to `DeptEntry` interface (preserved as-is from existing code): `interface DeptEntry { id?: string; name: string; icon: React.ElementType; color: string; memberIds: string[]; }`. The `id` field remains **optional** to support optimistic local insertion before the DB returns. When mapping from the DB result, set `id: d.id`.
- Rendered with existing `DepartmentDirectory` sub-component, props unchanged: `{ deptRoster, members, getMemberColor, onAddMember }`.
- Admin only: "Add Department" button (`isAdmin &&`) above the directory. **Behavioral change** — current code shows it to all.
- `showAddDept` modal and `addMemberToDept` modal preserved as-is.
- `currentUser` from `AppContext` is preserved. The existing "Reporting Lines" sub-panel (if present in the current component) is **removed** as part of this revamp — the new layout has no place for it. Remove it and remove the `subordinates` calculation (`members.filter(m => m.id !== currentUser?.id)`). `AppContext` import can be removed too if `currentUser` is the only thing consumed from it.

---

## Users Section

**Data:**
```ts
interface AuthUserRow { id: string; name: string; email: string; role: 'admin' | 'manager' | 'member'; }
```

**Stat pills** (`flex gap-3 mt-2`):
- Total: `bg-surface-100 text-gray-600 border-surface-200`
- Admin: `bg-primary-50 text-primary-600 border-primary-200`
- Manager: `bg-[#FFFBEB] text-[#D97706] border-[#FCD34D]`
- Member: `bg-surface-100 text-gray-500 border-surface-200`

**Toolbar** (`flex items-center gap-3 mt-4`): search (left, `max-w-xs`), filter chips (`all/admin/manager/member`), refresh (right, spins while `usersLoading`).

**User table** (`mt-4 rounded-2xl border border-surface-200 overflow-hidden`):
- Grid: `grid-cols-[32px_1fr_1fr_120px]` — Avatar, Name, Email, Role. **Behavioral change**: current code had five columns (including a separate read-only current-role pill column); that column is removed and the `RoleDropdown` component handles both display and editing in the single Role column.
- Header: `text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-surface-50 px-5 py-3 border-b border-surface-100`.
- Body: `divide-y divide-surface-100`, each row `grid grid-cols-[32px_1fr_1fr_120px] gap-4 px-5 py-3.5 items-center hover:bg-surface-50`.
  - Avatar: `<Avatar name={u.name} color="#5030E5" size="sm" />`.
  - Name: `text-sm font-semibold text-gray-900` + "You" `text-[10px] text-primary-400` if self.
  - Email: `text-sm text-gray-500 truncate`.
  - Role: `<RoleDropdown userId={u.id} current={u.role} isSelf={u.id === authUser?.id} onChange={handleRoleChange} />`.
- Loading / Empty: `py-12 text-center text-sm text-gray-400`.

**RoleDropdown:**
```ts
const RoleDropdown: React.FC<{
  userId: string;
  current: AuthUserRow['role'];
  isSelf: boolean;
  onChange: (userId: string, role: AuthUserRow['role']) => void;
}>
```
- `isSelf`: read-only styled pill + "(you)".
- Otherwise: pill → `motion.div` dropdown, roles `['admin', 'manager', 'member']`, check on current, click → `onChange` + close.

`handleRoleChange`: `authApi().updateRole` → update `authUsers` → `showToast`.

---

## Role Permissions Section

**Roles to configure:** Manager and Member/Guest only (admin always has all permissions).

**Role cards definition** (define locally):
```ts
const PERM_ROLES: { key: 'manager' | 'member'; label: string; icon: React.ElementType }[] = [
  { key: 'manager', label: 'Manager',      icon: Users },
  { key: 'member',  label: 'Member/Guest', icon: User  },
];
```

**Route list:**
```ts
const ALL_PERM_ROUTES = [
  { id: '/',             label: 'Task Board'   },
  { id: '/dashboard',    label: 'Dashboard'    },
  { id: '/messages',     label: 'Messages'     },
  { id: '/tasks',        label: 'Tasks'        },
  { id: '/teams',        label: 'Projects'     },
  { id: '/members',      label: 'Members'      },
  { id: '/attendance',   label: 'Attendance'   },
  { id: '/reports',      label: 'Reports'      },
  { id: '/organization', label: 'Organization' },
  { id: '/settings',     label: 'Settings'     },
];
```

**Layout:** `grid grid-cols-2 gap-5 mt-2`. **Replaces existing tile-grid** — new layout uses vertical toggle rows.

**Each card** (`bg-white rounded-2xl border border-surface-200 overflow-hidden`):

Header (`px-5 py-4 border-b border-surface-100 flex items-center justify-between`):
- Left: `<Icon size={16} className="text-gray-400 mr-2" />` + role label (`text-sm font-bold text-gray-900`) + count badge (`bg-surface-100 text-gray-500 text-xs rounded-full px-2 py-0.5 ml-2`). Count = `authUsers.filter(u => u.role === roleKey).length`.
- Right: `{saving === roleKey && <span className="text-xs text-gray-400 animate-pulse">Saving…</span>}`.
- Individual toggles stay enabled during save (optimistic UX).

Route rows (`divide-y divide-surface-100`), each `flex items-center justify-between px-5 py-3`:
- Left: `text-sm text-gray-700` label + `text-xs text-gray-400 ml-1` route id.
- Right: `<Toggle checked={isOn} onChange={() => togglePerm(roleKey, route.id)} disabled={route.id === '/settings'} />`.
- `isOn = perms.find(p => p.role === roleKey)?.allowedRoutes.includes(route.id) ?? false`.

**Toggle component** (inline):
```ts
const Toggle: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
  <button
    onClick={disabled ? undefined : onChange}
    type="button"
    className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-primary-500' : 'bg-surface-200'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
  </button>
);
```

**togglePerm:**
```ts
const togglePerm = async (role: 'manager' | 'member', routeId: string) => {
  if (routeId === '/settings') return;
  const current = perms.find(p => p.role === role)?.allowedRoutes ?? ['/settings'];
  const next = current.includes(routeId) ? current.filter(r => r !== routeId) : [...current, routeId];
  setSaving(role);
  try { await setRolePerms(role, next); }
  finally { setSaving(null); }
};
```

---

## Data & State Summary

| State | Type | Default | Purpose |
|---|---|---|---|
| `section` | `SectionId` | `'overview'` | Active nav section |
| `deptRoster` | `DeptEntry[]` | `[]` | Departments from DB |
| `showAddDept` | `boolean` | `false` | Add dept modal |
| `addMemberToDept` | `number \| null` | `null` | Add member modal |
| `newDeptName` | `string` | `''` | New dept name input |
| `newDeptColor` | `string` | `PROJECT_COLORS[0]` | New dept color |
| `authUsers` | `AuthUserRow[]` | `[]` | Auth users from DB |
| `usersLoaded` | `boolean` | `false` | Set to `true` by `loadUsers` on success; guards permissions-section re-load |
| `usersLoading` | `boolean` | `false` | Loading spinner flag |
| `search` | `string` | `''` | User search query |
| `roleFilter` | `'all' \| AuthUserRow['role']` | `'all'` | Role filter |
| `saving` | `'manager' \| 'member' \| null` | `null` | Perms save in-flight (narrowed type) |

---

## Behavioral Changes from Current Code

1. Tab bar replaced with left-side nav panel.
2. "Add Department" button is now admin-only (was visible to all).
3. Role Permissions: tile-grid replaced with vertical toggle-row list per card.
4. "Registered As" / current-role read-only pill column removed from Users table; `RoleDropdown` now serves both display and editing in a single Role column.
5. "Reporting Lines" sub-panel removed from Overview.
6. `saving` state narrowed from `string | null` to `'manager' | 'member' | null`.

---

## Out of Scope

- No new IPC handlers.
- No new routes or sidebar entries.
- No changes to AuthContext, RolePermsContext, MembersContext, or ProjectContext internals.
- No mobile/responsive changes (desktop Electron app only).
- No changes to `DepartmentDirectory` sub-component internals.
