# Users Screen Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** A new admin-only `/users` screen with three tabs (Users, Roles, Permissions) that lets admins manage user role assignments, define/rename/delete roles, and control which routes each role can access.

**Architecture:**
- New page: `src/pages/UsersPage.tsx` — three-tab layout (Users / Roles / Permissions)
- New components: `src/components/users/UserRoleDrawer.tsx`, `src/components/users/RoleDetailPanel.tsx`, `src/components/users/PermissionsPanel.tsx`
- Re-uses existing contexts: `MembersContext`, `RolesContext`, `RolePermsContext`, `AuthContext`
- No new IPC handlers needed — reuses existing `window.electronAPI.auth.updateRole(userId, role)`
- Route `/users` added to `App.tsx`, admin's `allowedRoutes` in `RolePermsContext`, and sidebar

**Tech Stack:** React + TypeScript, Framer Motion (AnimatePresence, motion, layoutId tab indicator), Tailwind CSS, Lucide icons, Electron IPC

---

## Detailed Design

### Route & Access

- Route: `/users`
- Registered in `App.tsx` as `<ProtectedRoute path="/users"><Layout><UsersPage /></Layout></ProtectedRoute>`
- `App.tsx` must also re-add `RolesProvider` (was removed with Organization feature). Wrap it around `MembersProvider`: `<RolesProvider><MembersProvider>...</MembersProvider></RolesProvider>`
- Added to `RolePermsContext` DEFAULT_PERMS for `admin` role only (add `'/users'` to admin's allowedRoutes array). Note: `allowedRoutes` is frontend-only — there is no backend seed to update.
- `Sidebar.tsx` `ALL_NAV_ITEMS` entry: `{ id: '/users', label: 'Users', icon: Users2 }` — visible only when route is in allowedRoutes (existing filter mechanism handles this automatically)

### Tab Bar

- Three tabs: **Users · Roles · Permissions**
- Horizontal tab bar at top of page, same pattern as previously used: `layoutId="users-tab-ind"` bottom border indicator with Framer Motion
- Shared `selectedRoleId: string | null` state (stores `role.appId`, NOT `role.name`) across Roles and Permissions tabs — using `appId` ensures the selection survives renames. Selecting a role on the left list in either tab persists as you switch between those two tabs.

---

### Tab 1: Users

**Layout:** Full-width table + slide-out drawer overlay

**Table columns:**
- Member (avatar circle with initials + name + designation)
- Email
- Role (colored badge — look up color via `RolesContext.roles.find(r => r.name === member.role)?.color`, fallback to `'#9ca3af'` gray if roles not yet loaded or role not found)
- Status (active/inactive dot indicator)
- Action (chevron icon to open drawer)

**Data source:** `MembersContext.members`

**UserRoleDrawer (`src/components/users/UserRoleDrawer.tsx`):**
- 420px fixed-width panel sliding in from the right (Framer Motion `x: 420 → 0`)
- Shows: avatar, name, email, designation, current role
- Role selector: `<select>` dropdown populated from `RolesContext.roles`
- Save button: calls `MembersContext.updateMember(id, { role: newRole })` then `window.electronAPI.auth.updateRole(member.id, newRole)` (existing IPC — no new handler needed). On failure, rollback `updateMember` via another call to restore original role and show error toast.
- Admin cannot change their own role (Save button disabled + tooltip if `member.id === authUser.id`)
- Close on backdrop click or X button
- Toast on success/error

---

### Tab 2: Roles

**Layout:** Two-panel — 280px left list + flex-1 right detail panel

**Left panel:**
- Scrollable list of role pills: `● RoleName (N members)`
  - Color dot uses `role.color`
  - Member count = `members.filter(m => m.role === role.name).length`
  - Selected role highlighted with `bg-primary-50 border-primary-200` (match by `role.appId === selectedRoleId`)
- "Add Role" button at bottom:
  1. Call `window.electronAPI.db.createRole({ name: 'New Role', color: '#6366f1' })` — returns full `RoleDoc` including server-generated `appId`
  2. Call `RolesContext.addRole(returnedRoleDoc)` to add to local state
  3. Call `RolePermsContext.addRolePerms({ role: 'New Role', allowedRoutes: ['/settings'] })`
  4. Set `selectedRoleId` to `returnedRoleDoc.appId`
  - Disable button while the async call is in flight to prevent duplicate creation

**Right panel (`src/components/users/RoleDetailPanel.tsx`):**
- Empty state when no role selected: "Select a role to edit"
- When role selected (looked up via `RolesContext.roles.find(r => r.appId === selectedRoleId)`):
  - Editable name field (text input). On blur: call `window.electronAPI.db.renameRole(role.appId, newName)` (this IPC cascades to UserModel + AuthUserModel in the DB), then `RolesContext.renameRoleLocal(role.appId, newName)` + `RolePermsContext.renameRolePerms(role.name, newName)`. On failure: revert input and show error toast.
  - Color picker: 8 preset color swatches + custom hex input. On pick: call `window.electronAPI.db.updateRoleColor(role.appId, newColor)` first; on success call `RolesContext.updateRoleLocal(role.appId, { color: newColor })`; on failure show error toast (no local update until IPC succeeds — avoids stale state).
  - Member count display: "X members with this role"
  - Delete button (red, bottom): shows inline "Are you sure? Members with this role will be reassigned to 'member'." confirm. On confirm:
    1. Collect affected: `const affected = members.filter(m => m.role === role.name)`
    2. For each affected member: call `MembersContext.updateMember(m.id, { role: 'member' })` + `window.electronAPI.auth.updateRole(m.id, 'member')` — this ensures DB is updated for both UserModel and AuthUserModel
    3. Call `window.electronAPI.db.deleteRole(role.appId)` — deletes the RoleDoc
    4. Call `RolesContext.removeRole(role.appId)`
    5. Call `RolePermsContext.removeRolePerms(role.name)`
    6. Set `selectedRoleId` to `null`
    - On any failure: rollback all local state changes and show error toast
  - `admin`, `manager`, `member` built-in roles: delete button hidden/disabled (check `['admin','manager','member'].includes(role.name)`)

---

### Tab 3: Permissions

**Layout:** Same two-panel as Tab 2 — same left role list (same `selectedRoleId`), different right panel

**Right panel (`src/components/users/PermissionsPanel.tsx`):**
- Empty state when no role selected: "Select a role to manage permissions"
- When role selected (looked up via `RolesContext.roles.find(r => r.appId === selectedRoleId)`):
  - "Grant All" / "Revoke All" buttons at top right
  - List of all app routes with toggle switches:
    - `/` — Task Board
    - `/dashboard` — Dashboard
    - `/messages` — Messages
    - `/tasks` — Tasks
    - `/teams` — Projects
    - `/members` — Members
    - `/attendance` — Attendance
    - `/reports` — Reports
    - `/users` — Users
    - `/settings` — Settings (always locked on, cannot revoke)
  - Each toggle: checked if route in `RolePermsContext.getAllowedRoutes(role.name)`
  - Toggle change: calls `RolePermsContext.setRolePerms(role.name, updatedRoutes)` — this persists to DB and updates local state
  - Admin role: all toggles locked on (disabled), show note "Admin always has full access"
  - `/settings` toggle: always locked on for all roles (cannot be revoked)

---

### Data Flow Summary

```
UsersPage
  ├── Tab: Users
  │     MembersContext.members → table rows
  │     UserRoleDrawer → updateMember + window.electronAPI.auth.updateRole (existing IPC)
  │
  ├── Tab: Roles  [selectedRoleId: string|null — stores appId]
  │     RolesContext.roles → left list
  │     RoleDetailPanel → db.createRole / db.renameRole / db.updateRoleColor / db.deleteRole
  │                      → RolesContext local updates
  │                      → RolePermsContext.addRolePerms / renameRolePerms / removeRolePerms
  │                      → auth.updateRole per affected member on delete
  │
  └── Tab: Permissions  [same selectedRoleId]
        RolesContext.roles → left list
        PermissionsPanel → RolePermsContext.setRolePerms per toggle
```

---

### Error Handling

- All async operations wrapped in try/catch with `useToast` error toasts
- Color picker: no optimistic update — only update local state after IPC succeeds
- All other mutations: optimistic local update first, rollback on IPC failure
- Drawer/panel shows loading spinner on save

---

### File Structure

New files:
```
src/pages/UsersPage.tsx                    — page shell, tab bar, shared selectedRoleId state
src/components/users/UserRoleDrawer.tsx    — slide-out drawer for role assignment
src/components/users/RoleDetailPanel.tsx   — name/color/delete panel for a role
src/components/users/PermissionsPanel.tsx  — route toggle panel for a role
```

Files to modify:
- `src/App.tsx` — add `/users` route + `UsersPage` import + re-add `RolesProvider` wrapping `MembersProvider`
- `src/components/layout/Sidebar.tsx` — add `{ id: '/users', label: 'Users', icon: Users2 }` to `ALL_NAV_ITEMS`
- `src/context/RolePermsContext.tsx` — add `'/users'` to admin's `allowedRoutes` in `DEFAULT_PERMS`
- `src/vite-env.d.ts` — no changes needed (reusing existing `window.electronAPI.auth.updateRole`)

No changes needed to `electron/main.ts`, `electron/main.js`, `electron/preload.ts`, or `electron/preload.js` — all required IPC methods already exist.
