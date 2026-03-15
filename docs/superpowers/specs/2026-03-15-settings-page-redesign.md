# Settings Page Redesign — Design Spec

## Goal

Revamp `src/pages/SettingsPage.tsx` with a professional, polished UI consistent with the existing ProjectX design system. Replace the left sidebar nav with a top pill tab bar, switch all saves to auto-save (on blur / on change), and improve the visual hierarchy of every section.

## Scope

- Single file change: `src/pages/SettingsPage.tsx`
- No new files, no new IPC handlers, no new context changes
- All existing functionality preserved (profile save, password change, notification toggles, appearance prefs, billing display, update checker)
- No dark mode implementation (themeMode preference is stored but not applied to the app — preserve as-is)

---

## Design System Tokens (existing, must match)

| Token | Value |
|---|---|
| Primary | `#5030E5` |
| Card | `bg-white rounded-2xl border border-surface-200` |
| Input focus ring | `focus:ring-2 focus:ring-[#5030E5]/20 focus:border-[#5030E5]` |
| Body text | `text-gray-900` |
| Muted text | `text-gray-500` |
| Surface bg | `bg-surface-50` or `bg-gray-50` |
| Danger | `#D8727D` |
| Success | `#68B266` |
| Amber | `#D58D49` |

---

## Overall Layout

