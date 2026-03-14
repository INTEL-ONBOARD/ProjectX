# Organization Page Revamp Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `OrganizationPage.tsx` to replace the top tab bar with a two-column settings-style layout — fixed left nav + scrollable right content — serving as an admin control panel.

**Architecture:** Single file rewrite. All existing sub-components (`DepartmentDirectory`, `RoleDropdown`) and modals are preserved. New `Toggle` inline component added. Tab state renamed to `section`. Left nav replaces tab bar. Permission cards switch from tile-grid to toggle-row list.

**Tech Stack:** React 18, TypeScript, Framer Motion, Tailwind CSS, Lucide React, existing context providers (`AppContext`, `MembersContext`, `ProjectContext`, `AuthContext`, `RolePermsContext`).

---

## File Structure

**Single file modified:**
- `src/pages/OrganizationPage.tsx` — complete rewrite, same exports

No new files. No new IPC handlers. No route changes.

---

## Chunk 1: Shell + Left Nav

### Task 1: Rewrite the page shell and left nav

**Files:**
- Modify: `src/pages/OrganizationPage.tsx`

This task replaces the outer `motion.div` wrapper + tab bar with the new two-column shell. The right panel is left as a placeholder (`{null}`) until Task 2.

- [ ] **Step 1: Open the file and locate the outer return statement**

Open `src/pages/OrganizationPage.tsx`. The current outer JSX starts at line ~272:
```tsx
return (
  <motion.div className="flex-1 flex flex-col overflow-hidden px-8 bg-white" ...>
    <div className="pt-8 pb-0 shrink-0">
      ...tab bar...
    </div>
    <AnimatePresence mode="wait">
      {/* tab content */}
    </AnimatePresence>
    {/* modals */}
  </motion.div>
);
```

- [ ] **Step 2: Replace the type/interface/const block for tabs**

Find and replace the block starting at line ~181:
```tsx
// REMOVE THIS:
type TabId = 'overview' | 'users' | 'permissions';
interface TabDef { id: TabId; label: string; icon: React.ElementType; adminOnly?: boolean }
const TABS: TabDef[] = [
  { id: 'overview',     label: 'Overview',          icon: Building2 },
  { id: 'users',        label: 'Users',             icon: Users,   adminOnly: true },
  { id: 'permissions',  label: 'Role Permissions',  icon: Shield,  adminOnly: true },
];
```

Replace with:
```tsx
type SectionId = 'overview' | 'users' | 'permissions';
interface OrgNavItem { id: SectionId; label: string; icon: React.ElementType; adminOnly?: boolean; }
const NAV_ITEMS: OrgNavItem[] = [
  { id: 'overview',     label: 'Overview',          icon: Building2 },
  { id: 'users',        label: 'Users',             icon: Users,   adminOnly: true },
  { id: 'permissions',  label: 'Role Permissions',  icon: Shield,  adminOnly: true },
];
```

- [ ] **Step 3: Rename `tab` → `section` throughout the component**

In the component body, find:
```tsx
const [tab, setTab] = useState<TabId>('overview');
```
Replace with:
```tsx
const [section, setSection] = useState<SectionId>('overview');
```

Then rename every remaining reference of `tab` to `section` and `setTab` to `setSection` within the component (the effects, JSX conditionals, etc.).

- [ ] **Step 4: Add the `usersLoaded` state variable**

After the existing `const [usersLoading, setUsersLoading] = useState(false);` line, add:
```tsx
const [usersLoaded, setUsersLoaded] = useState(false);
```

- [ ] **Step 5: Update `loadUsers` to set `usersLoaded`**

Find the existing `loadUsers` callback:
```tsx
const loadUsers = useCallback(async () => {
  setUsersLoading(true);
  try { setAuthUsers(await authApi().getAll()); }
  catch (err) { console.error('[OrganizationPage] Failed to load auth users:', err); }
  finally { setUsersLoading(false); }
}, []);
```

Replace with:
```tsx
const loadUsers = useCallback(async () => {
  setUsersLoading(true);
  try {
    setAuthUsers(await authApi().getAll());
    setUsersLoaded(true);
  }
  catch (err) { console.error('[OrganizationPage] Failed to load auth users:', err); }
  finally { setUsersLoading(false); }
}, []);
```

- [ ] **Step 6: Update the two load effects**

