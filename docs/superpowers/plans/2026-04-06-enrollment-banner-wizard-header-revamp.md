# Enrollment Banner & Wizard Header Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the enrollment progress banner and wizard page header with a frosted-glass-over-gradient design matching the Forte brand palette (red → navy).

**Architecture:** Pure styling changes to two existing components — no logic, no API, no type changes. `EnrollmentProgressBanner.tsx` gets a full rewrite of its JSX/classes. `EnrollmentWizard.tsx` gets its header section replaced; all state, handlers, and step content are untouched.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS 4, lucide-react, Jest + React Testing Library

---

## File Map

| File | Change |
|------|--------|
| `apps/frontend/src/components/enrollment/EnrollmentProgressBanner.tsx` | Full JSX rewrite — new gradient + frosted glass classes, lucide icons replacing emojis, step tracker visible on all screen sizes |
| `apps/frontend/src/components/enrollment/EnrollmentWizard.tsx` | Replace header div (main wizard header + submitted view header) — all logic/handlers untouched |
| `apps/frontend/src/__tests__/components/EnrollmentProgressBanner.test.tsx` | New test file — render tests for all 3 banner states |

---

## Task 1: Write failing tests for EnrollmentProgressBanner

**Files:**
- Create: `apps/frontend/src/__tests__/components/EnrollmentProgressBanner.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import EnrollmentProgressBanner from '@/components/enrollment/EnrollmentProgressBanner';

// Mock Next.js Link
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});

// Mock enrollment context
const mockUseEnrollment = jest.fn();
jest.mock('@/lib/enrollment-context', () => ({
  useEnrollment: () => mockUseEnrollment(),
}));

describe('EnrollmentProgressBanner', () => {
  it('renders nothing while loading', () => {
    mockUseEnrollment.mockReturnValue({ isLoading: true, enrollment: null, currentStep: 1 });
    const { container } = render(<EnrollmentProgressBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no enrollment', () => {
    mockUseEnrollment.mockReturnValue({ isLoading: false, enrollment: null, currentStep: 1 });
    const { container } = render(<EnrollmentProgressBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when enrollment is approved', () => {
    mockUseEnrollment.mockReturnValue({
      isLoading: false,
      enrollment: { adminReviewStatus: 'approved', completedSteps: [1, 2, 3] },
      currentStep: 3,
    });
    const { container } = render(<EnrollmentProgressBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders awaiting review state with pulsing dot and View Status link', () => {
    mockUseEnrollment.mockReturnValue({
      isLoading: false,
      enrollment: { status: 'ae_completed', adminReviewStatus: 'pending', completedSteps: [1, 2, 3] },
      currentStep: 3,
    });
    render(<EnrollmentProgressBanner />);
    expect(screen.getByText('Your enrollment is awaiting admin review.')).toBeInTheDocument();
    expect(screen.getByText('View Status').closest('a')).toHaveAttribute('href', '/enrollment');
  });

  it('renders in-progress banner with Continue link', () => {
    mockUseEnrollment.mockReturnValue({
      isLoading: false,
      enrollment: { status: 'in_progress', adminReviewStatus: null, completedSteps: [1], progressPercentage: 33 },
      currentStep: 2,
    });
    render(<EnrollmentProgressBanner />);
    expect(screen.getByText('Continue').closest('a')).toHaveAttribute('href', '/enrollment');
    expect(screen.getByText('Complete Your Enrollment')).toBeInTheDocument();
    expect(screen.getByText('Contract with Forte')).toBeInTheDocument();
  });

  it('shows step 2 of 3 in in-progress banner', () => {
    mockUseEnrollment.mockReturnValue({
      isLoading: false,
      enrollment: { status: 'in_progress', adminReviewStatus: null, completedSteps: [1], progressPercentage: 33 },
      currentStep: 2,
    });
    render(<EnrollmentProgressBanner />);
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/kkwenuja/development/Surecore/Forte-LMs/surecore-lms
npx jest --testPathPattern="EnrollmentProgressBanner" --no-coverage
```

Expected: Tests fail because the component doesn't yet match the new markup (e.g. "Step 2 of 3" text doesn't exist, awaiting review uses amber bg not gradient).

---

## Task 2: Rewrite EnrollmentProgressBanner

**Files:**
- Modify: `apps/frontend/src/components/enrollment/EnrollmentProgressBanner.tsx`

- [ ] **Step 1: Replace the entire file content**

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { User, Building2, FileCheck, Check } from 'lucide-react';
import { useEnrollment } from '@/lib/enrollment-context';

const STEPS = [
  { id: 1, title: 'Register as Candidate', icon: User },
  { id: 2, title: 'Contract with Forte', icon: Building2 },
  { id: 3, title: 'Submission', icon: FileCheck },
];

