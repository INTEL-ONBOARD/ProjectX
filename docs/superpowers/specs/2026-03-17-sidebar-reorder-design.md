# Sidebar Nav Reorder — Design Spec

**Date:** 2026-03-17
**Status:** Approved

---

## Overview

Users can drag and drop navigation items in the sidebar to reorder them. The order is saved per-user and persists across app restarts.

---

## Requirements

- All nav items are reorderable (no fixed anchors)
- Reorder is done via drag-and-drop directly in the sidebar (inline)
- A drag handle (`GripVertical` icon) appears on hover next to each nav item
- Clicking the item itself still navigates as before
- Dragging is disabled when the sidebar is collapsed (handle hidden, dnd-kit disabled)
- Order persists per-user across restarts
- Role-based visibility is unaffected

---

## Data & Persistence

### Schema & mapper changes — `electron/main.ts` (edit first, then mirror to `main.js`)

Add `navOrder` to `UserPrefSchema`:

```ts
navOrder: { type: [String], default: [] }
```

Update `toUserPref` mapper — this change is **required** for `db:userpref:get` to return `navOrder` (the mapper is a whitelist, not pass-through):

```ts
navOrder: d.navOrder ?? []
```

### IPC save strategy

The existing `db:userpref:set` handler uses `findOneAndUpdate` with the raw prefs object (no `$set` wrapper). Fields present in the payload are set; fields absent are left untouched on the MongoDB document. However, the `toUserPref` mapper is a whitelist — any schema fields it does not enumerate (e.g. `taskBreakdownSnapshot`) are not returned to the renderer. If the renderer spreads the `get` result and writes it back, those untracked fields will be dropped from the document. To avoid this, the implementation must **read the full current prefs, merge `navOrder` into them, then write the full object**:

```ts
const current = await electronAPI.userPrefs.get(user.id);
await electronAPI.userPrefs.set({ ...current, navOrder: newOrder });
```

### API namespace

All pref access uses `electronAPI.userPrefs.get(userId)` / `electronAPI.userPrefs.set(prefs)` — **not** `electronAPI.db.*`.

---

## Type definitions — `src/vite-env.d.ts`

Add `navOrder?: string[]` to the `ElectronUserPrefs` return type so TypeScript is aware of the field.

---

## Sidebar Component — `src/components/layout/Sidebar.tsx`

### Dependencies (install first)

```
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

`@dnd-kit/utilities` provides `arrayMove`.

### State

```ts
const [navOrder, setNavOrder] = useState<string[]>([]);
```

Initialised from `UserPref` on mount:

```ts
useEffect(() => {
  electronAPI.userPrefs.get(user.id).then(prefs => {
    if (prefs?.navOrder?.length) setNavOrder(prefs.navOrder);
  }).catch(() => { /* fall back to ALL_NAV_ITEMS default order */ });
}, [user?.id]);
```

### Derived nav items

```ts
const allowedIds = ALL_NAV_ITEMS
  .filter(item => allowedRoutes.includes(item.id))
  .map(item => item.id);

const orderedNavIds = [
  // saved order, filtered to allowed
  ...navOrder.filter(id => allowedIds.includes(id)),
  // allowed items not yet in navOrder (e.g. new routes added in future)
  ...allowedIds.filter(id => !navOrder.includes(id)),
];

const orderedNavItems = orderedNavIds
  .map(id => ALL_NAV_ITEMS.find(item => item.id === id)!);
```

### Drag-and-drop integration

**`motion.li` / dnd-kit conflict:** `useSortable` applies its own CSS `transform` via a `style` prop. This conflicts with Framer Motion's `whileHover={{ x: 2 }}` and the `layoutId="nav-indicator"` active indicator. Resolution: replace `<motion.li>` with a plain `<li>` and apply the `transform` style from `useSortable`. The `layoutId` active indicator can remain on the inner element unaffected.

Each nav item is wrapped in a `SortableNavItem` sub-component using `useSortable`. The `GripVertical` handle uses `{...attributes} {...listeners}` so only the handle initiates a drag — the nav button click still navigates.

When `collapsed === true`: wrap `<DndContext>` conditionally or set `disabled` on the `<SortableContext>` so no drag is initiated; hide the `GripVertical` handle.

On `dragEnd`:
1. Compute new order with `arrayMove`
2. `setNavOrder(newOrder)` — instant local update
3. Fire-and-forget save: read current prefs, merge, write back

---

## Error Handling

- `userPrefs.get` fails on mount → fall back to `ALL_NAV_ITEMS` default order silently
- `userPrefs.set` fails on save → local state is already correct; log the error, no user-facing feedback

---

## main.ts / main.js sync

`main.ts` is the source of truth. After editing `main.ts`, manually mirror the same changes to `main.js` (schema field + `toUserPref` mapper line).

---

## Out of Scope

- Reordering "My Projects" list
- Admin-enforced nav order
- Animated drag preview customisation beyond dnd-kit defaults
