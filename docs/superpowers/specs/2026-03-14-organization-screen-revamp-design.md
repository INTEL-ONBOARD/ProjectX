# Organization Screen Revamp — Design Spec

**Date:** 2026-03-14
**Status:** Approved

---

## Overview

Revamp the Organization screen to support fully dynamic roles (any name, stored directly as the user's auth role), rich user oversight with profile editing and workload data, and a permissions matrix that scales to any number of roles.

---

## Structure

Four-tab left sidebar nav. **Users, Roles, and Permissions are admin-only — hidden entirely from non-admins (no read-only view).** Non-admins only see Overview.

1. **Overview** — unchanged (existing stat cards + Department Directory, code preserved verbatim)
2. **Users** — rich user directory with slide-out profile drawer
3. **Roles** — dynamic role builder (create, rename, delete roles)
4. **Permissions** — matrix grid (pages × roles, toggle per cell)

**Implementation note:** The existing `SectionId` type and `NAV_ITEMS` array in `OrganizationPage.tsx` must be extended from 3 to 4 items. The Overview section JSX (stat cards, `DepartmentDirectory`, modals) is moved verbatim into the `section === 'overview'` branch of the new component.

---

## Required Type & Schema Changes

### `src/types/index.ts` ✅ already applied
```ts
// User.role — changed to:
role: string;
```

### `src/context/AuthContext.tsx`
```ts
// Change AuthUser.role from:
role: 'admin' | 'manager' | 'member';
// To:
role: string;

// Change register() and authApi().register() role param from:
role: 'admin' | 'manager' | 'member'
// To:
role: string
```

**Impact:** `isAdmin` check (`authUser?.role === 'admin'`) still works — string comparison, no change needed.

### `electron/main.ts` — Mongoose schema changes
```js
// UserSchema.role — change from:
{ type: String, enum: ['admin', 'manager', 'member'], default: 'member' }
// To:
{ type: String, default: 'member' }

// AuthUserSchema.role — change from:
{ type: String, enum: ['admin', 'manager', 'member'], default: 'member' }
// To:
{ type: String, default: 'member' }
```

### New Mongoose model: `Role` (`electron/main.ts`)
```js
const RoleSchema = new mongoose.Schema({
  appId: { type: String, unique: true },   // follow existing appId convention, e.g. `role_${Date.now()}`
  name:  { type: String, unique: true },
  color: { type: String },
});
const RoleModel = mongoose.model('Role', RoleSchema);
```

**Seeding:** On app startup (alongside existing `seedDefault`), if `RoleModel.countDocuments() === 0`, insert:
```js
{ appId: 'role_admin',   name: 'admin',   color: '#5030E5' }
{ appId: 'role_manager', name: 'manager', color: '#D97706' }
{ appId: 'role_member',  name: 'member',  color: '#9CA3AF' }
```
This ensures existing deployments get their three legacy roles as real documents on first run.

**Reserved names:** `admin` is a reserved role name — it cannot be deleted or renamed, enforced at the IPC handler level.

---

## New IPC Handlers (`electron/main.ts` + `electron/preload.ts`)

Channel naming follows the existing `db:<collection>:<action>` convention.

| Channel | Input | Returns | Notes |
|---|---|---|---|
| `db:roles:getAll` | — | `{ appId, name, color }[]` | Load all Role docs. Called on `RolesContext` mount after DB connects. |
| `db:roles:create` | `{ name, color }` | `{ appId, name, color }` | Throws if name already exists. `admin` blocked. |
| `db:roles:updateColor` | `{ appId, color }` | `{ appId, name, color }` | Updates color only. `name` is NOT accepted — all renames go through `db:roles:rename`. |
| `db:roles:rename` | `{ appId, newName }` | `{ ok: boolean, oldName: string }` | `appId` is the authoritative lookup key. Cascade (sequential): 1) update `Role.name` 2) update `RolePerms.role` field (delete old doc, insert new doc with same `allowedRoutes`) 3) `UserModel.updateMany({ role: oldName }, { role: newName })` 4) `AuthUserModel.updateMany({ role: oldName }, { role: newName })`. Returns `oldName` so client can update local state. On any step failure: log error, return `{ ok: false }` (partial state accepted — mid-session consistency is out of scope). Throws if `newName` already exists. `admin` is blocked. |
| `db:roles:delete` | `{ appId }` | `{ ok: boolean }` | Deletes Role doc by `appId`. Does NOT cascade to RolePerms — client must call `db:roleperms:delete` separately. `admin` is blocked. Only call when no users have this role (enforced client-side). |
| `db:roleperms:delete` | `{ roleName }` | `{ ok: boolean }` | Deletes `RolePerms` doc where `role === roleName`. Called by client after `db:roles:delete` succeeds. |

