# Enrollment Banner & Wizard Header Revamp Design

**Date:** 2026-04-06  
**Project:** SureCore LMS — Forte Insurance  
**Scope:** `EnrollmentProgressBanner.tsx` + wizard header section inside `EnrollmentWizard.tsx`

---

## Overview

Revamp the sticky enrollment progress banner (shown on dashboard/other pages) and the wizard page header (inside `/enrollment`) to use a frosted-glass-over-gradient style that matches the Forte brand palette (red `#D8003E` → navy `#00263A`).

**Files to modify:**
- `apps/frontend/src/components/enrollment/EnrollmentProgressBanner.tsx`
- `apps/frontend/src/components/enrollment/EnrollmentWizard.tsx`

---

## Design: EnrollmentProgressBanner

### Background
- `bg-gradient-to-r from-brand to-brand-2` base gradient (red → navy)
- Frosted overlay: `bg-white/5 backdrop-blur-md` layered on top
- Height: compact `py-3` — single row, sticky `top-0 z-50`

### Layout (3 columns)

**Left — Current step identity:**
- Lucide icon (`User` / `Building2` / `FileCheck`) inside a `w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm` circle
- Replaces current emoji icons
- Label: "Complete Your Enrollment" in `text-xs text-white/70`
- Step title: `text-sm font-bold text-white`

**Center — Step tracker (visible on ALL screen sizes, not hidden on mobile):**
- 3 pill/circle indicators connected by thin lines
- **Completed step:** `bg-brand` (solid red) circle with white `Check` lucide icon
- **Current step:** `bg-white/25 ring-2 ring-white` circle with white step number — glow via `shadow-lg shadow-white/20`
- **Future step:** `bg-white/10 text-white/40` circle with step number
- Connecting lines: `flex-1 h-px` — `bg-white/50` for completed segments, `bg-white/20` for upcoming
- Step labels shown below circles on `sm:` and above

**Right — Meta + CTA:**
- "Step X of 3" in `text-xs text-white/70`
- "N completed" in `text-xs text-white/50`
- `Continue` button: `bg-white text-brand font-semibold text-sm px-4 py-2 rounded-lg hover:bg-brand-light transition-all shadow-lg`

### Awaiting Review State
- Same gradient background (not amber)
- Center: pulsing amber dot (`animate-pulse bg-amber-400 w-2 h-2 rounded-full`) + "Your enrollment is awaiting admin review" text in white
- Right: `View Status` button with same white button style

---

## Design: EnrollmentWizard Header

### Background
- Same `bg-gradient-to-r from-brand to-brand-2` gradient with `bg-white/5 backdrop-blur-md` overlay
- Taller: `py-8` — replaces the current plain `bg-white border-b` header
- Sticky `top-0 z-40`

### Top Row
- Left: "Agent Enrollment" in `text-2xl font-bold text-white` + "Complete your profile to get started" in `text-sm text-white/70`
- Right: `XX%` in `text-3xl font-bold text-white` + "Complete" in `text-xs text-white/60`

### Step Indicator (below top row, `mt-6`)
Horizontal stepper, centered:

- Larger circles: `w-14 h-14 rounded-full`
- **Completed:** `bg-brand` with white `CheckCircle` lucide icon (`w-7 h-7`)
- **Current:** `bg-white/20 backdrop-blur-sm ring-2 ring-white shadow-lg shadow-white/20` with the step's lucide icon in white
- **Future:** `bg-white/10 text-white/40` with step lucide icon
- Connecting lines: `flex-1 h-0.5 mx-3` — `bg-white/60` (completed) / `bg-white/20` (upcoming)
- Step labels below circles: `text-xs font-medium` — `text-white` (current/completed), `text-white/40` (future)
- Clickable for completed/current steps (`cursor-pointer`), disabled for future (`cursor-not-allowed opacity-50`)

---

## What Does NOT Change

- All state logic, API calls, context usage — zero changes
- Navigation (goTo, handleSaveAndContinue, handleSubmit)
- Step content components (CandidateStep, ContractStep, SubmissionStep)
- Footer navigation buttons
- Error display block
- Loading spinner view
- Submitted/read-only view layout (only its header changes)

---

## Brand Tokens Used

| Token | Value | Usage |
|-------|-------|-------|
| `brand` | `#D8003E` | Completed step circles, Continue button text |
| `brand-2` | `#00263A` | Gradient end, dark anchor |
| `brand-light` | `#FEF2F5` | Continue button hover bg |
| `white/5–/25` | — | Frosted overlay and step circles |

No external colors (no `indigo-600`, no arbitrary values).

---

## Constraints

- Must remain `sticky top-0` on both components
- Banner must not grow taller — stays single-row compact strip
- Wizard header must not break the existing scroll/sticky layering (banner is `z-50`, wizard header is `z-40`)
- No changes to TypeScript types or API layer
