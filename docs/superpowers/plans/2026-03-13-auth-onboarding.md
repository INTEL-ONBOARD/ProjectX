# Auth & Onboarding Screens Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** Build splash, walkthrough (3 steps), login, register, and forgot-password screens with dark glassmorphism aesthetic, smooth Framer Motion animations, and mock localStorage auth.

**Architecture:** New `AuthContext` manages auth state + "has seen walkthrough" flag in localStorage. `App.tsx` conditionally renders auth screens before the main layout. All auth screens share a dark background with glowing purple glass cards.

**Tech Stack:** React 18, TypeScript, Framer Motion 12, React Router DOM 7, Tailwind CSS, localStorage mock auth.

---

## Files

- Create: `src/context/AuthContext.tsx` — auth state, login/register/logout, walkthrough flag
- Create: `src/pages/auth/SplashScreen.tsx` — animated logo reveal, 2.5s auto-advance
- Create: `src/pages/auth/WalkthroughScreen.tsx` — 3-step onboarding with skip/next
- Create: `src/pages/auth/LoginPage.tsx` — email + password + remember me + forgot password link
- Create: `src/pages/auth/RegisterPage.tsx` — name, email, password, confirm password, role
- Create: `src/pages/auth/ForgotPasswordPage.tsx` — email input + success state
- Create: `src/pages/auth/AuthBackground.tsx` — shared dark bg + purple glow + glass card wrapper
- Modify: `src/App.tsx` — wrap with AuthProvider, gate main layout behind auth state
- Modify: `index.html` — add app icon link tag
- Create: `public/icon.svg` — Project M. icon (purple circle + M lettermark)

---

## Task 1: AuthContext

**Files:**
- Create: `src/context/AuthContext.tsx`

- [ ] Create `src/context/AuthContext.tsx` with:
  - `AuthUser` interface: `{ id, name, email, role, avatar? }`
  - localStorage keys: `pm_auth_user`, `pm_has_seen_walkthrough`, `pm_users`
  - Seed one default user: `{ email: 'admin@projectm.com', password: 'password123', name: 'Admin User', role: 'admin' }`
  - `login(email, password)` — checks localStorage users, throws on failure, sets `pm_auth_user`
  - `register(name, email, password, role)` — saves new user to `pm_users`, auto-logs in
  - `logout()` — clears `pm_auth_user`, redirects to login
  - `markWalkthroughSeen()` — sets `pm_has_seen_walkthrough = true`
  - `hasSeenWalkthrough` boolean derived from localStorage
  - `isAuthenticated` boolean
  - `isLoading` boolean (true for 2.5s on first mount = splash duration)

- [ ] Commit: `git commit -m "feat: add AuthContext with mock localStorage auth"`

---

## Task 2: AuthBackground shared wrapper

**Files:**
- Create: `src/pages/auth/AuthBackground.tsx`

- [ ] Create `AuthBackground.tsx` — full-screen dark container:
  - bg: `#0A0A0F`
  - Radial purple glow: `radial-gradient(ellipse 60% 50% at 50% 0%, rgba(80,48,229,0.25) 0%, transparent 70%)`
  - Subtle noise/grain overlay using CSS `url("data:image/svg+xml...")` pattern
  - Exports `GlassCard` sub-component: `backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl`
  - App logo mark in top-center: purple circle with white "M" + "Project M." wordmark

- [ ] Commit: `git commit -m "feat: add AuthBackground shared layout"`

---

## Task 3: SplashScreen

**Files:**
- Create: `src/pages/auth/SplashScreen.tsx`

- [ ] Build `SplashScreen.tsx`:
  - Full screen `AuthBackground` (no card)
  - Center: animated logo (scale 0→1, opacity 0→1, spring, 0.6s)
  - Below logo: "Project M." text fades in after 0.4s delay
  - Tagline "Manage smarter. Deliver faster." fades in at 0.8s delay
  - Progress bar at bottom: fills from 0→100% over 2.2s using CSS animation
  - After 2.5s: calls `onComplete` prop
  - Uses `motion` from framer-motion for all animations

- [ ] Commit: `git commit -m "feat: add SplashScreen with logo animation"`

---

## Task 4: WalkthroughScreen