**Preload additions** (`electron/preload.ts`) — added under `db`:
```js
getRoles:        ()     => ipcRenderer.invoke('db:roles:getAll'),
createRole:      (data) => ipcRenderer.invoke('db:roles:create', data),
updateRoleColor: (data) => ipcRenderer.invoke('db:roles:updateColor', data),
renameRole:      (data) => ipcRenderer.invoke('db:roles:rename', data),
deleteRole:      (data) => ipcRenderer.invoke('db:roles:delete', data),
deleteRolePerms: (data) => ipcRenderer.invoke('db:roleperms:delete', data),
```

**Existing IPC left unchanged:** `setRolePerms`, `getRolePerms`, `authApi().updateRole()` (accepts any string once enum is removed).

---

## Shared State Architecture

### `RolesContext` (new — `src/context/RolesContext.tsx`)
Owns:
- `roles: RoleDoc[]` where `RoleDoc = { appId: string; name: string; color: string }`
- `loadRoles()` — re-fetches from `db:roles:getAll`
- `addRole(role: RoleDoc)` — appends to local state (called after createRole)
- `updateRole(appId: string, changes: Partial<RoleDoc>)` — patches local state (called after updateRoleColor)
- `renameRoleLocal(appId: string, newName: string)` — updates `name` field in local state (called after renameRole IPC succeeds)
- `removeRole(appId: string)` — removes from local state (called after deleteRole IPC succeeds)

**Timing:** `RolesContext` calls `loadRoles()` on mount. Role seeding happens server-side in the same startup hook as `seedDefault`, so the Role collection is seeded before `RolesContext` mounts.

### `RolePermsContext` (extended — `src/context/RolePermsContext.tsx`)
Extend the existing context to add:
- `addRolePerms(entry: RolePerms)` — appends to local `perms` state (called after createRole → setRolePerms)
- `renameRolePerms(oldName: string, newName: string)` — renames the key in local `perms` state (called after renameRole IPC succeeds)
- `removeRolePerms(roleName: string)` — removes the entry from local `perms` state (called after deleteRolePerms IPC succeeds)

These three methods are pure local-state mutations — no additional IPC calls. They keep `RolePermsContext.perms` in sync with the DB operations triggered by `RolesContext` actions.

### `authUsers` page-level state
Loaded once on `OrganizationPage` mount via `authApi().getAll()`. Stored in local state, available to all tabs. Re-fetched after a successful `renameRole` so member chips and counts stay accurate.

---

## Tab 2: Users

### Table columns
Avatar · Name · Email · Role (static badge — role assignment via drawer only) · Workload bar · Task count · Status dot

**Workload bar formula:**
```
assignedCount = allTasks.filter(t => t.assignees.includes(user.id)).length
totalCount    = allTasks.length        // total tasks in the system
barPct        = totalCount > 0 ? Math.min(100, (assignedCount / totalCount) * 100) : 0
```
Bar cap: 100%. Zero-task guard: bar shows 0% if `allTasks.length === 0`.

**Task count:** displays `assignedCount` as a number.

### Toolbar
- Search input — client-side filter on name or email
- Role filter pills — one per role from `RolesContext.roles` + "All" pill; regenerates reactively
- Refresh button — re-fetches `authApi().getAll()`

### Slide-out Drawer (420px, right side)
Opens on row click. Closes via backdrop click or X button.

**Self-guard:** if the row being clicked is the logged-in user (`u.id === authUser.id`), the Role dropdown in the drawer is rendered as a static badge (cannot demote self), matching the existing `RoleDropdown` behaviour.

**Editable fields** (all saved together via "Save" button):
- Name:
  1. `dbApi().updateMember(id, { name })` — updates the `User` collection
  2. `window.electronAPI.auth.updateName(id, name)` — updates the `AuthUser` collection (called directly via preload; `AuthContext` does not expose this)
  3. If the saved user is the logged-in user (`id === authUser.id`): call `AuthContext.updateDisplayName(name)` — see AuthContext changes below. This updates the in-memory `user.name` and rewrites the `pm_auth_session` localStorage token so the name is not stale after page reload.
