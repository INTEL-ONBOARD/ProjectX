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
- A drag handle (⠿) appears on hover next to each nav item
- Clicking the item itself still navigates as before
- Order persists per-user across restarts
- Role-based visibility is unaffected

---

## Data & Persistence

### Schema change — `electron/main.js`

Add `navOrder` to `UserPrefSchema`:

```js
navOrder: { type: [String], default: [] }
```

Update `toUserPref` mapper to include:

```js
navOrder: d.navOrder ?? []
```

No new IPC channels are needed. The existing `db:userpref:get` and `db:userpref:set` handlers pass through arbitrary fields.

### Save behaviour

- On drop: local state updates immediately, then `db:userpref:set` is called in the background (fire-and-forget)
- On load: `navOrder` is read from `UserPref` on sidebar mount

---

## Sidebar Component — `src/components/layout/Sidebar.tsx`

### Dependency

Add `@dnd-kit/core` and `@dnd-kit/sortable` packages.

### State

```ts
const [navOrder, setNavOrder] = useState<string[]>([]);
```

Initialised from `UserPref` on mount via `electronAPI.db.getUserPref(user.id)`.

### Derived nav items

```ts
const orderedNavItems = [
  // items in saved order that are allowed
  ...navOrder.filter(id => allowedRoutes.includes(id)),
  // any allowed items not yet in navOrder (e.g. new routes)
  ...ALL_NAV_ITEMS
    .filter(item => allowedRoutes.includes(item.id) && !navOrder.includes(item.id))
].map(id => ALL_NAV_ITEMS.find(item => item.id === id)!);
```

### Drag-and-drop

- Wrap nav list in `<DndContext>` and `<SortableContext>`
- Each nav item wrapped in `useSortable` hook
- Drag handle icon (e.g. `GripVertical` from lucide-react) shown on hover, used as the drag activator
- On `dragEnd`: call `arrayMove` to reorder, update `navOrder` state, call `db:userpref:set` with new order

### Role changes

Saved `navOrder` may contain route IDs the user no longer has access to. These are silently filtered out at render time and do not corrupt the stored order.

---

## Error Handling

- If `getUserPref` fails on mount: fall back to `ALL_NAV_ITEMS` default order silently
- If `setUserPref` fails on save: local state is already correct; log the error, no user-facing feedback needed

---

## Out of Scope

- Reordering "My Projects" list (separate feature)
- Admin-enforced nav order
- Animated drag preview customisation beyond dnd-kit defaults
