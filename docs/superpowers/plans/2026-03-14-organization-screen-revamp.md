# Organization Screen Revamp Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revamp the Organization screen to support fully dynamic roles with per-role permissions, a rich user management view with profile editing and workload data, and a permissions matrix that scales to any number of custom roles.

**Architecture:** Add a `RolesContext` that owns the dynamic roles collection; extend `RolePermsContext` with local-state mutation methods; add `updateDisplayName` to `AuthContext`; rewrite `OrganizationPage` with 4 tabs (Overview/Users/Roles/Permissions) using extracted sub-components (`UserProfileDrawer`, `RoleCard`, `PermissionsMatrix`); add 6 new IPC handlers in `electron/main.ts` + `electron/preload.ts`.

**Tech Stack:** React 18, TypeScript, Framer Motion, Lucide React, Mongoose (MongoDB Atlas), Electron IPC

---

## Chunk 1: Schema, IPC, and Type Changes

### Task 1: Relax role enum constraints

**Files:**
- Modify: `electron/main.ts:16` — `UserSchema.role`
- Modify: `electron/main.ts:93` — `AuthUserSchema.role`
- Modify: `electron/main.ts:325-351` — `db:auth:seedDefault` handler (add Role seeding)
- Modify: `src/context/AuthContext.tsx` — `AuthUser.role`, `register` signature

- [ ] **Step 1: Update `UserSchema.role` in `electron/main.ts`**

Change line 16 from:
```ts
role: { type: String, enum: ['admin', 'manager', 'member'], default: 'member' },
```
To:
```ts
role: { type: String, default: 'member' },
```

- [ ] **Step 2: Update `AuthUserSchema.role` in `electron/main.ts`**

Change line 93 from:
```ts
role: { type: String, enum: ['admin', 'manager', 'member'], default: 'member' },
```
To:
```ts
role: { type: String, default: 'member' },
```

- [ ] **Step 3: Update `AuthUser` interface and `register` signature in `src/context/AuthContext.tsx`**

Change `AuthUser.role` from:
```ts
role: 'admin' | 'manager' | 'member';
```
To:
```ts
role: string;
```

Change `AuthContextValue.register` parameter from:
```ts
register: (name: string, email: string, password: string, role: 'admin' | 'manager' | 'member') => Promise<void>;
```
To:
```ts
register: (name: string, email: string, password: string, role: string) => Promise<void>;
```

Change the `register` useCallback signature (line ~94) from:
```ts
role: 'admin' | 'manager' | 'member'
```
To:
```ts
role: string
```

Change the `authApi()` local const `register` type from:
```ts
register: (name: string, email: string, password: string, role: 'admin' | 'manager' | 'member') => Promise<AuthUser>;
```
To:
```ts
register: (name: string, email: string, password: string, role: string) => Promise<AuthUser>;
```

- [ ] **Step 4: Commit**

```bash
git add electron/main.ts src/context/AuthContext.tsx
git commit -m "chore: relax role enum constraints in schemas and AuthContext"
```

---

### Task 2: Add `RoleSchema` and `RoleModel` to `electron/main.ts`

**Files:**
- Modify: `electron/main.ts` — add `RoleSchema`/`RoleModel` after existing schemas (after line 154), seed in `seedDefault`

- [ ] **Step 1: Add `RoleSchema` and `RoleModel` after line 154**

After the line `const RolePermsModel = mongoose.model('RolePerms', RolePermsSchema);`, add:

```ts
const RoleSchema = new Schema({
    appId: { type: String, required: true, unique: true },
    name:  { type: String, required: true, unique: true },
    color: { type: String, default: '#9CA3AF' },
});
const RoleModel = mongoose.model('Role', RoleSchema);
```

- [ ] **Step 2: Seed default roles in `db:auth:seedDefault` handler**

Inside the `ipcMain.handle('db:auth:seedDefault', ...)` handler (after existing seeding logic, before the closing `}`), add:

```ts
// Seed default roles if none exist
const roleCount = await RoleModel.countDocuments();
if (roleCount === 0) {
    await RoleModel.insertMany([
        { appId: 'role_admin',   name: 'admin',   color: '#5030E5' },
        { appId: 'role_manager', name: 'manager', color: '#D97706' },
        { appId: 'role_member',  name: 'member',  color: '#9CA3AF' },
    ]);
}
```

- [ ] **Step 3: Commit**

```bash
git add electron/main.ts
git commit -m "feat: add RoleModel and seed default roles in seedDefault"
```

---

### Task 3: Add 6 new IPC handlers in `electron/main.ts`

**Files:**
- Modify: `electron/main.ts` — add handlers inside `registerDbHandlers()`, after the existing `db:roleperms:set` handler (after line 371)

- [ ] **Step 1: Add `toRole` helper after existing helpers (after line 184)**

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toRole = (d: any) => ({ appId: d.appId, name: d.name, color: d.color ?? '#9CA3AF' });
```

- [ ] **Step 2: Add 6 IPC handlers inside `registerDbHandlers()` after `db:roleperms:set`**

```ts
// Roles (dynamic role management)
ipcMain.handle('db:roles:getAll', async () => {
    const docs = await RoleModel.find().lean() as any[];
    return safe(docs.map(toRole));
});

ipcMain.handle('db:roles:create', async (_e, data: { name: string; color: string }) => {
    if (data.name === 'admin') throw new Error('Cannot create a role named admin.');
    const existing = await RoleModel.findOne({ name: data.name }).lean();
    if (existing) throw new Error(`Role "${data.name}" already exists.`);
    const d = await RoleModel.create({ appId: `role_${Date.now()}`, name: data.name, color: data.color });
    return safe(toRole(d.toObject()));
});

