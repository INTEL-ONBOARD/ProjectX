# Task Image Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show task images as a thumbnail grid in the detail panel sidebar, with a lightbox overlay for full-screen viewing, and fix the bug where images disappear after the app is reopened.

**Architecture:** All changes are in `src/pages/TasksPage.tsx` only. Replace the ephemeral `detailImage` local state with `lightboxIndex: number | null`, reading images directly from `selectedTask.images` (already persisted in DB). Add a thumbnail grid below the description and a Framer Motion lightbox overlay inside the existing detail panel IIFE.

**Tech Stack:** React, TypeScript, Framer Motion (`motion`, `AnimatePresence` — both already imported), Tailwind CSS, Lucide icons (`X`, `ImagePlus` already imported; `ChevronLeft`/`ChevronRight` need to be added)

---

## File Map

| File | Change |
|---|---|
| `src/pages/TasksPage.tsx` | Add `ChevronLeft`/`ChevronRight` imports; remove `detailImage` state; add `lightboxIndex` + `lightboxRef` state; add `relative` to panel div; replace old image block with thumbnail grid + upload button; add lightbox overlay JSX |

No new files. No DB changes. No type changes.

---

### Task 1: Add missing icon imports and replace `detailImage` state

**Files:**
- Modify: `src/pages/TasksPage.tsx:4` (imports)
- Modify: `src/pages/TasksPage.tsx:197` (state)

- [ ] **Step 1: Add `ChevronLeft` and `ChevronRight` to the lucide-react import**

Find line 4 (exact string):
```tsx
import { CheckSquare, Clock, TrendingUp, AlertCircle, Plus, Download, X, ImagePlus, Calendar, User, Tag, ChevronDown, Pencil, Trash2, ArrowRight, Flag, UserPlus, UserMinus, FileText, Search, AlignLeft, Check, Circle } from 'lucide-react';
```

Replace with:
```tsx
import { CheckSquare, Clock, TrendingUp, AlertCircle, Plus, Download, X, ImagePlus, Calendar, User, Tag, ChevronDown, ChevronLeft, ChevronRight, Pencil, Trash2, ArrowRight, Flag, UserPlus, UserMinus, FileText, Search, AlignLeft, Check, Circle } from 'lucide-react';
```

- [ ] **Step 2: Replace `detailImage` state with `lightboxIndex` and add `lightboxRef`**

Note: `useRef` is already imported at line 1 (`import React, { useState, useRef, useEffect } from 'react'`) — no import change needed.

Find line 197:
```ts
  const [detailImage, setDetailImage] = useState<string | null>(null);
```

Replace with:
```ts
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (lightboxIndex !== null) lightboxRef.current?.focus();
  }, [lightboxIndex]);
  useEffect(() => {
    setLightboxIndex(null);
  }, [selectedTask?.id]);
```

- [ ] **Step 3: Verify — expected build errors only about `detailImage`**

Run: `npm run build 2>&1 | head -40`

Expected: errors referencing `detailImage` and `setDetailImage` — correct, these are fixed in Task 2.

---

### Task 2: Add `relative` to the outer panel div, replace the image block, and add lightbox JSX

**Files:**
- Modify: `src/pages/TasksPage.tsx:534` (panel className)
- Modify: `src/pages/TasksPage.tsx:807–829` (image block)
- Modify: `src/pages/TasksPage.tsx:892` (insert lightbox before closing panel div)

- [ ] **Step 1: Add `relative` to the outer panel `motion.div`**

The lightbox uses `absolute inset-0` — this requires the containing `motion.div` to be `position: relative`. Without it the lightbox escapes the panel and covers the entire page.

Find (line ~533):
```tsx
              <motion.div
                className="w-[420px] h-full overflow-y-auto flex flex-col border-l shrink-0"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
```

Replace with:
```tsx
              <motion.div
                className="w-[420px] h-full overflow-y-auto flex flex-col border-l shrink-0 relative"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
```

- [ ] **Step 2: Replace the entire `{/* Image upload */}` block with thumbnail grid + upload button**

