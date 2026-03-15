# Users Screen Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** A new admin-only `/users` screen with three tabs (Users, Roles, Permissions) that lets admins manage user role assignments, define/rename/delete roles, and control which routes each role can access.

**Architecture:**
- New page: `src/pages/UsersPage.tsx` — three-tab layout (Users / Roles / Permissions), owns shared `selectedRoleId` state
- New components: `src/components/users/UserRoleDrawer.tsx`, `src/components/users/RoleDetailPanel.tsx`, `src/components/users/PermissionsPanel.tsx`, `src/components/users/RoleListPanel.tsx`
- Re-uses existing contexts: `MembersContext`, `RolesContext`, `RolePermsContext`, `AuthContext`
- No new IPC handlers needed — all required methods already exist
- Route `/users` added to `App.tsx`, admin's `allowedRoutes` in `RolePermsContext`, and sidebar

**Tech Stack:** React + TypeScript, Framer Motion (AnimatePresence, motion, layoutId tab indicator), Tailwind CSS, Lucide icons, Electron IPC

---

## IPC Reference (existing — no new handlers needed)

All calls go via `(window as any).electronAPI.db` or `window.electronAPI.auth`:

| Method | Signature | Notes |
|---|---|---|
| `db.getRoles()` | `() => Promise<RoleDoc[]>` | Already used by RolesContext on mount |
| `db.createRole(data)` | `(data: object) => Promise<RoleDoc>` | Returns full `RoleDoc` with server-generated `appId` |
| `db.renameRole(data)` | `(data: object) => Promise<unknown>` | Pass `{ appId, newName }` — cascades to UserModel + AuthUserModel |
| `db.updateRoleColor(data)` | `(data: object) => Promise<unknown>` | Pass `{ appId, color }` |
| `db.deleteRole(data)` | `(data: object) => Promise<unknown>` | Pass `{ appId }` — deletes RoleDoc only, does NOT cascade members |
| `db.deleteRolePerms(data)` | `(data: object) => Promise<unknown>` | Pass `{ role: roleName }` |
| `auth.updateRole(userId, role)` | `(userId: string, role: string) => Promise<void>` | Updates AuthUserModel |
| `db.updateMember(id, changes)` | `(id: string, changes: object) => Promise<User\|null>` | Updates UserModel — NOT optimistic in MembersContext |

**Important:** `MembersContext.updateMember` is DB-first (calls `api().updateMember` before updating local state). It is NOT optimistic. Do not attempt to "rollback" it by calling it again — that would make an extra DB write. If a subsequent IPC call fails, use `setMembers` directly via a local state setter pattern, or re-fetch.

**Important:** `db.deleteRole` does NOT cascade member reassignment to UserModel or AuthUserModel. The calling code must do this explicitly (see delete sequence below).

**Note on `vite-env.d.ts`:** The `ElectronDB` interface does not currently declare `createRole`, `renameRole`, `updateRoleColor`, `deleteRole`, or `deleteRolePerms`. These are called via `(window as any).electronAPI.db` in RolesContext (bypasses TypeScript). New components should follow the same pattern for these calls — cast to `any` or add the types to `ElectronDB`. If adding types, use:
```typescript
// Add to ElectronDB interface in src/vite-env.d.ts
getRoles(): Promise<RoleDoc[]>;
createRole(data: { name: string; color: string }): Promise<RoleDoc>;
renameRole(data: { appId: string; newName: string }): Promise<unknown>;
updateRoleColor(data: { appId: string; color: string }): Promise<unknown>;
deleteRole(data: { appId: string }): Promise<unknown>;
deleteRolePerms(data: { role: string }): Promise<unknown>;
```

---

## Detailed Design

### Route & Access

- Route: `/users`
- Registered in `App.tsx` as `<ProtectedRoute path="/users"><Layout><UsersPage /></Layout></ProtectedRoute>`
- `App.tsx` must re-add `RolesProvider` (was removed with Organization feature). Insert it between `RolePermsProvider` and `MembersProvider`:
  ```tsx
  <RolePermsProvider>
    <RolesProvider>          {/* ← add here */}
      <MembersProvider>
        <ProjectProvider>
          ...
  ```