```
┌──────────────────────────────────────────────────────────────┐
│  PageHeader: "Settings" / "Manage your account..."           │
├──────────────────────────────────────────────────────────────┤
│  [Profile] [Notifications] [Appearance] [Security]           │
│  [Billing] [About]          ← sticky pill tab bar            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   max-w-3xl mx-auto  ← all tab content centered here        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Page uses `overflow-y-auto h-full` with `px-8 py-6` padding. The tab bar is **not sticky** — it scrolls with the page (simpler, avoids z-index conflicts with modals).

---

## Tab Bar

```tsx
// Tab definition shape
const TABS = [
  { id: 'profile',       label: 'Profile',       icon: User       },
  { id: 'notifications', label: 'Notifications', icon: Bell       },
  { id: 'appearance',    label: 'Appearance',    icon: Palette    },
  { id: 'security',      label: 'Security',      icon: Shield     },
  { id: 'billing',       label: 'Billing',       icon: CreditCard },
  { id: 'about',         label: 'About',         icon: Info       },
];
```

**Rendering:**
```tsx
<div className="flex items-center gap-1 mb-6 bg-surface-50 rounded-2xl p-1 border border-surface-200">
  {TABS.map(tab => (
    <button
      key={tab.id}
      onClick={() => setActiveSection(tab.id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
        ${activeSection === tab.id
          ? 'bg-[#5030E5] text-white shadow-sm'
          : 'text-gray-500 hover:text-gray-800 hover:bg-white'
        }`}
    >
      <tab.icon size={15} />
      {tab.label}
    </button>
  ))}
</div>
```

---

## Auto-save Pattern

**No Save button.** All changes persist immediately:

- **Toggles / selects / color pickers**: save on change (`onChange` / `onClick`)
- **Text inputs** (name, email, location, designation): save on blur (`onBlur`)

**Saved feedback**: a small animated badge in the top-right corner of the relevant card:

```tsx
// State: savedField tracks which card last saved (string key or null)
const [savedField, setSavedField] = React.useState<string | null>(null);

// Helper
const flashSaved = (key: string) => {
  setSavedField(key);
  setTimeout(() => setSavedField(null), 2000);
};

// Badge component (inline)
const SavedBadge = ({ id }: { id: string }) => (
  <AnimatePresence>
    {savedField === id && (
      <motion.span
        className="flex items-center gap-1 text-xs font-medium text-[#68B266]"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.15 }}
      >
        <CheckCircle2 size={12} /> Saved
      </motion.span>
    )}
  </AnimatePresence>
);
```

---

## Reusable Sub-components (all inline in SettingsPage.tsx)

### `SettingCard`

```tsx
const SettingCard: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;  // e.g. SavedBadge
  className?: string;
}> = ({ title, description, children, action, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-surface-200 p-6 ${className}`}>
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);
```

### `ToggleRow`

```tsx
const ToggleRow: React.FC<{
  icon: React.ElementType;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ icon: Icon, label, description, checked, onChange }) => (
  <div className="flex items-center justify-between py-3 border-b border-surface-100 last:border-0">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-surface-50 border border-surface-200 flex items-center justify-center">
        <Icon size={14} className="text-gray-500" />
      </div>
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {description && <div className="text-xs text-gray-400">{description}</div>}
      </div>
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
);
```

### `InputField`

```tsx
const InputField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  readOnly?: boolean;
  type?: string;
}> = ({ label, value, onChange, onBlur, placeholder, readOnly, type = 'text' }) => (
  <div>
    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm text-gray-900
        placeholder:text-gray-300 outline-none transition-all
        ${readOnly
          ? 'bg-surface-50 text-gray-400 cursor-not-allowed'
          : 'bg-white focus:ring-2 focus:ring-[#5030E5]/20 focus:border-[#5030E5]'
        }`}
    />
  </div>
);
```

---

## Tab Sections

### Profile

**Card 1 — Identity** (`savedField === 'profile'`)

Layout: two columns (`grid grid-cols-[auto_1fr] gap-6`)

Left column:
```
┌────────────────────┐
│   Avatar (80px)    │
│   Display Name     │
│   role badge       │
└────────────────────┘
```

- Avatar: `<Avatar name={nameValue} size="xl" />` (80px)
- Name below avatar: `text-base font-semibold text-gray-900`
- Role badge: `text-xs px-2 py-0.5 rounded-full bg-[#5030E523] text-[#5030E5]`

Right column — 2×2 grid of `InputField`:
- Display Name (onBlur saves → `flashSaved('profile')`)
- Email (onBlur saves)
- Location (onBlur saves)
- Designation / Role (onBlur saves)

Save handler on blur: call `updateMember` + `authApi().updateName` (same as existing `handleSave`).

**Card 2 — Stats**

4 metric chips in a row:

```tsx
const stats = [
  { label: 'Tasks Done',   value: tasksDone   },
  { label: 'In Progress',  value: tasksInProg },
  { label: 'Total Tasks',  value: tasksTotal  },
  { label: 'Projects',     value: myProjects  },
];
```

Each chip:
```tsx
<div className="flex-1 bg-surface-50 rounded-xl p-4 text-center border border-surface-200">
  <div className="text-2xl font-bold text-gray-900">{value}</div>
  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
</div>
```

---

### Notifications

**Card 1 — Delivery Channels** (`savedField === 'notif'`)

`ToggleRow` entries:
| Icon | Label | Description | Key |
|---|---|---|---|
| `Mail` | Email Notifications | `authUser?.email ?? ''` | `emailNotifs` |
| `Smartphone` | Push Notifications | Desktop & mobile alerts | `pushNotifs` |
| `MessageSquare` | SMS Notifications | Text message alerts | `smsNotifs` |
| `Clock` | Quiet Hours | Mute from 10 PM – 8 AM | `quietHours` |

**Card 2 — Activity Events** (`savedField === 'notif'`)

`ToggleRow` entries:
| Icon | Label | Description | Key |
|---|---|---|---|
| `CheckCircle2` | Task Updates | When tasks are assigned or updated | `taskUpdates` |
| `AtSign` | Team Mentions | When someone @mentions you | `teamMentions` |
| `Layers` | Project Updates | New projects and milestones | `projectUpdates` |
| `Shield` | Security Alerts | Login attempts and changes | `securityAlerts` |
| `BarChart2` | Weekly Digest | Summary email every Monday | `weeklyDigest` |

On each toggle change: call `notifPrefsApi().set(...)` and `flashSaved('notif')`.

---

### Appearance

**Card 1 — Theme** (`savedField === 'appear'`)

Three clickable theme cards in a row:

```tsx
const THEMES = [
  { id: 'light',  label: 'Light',  Icon: Sun     },
  { id: 'dark',   label: 'Dark',   Icon: Moon    },
  { id: 'system', label: 'System', Icon: Monitor },
];
```

Each card:
```tsx
<button
  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
    ${themeMode === id
      ? 'border-[#5030E5] bg-[#5030E510]'
      : 'border-surface-200 hover:border-surface-300'
    }`}
>
  <Icon size={20} className={themeMode === id ? 'text-[#5030E5]' : 'text-gray-400'} />
  <span className={`text-xs font-medium ${themeMode === id ? 'text-[#5030E5]' : 'text-gray-500'}`}>
    {label}
  </span>
  {themeMode === id && <Check size={12} className="text-[#5030E5]" />}
</button>
```

**Card 2 — Accent Color**

Label + row of 6 color circles (28px, `rounded-full`):

Colors: `['#5030E5','#0EA5E9','#10B981','#F59E0B','#EF4444','#A855F7']`

Selected circle has a `ring-2 ring-offset-2 ring-[color]` halo.

**Card 3 — Display**

Two rows:
1. Font Size — three segmented buttons `[S] [M] [L]` styled like the theme picker but inline
2. `ToggleRow` for Compact Mode

On any change: call `saveAppearance()` and `flashSaved('appear')`.

---

### Security

**Card 1 — Change Password** (`savedField === 'security'`)

Three `InputField` components (type="password" with show/hide toggle in suffix):
- Current Password
- New Password
- Confirm New Password

Strength bar below New Password:
```tsx
<div className="mt-1.5 h-1.5 rounded-full bg-surface-100 overflow-hidden">
  <motion.div
    className="h-full rounded-full transition-all"
    style={{ width: `${(strength.score / 4) * 100}%`, background: strength.color }}
    layout
  />
</div>
<span className="text-xs" style={{ color: strength.color }}>{strength.label}</span>
```

"Update Password" button — violet filled, full-width, at bottom of card.

**Card 2 — Two-Factor Authentication** (placeholder)

Row with lock icon, label "Two-Factor Authentication", description "Add an extra layer of security", and a `Coming Soon` badge (`text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200`).

**Card 3 — Sessions & Login History** (placeholder)

Same Coming Soon treatment.

---

### Billing

**Card 1 — Current Plan**

Full-width banner: violet gradient background (`bg-gradient-to-r from-[#5030E5] to-[#7C3AED]`), white text. Shows plan name ("Free Plan"), description, and "Upgrade" button (white outlined).

**Card 2 — Plans**

Three plan cards side-by-side (`grid grid-cols-3 gap-4`):

| Plan | Price | Color |
|---|---|---|
| Free | $0/mo | Gray border |
| Pro | $12/mo | Violet border + "Popular" badge |
| Enterprise | Custom | Gray border |

Pro card: `border-[#5030E5] bg-[#5030E508]` with a `Popular` badge in top-right.

Each card has: name, price, 3 bullet features, CTA button.

**Card 3 — Usage**

Three progress meters (Storage, API Calls, Members) — same animated bars as existing.

**Danger Zone** — separated by a thin red-tinted `border-t border-[#D8727D20]`:
- Export Data button (outlined)
- Delete Account button (red outlined, requires `confirmDelete` double-confirm)

---

### About

**Card 1 — App Info**

Centered layout:
- App icon placeholder (violet gradient circle with initials "PX", 64px)
- App name `text-lg font-bold`
- Version `text-sm text-gray-500`
- "Built with Electron + React" caption

**Card 2 — Software Update**

Update status display with icon (status-dependent color), message text, and action buttons — identical logic to existing, just restyled with the new card/button patterns.

---

## Section Transition Animation

```tsx
// Wrap each section content in:
<motion.div
  key={activeSection}
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -6 }}
  transition={{ duration: 0.2 }}
>
  {/* cards */}
</motion.div>
```

Cards within a section are staggered:
```tsx
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.25, delay: index * 0.05 }}
>
```

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/SettingsPage.tsx` | Full rewrite of JSX/layout — all logic/state/IPC calls preserved |

No new files. No new IPC handlers.

---

## Preserved Functionality Checklist

- Profile: name/email/location/designation edit + save via `updateMember` + `authApi`
- Profile: stats (tasksDone, tasksTotal, tasksInProg, myProjects) derived same way
- Notifications: all 9 toggles persisted via `notifPrefsApi`
- Appearance: themeMode, accentColor, fontSize, compactMode persisted via `appearApi` + `setTheme`
- Security: password strength calculator, show/hide, `updatePassword` from AuthContext, `logout`
- Billing: usage meters, export data, delete account with `confirmDelete`
- About: update checker via `useAppUpdater` hook, all update states
- Toast notifications on save/error
- `useRef` guards preventing duplicate pref loads on re-render
