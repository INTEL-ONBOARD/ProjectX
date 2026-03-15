# Real-Time Presence Design

**Goal:** Show accurate online/away/offline status for all users across all connected Electron instances using a shared MongoDB Atlas M0 cluster.

**Architecture:** Each logged-in client writes a `lastSeen` heartbeat to the DB every 30 seconds. All clients poll `getMembers` every 5 seconds to refresh presence state. Status is derived client-side by comparing `lastSeen` to the current time.

**Tech Stack:** Mongoose 9, MongoDB Atlas M0, React 18, Electron IPC, existing MembersContext/refetchMembers pattern.

**Known limitation:** Status accuracy depends on client system clocks being reasonably in sync. If two machines differ by more than 30 seconds, a fully active user may appear as `'away'` on other machines.

---

## 1. Data Layer

### User schema (`electron/main.ts`)
Add `lastSeen` field to `UserSchema` only (NOT `AuthUserSchema` — presence is a display property, not an auth credential):
```typescript
lastSeen: { type: Date, default: null }
```

### `toUser` transformer (`electron/main.ts`)
Include `lastSeen` in the mapped object. Both `.lean()` and `.toObject()` return native JS `Date` instances, so use optional chaining:
```typescript
lastSeen: d.lastSeen?.toISOString() ?? null,
```

### `User` type (`src/types/index.ts`)
```typescript
lastSeen?: string | null;  // ISO string or null
```

### IPC handler (`electron/main.ts`)
Write only to `UserModel`. If `userId` doesn't exist, `updateOne` silently returns `{ matchedCount: 0 }` — this is acceptable; the handler returns `true` regardless:
```typescript
ipcMain.handle('db:presence:heartbeat', async (_e, userId: string) => {
    await UserModel.updateOne({ appId: userId }, { lastSeen: new Date() });
    return true;
});
```

### Preload (`electron/preload.ts` + `electron/preload.js`)
Add to the `db` object (same pattern as all other db methods):
```typescript
heartbeat: (userId: string): Promise<boolean> => ipcRenderer.invoke('db:presence:heartbeat', userId),
```

### Type declaration (`src/vite-env.d.ts`)
Add to the `ElectronDB` interface (not `ElectronAPI` top-level):
```typescript
heartbeat(userId: string): Promise<boolean>;
```

---

## 2. PresenceContext (`src/context/PresenceContext.tsx`)

New context with two responsibilities. The provider accesses auth and members via their existing hooks inside the component body:

```typescript
const { user: authUser } = useAuth();               // from AuthContext
const { refetchMembers } = useMembersContext();      // from MembersContext
```

```typescript
const HEARTBEAT_MS = 30_000;  // 30 seconds
const POLL_MS = 5_000;         // 5 seconds
```

**Heartbeat interval:** Call `heartbeat(authUser.id)` once immediately when the effect runs (so current user shows as online at once), then every 30s via `setInterval`.

**Polling interval:** Call `refetchMembers()` every 5s via `setInterval`. `refetchMembers` has no in-flight guard — concurrent calls are last-write-wins on React state, which is acceptable for presence polling.

Both intervals start only when `authUser` is non-null and are cleared via the `useEffect` cleanup when `authUser` becomes null or the component unmounts:

```typescript
useEffect(() => {
    if (!authUser) return;

    const db = () => (window as any).electronAPI.db;

    // fire once immediately so current user appears online right away
    db().heartbeat(authUser.id).catch(console.error);

    const heartbeatId = setInterval(() => {
        db().heartbeat(authUser.id).catch(console.error);
    }, HEARTBEAT_MS);

    const pollId = setInterval(() => {
        refetchMembers().catch(console.error);
    }, POLL_MS);

    return () => {
        clearInterval(heartbeatId);
        clearInterval(pollId);
    };
}, [authUser?.id]);  // re-runs on login/logout
```

The context also exports a pure utility function (no React state — just a helper used in UI components):

```typescript
export function getPresenceStatus(lastSeen?: string | null): 'online' | 'away' | 'offline' {
    if (!lastSeen) return 'offline';
    const diffMs = Date.now() - new Date(lastSeen).getTime();
    if (diffMs < 60_000) return 'online';    // seen within 1 minute
    if (diffMs < 300_000) return 'away';     // seen 1–5 minutes ago
    return 'offline';                         // seen more than 5 minutes ago
}
```

`PresenceProvider` provides no context value (no consumers need it) — it is used purely for its side effects and renders `{children}` directly.

---

## 3. Provider Tree (`src/App.tsx`)

The current provider tree is:
```tsx
<AuthProvider>
  <AppProvider>
    <RolePermsProvider>
      <RolesProvider>
        <MembersProvider>
          <ProjectProvider>
            <ToastProvider>
              <HashRouter>
                ...
              </HashRouter>
            </ToastProvider>
          </ProjectProvider>
        </MembersProvider>
      </RolesProvider>
    </RolePermsProvider>
  </AppProvider>
</AuthProvider>
```

`PresenceProvider` must be inside `MembersProvider` (needs `refetchMembers`) and inside `AuthProvider` (needs `authUser`). Place it directly inside `MembersProvider`, wrapping `ProjectProvider` and all its descendants:

