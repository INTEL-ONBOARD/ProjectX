# Sidebar Nav Reorder Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users drag and drop sidebar navigation items to reorder them, with the order saved per-user in MongoDB and restored on next login.

**Architecture:** Add a `navOrder` field to the existing `UserPrefSchema` in Electron's main process. The Sidebar component loads the saved order on mount, renders nav items in that order using `@dnd-kit/sortable`, and writes back the new order on each successful drop via the existing `electronAPI.userPrefs` IPC channel.

**Tech Stack:** React, TypeScript, Framer Motion, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, Mongoose/MongoDB, Electron IPC

---

## File Map

| File | Change |
|------|--------|
| `electron/main.ts` | Add `navOrder` field to `UserPrefSchema`; add `navOrder` to `toUserPref` mapper |
| `electron/main.js` | Mirror the same two changes from `main.ts` |
| `src/vite-env.d.ts` | Add `navOrder?: string[]` to `ElectronUserPrefs.get` return type |
| `src/components/layout/Sidebar.tsx` | Add `navOrder` state + load effect; replace `navItems` derivation; replace `motion.li` with plain `<li>` + dnd-kit; add `SortableNavItem` sub-component; add drag-end handler |

---

## Chunk 1: Backend & Types

### Task 1: Add `navOrder` to Mongoose schema and mapper (`main.ts`)

**Files:**
- Modify: `electron/main.ts:114` (end of `UserPrefSchema`)
- Modify: `electron/main.ts:223` (`toUserPref` mapper)

- [ ] **Step 1: Add `navOrder` field to `UserPrefSchema`**

In `electron/main.ts`, find `UserPrefSchema` (line 106). After the last field (`taskBreakdownSnapshot`), add:

```ts
    navOrder: { type: [String], default: [] },
```

The schema block should now end:
```ts
    taskBreakdownSnapshot: { type: Schema.Types.Mixed, default: {} },
    navOrder: { type: [String], default: [] },
});
```

- [ ] **Step 2: Add `navOrder` to `toUserPref` mapper**

In `electron/main.ts`, find the `toUserPref` mapper (line 223). Append `navOrder` to the returned object:

```ts
const toUserPref = (d: any) => ({
    userId: d.userId,
    theme: d.theme,
    sidebarCollapsed: d.sidebarCollapsed ?? false,
    selectedWeekStart: d.selectedWeekStart ?? null,
    hasSeenWalkthrough: d.hasSeenWalkthrough ?? false,
    projectsView: d.projectsView ?? 'grid',
    taskBreakdownSnapshot: d.taskBreakdownSnapshot ?? {},
    navOrder: d.navOrder ?? [],
});
```

(The existing line is a single-line object — reformat it to add the new field.)

- [ ] **Step 3: Commit**

```bash
git add electron/main.ts
git commit -m "feat: add navOrder field to UserPrefSchema and toUserPref mapper"
```

---

### Task 2: Mirror changes to `main.js`

**Files:**
- Modify: `electron/main.js:136` (end of `UserPrefSchema`)
- Modify: `electron/main.js:236` (`toUserPref` mapper)

- [ ] **Step 1: Add `navOrder` to `UserPrefSchema` in `main.js`**

In `electron/main.js`, find the `taskBreakdownSnapshot` field (line 136, the last field in `UserPrefSchema`). After it, add:

```js
    navOrder: { type: [String], default: [] },
```

- [ ] **Step 2: Add `navOrder` to `toUserPref` in `main.js`**

In `electron/main.js`, find the `toUserPref` line (line 236). It currently ends with `taskBreakdownSnapshot: d.taskBreakdownSnapshot ?? {} })`. Change it to:

```js
const toUserPref = (d) => ({ userId: d.userId, theme: d.theme, sidebarCollapsed: d.sidebarCollapsed ?? false, selectedWeekStart: d.selectedWeekStart ?? null, hasSeenWalkthrough: d.hasSeenWalkthrough ?? false, projectsView: d.projectsView ?? 'grid', taskBreakdownSnapshot: d.taskBreakdownSnapshot ?? {}, navOrder: d.navOrder ?? [] });
```

- [ ] **Step 3: Commit**

```bash
git add electron/main.js
git commit -m "feat: mirror navOrder changes to main.js"
```

