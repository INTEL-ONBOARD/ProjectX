# Real-Time Presence Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fake static `status === 'active'` presence system with a real heartbeat + polling mechanism that shows accurate online/away/offline status across all Electron instances sharing the same MongoDB Atlas database.

**Architecture:** Each logged-in client writes a `lastSeen` timestamp to MongoDB every 30 seconds (heartbeat). All clients poll `getMembers` every 5 seconds to refresh state. Status is derived client-side: online = seen < 60s ago, away = 1–5 min, offline = >5 min. A new `PresenceContext` component owns both intervals and exports a pure `getPresenceStatus()` utility used in UI components.

**Tech Stack:** Mongoose 9, MongoDB Atlas M0, React 18, TypeScript, Electron IPC (contextBridge pattern), existing MembersContext/refetchMembers + AuthContext/useAuth patterns.

---

## Chunk 1: Data Layer + IPC

### Task 1: Add `lastSeen` to User schema and `toUser` transformer

**Files:**
- Modify: `electron/main.ts:11-20` (UserSchema)
- Modify: `electron/main.ts:171` (toUser transformer)
- Modify: `electron/main.js:12-21` (UserSchema — JS mirror)
- Modify: `electron/main.js:169` (toUser transformer — JS mirror)

**Context:** `UserSchema` is at line 11 of `electron/main.ts`. The `toUser` helper is a one-liner at line 171. Both `main.ts` and `main.js` must be updated identically — Electron runs `main.js` directly.

- [ ] **Step 1: Add `lastSeen` to `UserSchema` in `electron/main.ts`**

In `electron/main.ts`, find `UserSchema` (line 11) and add `lastSeen` as the last field before the closing `}`):

```typescript
const UserSchema = new Schema({
    appId:       { type: String, required: true, unique: true },
    name:        String,
    avatar:      { type: String, default: '' },
    email:       String,
    location:    String,
    role:        { type: String, default: 'member' },
    designation: String,
    status:      { type: String, enum: ['active', 'inactive'], default: 'active' },
    lastSeen:    { type: Date, default: null },
});
```

- [ ] **Step 2: Update `toUser` transformer in `electron/main.ts`**

Find line 171 (the `toUser` one-liner) and add `lastSeen` to the returned object:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toUser = (d: any) => ({ id: d.appId, name: d.name, avatar: d.avatar ?? '', email: d.email ?? '', location: d.location ?? '', role: d.role, designation: d.designation ?? '', status: d.status, lastSeen: d.lastSeen?.toISOString() ?? null });
```

- [ ] **Step 3: Mirror both changes in `electron/main.js`**

In `electron/main.js`, find `UserSchema` (line 12) and add the same `lastSeen` field:

```javascript
const UserSchema = new Schema({
    appId: { type: String, required: true, unique: true },
    name: String,
    avatar: { type: String, default: '' },
    email: String,
    location: String,
    role: { type: String, default: 'member' },
    designation: String,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    lastSeen: { type: Date, default: null },
});
```

Then find the `toUser` one-liner (line 169) and add `lastSeen`:

```javascript
const toUser = d => ({ id: d.appId, name: d.name, avatar: d.avatar ?? '', email: d.email ?? '', location: d.location ?? '', role: d.role, designation: d.designation ?? '', status: d.status, lastSeen: d.lastSeen?.toISOString() ?? null });
```

- [ ] **Step 4: Add `lastSeen` to the `User` interface in `src/types/index.ts`**

Find the `User` interface (line 4) and add `lastSeen` after `joinedAt`:

```typescript
export interface User {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
    location?: string;
    role: string;
    designation?: string;
    status?: 'active' | 'inactive';
    phone?: string;
    department?: string;
    bio?: string;
    joinedAt?: string;
    lastSeen?: string | null;
}
```

- [ ] **Step 5: Run TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add electron/main.ts electron/main.js src/types/index.ts
git commit -m "feat(presence): add lastSeen field to UserSchema and User type"
```

---

### Task 2: Add `db:presence:heartbeat` IPC handler + preload exposure

**Files:**
- Modify: `electron/main.ts` — add IPC handler after `db:members:remove`
- Modify: `electron/main.js` — mirror the handler
- Modify: `electron/preload.ts` — add `heartbeat` to `db` object
- Modify: `electron/preload.js` — mirror
- Modify: `src/vite-env.d.ts` — add `heartbeat` to `ElectronDB` interface

