# Real-Time Messaging Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 5-second poll in MessagesPage with a MongoDB Change Stream push so messages appear instantly without any manual refresh.

**Architecture:** The Electron main process opens a change stream on the `messages` collection after the window is ready. When any insert fires for a message the current user *received* (not sent), main pushes a `msg:new` IPC event to the renderer with the transformed message payload. The renderer listens for `msg:new` and appends directly to local chat state — eliminating the poll entirely. The existing send/receive IPC request-response handlers are unchanged.

**Tech Stack:** Electron 28, Mongoose 9 / MongoDB Atlas, React 18, TypeScript

**Critical files:**
- Modify: `electron/main.js` — hoist `toMsg`, open change stream after window ready, push `msg:new` (runtime)
- Modify: `electron/main.ts` — same change (TypeScript source, keep in sync manually)
- Modify: `electron/preload.js` — expose `onNewMessage` listener (runtime)
- Modify: `electron/preload.ts` — same change (TypeScript source)
- Modify: `src/pages/MessagesPage.tsx` — replace 5s poll with `onNewMessage` listener

---

## Task 1: Update main.js — hoist toMsg, add change stream, start after window ready

**Files:**
- Modify: `electron/main.js`

**Important scoping note:** In `main.js` the `toMsg` helper is currently defined *inside* `registerDbHandlers()` (around line 255), making it local to that function. The change stream handler lives outside `registerDbHandlers`, so `toMsg` must be moved to module scope first.

**Important timing note:** `connectDB()` is called before `createWindow()` in the app lifecycle, so `mainWindow` is `null` when the DB first connects. The change stream must be started inside `mainWindow.once('ready-to-show', ...)` to guarantee the window exists before any events fire.

**Deduplication note:** The sender already sees their own message via optimistic update. To avoid duplicates we only forward messages where `fromId !== myId` — but we don't know "myId" in the main process. Instead, we let the renderer filter: we forward all inserts but the renderer ignores messages sent by itself (see Task 4).

- [ ] **Step 1: Hoist `toMsg` to module scope in main.js**

Find this line inside `registerDbHandlers()` (around line 255 inside the function):
```javascript
const toMsg = d => ({ id: d.msgId, from: d.fromId, to: d.toId, text: d.text, time: d.timestamp, read: false, reactions: d.reactions ? Object.fromEntries(Object.entries(d.reactions)) : {}, deleted: d.deleted ?? false });
```

Cut it from inside `registerDbHandlers` and paste it at module scope — just before the `connectDB` function (around line 187). The `ipcMain.handle('db:messages:...')` handlers inside `registerDbHandlers` that use `toMsg` will still find it via closure over the module scope.

After the move, `main.js` around line 187 should look like:
```javascript
const toMsg = d => ({ id: d.msgId, from: d.fromId, to: d.toId, text: d.text, time: d.timestamp, read: false, reactions: d.reactions ? Object.fromEntries(Object.entries(d.reactions)) : {}, deleted: d.deleted ?? false });

// ─── MongoDB connection ────────────────────────────────────────────────────────

async function connectDB() {
```

- [ ] **Step 2: Add `startMessageStream` function above `connectDB`**

After the hoisted `toMsg` line (and before the `connectDB` function), add:

```javascript
let messageStream = null;

function startMessageStream() {
    if (messageStream) { try { messageStream.close(); } catch (_) {} messageStream = null; }
    try {
        messageStream = MessageModel.watch([{ $match: { operationType: 'insert' } }]);
        messageStream.on('change', change => {
            if (!mainWindow || mainWindow.isDestroyed()) return;
            const d = change.fullDocument;
            if (!d) return;
            mainWindow.webContents.send('msg:new', toMsg(d));
        });
        messageStream.on('error', err => {
            console.error('[changeStream] error:', err.message);
            messageStream = null;
        });
        console.log('[changeStream] message stream started');
    } catch (err) {
        console.error('[changeStream] failed to start:', err.message);
    }
}
```

- [ ] **Step 3: Call `startMessageStream()` inside `ready-to-show` in `createWindow`**

Find the `mainWindow.once('ready-to-show', ...)` block (around line 599):
```javascript
mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (autoUpdater) setTimeout(() => checkForUpdates(), 3000);
});
```