Find this block (lines ~807–829):
```tsx
                    {/* Image upload */}
                    <div className="mb-4" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                      {detailImage ? (
                        <div className="relative rounded-xl overflow-hidden mb-2">
                          <img src={detailImage} alt="attachment" className="w-full h-36 object-cover" />
                          <button onClick={() => setDetailImage(null)} className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white">
                            <X size={11} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => detailFileRef.current?.click()}
                          className="flex items-center gap-3 px-1 py-2.5 text-sm w-full text-left transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                          <ImagePlus size={14} /> Upload image
                        </button>
                      )}
                      <input ref={detailFileRef} type="file" accept="image/*" className="hidden" onChange={e => handleImagePick(e, url => {
                        setDetailImage(url);
                        if (selectedTask) updateTask(selectedTask.id, { images: [...(selectedTask.images ?? []), url] }).catch(console.error);
                      })} />
                    </div>
```

Replace with:
```tsx
                    {/* Image gallery */}
                    <div className="mb-4" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                      {(selectedTask.images ?? []).length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {(selectedTask.images ?? []).map((img, i) => (
                            <button
                              key={i}
                              onClick={() => setLightboxIndex(i)}
                              className="h-20 rounded-lg overflow-hidden border border-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-400"
                            >
                              <img src={img} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                      <button onClick={() => detailFileRef.current?.click()}
                        className="flex items-center gap-3 px-1 py-2.5 text-sm w-full text-left transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                        <ImagePlus size={14} /> Upload image
                      </button>
                      <input ref={detailFileRef} type="file" accept="image/*" className="hidden" onChange={e => handleImagePick(e, url => {
                        if (selectedTask) updateTask(selectedTask.id, { images: [...(selectedTask.images ?? []), url] }).catch(console.error);
                      })} />
                    </div>
```

- [ ] **Step 3: Insert the lightbox overlay JSX**

The lightbox must be a sibling of the inner scrollable content `div`, inside the outer `motion.div` (which now has `relative`). Insert it just before the closing `</motion.div>` of the outer panel.

Find (lines ~892–895):
```tsx
              </motion.div>
            </motion.div>
          );
        })()}
```

Replace with:
```tsx
              </motion.div>

              {/* Lightbox overlay */}
              <AnimatePresence>
                {lightboxIndex !== null && (selectedTask.images ?? []).length > 0 && (() => {
                  const imgs = selectedTask.images ?? [];
                  const total = imgs.length;
                  const prev = () => setLightboxIndex(i => i !== null ? (i - 1 + total) % total : 0);
                  const next = () => setLightboxIndex(i => i !== null ? (i + 1) % total : 0);
                  return (
                    <motion.div
                      ref={lightboxRef}
                      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setLightboxIndex(null)}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Escape') setLightboxIndex(null);
                        if (e.key === 'ArrowLeft') prev();
                        if (e.key === 'ArrowRight') next();
                      }}
                      tabIndex={0}
                      style={{ outline: 'none' }}
                    >
                      <img
                        src={imgs[lightboxIndex]}
                        alt={`Image ${lightboxIndex + 1}`}
                        className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain"
                        onClick={e => e.stopPropagation()}
                      />
                      {/* Close */}
                      <button
                        onClick={() => setLightboxIndex(null)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                      >
                        <X size={16} />
                      </button>
                      {/* Arrows */}
                      {total > 1 && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); prev(); }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); next(); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </>
                      )}
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </motion.div>
          );
        })()}
```

- [ ] **Step 4: Verify the app compiles cleanly**

Run: `npm run build 2>&1 | head -40`

Expected: 0 errors. If `detailImage` is still referenced anywhere, search the file and remove any stray references.

- [ ] **Step 5: Commit**

```bash
git add src/pages/TasksPage.tsx
git commit -m "feat: add image gallery and lightbox to task detail panel (fixes #162)"
```

---

### Task 3: Manual verification

- [ ] **Step 1: Start the app**

```bash
npm run dev
```

- [ ] **Step 2: Verify images persist after reopen**

1. Open a task in the detail panel
2. Upload an image via "Upload image"
3. Confirm it appears in the thumbnail grid immediately
4. Close and reopen the app
5. Open the same task — image should still be visible in the grid

- [ ] **Step 3: Verify lightbox opens and closes**

1. Click a thumbnail — lightbox should open with the image centered on a dark backdrop
2. Click the backdrop — lightbox closes
3. Click X button — lightbox closes
4. Press `Escape` — lightbox closes

- [ ] **Step 4: Verify arrow navigation (upload 2+ images to one task first)**

1. Open lightbox on image 1
2. Click right arrow → shows image 2
3. Click right arrow on last image → wraps to image 1
4. Click left arrow on image 1 → wraps to last image

- [ ] **Step 5: Verify lightbox resets on task switch**

1. Open lightbox on Task A
2. Click a different task in the list
3. Lightbox should close (no stale overlay)