- Added to `RolePermsContext` DEFAULT_PERMS for `admin` role only (add `'/users'` to admin's allowedRoutes array). `allowedRoutes` is frontend-only — no backend to update.
- `Sidebar.tsx` `ALL_NAV_ITEMS` entry: `{ id: '/users', label: 'Users', icon: Users2 }` — existing filter mechanism shows it only when in allowedRoutes.

### Tab Bar

- Three tabs: **Users · Roles · Permissions**
- Horizontal tab bar at top of page: `layoutId="users-tab-ind"` bottom border indicator with Framer Motion
- `selectedRoleId: string | null` state lives in `UsersPage` — stores `role.appId` (NOT `role.name`), so it survives renames
- `selectedRoleId` is passed as a prop to `RoleListPanel`, `RoleDetailPanel`, and `PermissionsPanel`

---

### Tab 1: Users

**Layout:** Full-width table + slide-out drawer overlay

**Table columns:**
- Member (avatar circle with initials fallback + name + designation)
- Email
- Role (colored badge — derive color via `roles.find(r => r.name === member.role)?.color ?? '#9ca3af'`)
- Status (active/inactive dot indicator)
- Action (chevron icon to open drawer)

**Data sources:** `useMembersContext().members`, `useRoles().roles`

**UserRoleDrawer (`src/components/users/UserRoleDrawer.tsx`):**

Props: `{ member: User; onClose: () => void }`

- 420px fixed-width panel sliding in from the right (Framer Motion `x: 420 → 0`)
- Shows: avatar, name, email, designation, current role label
- Role selector: `<select>` dropdown populated from `useRoles().roles`
- Local state: `selectedRole: string` initialised to `member.role`
- Save sequence:
  1. Set `saving: true`
  2. `await (window as any).electronAPI.db.updateMember(member.id, { role: selectedRole })` — this also updates MembersContext local state internally
  3. `await (window as any).electronAPI.auth.updateRole(member.id, selectedRole)` — if this fails, the member's UserModel is already updated but AuthUserModel is not; show error toast explaining partial failure, do NOT attempt to reverse the UserModel update (MembersContext.updateMember is not reversible without an extra DB write)
  4. On full success: show success toast, call `onClose()`
  5. Set `saving: false` in finally block
- Admin cannot change their own role: disable Save + show note "You cannot change your own role" if `member.id === authUser.id`
- Close on backdrop click or X button

---

### Shared: RoleListPanel (`src/components/users/RoleListPanel.tsx`)

Props: `{ selectedRoleId: string | null; onSelect: (appId: string) => void }`

Both Tab 2 (Roles) and Tab 3 (Permissions) use this same component as the left column. Extract it to avoid duplication.

- Renders from `useRoles().roles`
- Each item: `● RoleName (N members)` where N = `useMembersContext().members.filter(m => m.role === role.name).length`
- Color dot: `role.color`
- Selected state: `role.appId === selectedRoleId` → `bg-primary-50 border-primary-200`
- "Add Role" button at bottom (only shown in Tab 2 context — pass `showAddRole?: boolean` prop)

---

### Tab 2: Roles

**Layout:** `<RoleListPanel showAddRole />` (280px) + `<RoleDetailPanel>` (flex-1)

**Add Role flow (triggered from RoleListPanel "Add Role" button, handled in UsersPage):**
1. Disable Add button while in flight
2. `const newRole = await (window as any).electronAPI.db.createRole({ name: 'New Role', color: '#6366f1' })` — returns full `RoleDoc` with `appId`
3. `useRoles().addRole(newRole as RoleDoc)`
4. `useRolePerms().setRolePerms('New Role', ['/settings'])` — uses `setRolePerms` (not `addRolePerms`) because `setRolePerms` persists to DB and upserts in local state. Note: `setRolePerms` does `prev.map(...)` which only updates if entry exists. Since this is a new role, use `addRolePerms` for the local state update and call `dbApi().setRolePerms({ role: 'New Role', allowedRoutes: ['/settings'] })` directly for DB persistence.
5. Set `selectedRoleId` to `newRole.appId`
6. On error: show toast, re-enable button

**Duplicate name prevention:** Before creating or saving a rename, check `roles.some(r => r.name === candidateName && r.appId !== currentRole.appId)`. If duplicate, show inline error "A role with this name already exists" and do not proceed.

**RoleDetailPanel (`src/components/users/RoleDetailPanel.tsx`):**

Props: `{ selectedRoleId: string | null }`

- Derives selected role: `const role = roles.find(r => r.appId === selectedRoleId) ?? null`
- Empty state: "Select a role to edit"
- When role loaded:
  - **Name field:** controlled input, local `nameValue` state initialised from `role.name` (sync via `useEffect([role?.appId])` to handle external changes). On blur:
    1. If `nameValue === role.name` → no-op
    2. Check duplicate (see above)
    3. `await (window as any).electronAPI.db.renameRole({ appId: role.appId, newName: nameValue })`
    4. On success: `renameRoleLocal(role.appId, nameValue)` + `renameRolePerms(role.name, nameValue)`
    5. On failure: revert `nameValue` to `role.name`, show error toast
  - **Rename blocked for built-ins:** if `['admin', 'manager', 'member'].includes(role.name)`, name field is `readOnly` and shows a lock icon + "Built-in role"
  - **Color picker:** 8 preset swatches + hex input. On pick:
    1. `await (window as any).electronAPI.db.updateRoleColor({ appId: role.appId, color: newColor })`
    2. On success: `updateRoleLocal(role.appId, { color: newColor })`
    3. On failure: show error toast (no local update until IPC succeeds)
  - **Member count:** "X members with this role"
  - **Delete button** (red, bottom): hidden/disabled for `['admin', 'manager', 'member']`
    - Show inline confirm: "Reassign X members to 'member' and delete this role?"
    - On confirm (entire sequence, abort on first failure):
      1. For each `affected = members.filter(m => m.role === role.name)`:
         - `await (window as any).electronAPI.db.updateMember(m.id, { role: 'member' })`
         - `await (window as any).electronAPI.auth.updateRole(m.id, 'member')`
         - On failure: show error toast "Failed to reassign [name]. Aborting." — stop loop, do NOT proceed to deleteRole (DB already partially updated — show message "Some members may have been reassigned. Please check the Users tab.")
      2. `await (window as any).electronAPI.db.deleteRole({ appId: role.appId })`
      3. `await (window as any).electronAPI.db.deleteRolePerms({ role: role.name })`
      4. `removeRole(role.appId)` — local update
      5. `removeRolePerms(role.name)` — local update
      6. `setSelectedRoleId(null)` (via callback prop `onDeleteComplete`)
      7. Show success toast

---

### Tab 3: Permissions

**Layout:** `<RoleListPanel />` (280px, no Add Role button) + `<PermissionsPanel>` (flex-1)

**PermissionsPanel (`src/components/users/PermissionsPanel.tsx`):**

Props: `{ selectedRoleId: string | null }`

- Derives selected role: `const role = roles.find(r => r.appId === selectedRoleId) ?? null`
- Empty state: "Select a role to manage permissions"
- When role loaded:
  - Uses `useRolePerms()`: `{ getAllowedRoutes, setRolePerms }`
  - Local `localRoutes: string[]` state, initialised from `getAllowedRoutes(role.name)`, re-synced when `role.appId` changes
  - "Grant All" button: sets all routes (except those already locked); "Revoke All": keeps only locked routes (`['/settings']`)
  - Route list (10 routes):
    ```
    /           Task Board
    /dashboard  Dashboard
    /messages   Messages
    /tasks      Tasks
    /teams      Projects
    /members    Members
    /attendance Attendance
    /reports    Reports
    /users      Users
    /settings   Settings  ← always locked on
    ```
  - Each toggle:
    - `checked`: `localRoutes.includes(route.id)`
    - Locked: `route.id === '/settings'` OR `role.name === 'admin'`
    - On change: update `localRoutes` locally, then `await setRolePerms(role.name, newRoutes)` — `setRolePerms` persists to DB. On failure: revert `localRoutes`, show error toast.
  - Admin role: all toggles disabled + banner "Admin always has full access to all routes"

---

### Data Flow Summary

```
UsersPage (owns: activeTab, selectedRoleId)
  ├── Tab: Users
  │     useMembersContext().members → table rows
  │     useRoles().roles → badge color lookup
  │     UserRoleDrawer
  │       → db.updateMember + auth.updateRole
  │
  ├── Tab: Roles  [selectedRoleId ← stores appId]
  │     RoleListPanel (showAddRole)
  │       → db.createRole → addRole + addRolePerms (local) + db.setRolePerms (DB)
  │     RoleDetailPanel
  │       → db.renameRole → renameRoleLocal + renameRolePerms
  │       → db.updateRoleColor → updateRoleLocal
  │       → db.updateMember + auth.updateRole (per affected member) → db.deleteRole + db.deleteRolePerms → removeRole + removeRolePerms
  │
  └── Tab: Permissions  [same selectedRoleId]
        RoleListPanel
        PermissionsPanel
          → setRolePerms (persists to DB + updates local state)
```

---

### Error Handling

- All async ops in try/catch with `useToast` error toasts
- Color picker: IPC-first (no optimistic update)
- Name rename: optimistic local after IPC succeeds
- Role assignment (drawer): DB-first via `updateMember` — partial failure on `auth.updateRole` is noted in toast
- Role delete: abort-on-first-failure with informative toast about partial DB state
- Loading spinner on Save/Delete buttons while in flight

---

### File Structure

New files:
```
src/pages/UsersPage.tsx                     — page shell, tab bar, selectedRoleId state
src/components/users/UserRoleDrawer.tsx     — slide-out drawer for role assignment
src/components/users/RoleListPanel.tsx      — shared left-column role list (Tabs 2 & 3)
src/components/users/RoleDetailPanel.tsx    — name/color/delete panel for a role
src/components/users/PermissionsPanel.tsx   — route toggle panel for a role
```

Files to modify:
- `src/App.tsx` — add `/users` route + `UsersPage` import + `RolesProvider` wrapping `MembersProvider` (inside `RolePermsProvider`)
- `src/components/layout/Sidebar.tsx` — add `{ id: '/users', label: 'Users', icon: Users2 }` to `ALL_NAV_ITEMS`
- `src/context/RolePermsContext.tsx` — add `'/users'` to admin's `allowedRoutes` in `DEFAULT_PERMS`
- `src/vite-env.d.ts` — add `getRoles`, `createRole`, `renameRole`, `updateRoleColor`, `deleteRole`, `deleteRolePerms` to `ElectronDB` interface (optional but recommended for type safety)

No changes needed to `electron/` files — all IPC handlers already exist.