---

### Task 3: Update TypeScript type definition

**Files:**
- Modify: `src/vite-env.d.ts:87`

- [ ] **Step 1: Add `navOrder` to `ElectronUserPrefs`**

In `src/vite-env.d.ts`, find the `ElectronUserPrefs` interface (line 86). The `get` return type currently is:

```ts
get(userId: string): Promise<{ theme?: string; sidebarCollapsed?: boolean; selectedWeekStart?: string | null; hasSeenWalkthrough?: boolean; projectsView?: string } | null>;
```

Add `navOrder?: string[]`:

```ts
get(userId: string): Promise<{ theme?: string; sidebarCollapsed?: boolean; selectedWeekStart?: string | null; hasSeenWalkthrough?: boolean; projectsView?: string; navOrder?: string[] } | null>;
```

- [ ] **Step 2: Commit**

```bash
git add src/vite-env.d.ts
git commit -m "feat: add navOrder to ElectronUserPrefs type"
```

---

## Chunk 2: Frontend — Sidebar Reorder

### Task 4: Install dnd-kit dependencies

**Files:**
- Modify: `package.json` (automatically updated by npm)

- [ ] **Step 1: Install packages**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: packages added to `dependencies` in `package.json`, `node_modules/@dnd-kit/` created.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add @dnd-kit dependencies for sidebar reorder"
```

---

### Task 5: Add `navOrder` state and load effect to Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add import for dnd-kit and GripVertical**

At the top of `Sidebar.tsx`, add imports:

```ts
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
```

Also add `GripVertical` to the existing lucide-react import line.

- [ ] **Step 2: Add `navOrder` state**

Inside `Sidebar`, after the existing `useState` declarations (around line 54), add:

```ts
const [navOrder, setNavOrder] = useState<string[]>([]);
```

- [ ] **Step 3: Add load effect**

After the existing `useEffect` blocks (after line 118), add:

```ts
useEffect(() => {
    if (!user?.id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI;
    api?.userPrefs?.get(user.id)
        .then((prefs: { navOrder?: string[] } | null) => {
            if (prefs?.navOrder?.length) setNavOrder(prefs.navOrder);
        })
        .catch(() => { /* fall back to default order */ });
}, [user?.id]);
```

- [ ] **Step 4: Replace `navItems` derivation with ordered derivation**

Find the existing line (around line 66):

```ts
const navItems = ALL_NAV_ITEMS.filter(item => allowedRoutes.includes(item.id));
```

Replace it with:

```ts
const allowedIds = ALL_NAV_ITEMS
    .filter(item => allowedRoutes.includes(item.id))
    .map(item => item.id);

const orderedNavIds = [
    ...navOrder.filter(id => allowedIds.includes(id)),
    ...allowedIds.filter(id => !navOrder.includes(id)),
];

const navItems = orderedNavIds
    .map(id => ALL_NAV_ITEMS.find(item => item.id === id)!);
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: add navOrder state and ordered nav derivation to Sidebar"
```

---

### Task 6: Add `SortableNavItem` sub-component

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Define `SortableNavItem` above the `Sidebar` component**

Insert the following before the `const Sidebar` declaration (around line 46):

```tsx
interface SortableNavItemProps {
    item: { id: string; label: string; icon: React.ElementType };
    isActive: boolean;
    collapsed: boolean;
    unreadMsgCount: number;
    onMessagesPage: boolean;
    onClick: () => void;
}

const SortableNavItem: React.FC<SortableNavItemProps> = ({
    item,
    isActive,
    collapsed,
    unreadMsgCount,
    onMessagesPage,
    onClick,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const Icon = item.icon;

    return (
        <li ref={setNodeRef} style={style} className="relative">
            {isActive && (
                <motion.div
                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary-500 rounded-r-full"
                    layoutId="nav-indicator"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
            )}
            <div className="flex items-center group">
                {!collapsed && (
                    <span
                        {...attributes}
                        {...listeners}
                        className="pl-1 pr-0.5 py-2.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
                        title="Drag to reorder"
                    >
                        <GripVertical size={14} />
                    </span>
                )}
                <button
                    onClick={onClick}
                    className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700'
                        }`}
                >
                    <div className="relative shrink-0">
                        <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                        {item.id === '/messages' && unreadMsgCount > 0 && !onMessagesPage && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-full bg-primary-500 text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
                                {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                            </span>
                        )}
                    </div>
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.span
                                className="text-sm font-medium whitespace-nowrap"
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {item.label}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>
        </li>
    );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: add SortableNavItem sub-component to Sidebar"
```

---

### Task 7: Wire up DndContext and drag-end handler

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add `sensors` and `handleDragEnd` inside `Sidebar`**

Inside the `Sidebar` component body, after the `navItems` derivation, add:

```ts
const sensors = useSensors(useSensor(PointerSensor));

const handleDragEnd = async (event: DragEndEvent) => {
    if (!user?.id) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedNavIds.indexOf(active.id as string);
    const newIndex = orderedNavIds.indexOf(over.id as string);
    const newOrder = arrayMove(orderedNavIds, oldIndex, newIndex);

    setNavOrder(newOrder);

    // Fire-and-forget save: read full prefs, merge navOrder, write back
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api = (window as any).electronAPI;
        const current = await api?.userPrefs?.get(user?.id);
        await api?.userPrefs?.set({ ...current, navOrder: newOrder });
    } catch (err) {
        console.error('[Sidebar] Failed to save navOrder:', err);
    }
};
```

Note: `orderedNavIds` must be accessible here — move it out of the `navItems` derivation block so it's in scope (it already is if defined at component scope in Task 5).

- [ ] **Step 2: Replace the nav `<ul>` with `DndContext` + `SortableContext`**

Find the nav `<ul>` block (around line 168):

```tsx
<ul className="space-y-1">
    {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.id;
        return (
            <motion.li key={item.id} whileHover={{ x: 2 }} transition={{ duration: 0.15 }} className="relative">
                {isActive && (
                    <motion.div
                        className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary-500 rounded-r-full"
                        layoutId="nav-indicator"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                )}
                <button
                    onClick={() => navigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700'
                        }`}
                >
                    <div className="relative shrink-0">
                        <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                        {item.id === '/messages' && unreadMsgCount > 0 && !onMessagesPage && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-full bg-primary-500 text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
                                {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                            </span>
                        )}
                    </div>
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.span
                                className="text-sm font-medium whitespace-nowrap"
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {item.label}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </motion.li>
        );
    })}
