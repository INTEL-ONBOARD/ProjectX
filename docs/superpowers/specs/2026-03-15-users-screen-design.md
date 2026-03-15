# Users Screen Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** A new admin-only `/users` screen with three tabs (Users, Roles, Permissions) that lets admins manage user role assignments, define/rename/delete roles, and control which routes each role can access.

**Architecture:**
- New page: `src/pages/UsersPage.tsx` — three-tab layout (Users / Roles / Permissions)
- New components: `src/components/users/UserRoleDrawer.tsx`, `src/components/users/RoleDetailPanel.tsx`, `src/components/users/PermissionsPanel.tsx`
- Re-uses existing contexts: `MembersContext`, `RolesContext`, `RolePermsContext`, `AuthContext`
- New IPC handler: `db:authuser:setRole` — updates the auth user's role in AuthUserModel by userId
- Route `/users` added to `App.tsx`, admin's `allowedRoutes` in `RolePermsContext`, and sidebar

**Tech Stack:** React + TypeScript, Framer Motion (AnimatePresence, motion, layoutId tab indicator), Tailwind CSS, Lucide icons, Electron IPC

---

## Detailed Design

### Route & Access

- Route: `/users`
- Registered in `App.tsx` as `<ProtectedRoute path="/users"><Layout><UsersPage /></Layout></ProtectedRoute>`
- Added to `RolePermsContext` DEFAULT_PERMS for `admin` role only
- `Sidebar.tsx` `ALL_NAV_ITEMS` entry: `{ id: '/users', label: 'Users', icon: Users2 }` — visible only when route is in allowedRoutes (existing filter mechanism handles this automatically)

### Tab Bar

- Three tabs: **Users · Roles · Permissions**
- Horizontal tab bar at top of page, same pattern as previously used: `layoutId="users-tab-ind"` bottom border indicator with Framer Motion
- Shared `selectedRole: string | null` state across Roles and Permissions tabs — selecting a role on the left list in either tab persists as you switch between those two tabs

---

### Tab 1: Users

**Layout:** Full-width table + slide-out drawer overlay

**Table columns:**
- Member (avatar circle with initials + name + designation)
- Email
- Role (colored badge — color from RolesContext role color, fallback to gray)
- Status (active/inactive dot indicator)
- Action (chevron icon to open drawer)

**Data source:** `MembersContext.members`

**UserRoleDrawer (`src/components/users/UserRoleDrawer.tsx`):**
- 420px fixed-width panel sliding in from the right (Framer Motion `x: 420 → 0`)
- Shows: avatar, name, email, designation, current role
- Role selector: `<select>` dropdown populated from `RolesContext.roles`
- Save button: calls `MembersContext.updateMember(id, { role: newRole })` + `db:authuser:setRole({ userId: member.id, role: newRole })` via `window.electronAPI.db.setAuthUserRole()`
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
  - Selected role highlighted with `bg-primary-50 border-primary-200`
- "Add Role" button at bottom — creates a new role via `RolesContext.addRole({ name: 'New Role', color: '#6366f1' })` then selects it immediately
- Also calls `RolePermsContext.addRolePerms({ role: 'New Role', allowedRoutes: ['/settings'] })` for the new role

**Right panel (`src/components/users/RoleDetailPanel.tsx`):**
- Empty state when no role selected: "Select a role to edit"
- When role selected:
  - Editable name field (text input, saves on blur via `RolesContext.renameRoleLocal` + `RolePermsContext.renameRolePerms` + IPC `db:roles:rename` cascade)
  - Color picker: 8 preset color swatches + custom hex input. Saves immediately on pick via `RolesContext.updateRoleLocal` + IPC `db:roles:updateColor`
  - Member count display: "X members with this role"
  - Delete button (red, bottom): confirms with inline "Are you sure?" then calls `RolesContext.removeRole` + `RolePermsContext.removeRolePerms` + reassigns affected members to 'member' role
  - `admin`, `manager`, `member` built-in roles: delete button hidden/disabled

---

### Tab 3: Permissions

**Layout:** Same two-panel as Tab 2 — same left role list, different right panel

**Right panel (`src/components/users/PermissionsPanel.tsx`):**
- Empty state when no role selected: "Select a role to manage permissions"
- When role selected:
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
  - Toggle change: calls `RolePermsContext.setRolePerms(role.name, updatedRoutes)`
  - Admin role: all toggles locked on (disabled), tooltip "Admin always has full access"
  - `/settings` toggle: always locked on for all roles (cannot be revoked)

---

### New IPC: `db:authuser:setRole`

**In `electron/main.ts` and `electron/main.js`:**
```typescript
ipcMain.handle('db:authuser:setRole', async (_e, { userId, role }: { userId: string; role: string }) => {
    return AuthUserModel.findByIdAndUpdate(userId, { role }, { new: true });
});
```

**In `electron/preload.ts` and `electron/preload.js`:**
```typescript
setAuthUserRole: (payload: { userId: string; role: string }) =>
    ipcRenderer.invoke('db:authuser:setRole', payload),
```

---

### Data Flow Summary

```
UsersPage
  ├── Tab: Users
  │     MembersContext.members → table rows
  │     UserRoleDrawer → updateMember + db:authuser:setRole
  │
  ├── Tab: Roles  [selectedRole shared state]
  │     RolesContext.roles → left list
  │     RoleDetailPanel → addRole / renameRole / updateColor / removeRole
  │                      → RolePermsContext.addRolePerms / renameRolePerms / removeRolePerms
  │
  └── Tab: Permissions  [selectedRole shared state]
        RolesContext.roles → left list
        PermissionsPanel → RolePermsContext.setRolePerms per toggle
```

---

### Error Handling

- All async operations wrapped in try/catch with `useToast` error toasts
- Optimistic local updates (same pattern as rest of app) with rollback on failure
- Drawer/panel shows loading spinner on save

---

### File Structure

New files:
```
src/pages/UsersPage.tsx                    — page shell, tab bar, shared selectedRole state
src/components/users/UserRoleDrawer.tsx    — slide-out drawer for role assignment
src/components/users/RoleDetailPanel.tsx   — name/color/delete panel for a role
src/components/users/PermissionsPanel.tsx  — route toggle panel for a role
```

Files to modify:
- `src/App.tsx` — add `/users` route + UsersPage import + RolesProvider wrapper back
- `src/components/layout/Sidebar.tsx` — add Users nav item
- `src/context/RolePermsContext.tsx` — add `/users` to admin default allowedRoutes
- `electron/main.ts` + `electron/main.js` — add `db:authuser:setRole` handler
- `electron/preload.ts` + `electron/preload.js` — add `setAuthUserRole` method