**Context:** IPC handlers in `main.ts` are registered inside a function called `registerDbHandlers()` which is called after DB connects. Look for `ipcMain.handle('db:members:remove', ...)` — add the heartbeat handler immediately after it, **still inside `registerDbHandlers()`** (before its closing `}`). In `preload.ts`, the `db` object's last entry is `deleteRolePerms` — add `heartbeat` after it, before the closing `},` of the `db` object. In `vite-env.d.ts`, `ElectronDB` interface ends with `}` — add `heartbeat` before the closing `}`.

- [ ] **Step 1: Add IPC handler in `electron/main.ts`**

After the `db:members:remove` handler, add:

```typescript
ipcMain.handle('db:presence:heartbeat', async (_e, userId: string) => {
    await UserModel.updateOne({ appId: userId }, { lastSeen: new Date() });
    return true;
});
```

- [ ] **Step 2: Mirror the handler in `electron/main.js`**

After the `db:members:remove` handler in `main.js`, add:

```javascript
ipcMain.handle('db:presence:heartbeat', async (_e, userId) => {
    await UserModel.updateOne({ appId: userId }, { lastSeen: new Date() });
    return true;
});
```

- [ ] **Step 3: Expose `heartbeat` in `electron/preload.ts`**

In the `db` object (before the closing `},`), add after `removeMember`:

```typescript
        // Presence
        heartbeat: (userId: string): Promise<boolean> => ipcRenderer.invoke('db:presence:heartbeat', userId),
```

- [ ] **Step 4: Mirror in `electron/preload.js`**

In the `db` object (before the closing `},`), add after `removeMember`:

```javascript
        // Presence
        heartbeat: (userId) => ipcRenderer.invoke('db:presence:heartbeat', userId),
```

- [ ] **Step 5: Add type declaration in `src/vite-env.d.ts`**

In `ElectronDB` interface, add after `removeMember`:

```typescript
  heartbeat(userId: string): Promise<boolean>;
```

- [ ] **Step 6: Run TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add electron/main.ts electron/main.js electron/preload.ts electron/preload.js src/vite-env.d.ts
git commit -m "feat(presence): add db:presence:heartbeat IPC handler and preload exposure"
```

---

## Chunk 2: PresenceContext + App.tsx

### Task 3: Create `PresenceContext`

**Files:**
- Create: `src/context/PresenceContext.tsx`

**Context:** This is a new file. It follows the exact same pattern as `MembersContext.tsx` — a `React.FC<{children}>` provider with `useEffect` and no exposed context value. It needs two imports from existing contexts: `useAuth` from `../context/AuthContext` and `useMembersContext` from `../context/MembersContext`. The `(window as any).electronAPI.db` pattern is the same as used in all other context files. The provider renders `{children}` with no wrapping element.

- [ ] **Step 1: Create `src/context/PresenceContext.tsx`**

```tsx
import React, { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useMembersContext } from './MembersContext';

const HEARTBEAT_MS = 30_000; // 30 seconds
const POLL_MS = 5_000;       // 5 seconds

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbApi = () => (window as any).electronAPI.db;

/**
 * Derives presence status from a lastSeen ISO timestamp.
 * - online:  seen within the last 60 seconds
 * - away:    seen 1–5 minutes ago
 * - offline: seen more than 5 minutes ago, or never seen (null/undefined)
 */
export function getPresenceStatus(lastSeen?: string | null): 'online' | 'away' | 'offline' {
    if (!lastSeen) return 'offline';
    const diffMs = Date.now() - new Date(lastSeen).getTime();
    if (diffMs < 60_000) return 'online';
    if (diffMs < 300_000) return 'away';
    return 'offline';
}

/**
 * PresenceProvider — mounts heartbeat and polling intervals.
 * Must be inside AuthProvider and MembersProvider in the tree.
 */
export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user: authUser } = useAuth();
    const { refetchMembers } = useMembersContext();

    useEffect(() => {
        if (!authUser) return;

        // Fire immediately so current user appears online right away
        dbApi().heartbeat(authUser.id).catch(console.error);

        const heartbeatId = setInterval(() => {
            dbApi().heartbeat(authUser.id).catch(console.error);
        }, HEARTBEAT_MS);

        const pollId = setInterval(() => {
            refetchMembers().catch(console.error);
        }, POLL_MS);

        return () => {
            clearInterval(heartbeatId);
            clearInterval(pollId);
        };
    }, [authUser?.id]); // re-runs on login/logout

    return <>{children}</>;
};
```

- [ ] **Step 2: Run TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit
```

