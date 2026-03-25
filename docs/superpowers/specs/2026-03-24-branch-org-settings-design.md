# Branch & Organisation Settings — Design Spec
**Date:** 2026-03-24
**Project:** Raft POS
**Status:** Approved

---

## Overview

Add a **Branches** tab to the existing Settings page so operators can create, view, edit, and deactivate branches without leaving the settings area. The existing "General" settings form moves into a "General" tab; a new "Branches" tab hosts full branch CRUD.

---

## Scope

- Tabbed layout on SettingsPage (General | Branches)
- Branches tab: table listing all branches, Add/Edit/Deactivate actions
- BranchFormModal: create and edit a branch
- New IPC channels: `BRANCHES_CREATE`, `BRANCHES_UPDATE`, `BRANCHES_DEACTIVATE`
- Branch service layer (create, update, deactivate)
- `useBranches` hook gains create/update/deactivate mutations

Out of scope: branch-level permissions, multi-branch reporting filters, branch deletion (deactivate only).

---

## Data Model

Existing `Branch` Mongoose model fields used:

| Field    | Type    | Notes                          |
|----------|---------|--------------------------------|
| name     | string  | required                       |
| code     | string  | unique, uppercase, auto-derived from name, editable |
| address  | string  | optional                       |
| phone    | string  | optional                       |
| email    | string  | optional                       |
| isActive | boolean | default true                   |

---

## IPC Channels

Added to `IPC` constant in `ipc.types.ts`:

```
BRANCHES_GET_ALL    'branches:getAll'    (already exists)
BRANCHES_CREATE     'branches:create'
BRANCHES_UPDATE     'branches:update'
BRANCHES_DEACTIVATE 'branches:deactivate'
```

All handlers check `can_manage_branches` permission via `requireAuth`.

---

## Backend

**`branch.service.ts`** (new file):
- `getBranches()` → `IBranch[]`
- `createBranch(input)` → `IBranch`
- `updateBranch(id, input)` → `IBranch | null`
- `deactivateBranch(id)` → `IBranch | null`

**`branch.handlers.ts`** (expand existing):
- `BRANCHES_GET_ALL` — already present, add auth check
- `BRANCHES_CREATE` — validate name + code, call service
- `BRANCHES_UPDATE` — validate id, call service
- `BRANCHES_DEACTIVATE` — validate id, call service

---

## Frontend

### `useBranches` hook (expand)
Adds `createMutation`, `updateMutation`, `deactivateMutation` alongside existing query. Each mutation invalidates the `['branches']` query key on success.

### `BranchFormModal` (new component)
Fields: Name*, Code* (auto-derived, editable), Address, Phone, Email.
Code auto-fills as user types name (uppercased, spaces→hyphens, max 10 chars), but stays editable.
Matches `UserFormModal` styling exactly (dark modal, `dark-input`, footer buttons).

### `BranchesTab` (new component)
Table with columns: Name, Code, Address, Status, Actions.
- Skeleton loading (4 rows) while query loads
- Empty state with "No branches yet" message
- Each row: Edit (pencil), Deactivate (UserMinus icon) — deactivate hidden when already inactive
- Deactivate uses `window.confirm`
- "+ Add Branch" button passed in as prop (rendered in page header)

### `SettingsPage` (refactor)
- Adds `activeTab: 'general' | 'branches'` state
- Tab bar renders below page header, above content
- "Save Settings" button shown only on General tab; "Add Branch" button shown only on Branches tab
- General tab wraps existing form unchanged
- Branches tab renders `<BranchesTab>`

---

## Error Handling

- Query errors show inline error message + retry button (matches UsersPage pattern)
- Mutation errors surface in modal via local `error` state
- Duplicate code (MongoDB `11000`) returns friendly message: "A branch with this code already exists"

---

## File Locations

```
src/main/services/branch.service.ts           (new)
src/main/handlers/branch.handlers.ts          (expand)
src/shared/types/ipc.types.ts                 (add 3 channels)
src/renderer/src/hooks/useBranches.ts         (expand)
src/renderer/src/pages/settings/BranchFormModal.tsx  (new)
src/renderer/src/pages/settings/BranchesTab.tsx      (new)
src/renderer/src/pages/settings/SettingsPage.tsx     (refactor)
```