ipcMain.handle('db:roles:updateColor', async (_e, data: { appId: string; color: string }) => {
    const d = await RoleModel.findOneAndUpdate({ appId: data.appId }, { color: data.color }, { new: true }).lean();
    if (!d) throw new Error('Role not found.');
    return safe(toRole(d));
});

ipcMain.handle('db:roles:rename', async (_e, data: { appId: string; newName: string }) => {
    const role = await RoleModel.findOne({ appId: data.appId }).lean() as any;
    if (!role) throw new Error('Role not found.');
    if (role.name === 'admin') throw new Error('Cannot rename the admin role.');
    const conflict = await RoleModel.findOne({ name: data.newName }).lean();
    if (conflict) throw new Error(`Role "${data.newName}" already exists.`);
    const oldName = role.name;
    await RoleModel.findOneAndUpdate({ appId: data.appId }, { name: data.newName });
    // Cascade: RolePerms — delete old, insert new with same routes
    const oldPerms = await RolePermsModel.findOne({ role: oldName }).lean() as any;
    const allowedRoutes = oldPerms?.allowedRoutes ?? ['/settings'];
    await RolePermsModel.deleteOne({ role: oldName });
    await RolePermsModel.create({ role: data.newName, allowedRoutes });
    // Cascade: User and AuthUser role fields
    await UserModel.updateMany({ role: oldName }, { role: data.newName });
    await AuthUserModel.updateMany({ role: oldName }, { role: data.newName });
    return safe({ ok: true, oldName });
});

ipcMain.handle('db:roles:delete', async (_e, data: { appId: string }) => {
    const role = await RoleModel.findOne({ appId: data.appId }).lean() as any;
    if (!role) throw new Error('Role not found.');
    if (role.name === 'admin') throw new Error('Cannot delete the admin role.');
    await RoleModel.deleteOne({ appId: data.appId });
    return safe({ ok: true });
});

ipcMain.handle('db:roleperms:delete', async (_e, data: { roleName: string }) => {
    await RolePermsModel.deleteOne({ role: data.roleName });
    return safe({ ok: true });
});
```

- [ ] **Step 3: Commit**

```bash
git add electron/main.ts
git commit -m "feat: add IPC handlers for dynamic role CRUD"
```

---

### Task 4: Expose new IPC methods in `electron/preload.ts`

**Files:**
- Modify: `electron/preload.ts:143-146` — add 6 new methods inside `db:` block

- [ ] **Step 1: Add new methods to the `db` object in `preload.ts` after `setRolePerms`**

After `setRolePerms: (data: object): Promise<unknown> => ipcRenderer.invoke('db:roleperms:set', data),`, add:

```ts
// Roles (dynamic)
getRoles:        ():                    Promise<unknown[]> => ipcRenderer.invoke('db:roles:getAll'),
createRole:      (data: object):        Promise<unknown>   => ipcRenderer.invoke('db:roles:create', data),
updateRoleColor: (data: object):        Promise<unknown>   => ipcRenderer.invoke('db:roles:updateColor', data),
renameRole:      (data: object):        Promise<unknown>   => ipcRenderer.invoke('db:roles:rename', data),
deleteRole:      (data: object):        Promise<unknown>   => ipcRenderer.invoke('db:roles:delete', data),
deleteRolePerms: (data: object):        Promise<unknown>   => ipcRenderer.invoke('db:roleperms:delete', data),
```

- [ ] **Step 2: Compile `.ts` → `.js`**

The project compiles `electron/main.ts` and `electron/preload.ts` to their `.js` counterparts for Electron to load. Run the build step:

```bash
cd /Users/kkwenuja/Desktop/ProjectX && npm run build:electron 2>/dev/null || npx tsc --project electron/tsconfig.json 2>/dev/null || echo "Check build script in package.json"
```

If that fails, check `package.json` for the correct build script name and run it to regenerate `electron/main.js` and `electron/preload.js`.

- [ ] **Step 3: Commit**

```bash
git add electron/preload.ts electron/preload.js electron/main.js
git commit -m "feat: expose dynamic role IPC methods in preload"
```

---

## Chunk 2: Context Layer

### Task 5: Create `RolesContext`

**Files:**
- Create: `src/context/RolesContext.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbApi = () => (window as any).electronAPI.db;

export interface RoleDoc {
    appId: string;
    name: string;
    color: string;
}

interface RolesContextType {
    roles: RoleDoc[];
    loadRoles: () => Promise<void>;
    addRole: (role: RoleDoc) => void;
    updateRoleLocal: (appId: string, changes: Partial<RoleDoc>) => void;
    renameRoleLocal: (appId: string, newName: string) => void;
    removeRole: (appId: string) => void;
}

const RolesContext = createContext<RolesContextType>({
    roles: [],
    loadRoles: async () => {},
    addRole: () => {},
    updateRoleLocal: () => {},
    renameRoleLocal: () => {},
    removeRole: () => {},
});

export const useRoles = () => useContext(RolesContext);