Change it to:
```javascript
mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (autoUpdater) setTimeout(() => checkForUpdates(), 3000);
    startMessageStream();
});
```

- [ ] **Step 4: Close stream on app quit**

Find `app.on('window-all-closed', ...)` (around line 619). Add just before it:

```javascript
app.on('before-quit', () => {
    if (messageStream) { try { messageStream.close(); } catch (_) {} messageStream = null; }
});
```

- [ ] **Step 5: Verify no syntax errors**

```bash
node --check electron/main.js 2>&1
```
Expected: no output (no syntax errors).

- [ ] **Step 6: Commit**

```bash
git add electron/main.js
git commit -m "feat: hoist toMsg + add change stream in main.js, start after window ready"
```

---

## Task 2: Mirror changes to main.ts

**Files:**
- Modify: `electron/main.ts`

`main.ts` is the TypeScript source — keep in sync with `main.js` for future builds.

**Important field naming:** In `main.ts` the `toMsg` helper is already at module scope (around line 196). However, its field names differ from `main.js` — it uses `fromId`/`toId`/`timestamp` instead of `from`/`to`/`time`. The renderer expects `from`/`to`/`time`. For the change stream we must use the `main.js`-style mapping so the renderer can process the event correctly. We add a separate `toMsgFrontend` helper for this.

- [ ] **Step 1: Add `toMsgFrontend` helper to main.ts**

Find the existing `toMsg` in `main.ts` (around line 196). Just after it, add:

```typescript
// Used by change stream to produce renderer-compatible shape (from/to/time/read)
const toMsgFrontend = (d: any) => ({
    id: d.msgId,
    from: d.fromId,
    to: d.toId,
    text: d.text,
    time: d.timestamp,
    read: false,
    reactions: d.reactions ? Object.fromEntries(Object.entries(d.reactions as Record<string, unknown>)) : {},
    deleted: d.deleted ?? false,
});
```

- [ ] **Step 2: Add `startMessageStream` to main.ts**

Find the `connectDB` function in `main.ts`. Just above it, add:

```typescript
let messageStream: any = null;

function startMessageStream(): void {
    if (messageStream) { try { messageStream.close(); } catch (_) {} messageStream = null; }
    try {
        messageStream = (MessageModel as any).watch([{ $match: { operationType: 'insert' } }]);
        messageStream.on('change', (change: any) => {
            if (!mainWindow || (mainWindow as any).isDestroyed()) return;
            const d = change.fullDocument;
            if (!d) return;
            (mainWindow as any).webContents.send('msg:new', toMsgFrontend(d));
        });
        messageStream.on('error', (err: any) => {
            console.error('[changeStream] error:', err.message);
            messageStream = null;
        });
        console.log('[changeStream] message stream started');
    } catch (err: any) {
        console.error('[changeStream] failed to start:', err.message);
    }
}
```

- [ ] **Step 3: Call `startMessageStream()` in `ready-to-show` in main.ts**

Find the `mainWindow.once('ready-to-show', ...)` block in `main.ts`. Add `startMessageStream()` inside it, same as Task 1 Step 3.

- [ ] **Step 4: Add before-quit cleanup to main.ts**

```typescript
app.on('before-quit', () => {
    if (messageStream) { try { messageStream.close(); } catch (_) {} messageStream = null; }
});
```

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/kkwenuja/Desktop/ProjectX && ./node_modules/.bin/tsc --noEmit 2>&1
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add electron/main.ts
git commit -m "feat: mirror change stream + toMsgFrontend to main.ts"
```

---

## Task 3: Expose onNewMessage in preload.js and preload.ts

**Files:**
- Modify: `electron/preload.js`
- Modify: `electron/preload.ts`

- [ ] **Step 1: Add `onNewMessage` to preload.js**

In `preload.js`, find the `onDbConnectionFailed` listener (it is the last DB-connection event in the file):
```javascript
onDbConnectionFailed: (cb) => {
    ipcRenderer.on('db:connection-failed', cb);
    return () => ipcRenderer.removeListener('db:connection-failed', cb);
},
```

After it, add:
```javascript
onNewMessage: (cb) => {
    ipcRenderer.on('msg:new', cb);
    return () => ipcRenderer.removeListener('msg:new', cb);
},
```

- [ ] **Step 2: Add `onNewMessage` to preload.ts**

In `preload.ts`, find the `onDbReconnected` listener (around line 39):
```typescript
onDbReconnected: (cb: () => void) => {
    ipcRenderer.on('db:reconnected', cb);
    return () => ipcRenderer.removeListener('db:reconnected', cb);
},
```

After it, add:
```typescript
onNewMessage: (cb: (_: unknown, msg: { id: string; from: string; to: string; text: string; time: string; read: boolean; reactions: Record<string, unknown>; deleted: boolean }) => void) => {
    ipcRenderer.on('msg:new', cb);
    return () => ipcRenderer.removeListener('msg:new', cb);
},
```

- [ ] **Step 3: TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit 2>&1
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add electron/preload.js electron/preload.ts
git commit -m "feat: expose onNewMessage IPC listener in preload"
```