Find:
```tsx
useEffect(() => { if (tab === 'users' && isAdmin) loadUsers(); }, [tab, isAdmin, loadUsers]);
```
Replace with:
```tsx
// Load users when Users section is visited (guarded by usersLoaded to prevent re-fetching on re-render)
useEffect(() => {
  if (section === 'users' && isAdmin && !usersLoaded) loadUsers();
}, [section, isAdmin, usersLoaded, loadUsers]);

// Load users when Permissions section is first visited (needs user counts for badges)
useEffect(() => {
  if (section === 'permissions' && isAdmin && !usersLoaded) loadUsers();
}, [section, isAdmin, usersLoaded, loadUsers]);
```

Note: The Refresh button in the Users section header calls `loadUsers()` directly (bypassing the guard), which is what allows manual re-fetching after a role change.

- [ ] **Step 7: Add the non-admin guard effect**

After the load effects, add:
```tsx
// Prevent non-admins from reaching admin-only sections via stale state
useEffect(() => {
  if (!isAdmin && section !== 'overview') setSection('overview');
}, [isAdmin, section]);
```

- [ ] **Step 8: Narrow `saving` state type**

Find:
```tsx
const [saving, setSaving] = useState<string | null>(null);
```
Replace with:
```tsx
const [saving, setSaving] = useState<'manager' | 'member' | null>(null);
```

- [ ] **Step 9: Compute `visibleNavItems`**

Find:
```tsx
const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);
```
Replace with:
```tsx
const visibleNavItems = NAV_ITEMS.filter(n => !n.adminOnly || isAdmin);
```

- [ ] **Step 10: Rewrite the outer return JSX**

Replace the entire `return (...)` block (from the opening `<motion.div` to its closing `</motion.div>`) with the new two-column shell. Keep the modals (`showAddDept`, `addMemberToDept`) inside — they render as fixed overlays and don't need to be inside the layout column:

```tsx
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
      {null /* section content goes here in Task 2 */}
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
                  .catch((err: unknown) => console.error('[OrganizationPage] Failed to create department:', err));
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
                if (dept?.id) dbApi().updateDept(dept.id, { memberIds: newMemberIds }).catch((err: unknown) => console.error('[OrganizationPage] Failed to update department:', err));
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
```

- [ ] **Step 11: Verify `layoutId` uniqueness**

Before writing the JSX, confirm the Sidebar does not use `"org-nav-ind"` as a `layoutId`:
```bash
grep -n "layoutId" src/components/layout/Sidebar.tsx
```
Expected: only `"nav-indicator"` (not `"org-nav-ind"`). If a collision is found, rename to `"org-left-nav-ind"` in the JSX below.

- [ ] **Step 12: Remove unused imports and variables**

The `currentUser` variable from `AppContext` is used in the Reporting Lines sub-panel which is being removed. First verify it is not referenced by any other preserved sub-component:
```bash
grep -n "currentUser\|subordinates\|Reporting" src/pages/OrganizationPage.tsx
```
Expected: only in the Reporting Lines JSX block (which is being removed) and the `subordinates` calculation.

If `currentUser` appears nowhere else, remove:
- `const subordinates = members.filter(m => m.id !== currentUser?.id);`
- `currentUser` from `const { currentUser } = useContext(AppContext);`
- If `AppContext` is only used for `currentUser`, remove the entire `useContext(AppContext)` line and the `AppContext` import.
- `PageHeader` import (replaced by inline `<h2>` title in the new shell)

Check there are no TypeScript errors: `./node_modules/.bin/tsc --noEmit`

- [ ] **Step 13: Verify the app renders without errors**

Run the app. Navigate to Organization. You should see:
- Left panel with "Organization / Control Panel" title and nav items
- Empty right panel
- Modals still work (add dept, add member)
- No TypeScript errors

Note: The old "Add Department" button that was in the tab-bar header is gone — it is replaced by the admin-only button inside the Overview section (Task 2). The modal itself is preserved in the shell above.

- [ ] **Step 14: Commit**

```bash
git add src/pages/OrganizationPage.tsx
git commit -m "refactor: replace org page tab bar with two-column left-nav shell"
```

---

## Chunk 2: Overview + Users Sections

### Task 2: Wire in Overview section

**Files:**
- Modify: `src/pages/OrganizationPage.tsx`

Replace `{null /* section content goes here */}` in the right panel with a proper section renderer. Implement the Overview section content.

- [ ] **Step 1: Add section renderer structure to the right panel**

Find:
```tsx
{null /* section content goes here in Task 2 */}
```