- Designation → `dbApi().updateMember(id, { designation })`
- Location → `dbApi().updateMember(id, { location })`
- Status toggle (active / inactive) → `dbApi().updateMember(id, { status })`
- Role dropdown (hidden / static badge if self) → on Save: `authApi().updateRole(userId, newRole)` + `dbApi().updateMember(id, { role: newRole })` + `MembersContext.updateMember(id, { role: newRole })` to keep rest of app in sync

**Save button:**
- Shows saving spinner while in-flight
- On success: success toast, close drawer
- On failure: error toast, drawer stays open

**Read-only display:**
- Email
- Workload bar + assigned count (using same formula as table)
- List of assigned tasks: title + status badge (from `allTasks.filter(t => t.assignees.includes(user.id))`)

**Actions:**
- **Send Message** → `navigate('/messages', { state: { memberId: user.id } })`

**Inline role dropdown in table row** is removed — the Role column displays a static read-only badge. Role assignment is done exclusively via the drawer to avoid conflicts between table and drawer state.

---

## Tab 3: Roles

**Data loaded on tab mount:** `RolesContext.roles` (already loaded at page mount). `authUsers` already loaded at page mount. RolePerms from `useRolePerms().perms`.

### Role card (collapsed)
- Color dot (role color)
- Role name
- Member count: `authUsers.filter(u => u.role === role.name).length`
- Permission coverage bar: `allowedRoutes.length / ALL_PERM_ROUTES.length * 100%`
  - Note: `/settings` is always in `allowedRoutes` so minimum shown is `1 / total`

### Role card (expanded — click to toggle, one open at a time)

**Admin card** — always first, always locked:
- Static name label "admin" — no input field
- Static color dot — no picker
- "System role" badge
- No delete button
- Shows member count + full coverage bar (admin has all routes)

**All other role cards — editable when expanded:**
- **Name field:** text input pre-filled with current name. On blur or Enter: if value changed and non-empty → calls `dbApi().renameRole({ appId, newName })` → on success (returns `{ ok: true, oldName }`):
  1. `RolesContext.renameRoleLocal(appId, newName)`
  2. `RolePermsContext.renameRolePerms(oldName, newName)`
  3. Re-fetch `authUsers` (`loadUsers()`)

  If IPC returns `{ ok: false }` or throws: error toast + revert field to previous name. If blank: revert without saving.
- **Color picker:** preset swatches from `PROJECT_COLORS`. On swatch click: immediately calls `dbApi().updateRoleColor({ appId, color })` → update `RolesContext` local state. No save button needed.
- **Members:** avatar + name chips for `authUsers.filter(u => u.role === role.name)`. Display only.
- **Delete button:**
  - Disabled with tooltip "Reassign all users first" when member count > 0
  - Enabled when count = 0: clicking shows inline confirm ("Delete role [name]? This cannot be undone.") → on confirm:
    1. `dbApi().deleteRole({ appId })` — deletes Role doc only
    2. On success: `dbApi().deleteRolePerms({ roleName: role.name })` — deletes RolePerms doc
    3. On success: `RolesContext.removeRole(appId)` + `RolePermsContext.removeRolePerms(role.name)` → success toast
    4. If either IPC fails: error toast, role card stays, no local state changes

### "+ New Role" form (inline, at top of list)
- Text input for role name + color swatch picker (default: first `PROJECT_COLORS` swatch)
- "Create" button — disabled until name is non-empty
- On create:
  1. Validate name is unique (client-side check against `RolesContext.roles`) → show error toast if duplicate, stop
  2. Call `dbApi().createRole({ name, color })` → returns `{ appId, name, color }`
  3. Call `dbApi().setRolePerms({ role: name, allowedRoutes: ['/settings'] })` — using role **name** as the key, matching `RolePermsSchema`
  4. `RolesContext.addRole({ appId, name, color })`
  5. `RolePermsContext.addRolePerms({ role: name, allowedRoutes: ['/settings'] })`
  6. Collapse creation form, expand newly created role card
- On failure: error toast, form stays open

**Reserved names enforced at IPC level:** attempting to create a role named `admin` returns an error; surface as error toast.

---

## Tab 4: Permissions

### Matrix layout
- **Rows:** 10 page routes (`ALL_PERM_ROUTES` — unchanged)
- **Columns:** one per role from `RolesContext.roles` (dynamic; Admin column first, always locked)
- Scrolls horizontally if many roles

