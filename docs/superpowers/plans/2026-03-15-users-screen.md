# Users Screen Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new admin-only `/users` screen with three tabs — Users (role assignment), Roles (add/rename/color/delete), Permissions (per-role route toggles).

**Architecture:** Single page `UsersPage.tsx` owns tab state and `selectedRoleId` (stores `appId`, not name). Four sub-components handle each panel. Shared `RoleListPanel` is reused in both Roles and Permissions tabs. All IPC methods already exist in `electron/preload.ts` — no backend changes needed.

**Tech Stack:** React 18 + TypeScript, Framer Motion (tab indicator via `layoutId`), Tailwind CSS, Lucide icons, Electron IPC via `window.electronAPI`

**Spec:** `docs/superpowers/specs/2026-03-15-users-screen-design.md`

---

## Chunk 1: Foundation — wiring, types, navigation

### Task 1: Add role IPC types to `vite-env.d.ts` and update `RolePermsContext` defaults

**Files:**
- Modify: `src/vite-env.d.ts:7-61`
- Modify: `src/context/RolePermsContext.tsx:12`

**Context:** `ElectronDB` in `vite-env.d.ts` is missing type declarations for the 6 role-related IPC methods that already exist in `electron/preload.ts`. Also, admin's `allowedRoutes` in `RolePermsContext` defaults is missing `/users`.

- [ ] **Step 1: Add role method types to `ElectronDB` in `src/vite-env.d.ts`**

Add these lines inside the `ElectronDB` interface, after the `// Role permissions` block (after line 60):

```typescript
  // Roles
  getRoles(): Promise<unknown[]>;
  createRole(data: { name: string; color: string }): Promise<{ appId: string; name: string; color: string }>;
  renameRole(data: { appId: string; newName: string }): Promise<{ ok: boolean; oldName: string }>;
  updateRoleColor(data: { appId: string; color: string }): Promise<unknown>;
  deleteRole(data: { appId: string }): Promise<unknown>;
  // NOTE: handler reads data.roleName (not data.role) — pass { roleName: string }
  deleteRolePerms(data: { roleName: string }): Promise<unknown>;
```

- [ ] **Step 2: Add `/users` to admin's `allowedRoutes` in `src/context/RolePermsContext.tsx`**

Change line 12 from:
```typescript
    { role: 'admin',   allowedRoutes: ['/', '/dashboard', '/messages', '/tasks', '/teams', '/members', '/attendance', '/reports', '/settings'] },
```
To:
```typescript
    { role: 'admin',   allowedRoutes: ['/', '/dashboard', '/messages', '/tasks', '/teams', '/members', '/attendance', '/reports', '/users', '/settings'] },
```

- [ ] **Step 3: Verify TypeScript compiles clean**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && ./node_modules/.bin/tsc --noEmit
```
Expected: no output (exit 0)

- [ ] **Step 4: Commit**

```bash
git add src/vite-env.d.ts src/context/RolePermsContext.tsx
git commit -m "feat: add role IPC types to ElectronDB, add /users to admin allowedRoutes"
```

---

### Task 2: Add `RolesProvider` to `App.tsx`, register `/users` route, add sidebar item

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

**Context:** `RolesProvider` was removed when the Organization feature was deleted. It must be re-added between `RolePermsProvider` and `MembersProvider`. The `/users` route and sidebar item also need to be added. `UsersPage` doesn't exist yet — we'll add a placeholder to unblock the route.

- [ ] **Step 1: Create a placeholder `UsersPage` so the route can compile**

Create `src/pages/UsersPage.tsx`:
```typescript
import React from 'react';

const UsersPage: React.FC = () => (
    <div className="flex-1 flex items-center justify-center text-gray-400">
        Users screen — coming soon
    </div>
);