```tsx
<MembersProvider>
  <PresenceProvider>
    <ProjectProvider>
      <ToastProvider>
        <HashRouter>
          ...
        </HashRouter>
      </ToastProvider>
    </ProjectProvider>
  </PresenceProvider>
</MembersProvider>
```

---

## 4. UI Updates

Import `getPresenceStatus` from `PresenceContext` and replace all presence-status ternary expressions.

### `src/pages/MessagesPage.tsx` — 5 locations

1. **Line ~278** — conversation list: replace `member.status === 'active' ? 'online' : 'offline'` with `getPresenceStatus(member.lastSeen)`. Change the type annotation from `'online' | 'offline'` to `'online' | 'away' | 'offline'`.
2. **Line ~319** — chat header avatar dot: replace `activeMember?.status === 'active' ? 'online' : 'offline'`
3. **Line ~323** — chat header status label: same replacement
4. **Line ~492** — right panel IIFE: `const s = activeMember?.status === 'active' ? 'online' : 'offline'` → `const s = getPresenceStatus(activeMember?.lastSeen)`
5. **Line ~496** — second expression in the same IIFE (same block as #4): replace the status label derivation

### `src/pages/MembersPage.tsx` — 4 locations

1. **Line ~69** — `onlineCount` metric: replace:
   ```typescript
   const onlineCount = members.filter(m => m.status === 'active').length;
   ```
   with:
   ```typescript
   const onlineCount = members.filter(m => getPresenceStatus(m.lastSeen) === 'online').length;
   ```

2. **Line ~169** — table row status derivation: replace `member.status === 'active' ? 'online' : 'offline'` with `getPresenceStatus(member.lastSeen)`. Change type annotation from `'online' | 'offline'` to `'online' | 'away' | 'offline'`.

3. **Line ~337** — Availability widget: update the iterated array from `(['online', 'offline'] as const)` to `(['online', 'away', 'offline'] as const)` and derive counts using `getPresenceStatus(member.lastSeen)` instead of the old binary check.

4. **Line ~421** — profile side-panel status display:
   ```tsx
   // Current:
   <span className={`... ${selectedMember.status === 'active' ? 'text-[#68B266]' : 'text-gray-400'}`}>
     {selectedMember.status ?? 'active'}
   </span>

   // Replace with:
   <span className={`... ${getPresenceStatus(selectedMember.lastSeen) === 'online' ? 'text-[#68B266]' : getPresenceStatus(selectedMember.lastSeen) === 'away' ? 'text-[#FFA500]' : 'text-gray-400'}`}>
     {getPresenceStatus(selectedMember.lastSeen)}
   </span>
   ```

The existing `statusColor` and `statusLabel` maps in both files already include `away` entries — no additional style additions needed.

---

## 5. Edge Cases

- **User not yet seen (null/undefined lastSeen):** `getPresenceStatus(null)` returns `'offline'`.
- **Current user:** Always `'online'` — heartbeat fires immediately on mount and every 30s.
- **App closed / crash:** Heartbeats stop → status becomes `'away'` after more than 60 seconds, `'offline'` after more than 5 minutes.
- **Polling concurrency:** `refetchMembers` has no in-flight guard — concurrent calls are last-write-wins on React state, which is fine for presence polling.
- **Logout:** `authUser` becomes null → `useEffect` re-runs → both intervals are cleared immediately.
- **React Strict Mode (dev only):** Effect fires twice; first cleanup clears first-invocation intervals; second invocation runs correctly.

---

## 6. Files to Modify/Create

| File | Type | Change |
|------|------|--------|
| `electron/main.ts` | Modify | Add `lastSeen` to `UserSchema`, update `toUser` transformer, add `db:presence:heartbeat` handler |
| `electron/main.js` | Modify | Mirror the above changes in compiled JS |
| `electron/preload.ts` | Modify | Add `heartbeat` to the `db` object |
| `electron/preload.js` | Modify | Mirror the above |
| `src/vite-env.d.ts` | Modify | Add `heartbeat` to `ElectronDB` interface |
| `src/types/index.ts` | Modify | Add `lastSeen?: string \| null` to `User` |
| `src/context/PresenceContext.tsx` | Create | Heartbeat + polling side effects + exported `getPresenceStatus` |
| `src/App.tsx` | Modify | Wrap `ProjectProvider` subtree with `PresenceProvider` inside `MembersProvider` |
| `src/pages/MessagesPage.tsx` | Modify | Replace 5 status-derivation expressions; update type annotations |
| `src/pages/MembersPage.tsx` | Modify | Replace 4 status-derivation locations (line 69, 169, 337, 421); update Availability widget |

---

## 7. Verification

1. `./node_modules/.bin/tsc --noEmit` — zero errors
2. Log in as User A → immediately shows as Online in User B's Members list (within 5s poll cycle)
3. Close User A's app → after more than 60 seconds User A shows as Away; after more than 5 minutes shows as Offline
4. Log back in as User A → within 5s shows as Online again
5. MessagesPage conversation list, chat header, and right panel all reflect the same `online`/`away`/`offline` state
6. Members page metric card "Active Members" shows count of currently-online users
7. Members page Availability widget shows Online/Away/Offline counts correctly
8. Members page profile side-panel status shows correct color for all three states