### Column header (per role)
- Color-coded role name badge (role color from `RolesContext`)
- Progress bar: `allowedRoutes.length / ALL_PERM_ROUTES.length * 100%`
- "Saving…" indicator while any toggle for that role is in-flight
- **Grant All** button (hidden for Admin column): optimistically sets all 10 routes for that role → calls `setRolePerms(role.name, ALL_PERM_ROUTES.map(r => r.id))`. On failure: rollback local state + error toast.
- **Revoke All** button (hidden for Admin column): optimistically sets allowedRoutes to `['/settings']` → calls `setRolePerms(role.name, ['/settings'])`. On failure: rollback + error toast.

### Cells
- **Admin column:** all cells show lock icon, no toggle, visually "on" — Admin always has full access
- **`/settings` row:** all cells show lock icon, no toggle, visually "on" — all roles always have settings access
- **All other cells:** `Toggle` component (reuse existing)

### Toggle behaviour (same optimistic pattern as current `togglePerm`)
1. Compute `next` routes (add or remove the route)
2. Ensure `/settings` is always in `next`
3. Update `localRoutes` optimistic state synchronously
4. Set saving indicator for that role column
5. Call `setRolePerms(role.name, next)` async
6. On success: clear optimistic override (read from context)
7. On failure: revert optimistic state + error toast

### New role columns
When a role is created in Tab 3, `RolesContext.roles` updates reactively → new column appears automatically in matrix with initial state `['/settings']` (already added to `RolePermsContext.perms` during creation).

---

## Component Breakdown

| Component | File | Notes |
|---|---|---|
| `OrganizationPage` | `src/pages/OrganizationPage.tsx` | Rewrite structure; extend `SectionId` to include `'roles'`; Overview branch preserved verbatim |
| `UserProfileDrawer` | `src/components/org/UserProfileDrawer.tsx` | Slide-out drawer |
| `RoleCard` | `src/components/org/RoleCard.tsx` | Collapsible role card |
| `PermissionsMatrix` | `src/components/org/PermissionsMatrix.tsx` | Matrix grid |
| `RolesContext` | `src/context/RolesContext.tsx` | New context for `Role` collection |
| `RolePermsContext` | `src/context/RolePermsContext.tsx` | Extend: load perms for all roles dynamically |
| `AuthContext` | `src/context/AuthContext.tsx` | Add `updateDisplayName(name: string): void` to `AuthContextValue`. Implementation: `setUser(prev => prev ? { ...prev, name } : prev)` + `localStorage.setItem(SESSION_KEY, JSON.stringify({ ...user, name }))`. Called only when editing the logged-in user's own name in the drawer. |

---

## Edge Cases & Error Handling

| Scenario | Behaviour |
|---|---|
| Duplicate role name on create | Client-side check → error toast before IPC call |
| Rename to existing name | Error toast on blur, revert field to previous name |
| Rename `admin` role | Blocked at IPC level; error toast |
| Delete role with users assigned | Delete button disabled; tooltip explains requirement |
| Delete role with no users: IPC fails | Error toast; role card stays |
| Role deleted while another user has it in active session | Next session: `getAllowedRoutes(role)` returns `['/settings']` fallback — acceptable, no mid-session invalidation |
| Toggle save failure | Rollback optimistic state + error toast |
| Grant All / Revoke All failure | Rollback optimistic state + error toast |
| No roles in DB on first launch | Seeded with admin/manager/member on startup |
| Admin changing their own role via drawer | Role dropdown rendered as static badge (self-guard) |
| Renaming a role that is the logged-in user's role | After rename: `authUser.role` in session still holds old string. Next login reflects new name. Acceptable — mid-session invalidation is out of scope. |
| `allTasks.length === 0` | Workload bar = 0%, task count = 0 |
| Many roles (10+) in Permissions matrix | Matrix scrolls horizontally |
| Non-admin navigates directly to `/organization` with `section` state set to `roles` or `permissions` | The `useEffect` guard redirects to `overview` before rendering — no content flash |
| Role column removed from Permissions matrix after role delete | `RolesContext.roles` update removes the column reactively; any in-flight `localRoutes` for that role is also cleared |
| Color format | Only `PROJECT_COLORS` hex swatches are valid — no free-form input. IPC handler does not validate color format beyond accepting the string. |
| `renameRole` IPC partially fails (e.g. RolePerms updated but UserModel update fails) | Handler returns `{ ok: false }` with the partial state logged server-side. Client treats as failure: shows error toast, does not update local state. User must retry. |

---

## Out of Scope

- Audit log / change history
- Per-user permission overrides (permissions are role-level only)
- Role ordering / drag-to-reorder
- Bulk user role assignment
- Email notifications on role change
- Mid-session permission invalidation
- Role hierarchy / inheritance