export const RolesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [roles, setRoles] = useState<RoleDoc[]>([]);

    const loadRoles = useCallback(async () => {
        try {
            const docs = await dbApi().getRoles() as RoleDoc[];
            setRoles(docs);
        } catch (err) {
            console.error('[RolesContext] Failed to load roles:', err);
        }
    }, []);

    useEffect(() => { loadRoles(); }, [loadRoles]);

    const addRole = useCallback((role: RoleDoc) => {
        setRoles(prev => [...prev, role]);
    }, []);

    const updateRoleLocal = useCallback((appId: string, changes: Partial<RoleDoc>) => {
        setRoles(prev => prev.map(r => r.appId === appId ? { ...r, ...changes } : r));
    }, []);

    const renameRoleLocal = useCallback((appId: string, newName: string) => {
        setRoles(prev => prev.map(r => r.appId === appId ? { ...r, name: newName } : r));
    }, []);

    const removeRole = useCallback((appId: string) => {
        setRoles(prev => prev.filter(r => r.appId !== appId));
    }, []);

    return (
        <RolesContext.Provider value={{ roles, loadRoles, addRole, updateRoleLocal, renameRoleLocal, removeRole }}>
            {children}
        </RolesContext.Provider>
    );
};
```

- [ ] **Step 2: Register `RolesProvider` in `src/App.tsx`**

Open `src/App.tsx`. Find where `RolePermsProvider` is used and wrap it (or its parent) with `RolesProvider`:

```tsx
import { RolesProvider } from './context/RolesContext';

// In JSX, add RolesProvider alongside existing providers:
<RolesProvider>
  <RolePermsProvider>
    {/* existing children */}
  </RolePermsProvider>
</RolesProvider>
```

- [ ] **Step 3: Commit**

```bash
git add src/context/RolesContext.tsx src/App.tsx
git commit -m "feat: add RolesContext for dynamic role management"
```

---

### Task 6: Extend `RolePermsContext` with mutation methods

**Files:**
- Modify: `src/context/RolePermsContext.tsx`

- [ ] **Step 1: Add 3 mutation methods to `RolePermsContextType` interface**

In `src/context/RolePermsContext.tsx`, extend the `RolePermsContextType` interface:

```ts
interface RolePermsContextType {
    perms: RolePerms[];
    getAllowedRoutes: (role: string) => string[];
    setRolePerms: (role: string, allowedRoutes: string[]) => Promise<void>;
    addRolePerms: (entry: RolePerms) => void;
    renameRolePerms: (oldName: string, newName: string) => void;
    removeRolePerms: (roleName: string) => void;
}
```

- [ ] **Step 2: Implement the 3 methods in `RolePermsProvider`**

Inside `RolePermsProvider`, add after the existing `setRolePerms` useCallback:

```ts
const addRolePerms = useCallback((entry: RolePerms) => {
    setPerms(prev => [...prev, entry]);
}, []);

const renameRolePerms = useCallback((oldName: string, newName: string) => {
    setPerms(prev => prev.map(p => p.role === oldName ? { ...p, role: newName } : p));
}, []);

