# Task Detail Panel — Image Gallery

**Date:** 2026-03-18
**Status:** Approved
**Fixes:** Issue #162 — Notifications/images not up-to-date after app reopen

---

## Problem

Task images uploaded via the detail panel are stored in `task.images[]` in the database, but the detail panel currently reads from a local `detailImage` state variable. This means images disappear when the app is reopened because ephemeral state is lost.

## Solution

Replace the single-image local state with a thumbnail grid that reads directly from `selectedTask.images`, and add a lightbox for full-screen viewing.

---

## Components Affected

- `src/pages/TasksPage.tsx` — only file changed

---

## Design

### Thumbnail Grid

- Rendered inside the detail panel "Details" tab, below the description block and above the "Upload image" button
- Shown only when `selectedTask.images` has one or more items
- 2-column CSS grid, each thumbnail: `h-20 rounded-lg object-cover` with a subtle border
- Clicking a thumbnail sets `lightboxIndex` to that image's index

### Lightbox Overlay

- Triggered by `lightboxIndex: number | null` state (null = closed)
- Rendered inside the detail panel `AnimatePresence` block
- Dark backdrop: `bg-black/80`, full viewport
- Image: `max-h-[85vh] max-w-[85vw] rounded-xl object-contain`, centered
- Close button (X) top-right
- Left/right arrow navigation if `task.images.length > 1`, wraps around
- Click backdrop closes lightbox
- `Escape` key closes lightbox
- Animation: Framer Motion fade in/out (opacity only)

### State Changes

| State | Before | After |
|---|---|---|
| `detailImage` | `string \| null` — local ephemeral image URL | **Removed** |
| `lightboxIndex` | — | `number \| null` — index of open lightbox image |

- Source of truth for images becomes `selectedTask.images` (persisted in DB)
- Upload flow (`handleImagePick` → `updateTask`) is unchanged
- No DB schema changes required

---

## What Is NOT Changing

- `Task` type definition (`images?: string[]` already exists)
- Upload mechanism
- `TaskModal.tsx` (separate modal, out of scope)
- Any other page or component