**Files:**
- Create: `src/pages/auth/WalkthroughScreen.tsx`

- [ ] Build `WalkthroughScreen.tsx` with 3 steps:
  - Step 1: Icon=📋, Title="Manage Projects", Body="Create boards, track tasks, and hit every deadline with clarity."
  - Step 2: Icon=👥, Title="Track Your Team", Body="See who's working on what. Attendance, roles, and performance in one place."
  - Step 3: Icon=📊, Title="Stay on Top of Tasks", Body="Filter, prioritize, and never miss a deadline again."
  - Layout: `AuthBackground` + centered `GlassCard` (max-w-md)
  - Step content transitions: `AnimatePresence` with slide-left exit / slide-right enter
  - Bottom: dot indicators (active=purple filled, inactive=white/20)
  - Buttons: "Skip" (ghost) left, "Next →" / "Get Started →" (solid purple) right
  - "Get Started" on last step calls `onComplete`

- [ ] Commit: `git commit -m "feat: add WalkthroughScreen 3-step onboarding"`

---

## Task 5: LoginPage

**Files:**
- Create: `src/pages/auth/LoginPage.tsx`

- [ ] Build `LoginPage.tsx`:
  - `AuthBackground` + centered `GlassCard`
  - Logo mark at top of card
  - Title "Welcome back" + subtitle "Sign in to your workspace"
  - Email input + Password input (with show/hide toggle)
  - "Remember me" checkbox (left) + "Forgot password?" link (right)
  - Solid purple "Sign In" button (full width, hover glow)
  - "Don't have an account? Register" link at bottom
  - On submit: calls `auth.login()`, shows inline error on failure
  - Loading state: button shows spinner, inputs disabled
  - Staggered mount animation: card slides up + fades in, fields stagger in after

- [ ] Commit: `git commit -m "feat: add LoginPage with form validation and animations"`

---

## Task 6: RegisterPage

**Files:**
- Create: `src/pages/auth/RegisterPage.tsx`

- [ ] Build `RegisterPage.tsx`:
  - Same card layout as Login
  - Title "Create account" + subtitle "Join your team on Project M."
  - Fields: Full Name, Email, Password, Confirm Password
  - Role selector: pill buttons — "Admin" | "Manager" | "Member" (default Member)
  - "Create Account" button
  - Validation: passwords match, email format, all fields required
  - Inline error messages below each field
  - "Already have an account? Sign in" link
  - Calls `auth.register()` on success

- [ ] Commit: `git commit -m "feat: add RegisterPage with role selector"`

---

## Task 7: ForgotPasswordPage

**Files:**
- Create: `src/pages/auth/ForgotPasswordPage.tsx`

- [ ] Build `ForgotPasswordPage.tsx`:
  - Card layout — Title "Reset password" + subtitle
  - Email input + "Send Reset Link" button
  - Success state: animated checkmark (scale spring), "Check your inbox" message, "Back to Login" link
  - `AnimatePresence` between form state ↔ success state
  - "← Back to Login" link below form

- [ ] Commit: `git commit -m "feat: add ForgotPasswordPage with success state"`

---

## Task 8: App icon + wire App.tsx

**Files:**
- Create: `public/icon.svg`
- Modify: `index.html`
- Modify: `src/App.tsx`

- [ ] Create `public/icon.svg` — 512×512 purple circle (`#5030E5`) with white "M" lettermark, bold sans-serif. Add `<link rel="icon" href="/icon.svg" type="image/svg+xml">` to `index.html`.

- [ ] Update `src/App.tsx`:
  - Wrap entire tree with `<AuthProvider>`
  - Inside app, read `{ isAuthenticated, isLoading, hasSeenWalkthrough }` from `useAuth()`
  - Render flow with `AnimatePresence`:
    - `isLoading` → `<SplashScreen onComplete={...} />`
    - `!isAuthenticated && !hasSeenWalkthrough` → `<WalkthroughScreen onComplete={...} />`
    - `!isAuthenticated` → Router with `/login`, `/register`, `/forgot-password` routes
    - `isAuthenticated` → existing main app layout + routes
  - `logout` button wired to sidebar or header (settings menu or avatar)

- [ ] Commit: `git commit -m "feat: wire auth flow into App.tsx with splash and walkthrough gate"`