Expected: zero errors.

---

### Task 4: Wire `PresenceProvider` into `App.tsx`

**Files:**
- Modify: `src/App.tsx:203-222`

**Context:** The current provider tree in `src/App.tsx` is in the `App` component near the bottom of the file (search for `<AuthProvider>` to find it):
```tsx
<AuthProvider>
  <AppProvider>
    <AuthAppSync />
    <RolePermsProvider>
      <RolesProvider>
        <MembersProvider>
          <ProjectProvider>
            <ToastProvider>
              <HashRouter>
```

`PresenceProvider` must go inside `MembersProvider` (needs `refetchMembers`) and wrap `ProjectProvider` and all its descendants.

- [ ] **Step 1: Add import for `PresenceProvider` in `src/App.tsx`**

Find the existing context imports (around line 10–20) and add:

```tsx
import { PresenceProvider } from './context/PresenceContext';
```

- [ ] **Step 2: Wrap `ProjectProvider` with `PresenceProvider` in `src/App.tsx`**

Change the `App` component's return to:

```tsx
const App: React.FC = () => (
    <AuthProvider>
        <AppProvider>
            <AuthAppSync />
            <RolePermsProvider>
                <RolesProvider>
                <MembersProvider>
                    <PresenceProvider>
                        <ProjectProvider>
                            <ToastProvider>
                                <HashRouter>
                                    <Root />
                                </HashRouter>
                            </ToastProvider>
                        </ProjectProvider>
                    </PresenceProvider>
                </MembersProvider>
                </RolesProvider>
            </RolePermsProvider>
        </AppProvider>
    </AuthProvider>
);
```