export default function EnrollmentProgressBanner() {
  const { enrollment, isLoading, currentStep } = useEnrollment();

  if (isLoading || !enrollment) return null;
  if (enrollment.adminReviewStatus === 'approved') return null;

  // Awaiting review state
  if (enrollment.status === 'ae_completed' && enrollment.adminReviewStatus === 'pending') {
    return (
      <div className="sticky top-0 z-50 bg-gradient-to-r from-brand to-brand-2 shadow-lg">
        <div className="bg-white/5 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="animate-pulse w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <p className="text-sm font-medium text-white">Your enrollment is awaiting admin review.</p>
            </div>
            <Link
              href="/enrollment"
              className="px-4 py-1.5 bg-white text-brand rounded-lg font-semibold text-sm hover:bg-brand-light transition-all shadow-lg shrink-0"
            >
              View Status
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const step = STEPS[currentStep - 1] || STEPS[0];
  const StepIcon = step.icon;
  const completedCount = enrollment.completedSteps?.length || 0;

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-brand to-brand-2 shadow-lg">
      <div className="bg-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">

            {/* Left: current step identity */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <StepIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-white/70 font-medium">Complete Your Enrollment</p>
                <p className="text-sm font-bold text-white">{step.title}</p>
              </div>
            </div>

            {/* Center: step tracker — visible on all screen sizes */}
            <div className="flex items-center flex-1 max-w-xs mx-4">
              {STEPS.map((s, index) => {
                const isCompleted = enrollment.completedSteps?.includes(s.id);
                const isCurrent = s.id === currentStep;
                return (
                  <React.Fragment key={s.id}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          isCompleted
                            ? 'bg-brand shadow-lg shadow-brand/40'
                            : isCurrent
                            ? 'bg-white/25 ring-2 ring-white shadow-lg shadow-white/20'
                            : 'bg-white/10'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <span className={`text-[10px] font-bold ${isCurrent ? 'text-white' : 'text-white/40'}`}>
                            {s.id}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[9px] mt-0.5 hidden sm:block font-medium ${
                          isCurrent ? 'text-white/80' : isCompleted ? 'text-white/60' : 'text-white/30'
                        }`}
                      >
                        {s.title.split(' ')[0]}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-px mx-1 mb-3 ${
                          enrollment.completedSteps?.includes(s.id) ? 'bg-white/60' : 'bg-white/20'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Right: meta + CTA */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-white/70">Step {currentStep} of 3</p>
                <p className="text-xs text-white/50">{completedCount} completed</p>
              </div>
              <Link
                href="/enrollment"
                className="px-4 py-2 bg-white text-brand rounded-lg font-semibold text-sm hover:bg-brand-light transition-all shadow-lg"
              >
                Continue
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests to confirm they pass**

```bash
cd /Users/kkwenuja/development/Surecore/Forte-LMs/surecore-lms
npx jest --testPathPattern="EnrollmentProgressBanner" --no-coverage
```

Expected: All 6 tests PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/kkwenuja/development/Surecore/Forte-LMs/surecore-lms
git add apps/frontend/src/components/enrollment/EnrollmentProgressBanner.tsx \
        apps/frontend/src/__tests__/components/EnrollmentProgressBanner.test.tsx
git commit -m "feat: revamp EnrollmentProgressBanner with frosted glass gradient design"
```

---

## Task 3: Replace EnrollmentWizard header sections

**Files:**
- Modify: `apps/frontend/src/components/enrollment/EnrollmentWizard.tsx`

Two header blocks to replace:
1. Main wizard header (lines ~331–406)
2. Submitted view header (lines ~293–307)

**No changes** to: state, handlers, step content components, footer navigation, error block, loading spinner.

- [ ] **Step 1: Replace the main wizard header div**

Find this block (starts at `{/* Header */}` inside the main wizard `return`):

```tsx
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Agent Enrollment</h1>
              <p className="text-sm text-gray-600">Complete your profile to get started</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-brand">{progressPercentage}%</p>
              <p className="text-xs text-gray-500">Complete</p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                const isClickable = index <= currentStep;
                const Icon = step.icon;

                return (
                  <React.Fragment key={step.key}>
                    <button
                      onClick={() => isClickable && goTo(index)}
                      disabled={!isClickable}
                      className={`flex flex-col items-center group transition-all ${
                        isClickable
                          ? 'cursor-pointer'
                          : 'cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                          isCompleted
                            ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                            : isCurrent
                            ? 'bg-gradient-to-br from-brand to-brand-2 text-white shadow-lg shadow-brand/30'
                            : 'bg-gray-100 text-gray-400'
                        } ${isClickable && !isCurrent ? 'group-hover:scale-110' : ''}`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <Icon className="w-6 h-6" />
                        )}
                      </div>
                      <span
                        className={`text-xs font-medium text-center hidden sm:block max-w-[100px] ${
                          isCurrent
                            ? 'text-brand'
                            : isCompleted
                            ? 'text-green-600'
                            : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </button>

                    {/* Connecting line */}
                    {index < TOTAL_STEPS - 1 && (
                      <div
                        className={`flex-1 h-1 mx-2 rounded transition-all ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>
```

Replace with:

```tsx
      {/* Header */}
      <div className="bg-gradient-to-r from-brand to-brand-2 sticky top-0 z-40 shadow-lg">
        <div className="bg-white/5 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 py-8">

            {/* Top row */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Agent Enrollment</h1>
                <p className="text-sm text-white/70">Complete your profile to get started</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">{progressPercentage}%</p>
                <p className="text-xs text-white/60">Complete</p>
              </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                const isClickable = index <= currentStep;
                const Icon = step.icon;

                return (
                  <React.Fragment key={step.key}>
                    <button
                      onClick={() => isClickable && goTo(index)}
                      disabled={!isClickable}
                      className={`flex flex-col items-center group transition-all ${
                        isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 transition-all ${
                          isCompleted
                            ? 'bg-brand shadow-lg shadow-brand/40'
                            : isCurrent
                            ? 'bg-white/20 backdrop-blur-sm ring-2 ring-white shadow-lg shadow-white/20'
                            : 'bg-white/10'
                        } ${isClickable && !isCurrent ? 'group-hover:scale-110' : ''}`}
                      >
                        {isCompleted ? (
                          <CheckCircle className={`w-7 h-7 text-white`} />
                        ) : (
                          <Icon className={`w-6 h-6 ${isCurrent ? 'text-white' : 'text-white/40'}`} />
                        )}
                      </div>
                      <span
                        className={`text-xs font-medium text-center hidden sm:block max-w-[100px] ${
                          isCurrent ? 'text-white' : isCompleted ? 'text-white/70' : 'text-white/40'
                        }`}
                      >
                        {step.label}
                      </span>
                    </button>

                    {index < TOTAL_STEPS - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-3 mb-6 rounded transition-all ${
                          isCompleted ? 'bg-white/60' : 'bg-white/20'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

          </div>
        </div>
      </div>
```

- [ ] **Step 2: Replace the submitted view header**

Find this block (inside the `isSubmitted` return, starts at `{/* Header */}`):

```tsx
        <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Agent Enrollment</h1>
                <p className="text-sm text-gray-600">Your enrollment has been submitted</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">100%</p>
                <p className="text-xs text-gray-500">Complete</p>
              </div>
            </div>
          </div>
        </div>
```

Replace with:

```tsx
        <div className="bg-gradient-to-r from-brand to-brand-2 sticky top-0 z-40 shadow-lg">
          <div className="bg-white/5 backdrop-blur-md">
            <div className="max-w-5xl mx-auto px-6 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">Agent Enrollment</h1>
                  <p className="text-sm text-white/70">Your enrollment has been submitted</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">100%</p>
                  <p className="text-xs text-white/60">Complete</p>
                </div>
              </div>
            </div>
          </div>
        </div>
```

- [ ] **Step 3: Verify the app builds without TypeScript errors**

```bash
cd /Users/kkwenuja/development/Surecore/Forte-LMs/surecore-lms
npx tsc --noEmit -p apps/frontend/tsconfig.json
```

Expected: No errors output.

- [ ] **Step 4: Verify visually in the browser**

Start dev servers:
```bash
npm run dev
```

Check these states at `http://localhost:3000`:
1. Log in as `sokha.pheakdey@forte.com.kh` (role: agent/candidate) → dashboard should show the frosted gradient banner
2. Navigate to `/enrollment` → wizard header should show the gradient with frosted overlay and larger step circles
3. Confirm step dots show correct states (completed = red, current = ring, future = muted)
4. Confirm no emojis remain in the banner
5. Confirm banner visible on mobile viewport (375px width) — step tracker visible

- [ ] **Step 5: Commit**

```bash
cd /Users/kkwenuja/development/Surecore/Forte-LMs/surecore-lms
git add apps/frontend/src/components/enrollment/EnrollmentWizard.tsx
git commit -m "feat: revamp EnrollmentWizard header with frosted glass gradient design"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|-----------------|-----------|
| Gradient `from-brand to-brand-2` | Task 2 + 3 |
| `bg-white/5 backdrop-blur-md` frosted overlay | Task 2 + 3 |
| Lucide icons replacing emojis in banner | Task 2 |
| `bg-white/15 backdrop-blur-sm` icon circle | Task 2 |
| Step tracker visible on all screen sizes | Task 2 (removed `hidden md:block`) |
| Completed step: `bg-brand` + Check icon | Task 2 + 3 |
| Current step: `bg-white/25 ring-2 ring-white shadow-white/20` | Task 2 + 3 |
| Future step: `bg-white/10 text-white/40` | Task 2 + 3 |
| Connecting lines `h-px bg-white/50 / bg-white/20` | Task 2 |
| Step labels below circles on sm+ | Task 2 |
| Right: "Step X of 3" + "N completed" | Task 2 |
| Continue button: `bg-white text-brand hover:bg-brand-light` | Task 2 |
| Awaiting review: pulsing amber dot + View Status | Task 2 |
| Wizard header: `py-8` taller | Task 3 |
| Wizard header top row: white text, 3xl% | Task 3 |
| Wizard step circles `w-14 h-14` | Task 3 |
| Wizard connecting lines `h-0.5 mx-3 mb-6` | Task 3 |
| Submitted view header updated | Task 3 |
| No logic changes | Confirmed — only JSX/class strings changed |
| No external colors (no indigo-600) | Confirmed |

All spec requirements covered. No gaps found.