Replace with:
```tsx
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
    <div key="users">{null /* Task 3 */}</div>
  )}

  {section === 'permissions' && isAdmin && (
    <div key="permissions">{null /* Task 4 */}</div>
  )}
</AnimatePresence>
```

- [ ] **Step 2: Verify TypeScript**

```bash
./node_modules/.bin/tsc --noEmit
```
Expected: no output (no errors).

- [ ] **Step 3: Smoke-test Overview**

Run app. Navigate to Organization → Overview. Check:
- 4 stat cards render correctly
- Department Directory renders
- "New Department" button shows for admin, hidden for non-admin
- Department and member modals still work

- [ ] **Step 4: Commit**

```bash
git add src/pages/OrganizationPage.tsx
git commit -m "feat: implement Overview section in org page two-column layout"
```

---

### Task 3: Implement Users section

**Files:**
- Modify: `src/pages/OrganizationPage.tsx`

Replace the `{null /* Task 3 */}` placeholder with the full Users section.

The old Users tab had a 5-column table: `grid-cols-[36px_1fr_1fr_130px_130px]` with columns: avatar, name, email, "Current Role" (read-only pill), "Change Role" (RoleDropdown). The new table has 4 columns: `grid-cols-[32px_1fr_1fr_140px]` — the old read-only "Current Role" pill column is removed, and `RoleDropdown` now serves as the single role cell (showing current role as a pill, or an editable dropdown).

- [ ] **Step 1: Replace the Users placeholder**

Find:
```tsx
{section === 'users' && isAdmin && (
  <div key="users">{null /* Task 3 */}</div>
)}
```

Replace with:
```tsx
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
              className="grid grid-cols-[32px_1fr_1fr_140px] gap-4 px-5 py-3.5 items-center hover:bg-surface-50/60 transition-colors"
            >
              <Avatar name={u.name} color="#5030E5" size="sm" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{u.name}</div>
                {u.id === authUser?.id && <div className="text-[10px] text-primary-400 font-medium">You</div>}
              </div>
              <div className="text-sm text-gray-400 truncate">{u.email}</div>
              <RoleDropdown userId={u.id} current={u.role} isSelf={u.id === authUser?.id} onChange={handleRoleChange} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  </motion.div>
)}
```

- [ ] **Step 2: Verify TypeScript**

```bash
./node_modules/.bin/tsc --noEmit
```
Expected: no output.

- [ ] **Step 3: Smoke-test Users section**

Run app as admin. Navigate to Organization → Users. Check:
- Stat pills show correct counts
- Search filters by name/email
- Role filter chips work
- Table rows render with avatar, name, email, RoleDropdown
- Own row shows non-clickable "(you)" pill
- Changing another user's role shows toast + updates table row

- [ ] **Step 4: Commit**

```bash
git add src/pages/OrganizationPage.tsx
git commit -m "feat: implement Users section in org page left-nav layout"
```

---

## Chunk 3: Role Permissions Section + Toggle

### Task 4: Add `Toggle` component and implement Role Permissions section

**Files:**
- Modify: `src/pages/OrganizationPage.tsx`

Add the `Toggle` inline component above the `OrganizationPage` function definition. Replace the permissions placeholder with the full Role Permissions section using vertical toggle rows.

- [ ] **Step 1: Add `Toggle` component**

Find the `RoleDropdown` component definition (around line 118 in the current file, after all the other inline components). Add the `Toggle` component just before the `// ── Main page ──` comment:

```tsx
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
```

- [ ] **Step 2: Update `PERM_ROLES` to add icon field**

Find the existing `PERM_ROLES` const (around line 175):
```tsx
const PERM_ROLES: { key: 'manager' | 'member'; label: string; badgeCls: string; barColor: string }[] = [
  { key: 'manager', label: 'Manager',        badgeCls: '...', barColor: '...' },
  { key: 'member',  label: 'Member / Guest', badgeCls: '...', barColor: '...' },
];
```

Replace with (add `icon` field, keep existing fields):
```tsx
const PERM_ROLES: { key: 'manager' | 'member'; label: string; icon: React.ElementType; badgeCls: string; barColor: string }[] = [
  { key: 'manager', label: 'Manager',        icon: Users, badgeCls: 'bg-[#FFFBEB] text-[#D97706] border-[#FCD34D]', barColor: '#D97706' },
  { key: 'member',  label: 'Member / Guest', icon: User,  badgeCls: 'bg-surface-100 text-gray-500 border-surface-200', barColor: '#9CA3AF' },
];
```