export default UsersPage;
```

- [ ] **Step 2: Update `src/App.tsx`**

Add TWO imports at the top of `src/App.tsx` (after the other page imports):
```typescript
import UsersPage from './pages/UsersPage';
import { RolesProvider } from './context/RolesContext';
```
**Important:** Both imports are required. `RolesProvider` is a named export — use curly braces.

In `MainApp`, add the `/users` route after the `/reports` route:
```tsx
<Route path="/users" element={<ProtectedRoute path="/users"><Layout><UsersPage /></Layout></ProtectedRoute>} />
```

In the `App` component, wrap `MembersProvider` with `RolesProvider` (inside `RolePermsProvider`):
```tsx
<RolePermsProvider>
    <RolesProvider>
        <MembersProvider>
            <ProjectProvider>
```
Close tags accordingly: `</MembersProvider></RolesProvider></RolePermsProvider>`

- [ ] **Step 3: Add Users nav item to `src/components/layout/Sidebar.tsx`**

First, add `Users2` to the lucide-react import line in `Sidebar.tsx`. Open the file and find the line starting with `import {` from `'lucide-react'` — add `Users2` to that import (it's already importing `Users`, add `Users2` alongside it):
```typescript
import { LayoutGrid, MessageSquare, CheckSquare, Users, Users2, Clock3, BarChart3, Settings, ChevronLeft, Plus, MoreHorizontal, ... } from 'lucide-react';
```

Then add to `ALL_NAV_ITEMS` array, after the `/reports` entry and before `/settings`:
```typescript
    { id: '/users',    label: 'Users',    icon: Users2 },
```

**Note:** `Users2` must be imported — it is NOT the same as `Users` (which is already used for `/members` and `/teams`). Both steps are required.

- [ ] **Step 4: Verify TypeScript compiles and app runs**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && ./node_modules/.bin/tsc --noEmit
```
Expected: no output (exit 0)

- [ ] **Step 5: Commit**

```bash
git add src/pages/UsersPage.tsx src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: wire /users route, add RolesProvider, add Users sidebar item"
```

---

## Chunk 2: Tab 1 — Users table + role assignment drawer

### Task 3: `UserRoleDrawer` — slide-out panel to reassign a user's role

**Files:**
- Create: `src/components/users/UserRoleDrawer.tsx`

**Context:** Clicking a row in the Users tab opens this 420px drawer from the right. It shows user info and a role dropdown. Save calls `db.updateMember` (DB-first, not optimistic) then `auth.updateRole`. Admin cannot change their own role.

- [ ] **Step 1: Create `src/components/users/UserRoleDrawer.tsx`**

```typescript
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { User } from '../../types';
import { RoleDoc } from '../../context/RolesContext';
import { useMembersContext } from '../../context/MembersContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbApi = () => (window as any).electronAPI.db;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authApi = () => (window as any).electronAPI.auth;

interface Props {
    member: User | null;
    roles: RoleDoc[];
    onClose: () => void;
}

export const UserRoleDrawer: React.FC<Props> = ({ member, roles, onClose }) => {
    const { updateMember } = useMembersContext();
    const { user: authUser } = useAuth();
    const { showToast } = useToast();
    const [selectedRole, setSelectedRole] = useState<string>(member?.role ?? '');
    const [saving, setSaving] = useState(false);

    // Sync when member changes (member is non-nullable when drawer is open)
    React.useEffect(() => {
        if (member) setSelectedRole(member.role);
    }, [member?.id]);

    const isSelf = member?.id === authUser?.id;
    const unchanged = selectedRole === member?.role;

    const handleSave = async () => {
        if (!member || isSelf || unchanged) return;
        setSaving(true);
        try {
            // updateMember calls the DB IPC AND updates MembersContext local state
            await updateMember(member.id, { role: selectedRole });
            try {
                await authApi().updateRole(member.id, selectedRole);
            } catch {
                showToast('Role updated but auth sync failed. The user may need to re-login.', 'error');
                return;
            }
            showToast(`${member.name}'s role updated to ${selectedRole}.`, 'success');
            onClose();
        } catch {
            showToast('Failed to update role. Please try again.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const initials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <AnimatePresence>
            {member && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/20 z-40"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    {/* Drawer */}
                    <motion.div
                        className="fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col"
                        initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-100">
                            <h2 className="text-base font-semibold text-gray-800">Edit User Role</h2>
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                            {/* Avatar + info */}
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg shrink-0">
                                    {initials(member.name)}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800 text-base">{member.name}</p>
                                    <p className="text-sm text-gray-400">{member.email ?? '—'}</p>
                                    {member.designation && <p className="text-xs text-gray-400 mt-0.5">{member.designation}</p>}
                                </div>
                            </div>

                            {/* Role selector */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Role</label>
                                {isSelf ? (
                                    <p className="text-sm text-gray-400 italic">You cannot change your own role.</p>
                                ) : (
                                    <select
                                        value={selectedRole}
                                        onChange={e => setSelectedRole(e.target.value)}
                                        className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                                    >
                                        {roles.map(r => (
                                            <option key={r.appId} value={r.name}>{r.name.charAt(0).toUpperCase() + r.name.slice(1)}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        {!isSelf && (
                            <div className="px-6 py-4 border-t border-surface-100">
                                <button
                                    onClick={handleSave}
                                    disabled={saving || unchanged}
                                    className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
                                >
                                    <Save size={14} />
                                    {saving ? 'Saving…' : 'Save Role'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && ./node_modules/.bin/tsc --noEmit
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add src/components/users/UserRoleDrawer.tsx
git commit -m "feat: add UserRoleDrawer component for role assignment"
```

---

### Task 4: Users tab table in `UsersPage`

**Files:**
- Modify: `src/pages/UsersPage.tsx` (replace placeholder with full implementation — Users tab only for now)

**Context:** The Users tab is a full-width table of all members. Clicking a row opens `UserRoleDrawer`. Role badge color is derived from `RolesContext.roles`.

- [ ] **Step 1: Replace `src/pages/UsersPage.tsx` with the Users-tab implementation**

```typescript
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Users2 } from 'lucide-react';
import { useRoles } from '../context/RolesContext';
import { useMembersContext } from '../context/MembersContext';
import { User } from '../types';
import { UserRoleDrawer } from '../components/users/UserRoleDrawer';

// ── Helpers ──────────────────────────────────────────────────────────────────
const initials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const TABS = ['Users', 'Roles', 'Permissions'] as const;
type Tab = typeof TABS[number];

// ── UsersTab ─────────────────────────────────────────────────────────────────
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

// ── UsersPage ─────────────────────────────────────────────────────────────────
const UsersPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('Users');

    return (
        <motion.div
            className="flex-1 flex flex-col overflow-hidden px-8 bg-white"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
        >
            {/* Page heading */}
            <div className="pt-8 pb-5 shrink-0 flex items-center gap-3">
                <Users2 size={22} className="text-primary-500" />
                <h1 className="text-xl font-bold text-gray-800">Users & Roles</h1>
            </div>

            {/* Tab bar */}
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

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'Users' && <UsersTab />}
                {activeTab === 'Roles' && <div className="text-gray-400 text-sm">Roles tab — coming in next task</div>}
                {activeTab === 'Permissions' && <div className="text-gray-400 text-sm">Permissions tab — coming in next task</div>}
            </div>
        </motion.div>
    );
};

export default UsersPage;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && ./node_modules/.bin/tsc --noEmit
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add src/pages/UsersPage.tsx
git commit -m "feat: implement Users tab — member table with role badge and drawer wiring"
```

---

## Chunk 3: Tab 2 — Roles management

### Task 5: `RoleListPanel` — shared left-column role list

**Files:**
- Create: `src/components/users/RoleListPanel.tsx`

**Context:** Both the Roles and Permissions tabs show the same left panel: a list of role pills with color dots and member counts. The Roles tab also shows an "Add Role" button. Extract this into a shared component to avoid duplication.

- [ ] **Step 1: Create `src/components/users/RoleListPanel.tsx`**

```typescript
import React from 'react';
import { Plus } from 'lucide-react';
import { RoleDoc } from '../../context/RolesContext';
import { User } from '../../types';

interface Props {
    roles: RoleDoc[];
    members: User[];
    selectedRoleId: string | null;
    onSelect: (appId: string) => void;
    showAddRole?: boolean;
    addRoleDisabled?: boolean;
    onAddRole?: () => void;
}

export const RoleListPanel: React.FC<Props> = ({
    roles, members, selectedRoleId, onSelect,
    showAddRole = false, addRoleDisabled = false, onAddRole,
}) => {
    return (
        <div className="w-[280px] shrink-0 flex flex-col border-r border-surface-100 pr-4 mr-6">
            <div className="flex-1 overflow-y-auto space-y-1">
                {roles.map(role => {
                    const count = members.filter(m => m.role === role.name).length;
                    const isSelected = role.appId === selectedRoleId;
                    return (
                        <button
                            key={role.appId}
                            onClick={() => onSelect(role.appId)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors border ${
                                isSelected
                                    ? 'bg-primary-50 border-primary-200 text-primary-700'
                                    : 'border-transparent hover:bg-surface-50 text-gray-700'
                            }`}
                        >
                            <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ background: role.color }}
                            />
                            <span className="flex-1 text-sm font-medium truncate">
                                {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                            </span>
                            <span className="text-xs text-gray-400 shrink-0">{count}</span>
                        </button>
                    );
                })}
                {roles.length === 0 && (
                    <p className="text-xs text-gray-400 px-3 py-4">No roles defined.</p>
                )}
            </div>

            {showAddRole && (
                <button
                    onClick={onAddRole}
                    disabled={addRoleDisabled}
                    className="mt-4 flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-xl hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Plus size={14} />
                    Add Role
                </button>
            )}
        </div>
    );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && ./node_modules/.bin/tsc --noEmit
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add src/components/users/RoleListPanel.tsx
git commit -m "feat: add RoleListPanel shared component"
```

---

### Task 6: `RoleDetailPanel` — name, color, delete

**Files:**
- Create: `src/components/users/RoleDetailPanel.tsx`

**Context:** Right panel of the Roles tab. Shows editable name, color picker, member count, and delete. Built-in roles (`admin`, `manager`, `member`) have name and delete locked. Color saves IPC-first (no optimistic). Rename checks for duplicates before saving.

- [ ] **Step 1: Create `src/components/users/RoleDetailPanel.tsx`**

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Lock } from 'lucide-react';
import { RoleDoc, useRoles } from '../../context/RolesContext';
import { useRolePerms } from '../../context/RolePermsContext';
import { useMembersContext } from '../../context/MembersContext';
import { useToast } from '../ui/Toast';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbApi = () => (window as any).electronAPI.db;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authApi = () => (window as any).electronAPI.auth;

const BUILT_IN = ['admin', 'manager', 'member'];
const PRESET_COLORS = ['#5030E5', '#D97706', '#68B266', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'];

interface Props {
    selectedRoleId: string | null;
    onDeleteComplete: () => void;
}

export const RoleDetailPanel: React.FC<Props> = ({ selectedRoleId, onDeleteComplete }) => {
    const { roles, renameRoleLocal, updateRoleLocal, removeRole } = useRoles();
    const { renameRolePerms, removeRolePerms } = useRolePerms();
    const { members } = useMembersContext();
    const { showToast } = useToast();

    const role = roles.find(r => r.appId === selectedRoleId) ?? null;

    const [nameValue, setNameValue] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [colorSaving, setColorSaving] = useState(false);

    // Sync name when role changes
    useEffect(() => {
        setNameValue(role?.name ?? '');
        setConfirmDelete(false);
    }, [role?.appId]);

    const isBuiltIn = role ? BUILT_IN.includes(role.name) : false;
    const memberCount = role ? members.filter(m => m.role === role.name).length : 0;

    const handleNameBlur = async () => {
        if (!role || nameValue === role.name) return;
        // Normalize to lowercase to match server-side behavior
        const trimmed = nameValue.trim().toLowerCase();
        if (!trimmed) { setNameValue(role.name); return; }
        const duplicate = roles.some(r => r.name.toLowerCase() === trimmed && r.appId !== role.appId);
        if (duplicate) {
            showToast('A role with that name already exists.', 'error');
            setNameValue(role.name);
            return;
        }
        try {
            // renameRole returns { ok: boolean; oldName: string }
            const result = await dbApi().renameRole({ appId: role.appId, newName: trimmed }) as { ok: boolean; oldName: string };
            if (!result.ok) throw new Error('rename returned ok:false');
            renameRoleLocal(role.appId, trimmed);
            renameRolePerms(result.oldName, trimmed);
        } catch {
            showToast('Failed to rename role.', 'error');
            setNameValue(role.name);
        }
    };

    const handleColorPick = async (color: string) => {
        if (!role || colorSaving) return;
        setColorSaving(true);
        try {
            await dbApi().updateRoleColor({ appId: role.appId, color });
            updateRoleLocal(role.appId, { color });
        } catch {
            showToast('Failed to update color.', 'error');
        } finally {
            setColorSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!role) return;
        setDeleting(true);
        const affected = members.filter(m => m.role === role.name);
        try {
            // Reassign all members to 'member' role
            for (const m of affected) {
                await dbApi().updateMember(m.id, { role: 'member' });
                await authApi().updateRole(m.id, 'member');
            }
            await dbApi().deleteRole({ appId: role.appId });
            // IMPORTANT: the IPC handler reads data.roleName (not data.role) — use { roleName }
            await dbApi().deleteRolePerms({ roleName: role.name });
            removeRole(role.appId);
            removeRolePerms(role.name);
            showToast(`Role "${role.name}" deleted.`, 'success');
            onDeleteComplete();
        } catch {
            showToast('Delete failed. Some members may have been reassigned already — please check the Users tab.', 'error');
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    if (!role) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                Select a role to edit
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto space-y-6 max-w-lg">
            {/* Name */}
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Role Name</label>
                {isBuiltIn ? (
                    <div className="flex items-center gap-2 px-3 py-2 border border-surface-200 rounded-lg bg-surface-50">
                        <Lock size={13} className="text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-500">{role.name.charAt(0).toUpperCase() + role.name.slice(1)}</span>
                        <span className="ml-auto text-xs text-gray-400">Built-in role</span>
                    </div>
                ) : (
                    <input
                        type="text"
                        value={nameValue}
                        onChange={e => setNameValue(e.target.value)}
                        onBlur={handleNameBlur}
                        className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
                    />
                )}
            </div>

            {/* Color */}
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Color {colorSaving && <span className="text-gray-400 font-normal ml-1">Saving…</span>}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => handleColorPick(c)}
                            disabled={colorSaving}
                            className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 disabled:opacity-50 ${role.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                            style={{ background: c }}
                        />
                    ))}
                </div>
            </div>

            {/* Member count */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="font-medium text-gray-800">{memberCount}</span>
                <span>{memberCount === 1 ? 'member' : 'members'} with this role</span>
            </div>

            {/* Delete */}
            {!isBuiltIn && (
                <div className="pt-4 border-t border-surface-100">
                    {!confirmDelete ? (
                        <button
                            onClick={() => setConfirmDelete(true)}
                            className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
                        >
                            <Trash2 size={14} />
                            Delete Role
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                Reassign <strong>{memberCount}</strong> {memberCount === 1 ? 'member' : 'members'} to &ldquo;member&rdquo; and delete this role?
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="px-4 py-2 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                                >
                                    {deleting ? 'Deleting…' : 'Yes, Delete'}
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-surface-200 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && ./node_modules/.bin/tsc --noEmit
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add src/components/users/RoleDetailPanel.tsx
git commit -m "feat: add RoleDetailPanel — rename, color, delete role"
```

---

### Task 7: Wire Roles tab into `UsersPage`

**Files:**
- Modify: `src/pages/UsersPage.tsx`

**Context:** Add `selectedRoleId` state to `UsersPage`, implement the "Add Role" handler, and replace the Roles tab placeholder with `RoleListPanel` + `RoleDetailPanel`.

- [ ] **Step 1: Update `src/pages/UsersPage.tsx` — add shared state and Roles tab**

Add these imports at the top:
```typescript
import { useRolePerms } from '../context/RolePermsContext';
import { RoleListPanel } from '../components/users/RoleListPanel';
import { RoleDetailPanel } from '../components/users/RoleDetailPanel';
```

Add inside `UsersPage` component (before the return):
```typescript
    const { roles, addRole } = useRoles();
    const { members } = useMembersContext();
    const { addRolePerms } = useRolePerms();
    const { showToast } = useToast();
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [addingRole, setAddingRole] = useState(false);
```

Add these imports at the top of `UsersPage.tsx`:
```typescript
import { useToast } from '../components/ui/Toast';
```

Add the `handleAddRole` function inside `UsersPage`:
```typescript
    const handleAddRole = async () => {
        if (addingRole) return;
        setAddingRole(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const db = (window as any).electronAPI.db;
            const newRole = await db.createRole({ name: 'New Role', color: '#6366f1' });
            addRole(newRole); // local insert into RolesContext

            // For a brand-new role, RolePermsContext.setRolePerms uses prev.map() which
            // only updates existing entries — it CANNOT insert a new one.
            // Correct pattern: DB write via dbApi directly, local insert via addRolePerms.
            await db.setRolePerms({ role: newRole.name, allowedRoutes: ['/settings'] }); // DB write
            addRolePerms({ role: newRole.name, allowedRoutes: ['/settings'] }); // local insert

            setSelectedRoleId(newRole.appId);
        } catch {
            showToast('Failed to create role.', 'error');
        } finally {
            setAddingRole(false);
        }
    };
```

Add a `RolesTab` component (inside `UsersPage.tsx`, before the `UsersPage` component):
```typescript
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
```

Replace the Roles tab placeholder in the return:
```tsx
{activeTab === 'Roles' && (
    <RolesTab
        selectedRoleId={selectedRoleId}
        onSelect={setSelectedRoleId}
        onDeleteComplete={() => setSelectedRoleId(null)}
        onAddRole={handleAddRole}
        addingRole={addingRole}
    />
)}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && ./node_modules/.bin/tsc --noEmit
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add src/pages/UsersPage.tsx
git commit -m "feat: wire Roles tab — add/select/edit/delete roles"
```

---

## Chunk 4: Tab 3 — Permissions

### Task 8: `PermissionsPanel` — route toggles per role

**Files:**
- Create: `src/components/users/PermissionsPanel.tsx`

**Context:** Right panel of the Permissions tab. Shows a list of all app routes with toggle switches. Uses existing `setRolePerms` from `RolePermsContext` which persists to DB. Admin role and `/settings` route are always locked on. Grant All / Revoke All buttons at top. Includes `/users` in the route list (new route not in the old `PermissionsMatrix`).

- [ ] **Step 1: Create `src/components/users/PermissionsPanel.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useRoles, RoleDoc } from '../../context/RolesContext';
import { useRolePerms } from '../../context/RolePermsContext';
import { useToast } from '../ui/Toast';

const ALL_ROUTES = [
    { id: '/',           label: 'Task Board'  },
    { id: '/dashboard',  label: 'Dashboard'   },
    { id: '/messages',   label: 'Messages'    },
    { id: '/tasks',      label: 'Tasks'       },
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

    // Sync when role changes
    useEffect(() => {
        setLocalRoutes(role ? getAllowedRoutes(role.name) : []);
    }, [role?.appId]);

    if (!role) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                Select a role to manage permissions
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
            {/* Header */}
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

            {/* Route list */}
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && ./node_modules/.bin/tsc --noEmit
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add src/components/users/PermissionsPanel.tsx
git commit -m "feat: add PermissionsPanel — per-role route toggles with grant/revoke all"
```

---

### Task 9: Wire Permissions tab into `UsersPage`

**Files:**
- Modify: `src/pages/UsersPage.tsx`

**Context:** Replace the Permissions tab placeholder with `RoleListPanel` + `PermissionsPanel`. `selectedRoleId` is already owned by `UsersPage` so selecting a role in either Roles or Permissions tab shares the same state.

- [ ] **Step 1: Add `PermissionsPanel` import to `src/pages/UsersPage.tsx`**

```typescript
import { PermissionsPanel } from '../components/users/PermissionsPanel';
```

- [ ] **Step 2: Add `PermissionsTab` component in `src/pages/UsersPage.tsx` (alongside `RolesTab`)**

```typescript
interface PermissionsTabProps {
    selectedRoleId: string | null;
    onSelect: (id: string) => void;
}

const PermissionsTab: React.FC<PermissionsTabProps> = ({ selectedRoleId, onSelect }) => {
    const { roles } = useRoles();
    const { members } = useMembersContext();
    return (
        <div className="flex h-full">
            <RoleListPanel
                roles={roles}
                members={members}
                selectedRoleId={selectedRoleId}
                onSelect={onSelect}
            />
            <PermissionsPanel selectedRoleId={selectedRoleId} />
        </div>
    );
};
```

- [ ] **Step 3: Replace Permissions tab placeholder in the return**

```tsx
{activeTab === 'Permissions' && (
    <PermissionsTab
        selectedRoleId={selectedRoleId}
        onSelect={setSelectedRoleId}
    />
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && ./node_modules/.bin/tsc --noEmit
```
Expected: no output

- [ ] **Step 5: Commit**

```bash
git add src/pages/UsersPage.tsx
git commit -m "feat: wire Permissions tab — role list + route toggles"
```

---

## Chunk 5: Final wiring and also update PermissionsMatrix

### Task 10: Update `PermissionsMatrix` to include `/users` route

**Files:**
- Modify: `src/components/org/PermissionsMatrix.tsx`

**Context:** The old `PermissionsMatrix` (still used if referenced anywhere) does not include `/users` in its `ALL_PERM_ROUTES` list. Add it for consistency. Also verify no other stale references exist after the Organization page removal.

- [ ] **Step 1: Check if `PermissionsMatrix` is referenced anywhere**

```bash
grep -r "PermissionsMatrix" /Users/kkwenuja/Desktop/ProjectX/src --include="*.tsx" --include="*.ts" -l
```

If output is empty (no references after Organization page removal), skip to Step 3 (the component is orphaned and no update is needed).

If it IS referenced, add `/users` to `ALL_PERM_ROUTES` in `src/components/org/PermissionsMatrix.tsx` (after `/reports`, before `/settings`):
```typescript
    { id: '/users',      label: 'Users',        icon: Users        },
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && ./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 3: Commit (only if changes were made)**

```bash
git add src/components/org/PermissionsMatrix.tsx
git commit -m "fix: add /users route to PermissionsMatrix ALL_PERM_ROUTES"
```

---

### Task 11: Final verification

**Files:** none

- [ ] **Step 1: Full TypeScript check**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && ./node_modules/.bin/tsc --noEmit
```
Expected: no output (exit 0)

- [ ] **Step 2: Verify all new files exist**

```bash
ls src/pages/UsersPage.tsx src/components/users/UserRoleDrawer.tsx src/components/users/RoleListPanel.tsx src/components/users/RoleDetailPanel.tsx src/components/users/PermissionsPanel.tsx
```
Expected: all 5 files listed with no errors

- [ ] **Step 3: Verify route and provider wiring in App.tsx**

```bash
grep -n "users\|RolesProvider" src/App.tsx
```
Expected output should include:
- Line with `import UsersPage`
- Line with `import { RolesProvider }`
- Line with `<Route path="/users"`
- Lines with `<RolesProvider>` and `</RolesProvider>`

- [ ] **Step 4: Verify sidebar item**

```bash
grep "users" src/components/layout/Sidebar.tsx
```
Expected: line with `{ id: '/users', label: 'Users', icon: Users2 }`

- [ ] **Step 5: Verify admin allowedRoutes**

```bash
grep "allowedRoutes" src/context/RolePermsContext.tsx | head -1
```
Expected: admin's array includes `/users`

- [ ] **Step 6: Final commit if any fixes were made during verification**

```bash
git add -A
git commit -m "fix: final verification fixes for Users screen"
```