- [ ] **Step 3: Run TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/context/PresenceContext.tsx src/App.tsx
git commit -m "feat(presence): add PresenceContext with heartbeat + polling, wire into App"
```

---

## Chunk 3: UI Updates

### Task 5: Update `MessagesPage.tsx` — 5 status locations

**Files:**
- Modify: `src/pages/MessagesPage.tsx`

**Context:** Currently uses `member.status === 'active' ? 'online' : 'offline'` (binary). All 5 locations must use `getPresenceStatus(member.lastSeen)` instead. The `statusColor` and `statusLabel` maps already have `away` entries at line 12 — no new styles needed. Import `getPresenceStatus` from `../context/PresenceContext`.

- [ ] **Step 1: Add import in `src/pages/MessagesPage.tsx`**

Find the existing imports (top of file) and add:

```tsx
import { getPresenceStatus } from '../context/PresenceContext';
```

- [ ] **Step 2: Fix location 1 — conversation list status derivation (line ~278)**

Replace:
```tsx
const status: 'online' | 'offline' = member.status === 'active' ? 'online' : 'offline';
```
With:
```tsx
const status = getPresenceStatus(member.lastSeen);
```
(Type annotation is no longer needed — TypeScript infers `'online' | 'away' | 'offline'` from the function return type.)

- [ ] **Step 3: Fix location 2 — chat header avatar dot (line ~319)**

Replace:
```tsx
style={{ backgroundColor: statusColor[activeMember?.status === 'active' ? 'online' : 'offline'] }}
```
With:
```tsx
style={{ backgroundColor: statusColor[getPresenceStatus(activeMember?.lastSeen)] }}
```

- [ ] **Step 4: Fix location 3 — chat header status label (line ~323)**

The line contains two inline ternaries. Replace both:
```tsx
<div className="text-xs text-gray-400">{activeMember?.designation ?? ''} · <span style={{ color: statusColor[activeMember?.status === 'active' ? 'online' : 'offline'] }}>{statusLabel[activeMember?.status === 'active' ? 'online' : 'offline']}</span></div>
```
With:
```tsx
<div className="text-xs text-gray-400">{activeMember?.designation ?? ''} · <span style={{ color: statusColor[getPresenceStatus(activeMember?.lastSeen)] }}>{statusLabel[getPresenceStatus(activeMember?.lastSeen)]}</span></div>
```

- [ ] **Step 5: Fix locations 4 & 5 — right panel IIFEs (lines ~492 and ~496)**

These two lines are inside IIFEs. Replace both:

Line ~492:
```tsx
{(() => { const s = activeMember?.status === 'active' ? 'online' : 'offline'; return <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white" style={{ backgroundColor: statusColor[s] }} />; })()}
```
With:
```tsx
{(() => { const s = getPresenceStatus(activeMember?.lastSeen); return <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white" style={{ backgroundColor: statusColor[s] }} />; })()}
```

Line ~496:
```tsx
{(() => { const s = activeMember?.status === 'active' ? 'online' : 'offline'; return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-2 inline-block" style={{ backgroundColor: statusColor[s] + '20', color: statusColor[s] }}>{statusLabel[s]}</span>; })()}
```
With:
```tsx
{(() => { const s = getPresenceStatus(activeMember?.lastSeen); return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-2 inline-block" style={{ backgroundColor: statusColor[s] + '20', color: statusColor[s] }}>{statusLabel[s]}</span>; })()}
```

- [ ] **Step 6: Run TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/MessagesPage.tsx
git commit -m "feat(presence): use getPresenceStatus in MessagesPage (5 locations)"
```

---

### Task 6: Update `MembersPage.tsx` — 4 status locations

**Files:**
- Modify: `src/pages/MembersPage.tsx`

**Context:** Four locations to update:
1. `onlineCount` metric (line ~69) — counts members for the "Active Members" card
2. Table row status derivation (line ~169)
3. Availability widget (line ~337) — currently iterates `['online', 'offline']`
4. Profile side-panel status display (line ~421)

`statusColor` and `statusLabel` maps in `MembersPage.tsx` are at line 18–19. Both already have `away` entries.

- [ ] **Step 1: Add import in `src/pages/MembersPage.tsx`**

Find the existing imports and add:

```tsx
import { getPresenceStatus } from '../context/PresenceContext';
```

- [ ] **Step 2: Fix location 1 — `onlineCount` (line ~69)**

Replace:
```tsx
const onlineCount = members.filter(m => m.status === 'active').length;
```
With:
```tsx
const onlineCount = members.filter(m => getPresenceStatus(m.lastSeen) === 'online').length;
```

- [ ] **Step 3: Fix location 2 — table row status derivation (line ~169)**

Replace:
```tsx
const status: 'online' | 'offline' = member.status === 'active' ? 'online' : 'offline';
```
With:
```tsx
const status = getPresenceStatus(member.lastSeen);
```

- [ ] **Step 4: Fix location 3 — Availability widget (line ~337)**

Replace:
```tsx
{(['online', 'offline'] as const).map(s => {
  const count = members.filter(m => (m.status === 'active' ? 'online' : 'offline') === s).length;
```
With:
```tsx
{(['online', 'away', 'offline'] as const).map(s => {
  const count = members.filter(m => getPresenceStatus(m.lastSeen) === s).length;
```

- [ ] **Step 5: Fix location 4 — profile side-panel status (line ~421)**

Replace:
```tsx
<span className={`text-xs font-semibold ${selectedMember.status === 'active' ? 'text-[#68B266]' : 'text-gray-400'}`}>{selectedMember.status ?? 'active'}</span>
```
With:
```tsx
<span className={`text-xs font-semibold ${getPresenceStatus(selectedMember.lastSeen) === 'online' ? 'text-[#68B266]' : getPresenceStatus(selectedMember.lastSeen) === 'away' ? 'text-[#FFA500]' : 'text-gray-400'}`}>{getPresenceStatus(selectedMember.lastSeen)}</span>
```

- [ ] **Step 6: Run TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/MembersPage.tsx
git commit -m "feat(presence): use getPresenceStatus in MembersPage (4 locations)"
```

---

## End-to-End Verification

- [ ] Start the app as User A. Confirm User A immediately appears as **Online** in their own Members list (within 5s poll).
- [ ] Open the app as User B (different machine or second Electron instance pointing to same Atlas DB). Confirm User A shows as **Online** within 5 seconds.
- [ ] Close User A's app. After >60 seconds, confirm User A shows **Away** on User B's screen. After >5 minutes, confirm **Offline**.
- [ ] Reopen User A. Within 5 seconds, User A shows **Online** again on User B.
- [ ] In `MessagesPage`, open a chat — confirm conversation list dots, chat header dot, and right panel badge all show the correct state.
- [ ] In `MembersPage`, check the Availability widget shows Online/Away/Offline counts. Check the "Active Members" metric card reflects actual online count.
- [ ] In `MembersPage`, click a member row to open the side panel — confirm the Status field shows the correct color for all three states.
- [ ] Run final TypeScript check: `./node_modules/.bin/tsc --noEmit` — zero errors.