Note: `User` (singular) from lucide-react. Add it to the lucide imports at the top of the file if not already there.

- [ ] **Step 3: Add `User` to lucide imports**

Find the lucide import block at the top of the file. It currently imports `Users` (plural) but not `User` (singular). Change it to add `User` right after `Users`:

```tsx
// BEFORE:
import {
  Building2, Users, MapPin, BarChart2, FolderKanban, Settings2, X, Plus,
  ChevronDown, Shield, Check, Search, RefreshCw, ChevronRight,
} from 'lucide-react';

// AFTER:
import {
  Building2, Users, User, MapPin, BarChart2, FolderKanban, Settings2, X, Plus,
  ChevronDown, Shield, Check, Search, RefreshCw, ChevronRight,
} from 'lucide-react';
```

- [ ] **Step 4: Replace the permissions placeholder with the full section**

Find:
```tsx
{section === 'permissions' && isAdmin && (
  <div key="permissions">{null /* Task 4 */}</div>
)}
```

Replace with:
```tsx
{section === 'permissions' && isAdmin && (
  <motion.div key="permissions" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
    <div className="mb-1">
      <h2 className="text-xl font-bold text-gray-900">Role Permissions</h2>
      <p className="text-sm text-gray-400 mt-0.5">Configure which pages each role can access</p>
    </div>

    <div className="grid grid-cols-2 gap-5 mt-6">
      {PERM_ROLES.map((role, ri) => {
        const allowed = perms.find(p => p.role === role.key)?.allowedRoutes ?? ['/settings'];
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
                {saving === role.key && <span className="text-xs text-gray-400 animate-pulse">Saving…</span>}
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
```

- [ ] **Step 5: Verify TypeScript**

```bash
./node_modules/.bin/tsc --noEmit
```
Expected: no output.

- [ ] **Step 6: Smoke-test Role Permissions**

Run app as admin. Navigate to Organization → Role Permissions. Check:
- Two cards side by side: Manager and Member/Guest
- Each card shows role icon, label, member count badge, progress bar
- Each route appears as a toggle row with label + route id
- Settings row toggle is on and not clickable
- Toggling any route saves to DB (check "Saving…" pulse, then verify next app reload has correct perms)
- Admin note banner at bottom

- [ ] **Step 7: Smoke-test non-admin**

Log in as a non-admin. Navigate to Organization. Check:
- Left nav shows only "Overview"
- Overview section renders correctly with no "New Department" button

- [ ] **Step 8: Commit**

```bash
git add src/pages/OrganizationPage.tsx
git commit -m "feat: implement Role Permissions section with toggle-row layout in org page"
```

---

## Chunk 4: Cleanup

### Task 5: Remove unused files and verify final state

**Files:**
- Delete: `src/pages/AdminPage.tsx` (orphaned — no longer imported or routed)
- Delete: `src/pages/RolesPage.tsx` (orphaned)
- Delete: `src/pages/UserRequestsPage.tsx` (orphaned)
- Verify: `src/pages/OrganizationPage.tsx` (no unused imports)

- [ ] **Step 1: Remove any routes/imports in App.tsx first, then confirm files are unused**

First check if `App.tsx` references any of the orphaned pages:
```bash
grep -n "AdminPage\|RolesPage\|UserRequestsPage\|/admin" src/App.tsx
```
If any are found, remove the import line and the corresponding `<Route>` element.

Then confirm no references remain anywhere:
```bash
grep -r "AdminPage\|RolesPage\|UserRequestsPage" src/ --include="*.tsx" --include="*.ts"
```
Expected: no output (no imports).

- [ ] **Step 2: Delete the orphaned files**

```bash
rm src/pages/AdminPage.tsx src/pages/RolesPage.tsx src/pages/UserRequestsPage.tsx
```

- [ ] **Step 3: Verify TypeScript after deletions**

```bash
./node_modules/.bin/tsc --noEmit
```
Expected: no output.

- [ ] **Step 4: Final end-to-end check**

Run app. Walk through:
1. Admin logs in → Organization page → Overview (stat cards, departments, "New Department" button visible)
2. Admin → Users tab → table renders, role change works, search/filter works
3. Admin → Role Permissions → toggle rows render, toggling saves, count badges show
4. Non-admin logs in → Organization page → only Overview visible in left nav, no "New Department" button

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: remove orphaned AdminPage, RolesPage, UserRequestsPage files"
```