---

## Task 4: Replace poll with change stream listener in MessagesPage.tsx

**Files:**
- Modify: `src/pages/MessagesPage.tsx`

Replace the 5-second polling useEffect with:
1. A one-time fetch when the active peer changes (keep the initial load)
2. A global `onNewMessage` listener that appends incoming messages to the correct conversation slot

**Sender deduplication:** When the current user sends a message, the change stream will push it back to the renderer. To avoid a duplicate (the sender already has an optimistic entry), the listener skips any message whose `from` equals `myId`.

- [ ] **Step 1: Replace the polling useEffect**

Find this block in `MessagesPage.tsx` (lines ~75–86):

```typescript
// Load messages from DB when active peer changes, then poll every 5s
useEffect(() => {
  if (!activeMember) return;
  const peerId = activeMember.id;
  const fetch = () =>
    dbApi().getMessagesBetween(currentUserId, peerId)
        .then((msgs: Msg[]) => setChats(prev => ({ ...prev, [peerId]: msgs })))
        .catch((err: unknown) => console.error('[MessagesPage] Failed to load messages:', err));
  fetch();
  const pollId = setInterval(fetch, 5_000);
  return () => clearInterval(pollId);
}, [activeMember?.id, currentUserId]);
```

Replace the entire block with these two separate useEffects:

```typescript
// Load messages from DB when active peer changes (one-time fetch)
useEffect(() => {
  if (!activeMember) return;
  const peerId = activeMember.id;
  dbApi().getMessagesBetween(currentUserId, peerId)
      .then((msgs: Msg[]) => setChats(prev => ({ ...prev, [peerId]: msgs })))
      .catch((err: unknown) => console.error('[MessagesPage] Failed to load messages:', err));
}, [activeMember?.id, currentUserId]);

// Real-time: listen for new messages pushed from main via change stream
useEffect(() => {
  if (!currentUserId) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (window as any).electronAPI;
  if (!api?.onNewMessage) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unsub = api.onNewMessage((_: unknown, msg: any) => {
    // Skip messages the current user sent (already shown via optimistic update)
    if (msg.from === currentUserId) return;
    // Skip messages not addressed to the current user
    if (msg.to !== currentUserId) return;
    const peerId = msg.from;
    setChats(prev => {
      const existing = prev[peerId] ?? [];
      if (existing.some((m: Msg) => m.id === msg.id)) return prev;
      return { ...prev, [peerId]: [...existing, { id: msg.id, from: msg.from, text: msg.text, time: msg.time, read: false }] };
    });
  });
  return () => unsub?.();
}, [currentUserId]);
```

- [ ] **Step 2: TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit 2>&1
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/MessagesPage.tsx
git commit -m "feat: replace 5s message poll with real-time change stream listener"
```

---

## Verification

1. Open the app with two user accounts (two windows or two machines against the same Atlas DB)
2. User A sends a message to User B
3. User B sees the message appear instantly — no ctrl+r needed
4. Switch conversations on User B's side — messages still load correctly on switch
5. User A's sent message does NOT appear twice (dedup works)
6. Unread count on sidebar conversation list updates without refresh

**TypeScript check:**
```bash
./node_modules/.bin/tsc --noEmit
```
Expected: zero errors.