</ul>
```

Replace with:

```tsx
<DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragEnd={handleDragEnd}
>
    <SortableContext
        items={navItems.map(i => i.id)}
        strategy={verticalListSortingStrategy}
        disabled={collapsed}
    >
        <ul className="space-y-1">
            {navItems.map((item) => (
                <SortableNavItem
                    key={item.id}
                    item={item}
                    isActive={location.pathname === item.id}
                    collapsed={collapsed}
                    unreadMsgCount={unreadMsgCount}
                    onMessagesPage={onMessagesPage}
                    onClick={() => navigate(item.id)}
                />
            ))}
        </ul>
    </SortableContext>
</DndContext>
```

- [ ] **Step 3: Build and verify no TypeScript errors**

```bash
npm run build 2>&1 | head -40
```

Expected: build completes with no TypeScript errors. Fix any type errors before proceeding.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: wire up DndContext drag-and-drop reorder in Sidebar"
```

---

### Task 8: Manual smoke test

- [ ] **Step 1: Run the app**

```bash
npm run dev
```

- [ ] **Step 2: Verify drag reorder works**

1. Log in as any user
2. Hover over any nav item — the `⠿` handle should appear on the left
3. Drag the item up or down — it should reposition
4. Release — the new order should be reflected immediately

- [ ] **Step 3: Verify persistence**

1. After reordering, close the app
2. Reopen and log in as the same user
3. The nav items should appear in the saved order

- [ ] **Step 4: Verify collapsed sidebar hides handle**

1. Click the sidebar collapse button
2. No drag handle should be visible; items should appear icon-only as before

- [ ] **Step 5: Verify role filtering still works**

1. Log in as a `member` role user (restricted routes)
2. Only the allowed nav items should appear, in the saved order
3. Drag to reorder — only allowed items should reorder; no phantom items

- [ ] **Step 6: Commit final**

```bash
git add .
git commit -m "feat: complete sidebar nav drag-and-drop reorder with persistence"
```