const removeRolePerms = useCallback((roleName: string) => {
    setPerms(prev => prev.filter(p => p.role !== roleName));
}, []);
```

- [ ] **Step 3: Add methods to the context default value and Provider value**

Update the `createContext` default:
```ts
export const RolePermsContext = createContext<RolePermsContextType>({
    perms: DEFAULT_PERMS,
    getAllowedRoutes: (role) => DEFAULT_PERMS.find(p => p.role === role)?.allowedRoutes ?? ['/settings'],
    setRolePerms: async () => {},
    addRolePerms: () => {},
    renameRolePerms: () => {},
    removeRolePerms: () => {},
});
```

Update the `<RolePermsContext.Provider value={...}>` to include the 3 new methods.

- [ ] **Step 4: Commit**

```bash
git add src/context/RolePermsContext.tsx
git commit -m "feat: extend RolePermsContext with addRolePerms/renameRolePerms/removeRolePerms"
```

---

### Task 7: Add `updateDisplayName` to `AuthContext`

**Files:**
- Modify: `src/context/AuthContext.tsx`

- [ ] **Step 1: Add `updateDisplayName` to `AuthContextValue` interface**

In `src/context/AuthContext.tsx`, add to the `AuthContextValue` interface:

```ts
updateDisplayName: (name: string) => void;
```

- [ ] **Step 2: Implement `updateDisplayName` in `AuthProvider`**

Inside `AuthProvider`, add after `updatePassword`:

```ts
const updateDisplayName = useCallback((name: string) => {
    setUser(prev => {
        if (!prev) return prev;
        const updated = { ...prev, name };
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
        return updated;
    });
}, []);
```

- [ ] **Step 3: Add `updateDisplayName` to the Provider value**

In the `<AuthContext.Provider value={{...}}>`, add `updateDisplayName`.

- [ ] **Step 4: Commit**

```bash
git add src/context/AuthContext.tsx
git commit -m "feat: add updateDisplayName to AuthContext"
```

---

## Chunk 3: Sub-components

### Task 8: Create `UserProfileDrawer`

**Files:**
- Create: `src/components/org/UserProfileDrawer.tsx`

- [ ] **Step 1: Create the file with the complete implementation**

```tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Save } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useMembersContext } from '../../context/MembersContext';
import { useAuth } from '../../context/AuthContext';
import { useRoles } from '../../context/RolesContext';
import { useProjects } from '../../context/ProjectContext';
import { useToast } from '../ui/Toast';
import { User } from '../../types';
import { useNavigate } from 'react-router-dom';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authApi = () => (window as any).electronAPI.auth as {
    updateRole: (userId: string, role: string) => Promise<boolean>;
    updateName: (userId: string, newName: string) => Promise<void>;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbApi = () => (window as any).electronAPI.db;

interface AuthUserRow { id: string; name: string; email: string; role: string; }

interface Props {
    user: AuthUserRow;
    member: User | undefined;
    getMemberColor: (id: string) => string;
    onClose: () => void;
    onSaved: (userId: string, changes: Partial<AuthUserRow & User>) => void;
}

const roleStyles: Record<string, { bg: string; text: string; dot: string }> = {
    admin:   { bg: 'bg-primary-50',  text: 'text-primary-600', dot: 'bg-primary-500' },
    manager: { bg: 'bg-[#FFFBEB]',   text: 'text-[#D97706]',   dot: 'bg-[#D97706]'  },
    member:  { bg: 'bg-surface-200', text: 'text-gray-500',    dot: 'bg-gray-300'   },
};
const getRoleStyle = (role: string) => roleStyles[role] ?? { bg: 'bg-surface-100', text: 'text-gray-600', dot: 'bg-gray-400' };

export const UserProfileDrawer: React.FC<Props> = ({ user, member, getMemberColor, onClose, onSaved }) => {
    const { updateMember } = useMembersContext();
    const { user: authUser, updateDisplayName } = useAuth();
    const { roles } = useRoles();
    const { allTasks } = useProjects();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [name, setName]           = useState(user.name);
    const [designation, setDesig]   = useState(member?.designation ?? '');
    const [location, setLocation]   = useState(member?.location ?? '');
    const [status, setStatus]       = useState<'active' | 'inactive'>(member?.status ?? 'active');
    const [role, setRole]           = useState(user.role);
    const [saving, setSaving]       = useState(false);

    const isSelf = user.id === authUser?.id;

    const assignedTasks = allTasks.filter(t => t.assignees.includes(user.id));
    const totalTasks = allTasks.length;
    const barPct = totalTasks > 0 ? Math.min(100, (assignedTasks.length / totalTasks) * 100) : 0;

    const handleSave = async () => {
        setSaving(true);
        try {
            // Name — update both User and AuthUser collections
            if (name !== user.name) {
                await dbApi().updateMember(user.id, { name });
                await authApi().updateName(user.id, name);
                if (isSelf) updateDisplayName(name);
            }
            // Profile fields
            if (member) {
                await dbApi().updateMember(user.id, { designation, location, status });
            }
            // Role
            if (role !== user.role && !isSelf) {
                await authApi().updateRole(user.id, role);
                await dbApi().updateMember(user.id, { role });
                await updateMember(user.id, { role });
            }
            onSaved(user.id, { name, designation, location, status, role });
            showToast('Profile updated.', 'success');
            onClose();
        } catch {
            showToast('Failed to save changes.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const rs = getRoleStyle(role);

    return (
        <motion.div
            className="fixed inset-0 top-16 z-50 flex"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
            <div className="flex-1 bg-black/30" onClick={onClose} />
            <motion.div
                className="w-[420px] bg-white h-full overflow-y-auto border-l border-surface-200 flex flex-col"
                initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
                transition={{ duration: 0.3 }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">User Profile</span>
                    <button onClick={onClose} className="p-1 rounded hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Avatar + name */}
                <div className="px-5 py-5 flex flex-col items-center gap-3 border-b border-surface-100 shrink-0">
                    <Avatar name={user.name} color={getMemberColor(user.id)} size="lg" />
                    <div className="text-center">
                        <div className="text-base font-bold text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                    </div>
                </div>

                {/* Editable fields */}
                <div className="px-5 py-4 flex flex-col gap-3 flex-1">
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Name</label>
                        <input
                            value={name} onChange={e => setName(e.target.value)}
                            className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Designation</label>
                        <input
                            value={designation} onChange={e => setDesig(e.target.value)}
                            placeholder="e.g. Senior Engineer"
                            className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Location</label>
                        <input
                            value={location} onChange={e => setLocation(e.target.value)}
                            placeholder="e.g. Nairobi"
                            className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Status</label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setStatus('active')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${status === 'active' ? 'bg-[#ECFDF3] text-[#16A34A] border-[#BBF7D0]' : 'bg-surface-100 text-gray-400 border-surface-200'}`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" /> Active
                            </button>
                            <button
                                onClick={() => setStatus('inactive')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${status === 'inactive' ? 'bg-surface-200 text-gray-600 border-surface-300' : 'bg-surface-100 text-gray-400 border-surface-200'}`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Inactive
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Role</label>
                        {isSelf ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${rs.bg} ${rs.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${rs.dot}`} />{role}<span className="opacity-40 text-[9px]">you</span>
                            </span>
                        ) : (
                            <select
                                value={role} onChange={e => setRole(e.target.value)}
                                className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 bg-white transition-all"
                            >
                                {roles.map(r => (
                                    <option key={r.appId} value={r.name}>{r.name.charAt(0).toUpperCase() + r.name.slice(1)}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Workload */}
                    <div className="pt-1 border-t border-surface-100">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Workload</label>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-primary-400 transition-all" style={{ width: `${barPct}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-600 shrink-0">{assignedTasks.length} tasks</span>
                        </div>
                    </div>

                    {/* Task list */}
                    {assignedTasks.length > 0 && (
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Assigned Tasks</label>
                            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                                {assignedTasks.map(t => (
                                    <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-50 text-xs">
                                        <span className="flex-1 text-gray-700 font-medium truncate">{t.title}</span>
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${t.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-surface-200 text-gray-500'}`}>{t.status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-5 py-4 border-t border-surface-100 shrink-0 flex gap-3">
                    <motion.button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 bg-primary-500 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors"
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    >
                        <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
                    </motion.button>
                    <motion.button
                        onClick={() => navigate('/messages', { state: { memberId: user.id } })}
                        className="flex items-center gap-2 border border-surface-200 text-gray-600 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-surface-50 transition-colors"
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    >
                        <Send size={14} />
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/org/UserProfileDrawer.tsx
git commit -m "feat: add UserProfileDrawer component"
```

---

### Task 9: Create `RoleCard`

**Files:**
- Create: `src/components/org/RoleCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Lock, Trash2 } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { RoleDoc } from '../../context/RolesContext';
import { RolePerms } from '../../context/RolePermsContext';
import { PROJECT_COLORS } from '../../data/mockData';

interface AuthUserRow { id: string; name: string; email: string; role: string; }

interface Props {
    role: RoleDoc;
    isAdmin: boolean;           // true = this is the locked admin card
    expanded: boolean;
    onToggle: () => void;
    authUsers: AuthUserRow[];
    perms: RolePerms[];
    totalRoutes: number;
    getMemberColor: (id: string) => string;
    onRename: (appId: string, newName: string) => Promise<void>;
    onColorChange: (appId: string, color: string) => Promise<void>;
    onDelete: (appId: string, name: string) => Promise<void>;
}

export const RoleCard: React.FC<Props> = ({
    role, isAdmin, expanded, onToggle, authUsers, perms, totalRoutes,
    getMemberColor, onRename, onColorChange, onDelete,
}) => {
    const [nameValue, setNameValue] = useState(role.name);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);

    const members = authUsers.filter(u => u.role === role.name);
    const allowedRoutes = perms.find(p => p.role === role.name)?.allowedRoutes ?? ['/settings'];
    const coveragePct = totalRoutes > 0 ? (allowedRoutes.length / totalRoutes) * 100 : 0;

    const handleNameBlur = async () => {
        const trimmed = nameValue.trim();
        if (!trimmed || trimmed === role.name) { setNameValue(role.name); return; }
        try { await onRename(role.appId, trimmed); }
        catch { setNameValue(role.name); }
    };

    const handleColorClick = async (color: string) => {
        try { await onColorChange(role.appId, color); }
        catch { /* error handled by parent */ }
    };

    const handleDelete = async () => {
        try { await onDelete(role.appId, role.name); }
        catch { setConfirmDelete(false); }
    };

    return (
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
            {/* Collapsed header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-surface-50 transition-colors text-left"
            >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: role.color }} />
                <span className="flex-1 font-semibold text-gray-900 text-sm capitalize">{role.name}</span>
                {isAdmin && <span className="text-[10px] text-gray-400 font-medium px-2 py-0.5 rounded-full bg-surface-100 border border-surface-200 flex items-center gap-1"><Lock size={9} /> System role</span>}
                <span className="text-xs text-gray-400 shrink-0">{members.length} user{members.length !== 1 ? 's' : ''}</span>
                {/* Coverage bar */}
                <div className="w-16 h-1.5 bg-surface-200 rounded-full overflow-hidden shrink-0">
                    <div className="h-full rounded-full" style={{ width: `${coveragePct}%`, background: role.color }} />
                </div>
                <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={14} className="text-gray-400" />
                </motion.div>
            </button>

            {/* Expanded body */}
            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="px-5 pb-5 pt-1 border-t border-surface-100 flex flex-col gap-4">
                            {isAdmin ? (
                                <p className="text-xs text-gray-400 italic">Admin has full access and cannot be modified.</p>
                            ) : (
                                <>
                                    {/* Name */}
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Role Name</label>
                                        <input
                                            ref={nameRef}
                                            value={nameValue}
                                            onChange={e => setNameValue(e.target.value)}
                                            onBlur={handleNameBlur}
                                            onKeyDown={e => { if (e.key === 'Enter') nameRef.current?.blur(); if (e.key === 'Escape') { setNameValue(role.name); nameRef.current?.blur(); } }}
                                            className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                                        />
                                    </div>
                                    {/* Color */}
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Color</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {PROJECT_COLORS.map(c => (
                                                <button
                                                    key={c} type="button"
                                                    onClick={() => handleColorClick(c)}
                                                    className={`w-7 h-7 rounded-full transition-all ${role.color === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Members */}
                            {members.length > 0 && (
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Members ({members.length})</label>
                                    <div className="flex flex-wrap gap-2">
                                        {members.map(m => (
                                            <div key={m.id} className="flex items-center gap-1.5 bg-surface-50 rounded-full px-2.5 py-1">
                                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ background: getMemberColor(m.id) }}>{m.name.charAt(0).toUpperCase()}</div>
                                                <span className="text-xs text-gray-700 font-medium">{m.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Delete */}
                            {!isAdmin && (
                                <div className="pt-1 border-t border-surface-100">
                                    {confirmDelete ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 flex-1">Delete role "{role.name}"?</span>
                                            <button onClick={handleDelete} className="text-xs font-bold text-red-500 hover:text-red-700 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">Confirm</button>
                                            <button onClick={() => setConfirmDelete(false)} className="text-xs font-bold text-gray-500 hover:text-gray-700 px-2.5 py-1 rounded-lg bg-surface-100 hover:bg-surface-200 transition-colors">Cancel</button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDelete(true)}
                                            disabled={members.length > 0}
                                            title={members.length > 0 ? 'Reassign all users first' : undefined}
                                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${members.length > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:text-red-700 hover:bg-red-50'}`}
                                        >
                                            <Trash2 size={12} /> Delete Role
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/org/RoleCard.tsx
git commit -m "feat: add RoleCard component"
```

---

### Task 10: Create `PermissionsMatrix`

**Files:**
- Create: `src/components/org/PermissionsMatrix.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, FolderKanban, BarChart2, Settings2, Users, ChevronRight, Building2 } from 'lucide-react';
import { RoleDoc } from '../../context/RolesContext';
import { RolePerms, useRolePerms } from '../../context/RolePermsContext';
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/org/PermissionsMatrix.tsx
git commit -m "feat: add PermissionsMatrix component"
```

---

## Chunk 4: OrganizationPage Rewrite

### Task 11: Rewrite `OrganizationPage`

**Files:**
- Modify: `src/pages/OrganizationPage.tsx` — full rewrite; preserve Overview section verbatim

- [ ] **Step 1: Replace the file with the new 4-tab implementation**

The new `OrganizationPage.tsx` keeps all existing Overview logic (stat cards, DepartmentDirectory, modals) exactly as-is, adds the Users/Roles/Permissions tabs, and wires up all sub-components. Replace the entire file with:

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Building2, Users, User, MapPin, BarChart2, FolderKanban, Settings2, X, Plus,
    ChevronDown, Shield, Search, RefreshCw,
} from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { useMembersContext } from '../context/MembersContext';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { useRolePerms } from '../context/RolePermsContext';
import { useRoles } from '../context/RolesContext';
import { useToast } from '../components/ui/Toast';
import { PROJECT_COLORS } from '../data/mockData';
import { UserProfileDrawer } from '../components/org/UserProfileDrawer';
import { RoleCard } from '../components/org/RoleCard';
import { PermissionsMatrix } from '../components/org/PermissionsMatrix';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbApi   = () => (window as any).electronAPI.db;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authApi = () => (window as any).electronAPI.auth as {
    getAll: () => Promise<AuthUserRow[]>;
    updateRole: (id: string, role: string) => Promise<boolean>;
};

const roleStyles: Record<string, { bg: string; text: string; dot: string }> = {
    admin:   { bg: 'bg-primary-50',   text: 'text-primary-600', dot: 'bg-primary-500' },
    manager: { bg: 'bg-[#FFFBEB]',    text: 'text-[#D97706]',   dot: 'bg-[#D97706]'  },
    member:  { bg: 'bg-surface-200',  text: 'text-gray-500',    dot: 'bg-gray-300'   },
};
const getRoleStyle = (role: string) => roleStyles[role] ?? { bg: 'bg-surface-100', text: 'text-gray-600', dot: 'bg-gray-400' };

interface DeptEntry { id?: string; name: string; icon: React.ElementType; color: string; memberIds: string[]; }
interface OrgUser   { id: string; name: string; role: string; designation?: string; location?: string; }
interface AuthUserRow { id: string; name: string; email: string; role: string; }

// ── Dept Directory ─ (preserved verbatim) ─────────────────────────────────────
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

// ── Nav ────────────────────────────────────────────────────────────────────────
type SectionId = 'overview' | 'users' | 'roles' | 'permissions';
interface OrgNavItem { id: SectionId; label: string; icon: React.ElementType; adminOnly?: boolean; }
const NAV_ITEMS: OrgNavItem[] = [
    { id: 'overview',    label: 'Overview',          icon: Building2 },
    { id: 'users',       label: 'Users',             icon: Users,    adminOnly: true },
    { id: 'roles',       label: 'Roles',             icon: User,     adminOnly: true },
    { id: 'permissions', label: 'Permissions',       icon: Shield,   adminOnly: true },
];

// ── Main page ─────────────────────────────────────────────────────────────────
const OrganizationPage: React.FC = () => {
    const { members, getMemberColor, updateMember } = useMembersContext();
    const { allTasks } = useProjects();
    const { user: authUser } = useAuth();
    const { perms, addRolePerms, renameRolePerms, removeRolePerms } = useRolePerms();
    const { roles, addRole, updateRoleLocal, renameRoleLocal, removeRole } = useRoles();
    const { showToast } = useToast();
    const isAdmin = authUser?.role === 'admin';

    const [section, setSection] = useState<SectionId>('overview');

    // ── Overview state (preserved verbatim) ────────────────────────────────────
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
        { label: 'Total Members', value: String(members.length),    trend: 'In org',       color: '',        accent: true,  icon: Users,    barPct: 100 },
        { label: 'Departments',   value: String(deptRoster.length), trend: 'Roles',         color: '#5030E5', accent: false, icon: Building2, barPct: 100 },
        { label: 'Locations',     value: String(locationCount),     trend: 'Cities',        color: '#30C5E5', accent: false, icon: MapPin,   barPct: 100 },
        { label: 'Avg Workload',  value: avgWorkload,               trend: 'tasks/member',  color: '#FFA500', accent: false, icon: BarChart2, barPct: Math.min(100, parseFloat(avgWorkload) * 10) },
    ];

    // ── Users tab state ─────────────────────────────────────────────────────────
    const [authUsers, setAuthUsers] = useState<AuthUserRow[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<AuthUserRow | null>(null);

    const loadUsers = useCallback(async () => {
        setUsersLoading(true);
        try { setAuthUsers(await authApi().getAll()); }
        catch { showToast('Failed to load users.', 'error'); }
        finally { setUsersLoading(false); }
    }, [showToast]);

    useEffect(() => {
        if (isAdmin) loadUsers();
    }, [isAdmin, loadUsers]);

    useEffect(() => {
        if (!isAdmin && section !== 'overview') setSection('overview');
    }, [isAdmin, section]);

    const filteredUsers = authUsers.filter(u => {
        const q = search.toLowerCase();
        return (roleFilter === 'all' || u.role === roleFilter) &&
               (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    });

    // ── Roles tab state ─────────────────────────────────────────────────────────
    const [expandedRole, setExpandedRole] = useState<string | null>(null);
    const [showNewRole, setShowNewRole] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleColor, setNewRoleColor] = useState(PROJECT_COLORS[0]);

    const handleCreateRole = async () => {
        const name = newRoleName.trim().toLowerCase();
        if (!name) return;
        if (roles.some(r => r.name === name)) { showToast(`Role "${name}" already exists.`, 'error'); return; }
        try {
            const created = await dbApi().createRole({ name, color: newRoleColor }) as { appId: string; name: string; color: string };
            await dbApi().setRolePerms({ role: name, allowedRoutes: ['/settings'] });
            addRole(created);
            addRolePerms({ role: name, allowedRoutes: ['/settings'] });
            setNewRoleName(''); setNewRoleColor(PROJECT_COLORS[0]); setShowNewRole(false);
            setExpandedRole(created.appId);
            showToast(`Role "${name}" created.`, 'success');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to create role.';
            showToast(msg, 'error');
        }
    };

    const handleRenameRole = async (appId: string, newName: string) => {
        const trimmed = newName.trim().toLowerCase();
        try {
            const result = await dbApi().renameRole({ appId, newName: trimmed }) as { ok: boolean; oldName: string };
            if (!result.ok) throw new Error('Rename failed.');
            renameRoleLocal(appId, trimmed);
            renameRolePerms(result.oldName, trimmed);
            await loadUsers();
            showToast(`Role renamed to "${trimmed}".`, 'success');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to rename role.';
            showToast(msg, 'error');
            throw err; // re-throw so RoleCard can revert field
        }
    };

    const handleColorChange = async (appId: string, color: string) => {
        try {
            await dbApi().updateRoleColor({ appId, color });
            updateRoleLocal(appId, { color });
        } catch { showToast('Failed to update color.', 'error'); }
    };

    const handleDeleteRole = async (appId: string, name: string) => {
        try {
            await dbApi().deleteRole({ appId });
            await dbApi().deleteRolePerms({ roleName: name });
            removeRole(appId);
            removeRolePerms(name);
            showToast(`Role "${name}" deleted.`, 'success');
        } catch { showToast('Failed to delete role.', 'error'); throw new Error('delete failed'); }
    };

    const visibleNavItems = NAV_ITEMS.filter(n => !n.adminOnly || isAdmin);

    return (
        <div className="flex flex-row h-full overflow-hidden bg-white">

            {/* ── Left nav ── */}
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
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm font-medium transition-colors ${active ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700'}`}
                                >
                                    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                                    {item.label}
                                </button>
                            </div>
                        );
                    })}
                </nav>
            </div>

            {/* ── Right content ── */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
                <AnimatePresence mode="wait">

                    {/* ── Overview (verbatim) ── */}
                    {section === 'overview' && (
                        <motion.div key="overview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                            <div className="flex items-center justify-between mb-1">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Overview</h2>
                                    <p className="text-sm text-gray-400 mt-0.5">Team structure &amp; metrics</p>
                                </div>
                                {isAdmin && (
                                    <motion.button onClick={() => setShowAddDept(true)} className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                        <Plus size={15} /> New Department
                                    </motion.button>
                                )}
                            </div>
                            <div className="grid grid-cols-4 gap-5 mt-6">
                                {metrics.map((m, i) => {
                                    const Icon = m.icon;
                                    return (
                                        <motion.div key={m.label} className={`rounded-2xl p-5 ${m.accent ? 'bg-gradient-to-br from-primary-500 to-primary-400 text-white' : 'bg-white border border-surface-200'}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.08 }}>
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
                            <div className="mt-6">
                                <DepartmentDirectory deptRoster={deptRoster} members={members} getMemberColor={getMemberColor} onAddMember={setAddMemberToDept} />
                            </div>
                        </motion.div>
                    )}

                    {/* ── Users ── */}
                    {section === 'users' && isAdmin && (
                        <motion.div key="users" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                            <div className="flex items-center justify-between mb-1">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Users</h2>
                                    <p className="text-sm text-gray-400 mt-0.5">Manage users and assign roles</p>
                                </div>
                                <button onClick={loadUsers} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-surface-100 transition-colors" title="Refresh">
                                    <RefreshCw size={14} className={usersLoading ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            {/* Role filter pills */}
                            <div className="flex items-center gap-2 mt-5">
                                <div className="relative flex-1 max-w-sm">
                                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…" className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-xl focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all" />
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                    {(['all', ...roles.map(r => r.name)] as string[]).map(f => (
                                        <button key={f} onClick={() => setRoleFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${roleFilter === f ? 'bg-primary-500 text-white' : 'bg-surface-100 text-gray-500 hover:bg-surface-200'}`}>
                                            {f === 'all' ? 'All' : f}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Table */}
                            <div className="mt-4 rounded-2xl border border-surface-200 overflow-hidden">
                                <div className="grid grid-cols-[32px_1fr_1fr_140px_120px_80px] gap-4 px-5 py-3 bg-surface-50 border-b border-surface-100">
                                    {['', 'Name', 'Email', 'Role', 'Workload', 'Tasks'].map((h, i) => (
                                        <div key={i} className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</div>
                                    ))}
                                </div>
                                {usersLoading ? (
                                    <div className="py-12 text-center text-sm text-gray-400">Loading users…</div>
                                ) : filteredUsers.length === 0 ? (
                                    <div className="py-12 text-center text-sm text-gray-400">No users found.</div>
                                ) : (
                                    <div className="divide-y divide-surface-100">
                                        {filteredUsers.map((u, i) => {
                                            const rs = getRoleStyle(u.role);
                                            const assigned = allTasks.filter(t => t.assignees.includes(u.id)).length;
                                            const barPct = allTasks.length > 0 ? Math.min(100, (assigned / allTasks.length) * 100) : 0;
                                            return (
                                                <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.025 }}
                                                    className="grid grid-cols-[32px_1fr_1fr_140px_120px_80px] gap-4 px-5 py-3.5 items-center hover:bg-surface-50 transition-colors cursor-pointer"
                                                    onClick={() => setSelectedUser(u)}
                                                >
                                                    <Avatar name={u.name} color={getMemberColor(u.id)} size="sm" />
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-gray-900 truncate">{u.name}</div>
                                                        {u.id === authUser?.id && <div className="text-[10px] text-primary-400 font-medium">You</div>}
                                                    </div>
                                                    <div className="text-sm text-gray-500 truncate">{u.email}</div>
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${rs.bg} ${rs.text} w-fit`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${rs.dot}`} />{u.role}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full bg-primary-400" style={{ width: `${barPct}%` }} />
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 shrink-0">{assigned}/{allTasks.length}</span>
                                                    </div>
                                                    <div className="text-sm font-bold text-gray-900">{assigned}</div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ── Roles ── */}
                    {section === 'roles' && isAdmin && (
                        <motion.div key="roles" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Roles</h2>
                                    <p className="text-sm text-gray-400 mt-0.5">Create and manage roles</p>
                                </div>
                                <motion.button onClick={() => setShowNewRole(v => !v)} className="flex items-center gap-2 bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-600 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                    <Plus size={15} /> New Role
                                </motion.button>
                            </div>

                            {/* New role form */}
                            <AnimatePresence>
                                {showNewRole && (
                                    <motion.div className="mb-4 p-4 rounded-2xl border border-surface-200 bg-surface-50 flex items-center gap-3" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                                        <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Role name (e.g. developer)" onKeyDown={e => { if (e.key === 'Enter') handleCreateRole(); }}
                                            className="flex-1 border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all bg-white" />
                                        <div className="flex gap-1.5">
                                            {PROJECT_COLORS.map(c => (
                                                <button key={c} type="button" onClick={() => setNewRoleColor(c)} className={`w-6 h-6 rounded-full transition-all ${newRoleColor === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: c }} />
                                            ))}
                                        </div>
                                        <button onClick={handleCreateRole} disabled={!newRoleName.trim()} className="px-4 py-2 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-40 transition-colors">Create</button>
                                        <button onClick={() => setShowNewRole(false)} className="p-2 text-gray-400 hover:text-gray-600 transition-colors"><X size={14} /></button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex flex-col gap-3">
                                {roles.map(role => (
                                    <RoleCard
                                        key={role.appId}
                                        role={role}
                                        isAdmin={role.name === 'admin'}
                                        expanded={expandedRole === role.appId}
                                        onToggle={() => setExpandedRole(expandedRole === role.appId ? null : role.appId)}
                                        authUsers={authUsers}
                                        perms={perms}
                                        totalRoutes={10}
                                        getMemberColor={getMemberColor}
                                        onRename={handleRenameRole}
                                        onColorChange={handleColorChange}
                                        onDelete={handleDeleteRole}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ── Permissions ── */}
                    {section === 'permissions' && isAdmin && (
                        <motion.div key="permissions" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Permissions</h2>
                                <p className="text-sm text-gray-400 mt-0.5">Configure which pages each role can access</p>
                            </div>
                            <PermissionsMatrix roles={roles} />
                            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-primary-50 border border-primary-100 mt-5">
                                <Shield size={13} className="text-primary-400 shrink-0" />
                                <p className="text-xs text-primary-600"><span className="font-bold">Admin</span> always has full access and cannot be restricted.</p>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* ── Profile Drawer ── */}
            <AnimatePresence>
                {selectedUser && (
                    <UserProfileDrawer
                        user={selectedUser}
                        member={members.find(m => m.id === selectedUser.id)}
                        getMemberColor={getMemberColor}
                        onClose={() => setSelectedUser(null)}
                        onSaved={(userId, changes) => {
                            setAuthUsers(prev => prev.map(u => u.id === userId ? { ...u, ...changes } : u));
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ── Add Dept Modal (verbatim) ── */}
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

            {/* ── Add Member to Dept Modal (verbatim) ── */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/OrganizationPage.tsx
git commit -m "feat: rewrite OrganizationPage with 4-tab layout (Users/Roles/Permissions)"
```

---

## Chunk 5: Build Verification and Wiring

### Task 12: Verify TypeScript compilation and fix any type errors

**Files:**
- Check: `src/pages/MembersPage.tsx` — uses `User.role` as literal union in some places
- Check: `src/App.tsx` — ensure `RolesProvider` is wired in

- [ ] **Step 1: Run TypeScript check**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && npx tsc --noEmit 2>&1 | head -60
```

Expected: no errors. If errors appear, fix them — most will be `User.role` or `AuthUser.role` type narrowing in files that pattern-match against the old union. Replace literal union comparisons with string comparisons (they already work for string types).

- [ ] **Step 2: Check `src/App.tsx` has `RolesProvider`**

Open `src/App.tsx` and confirm `RolesProvider` wraps the app. If it was added in Task 5 Step 2, verify it's in the right place (inside `AuthProvider`, outside `OrganizationPage`).

- [ ] **Step 3: Run the app in dev mode**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && npm run dev
```

Navigate to the Organization screen. Verify:
- All 4 tabs appear in the sidebar for admin users
- Overview tab looks identical to before
- Users tab loads and displays the user table
- Roles tab loads and shows role cards
- Permissions tab shows the matrix grid

- [ ] **Step 4: Compile electron files**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && npm run build:electron 2>/dev/null || npx tsc --project electron/tsconfig.json 2>/dev/null || echo "Check package.json for electron build script"
```

Verify `electron/main.js` and `electron/preload.js` are updated.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Organization screen revamp with dynamic roles and permissions"
```
